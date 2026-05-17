// Mark the current nav link with aria-current and stamp the year into the footer.
// Kept tiny and dependency-free — the site must work with JS disabled.
(function () {
  var path = window.location.pathname.replace(/index\.html$/, "");
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    var normalized = href.replace(/index\.html$/, "");
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    if (normalized === path) {
      link.setAttribute("aria-current", "page");
    }
  });

  var year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = year;
  });
})();
