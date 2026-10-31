const carousel = document.querySelector("#profile-carousel");

if (carousel) {
  const track = carousel.querySelector("#profile-carousel-track");
  const slides = [...track.querySelectorAll("[data-profile-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-index]")];
  const label = carousel.querySelector("#profile-slide-label");
  const status = carousel.querySelector("#profile-slide-status");
  const slideLabels = ["CODING PROFILE", "GITHUB PROFILE", "LINKEDIN PROFILE"];
  let activeIndex = 0;
  let pointerStartX = null;

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    label.textContent = slideLabels[activeIndex];
    status.textContent = activeIndex === 2 ? "PROFILE" : "LIVE";
    slides.forEach((slide, slideIndex) => {
      slide.setAttribute("aria-hidden", String(slideIndex !== activeIndex));
      slide.inert = slideIndex !== activeIndex;
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === activeIndex;
      dot.classList.toggle("active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  carousel.querySelectorAll("[data-carousel-step]").forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(activeIndex + Number(button.dataset.carouselStep));
    });
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => showSlide(Number(dot.dataset.carouselIndex)));
  });

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showSlide(activeIndex - 1);
    }
  });

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartX = event.clientX;
  });
  track.addEventListener("pointerup", (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 45) return;
    showSlide(activeIndex + (distance < 0 ? 1 : -1));
  });
  track.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });

  showSlide(activeIndex);
}
