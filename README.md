# Info Builder

The marketing/landing site for **Info Builder**, hosted on [Cloudflare Pages](https://pages.cloudflare.com/).

This is a static site — plain HTML, CSS, and a sprinkle of vanilla JavaScript. No framework, no build step, no toolchain. The repo is the deployable artifact: Cloudflare Pages serves these files as-is.

## Project layout

```
.
├── index.html              # Home page (/)
├── about/
│   └── index.html          # About page (/about/)
├── assets/
│   ├── css/
│   │   └── styles.css      # Global stylesheet
│   ├── js/
│   │   └── main.js         # Shared client-side script (nav active state, year)
│   └── favicon.svg         # Site favicon
├── _headers                # Cloudflare Pages response headers
├── _redirects              # Cloudflare Pages redirect rules
├── docs/
│   └── PLAN.md             # Implementation plan
└── README.md
```

Each page is a self-contained HTML document that links to the same shared CSS and JS. Adding a new page means creating a new folder with an `index.html` (so the URL stays clean: `/foo/` instead of `/foo.html`) and adding a nav entry to the header in every page.

## Local development

There is no build step. To preview locally, serve the directory with any static file server — for example:

```sh
# Python 3
python3 -m http.server 8000

# Or with Node
npx serve .
```

Then open <http://localhost:8000/>.

Editing a file and reloading the browser is the entire dev loop.

## Deployment

The site deploys to Cloudflare Pages directly from the `main` branch. There is no build command — Cloudflare Pages publishes the repo root as the output directory.

Cloudflare Pages configuration (set in the Cloudflare dashboard):

| Setting             | Value             |
| ------------------- | ----------------- |
| Build command       | *(none)*          |
| Build output directory | `/`            |
| Root directory      | `/`               |
| Production branch   | `main`            |

Branches other than `main` are deployed as preview environments automatically.

### `_headers` and `_redirects`

- [`_headers`](./_headers) sets baseline security headers and long-lived caching for `/assets/*`.
- [`_redirects`](./_redirects) is reserved for future redirect rules (currently empty apart from a comment).

See the [Cloudflare Pages docs](https://developers.cloudflare.com/pages/configuration/) for the full file format.

## Browser support

Targets evergreen browsers (last two versions of Chrome, Edge, Firefox, Safari). The CSS uses `color-scheme: light dark` and `prefers-color-scheme` so the site adapts to the user's system theme without any toggle.

## Contributing

Open a PR. Keep pages small, keep styles in `assets/css/styles.css`, and keep JavaScript optional — the site must remain usable with JS disabled.
