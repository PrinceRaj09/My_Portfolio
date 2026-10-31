async function fetchGithubJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `GitHub request failed (${response.status}).`);
  }
  return result;
}

window.fetchPortfolioGithubData = async function fetchPortfolioGithubData(apiBaseUrl) {
  let apiError;
  try {
    const result = await fetchGithubJson(`${apiBaseUrl}/api/github/repos`);
    return { ...result, source: "portfolio-api" };
  } catch (error) {
    apiError = error;
  }

  try {
    const [repositories, profile] = await Promise.all([
      fetchGithubJson("https://api.github.com/users/princeraj09/repos?per_page=100&sort=updated"),
      fetchGithubJson("https://api.github.com/users/princeraj09"),
    ]);
    return { repositories, profile, updated_at: new Date().toISOString(), source: "github" };
  } catch (fallbackError) {
    const apiMessage = apiError instanceof Error ? apiError.message : "unknown API error";
    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "unknown GitHub error";
    throw new Error(`Projects could not be loaded (portfolio API: ${apiMessage}; GitHub: ${fallbackMessage}).`);
  }
};
