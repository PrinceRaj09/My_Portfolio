const featuredApiBaseUrl = (window.PORTFOLIO_CONFIG?.apiBaseUrl || "").replace(/\/+$/, "");
const featuredProjects = document.querySelector("#featured-repos");
const featuredRepositoryNames = ["DrawParty", "Smart_Weather_Alert", "Currency-Converter"];

function addFeaturedText(parent, tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

async function loadFeaturedProjects() {
  try {
    const response = await fetch(`${featuredApiBaseUrl}/api/github/repos`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "GitHub projects are temporarily unavailable.");

    const repositories = featuredRepositoryNames
      .map((name) => result.repositories.find((repository) => repository.name.toLowerCase() === name.toLowerCase()))
      .filter((repository) => repository && !repository.archived);
    featuredProjects.replaceChildren();

    repositories.forEach((repository, index) => {
      const card = document.createElement("article");
      card.className = "featured-repo-card reveal revealed";
      addFeaturedText(card, "span", "featured-repo-index", `BUILD / 0${index + 1}`);
      addFeaturedText(card, "span", "featured-repo-icon", repository.name.slice(0, 2).toUpperCase());
      addFeaturedText(card, "h3", "", repository.name.replace(/[-_]/g, " "));
      addFeaturedText(
        card,
        "p",
        "featured-repo-description",
        repository.description || `A public ${repository.language || "software"} project. Explore the source and project details on GitHub.`,
      );
      const metadata = document.createElement("div");
      metadata.className = "featured-repo-meta";
      addFeaturedText(metadata, "span", "", repository.language || "Open source");
      addFeaturedText(metadata, "span", "", `★ ${repository.stargazers_count}`);
      card.append(metadata);
      const link = addFeaturedText(card, "a", "repository-link", "View my project ↗");
      link.href = repository.html_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      featuredProjects.append(card);
    });

    if (!repositories.length) {
      addFeaturedText(featuredProjects, "p", "project-empty", "My featured projects are available on the projects page.");
    }
  } catch (error) {
    featuredProjects.replaceChildren();
    addFeaturedText(
      featuredProjects,
      "p",
      "project-status",
      error instanceof Error ? error.message : "GitHub projects could not be loaded.",
    );
  }
}

loadFeaturedProjects();
