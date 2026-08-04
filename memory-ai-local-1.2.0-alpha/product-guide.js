"use strict";

(() => {
  const body = document.body;
  const menuButton = document.getElementById("menu-button");
  const sidebar = document.getElementById("guide-sidebar");
  const scrim = document.getElementById("nav-scrim");
  const backToTop = document.getElementById("back-to-top");
  const navLinks = [...document.querySelectorAll('.guide-nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMenu(open) {
    body.classList.toggle("nav-open", open);
    menuButton?.setAttribute("aria-expanded", String(open));
    if (scrim) scrim.hidden = !open;
    if (!open) menuButton?.focus({ preventScroll: true });
  }

  menuButton?.addEventListener("click", () => setMenu(!body.classList.contains("nav-open")));
  scrim?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("nav-open")) setMenu(false);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) {
        body.classList.remove("nav-open");
        menuButton?.setAttribute("aria-expanded", "false");
        if (scrim) scrim.hidden = true;
      }
    });
  });

  function markCurrent(id) {
    navLinks.forEach((link) => {
      const current = link.getAttribute("href") === `#${id}`;
      if (current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) markCurrent(visible.target.id);
    }, { rootMargin: "-12% 0px -68%", threshold: [0, 0.15, 0.4] });
    sections.forEach((section) => observer.observe(section));
  }

  function updateTopButton() {
    if (backToTop) backToTop.hidden = window.scrollY < 560;
  }

  window.addEventListener("scroll", updateTopButton, { passive: true });
  updateTopButton();
  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && body.classList.contains("nav-open")) {
      body.classList.remove("nav-open");
      menuButton?.setAttribute("aria-expanded", "false");
      if (scrim) scrim.hidden = true;
    }
  });

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target?.id) markCurrent(target.id);
  }

  sidebar?.addEventListener("transitionend", () => {
    if (body.classList.contains("nav-open")) {
      sidebar.querySelector("a, button")?.focus({ preventScroll: true });
    }
  });
})();
