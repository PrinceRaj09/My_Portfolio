const profileApiBaseUrl = (window.PORTFOLIO_CONFIG?.apiBaseUrl || "").replace(/\/+$/, "");
const leetcodeStats = document.querySelector("#leetcode-stats");

const githubRepoCount = document.querySelector("#github-repo-count");
if (githubRepoCount) {
  fetch(`${profileApiBaseUrl}/api/github/repos`)
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "GitHub profile data is temporarily unavailable.");
      githubRepoCount.textContent = result.profile.public_repos;
      document.querySelector("[data-github-stat='repos']").textContent = result.profile.public_repos;
      document.querySelector("[data-github-stat='followers']").textContent = result.profile.followers;
      document.querySelector("[data-github-status]").textContent = "Live public GitHub data";
    })
    .catch((error) => {
      githubRepoCount.textContent = "—";
      document.querySelector("[data-github-status]").textContent = error instanceof Error
        ? error.message
        : "GitHub profile data could not be loaded.";
    });
}

if (leetcodeStats) {
  fetch(`${profileApiBaseUrl}/api/leetcode/stats`)
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "LeetCode statistics are temporarily unavailable.");
      leetcodeStats.querySelector("[data-stat='solved']").textContent = result.solved;
      leetcodeStats.querySelector("[data-stat='easy']").textContent = result.easy;
      leetcodeStats.querySelector("[data-stat='medium']").textContent = result.medium;
      leetcodeStats.querySelector("[data-stat='hard']").textContent = result.hard;
      leetcodeStats.querySelector("[data-stat='ranking']").textContent = result.ranking == null
        ? "—"
        : result.ranking.toLocaleString();
      leetcodeStats.querySelector(".profile-data-status").textContent = "Live public profile data";
    })
    .catch((error) => {
      leetcodeStats.querySelector(".profile-data-status").textContent = error instanceof Error
        ? error.message
        : "LeetCode statistics could not be loaded.";
    });
}
