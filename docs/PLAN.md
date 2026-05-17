# Implementation plan

Plan for taking the Cloudflare Pages template to a small, polished Info Builder site. Each phase is independently shippable.

## Phase 0 — Documentation (this PR)

- [x] Write `README.md` covering layout, local dev, and deployment.
- [x] Write this plan document.
- [x] Add inline comments only where the *why* is non-obvious.

## Phase 1 — Brand the template (this PR)

The starting template is a one-page "It works 🎉" placeholder. The minimum the issue asked for is an About page that says *Info Builder*. We do that and a bit more so the rest of the build can iterate on a real structure.

- [x] Set the site title and brand to **Info Builder** in every page.
- [x] Rewrite the home page (`index.html`) with a hero, tagline, and a CTA linking to About.
- [x] Update `about/index.html` to say *Info Builder* and explain what the project is.
- [x] Add a shared header with site nav (Home, About) and a shared footer.
- [x] Refresh `assets/css/styles.css` with a small design system (spacing, type scale, container width, header/footer/nav styles) — still light/dark aware.
- [x] Add a tiny `assets/js/main.js` that highlights the active nav link and stamps the current year into the footer.
- [x] Add a baseline `_headers` file (security + asset caching) and a placeholder `_redirects`.

## Phase 2 — Content pages (future PR)

Once the brand and shell are in place, fill in real content:

- [ ] Replace the home hero copy with the actual product pitch.
- [ ] Expand `/about/` with the project background, team, and contact info.
- [ ] Add `/contact/` (mailto link or a Cloudflare Worker-backed form).
- [ ] Add `/blog/` index + first post (still static, one HTML file per post).

## Phase 3 — Polish (future PR)

- [ ] Open Graph / Twitter card meta tags on every page.
- [ ] `sitemap.xml` and `robots.txt`.
- [ ] Add a small social/preview image to `/assets/`.
- [ ] Accessibility pass: focus styles, skip-link, color-contrast audit, screen-reader smoke test.
- [ ] Lighthouse pass (target ≥95 on all categories — static sites should hit this trivially).

## Phase 4 — Optional enhancements (future PR)

- [ ] Pull repo metadata (commit SHA, build date) into the footer via a tiny build step or a Cloudflare Pages Function.
- [ ] Contact form backed by a Cloudflare Worker + Turnstile.
- [ ] Analytics via Cloudflare Web Analytics (privacy-friendly, no cookies).

## Out of scope

- Frontend frameworks (React, Vue, Svelte) — explicitly not wanted.
- Static site generators (Eleventy, Astro, Hugo) — overkill for a few pages.
- A CSS framework (Tailwind, Bootstrap) — the stylesheet stays hand-written and small.

If any of those become necessary later, revisit this plan.
