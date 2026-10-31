const contactApiBaseUrl = (window.PORTFOLIO_CONFIG?.apiBaseUrl || "").replace(/\/+$/, "");
const contactForm = document.querySelector("#contact-form");

if (contactForm) {
  const formStatus = document.querySelector("#form-status");
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const submitLabel = submitButton.querySelector(".submit-label");
    submitButton.disabled = true;
    submitLabel.textContent = "Sending...";
    formStatus.textContent = "";
    formStatus.dataset.state = "";

    try {
      const formData = new FormData(contactForm);
      const response = await fetch(`${contactApiBaseUrl}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your message couldn't be sent. Please try again.");
      contactForm.reset();
      formStatus.textContent = result.message;
      formStatus.dataset.state = result.delivery === "sent" ? "success" : "warning";
    } catch (error) {
      formStatus.textContent = error instanceof Error
        ? error.message
        : "Your message couldn't be sent. Please try again.";
      formStatus.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitLabel.textContent = "Send message";
    }
  });
}

document.querySelectorAll(".skill-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.skillFilter;
    document.querySelectorAll(".skill-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(".skill-panel[data-skill-category]").forEach((panel) => {
      panel.hidden = filter !== "all" && panel.dataset.skillCategory !== filter;
    });
  });
});
