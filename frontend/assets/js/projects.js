const projectsApiBaseUrl = (window.PORTFOLIO_CONFIG?.apiBaseUrl || "").replace(/\/+$/, "");
const repositoryGrid = document.querySelector("#github-project-grid");
const projectStatus = document.querySelector("#project-status");
const searchInput = document.querySelector("#project-search");
const sortSelect = document.querySelector("#project-sort");
const filterButtons = [...document.querySelectorAll(".project-filter")];
const caseStudyCards = [...document.querySelectorAll(".project-case-study")];
let repositories = [];
let currentFilter = "all";

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function repositoryMatchesFilter(repository) {
  const topics = repository.topics.map((topic) => topic.toLowerCase());
  const name = repository.name.toLowerCase();
  if (currentFilter === "all" || currentFilter === "github") return true;
  if (currentFilter === "data") {
    return topics.some((topic) => /data|analytics|machine-learning|ai/.test(topic))
      || /python|jupyter/i.test(repository.language || "");
  }
  if (currentFilter === "web") {
    return topics.some((topic) => /web|frontend|website|react/.test(topic))
      || /html|css|javascript|typescript/i.test(repository.language || "");
  }
  return topics.some((topic) => /game|interactive/.test(topic))
    || /draw|party|tic.?tac|game/.test(name);
}

function visibleRepositories() {
  const query = searchInput.value.trim().toLowerCase();
  return repositories
    .filter((repository) => repositoryMatchesFilter(repository))
    .filter((repository) => !query || [
      repository.name,
      repository.description || "",
      repository.language || "",
      ...repository.topics,
    ].join(" ").toLowerCase().includes(query))
    .sort((a, b) => {
      if (sortSelect.value === "stars") return b.stargazers_count - a.stargazers_count;
      if (sortSelect.value === "name") return a.name.localeCompare(b.name);
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
}

function renderRepositories() {
  const visible = visibleRepositories();
  const searchQuery = searchInput.value.trim().toLowerCase();
  const showCaseStudies = currentFilter === "all" || currentFilter === "data";
  let visibleCaseStudies = 0;
  caseStudyCards.forEach((card) => {
    const matchesSearch = !searchQuery || card.textContent.toLowerCase().includes(searchQuery);
    card.hidden = !showCaseStudies || !matchesSearch;
    if (!card.hidden) visibleCaseStudies += 1;
  });
  repositoryGrid.replaceChildren();
  if (!visible.length && !visibleCaseStudies) {
    repositoryGrid.append(createTextElement("p", "project-empty", "No matching public repositories. Try another filter or search."));
    return;
  }
  if (!visible.length) {
    repositoryGrid.append(createTextElement("p", "project-empty", "No matching live repositories. Related résumé case studies are shown below."));
    return;
  }

  visible.forEach((repository, index) => {
    const card = document.createElement("article");
    card.className = "project-card github-project-card reveal revealed";
    const art = document.createElement("div");
    art.className = "repository-art";
    art.append(createTextElement("span", "repository-index", `REPOSITORY / ${String(index + 1).padStart(2, "0")}`));
    art.append(createTextElement("strong", "repository-mark", repository.name.slice(0, 2).toUpperCase()));
    art.append(createTextElement("span", "repository-language", repository.language || "Open source"));
    card.append(art);

    const meta = document.createElement("div");
    meta.className = "project-meta";
    meta.append(createTextElement("p", "project-type", "PUBLIC GITHUB REPOSITORY"));
    const title = createTextElement("h3", "", repository.name.replace(/[-_]/g, " "));
    meta.append(title);
    card.append(meta);

    const description = createTextElement("p", "project-description", repository.description || "A public project from my GitHub profile. Open the repository to explore its code and details.");
    card.append(description);

    const stats = document.createElement("div");
    stats.className = "repository-stats";
    stats.append(createTextElement("span", "", repository.language || "Language n/a"));
    stats.append(createTextElement("span", "", `★ ${repository.stargazers_count}`));
    stats.append(createTextElement("span", "", `⑂ ${repository.forks_count}`));
    stats.append(createTextElement("span", "", `Updated ${new Date(repository.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })}`));
    card.append(stats);

    const tags = document.createElement("div");
    tags.className = "project-tech";
    repository.topics.slice(0, 4).forEach((topic) => tags.append(createTextElement("span", "", topic)));
    if (!repository.topics.length && repository.language) tags.append(createTextElement("span", "", repository.language));
    card.append(tags);

    const link = createTextElement("a", "repository-link", "Explore repository ↗");
    link.href = repository.html_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    card.append(link);
    repositoryGrid.append(card);
  });
}

async function loadRepositories() {
  try {
    const result = await window.fetchPortfolioGithubData(projectsApiBaseUrl);
    repositories = result.repositories.filter((repository) => !repository.archived);
    const profile = result.profile;
    document.querySelector("#github-repo-count").textContent = profile.public_repos;
    document.querySelector("#github-follower-count").textContent = profile.followers;
    const refreshStatus = result.source === "github"
      ? "loaded directly from GitHub"
      : "refreshed every 5 minutes";
    document.querySelector("#project-status").textContent = `${repositories.length} live public repositories · ${refreshStatus}`;
    renderRepositories();
  } catch (error) {
    projectStatus.textContent = error instanceof Error
      ? error.message
      : "GitHub project data could not be loaded.";
    repositoryGrid.replaceChildren();
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.projectFilter;
    filterButtons.forEach((filterButton) => {
      const active = filterButton === button;
      filterButton.classList.toggle("active", active);
      filterButton.setAttribute("aria-pressed", String(active));
    });
    renderRepositories();
  });
});
searchInput.addEventListener("input", renderRepositories);
sortSelect.addEventListener("change", renderRepositories);
loadRepositories();
