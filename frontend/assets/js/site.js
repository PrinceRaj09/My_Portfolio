const navigation = [
  ["home", "Home", "index.html"],
  ["about", "About", "about.html"],
  ["skills", "Skills", "skills.html"],
  ["projects", "Projects", "projects.html"],
  ["contact", "Contact", "contact.html"],
];
const activePage = document.body.dataset.page;
const header = document.querySelector("#site-header");
const footer = document.querySelector("#site-footer");
const mobileNavigation = document.querySelector("#mobile-navigation");

header.innerHTML = `
  <a class="wordmark" href="index.html" aria-label="Prince Raj, home">pr<span>.</span></a>
  <nav class="main-nav" aria-label="Main navigation">
    ${navigation.map(([id, label, href]) => `<a class="nav-link${id === activePage ? " active" : ""}" href="${href}"${id === activePage ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
  </nav>
  <div class="header-actions">
    <button class="theme-toggle icon-button" type="button" aria-label="Switch theme" title="Switch theme">
      <svg class="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>
      <svg class="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.6 8.6 0 1 0 20.2 15.4Z"></path></svg>
    </button>
    <a class="button button-small header-cta" href="contact.html">Let's talk <span aria-hidden="true">↗</span></a>
  </div>`;

mobileNavigation.innerHTML = navigation.map(([id, label, href]) =>
  `<a class="dock-link${id === activePage ? " active" : ""}" href="${href}"${id === activePage ? ' aria-current="page"' : ""}><span aria-hidden="true">${{ home: "⌂", about: "◉", skills: "⌘", projects: "▦", contact: "↗" }[id]}</span>${label}</a>`,
).join("");

footer.innerHTML = `
  <a class="wordmark" href="index.html" aria-label="Prince Raj, home">pr<span>.</span></a>
  <p>Designed and built by Prince Raj <span>© <span id="year">${new Date().getFullYear()}</span></span></p>
  <a class="back-top" href="#top">Back to top ↑</a>`;

const root = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const savedTheme = localStorage.getItem("portfolio-theme");
const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
const themeToggle = header.querySelector(".theme-toggle");

function setTheme(theme) {
  root.dataset.theme = theme;
  themeMeta.content = theme === "light" ? "#f5f7fb" : "#11131a";
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
  localStorage.setItem("portfolio-theme", theme);
}

setTheme(savedTheme || (prefersLight ? "light" : "dark"));
themeToggle.addEventListener("click", () => {
  setTheme(root.dataset.theme === "light" ? "dark" : "light");
});

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  root.classList.add("reveal-ready");
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
}
