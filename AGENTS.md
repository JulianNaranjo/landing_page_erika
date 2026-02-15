# AGENTS.md

## Purpose
- This repository is a static marketing site for Erika Lotero Neuropsicologia.
- Stack: plain HTML, CSS, and small inline vanilla JavaScript snippets (no framework, no bundler).
- Primary goals: SEO landing pages, accessibility, mobile-first behavior, and fast loading.

## Repository layout
- Root pages: `index.html`, `servicios.html`, `blog.html`, plus service pages.
- Location pages: `ubicaciones/*.html`.
- Template for location pages: `ubicaciones/_template.html`.
- Stylesheets: `css/design-system.css`, `css/components.css`, `css/styles.css`.
- SEO files: `robots.txt`, `sitemap.xml`.
- Static media: `assets/`.

## Cursor/Copilot rules status
- No `.cursorrules` file found.
- No `.cursor/rules/` directory found.
- No `.github/copilot-instructions.md` file found.
- If any of these files are added later, treat them as higher-priority project instructions.

## Build commands
- There is no build step configured in this repository.
- Development run (Python): `python -m http.server 8080`
- Development run (Node): `npx --yes serve .`
- Production deploy model is static hosting (upload files as-is).

## Lint/format commands
- No lint tooling is preconfigured in `package.json` (none exists today).
- Full HTML lint: `npx --yes htmlhint "**/*.html"`
- Single HTML file lint: `npx --yes htmlhint "index.html"`
- Full CSS lint: `npx --yes stylelint "css/**/*.css"`
- Single CSS file lint: `npx --yes stylelint "css/styles.css"`
- Full formatting check: `npx --yes prettier --check "**/*.{html,css,md}"`
- Single file formatting check: `npx --yes prettier --check "blog.html"`
- Auto-format all: `npx --yes prettier --write "**/*.{html,css,md}"`

## Test commands
- There is no automated unit/integration test suite configured.
- Treat lint + manual smoke checks as the current test strategy.
- Recommended manual smoke pass pages:
  - `/index.html`
  - `/servicios.html`
  - `/blog.html`
  - `/ubicaciones/index.html`
  - One sample location page such as `/ubicaciones/el-poblado.html`

## Running a single test (practical equivalent)
- Single HTML validation: `npx --yes htmlhint "ubicaciones/el-poblado.html"`
- Single CSS validation: `npx --yes stylelint "css/components.css"`
- Single file format validation: `npx --yes prettier --check "css/design-system.css"`
- Single page manual test:
  1) Start server: `python -m http.server 8080`
  2) Open `http://localhost:8080/servicios.html`
  3) Verify navigation, mobile menu, and CTA links.

## Pre-PR quality gate
- Run HTML lint for changed pages.
- Run CSS lint for changed stylesheets.
- Run Prettier check on changed files.
- Manually test at least one desktop width and one mobile width.
- Verify no console errors on touched pages.
- Verify internal links and anchors on touched pages.
- If SEO metadata changed, update `sitemap.xml` and validate canonical URLs.

## Coding conventions

### General
- Keep copy and UI text in Spanish unless the page clearly requires another language.
- Use semantic HTML (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Prefer progressive enhancement: content should remain readable without JS.
- Preserve accessibility features (`aria-*`, skip link, keyboard support).

### HTML style
- Use UTF-8 and include viewport meta tags.
- Keep one `<h1>` per page.
- Keep heading hierarchy sequential (`h1` -> `h2` -> `h3`).
- Include unique `<title>`, `meta description`, canonical, and OG tags per page.
- Add descriptive `alt` text to all content images.
- Use `loading="lazy"` for non-critical images.
- Keep inline SVGs accessible with `aria-hidden="true"` when decorative.
- Avoid inline `style` attributes unless unavoidable.

### CSS style
- Reuse design tokens from `:root` in `css/design-system.css`.
- Prefer variables over hardcoded colors, spacing, and font sizes.
- Keep component-level rules in `css/components.css`.
- Keep page/section-specific rules in `css/styles.css`.
- Maintain existing naming patterns (kebab-case classes like `.hero-content`, `.service-card`).
- Prefer class selectors; avoid ID selectors for styling.
- Keep responsive behavior with existing breakpoints (1024px, 768px, 640px, 480px).
- Preserve reduced-motion and focus-visible support.

### Import and asset conventions
- HTML stylesheet order should remain:
  1) `css/design-system.css`
  2) `css/components.css`
  3) `css/styles.css`
- Use relative paths consistent with file depth (root vs `ubicaciones/`).
- Prefer `link rel="preconnect"` + Google Fonts `<link>` over additional CSS `@import`.

### JavaScript conventions (inline scripts)
- Keep scripts small, page-scoped, and DOM-driven.
- Wrap setup in `DOMContentLoaded` when querying nodes that may not exist yet.
- Guard selectors before attaching listeners:
  - Example: check `if (menuBtn && navLinks)`.
- Favor `const` by default; use `let` only when reassignment is required.
- Use early returns for null/invalid state.
- Keep behavior accessible:
  - Maintain `aria-expanded` / `aria-hidden` state.
  - Support Escape key for closing menus/modals.
- Avoid introducing global variables when not necessary.

### Types and data contracts
- There is no TypeScript in this repository.
- For non-trivial JS helpers, add JSDoc for parameter/return intent.
- Validate untrusted data before use (especially `dataset`, URL params, and dynamic HTML).
- Avoid `innerHTML` with interpolated user-controlled content.

### Naming conventions
- File names: lowercase kebab-case (e.g., `diagnostico-autismo.html`).
- CSS classes: lowercase kebab-case.
- JS variables/functions: camelCase.
- Constants: UPPER_SNAKE_CASE only for true constants.
- Use descriptive names tied to UI role (`mobileMenuBtn`, `accordionTrigger`).

### Error handling and resilience
- Never assume DOM elements exist on every page.
- Fail gracefully: if an optional feature cannot initialize, keep core content usable.
- Prefer defensive checks around event wiring and dynamic node traversal.
- Keep console clean in normal flows (no debug logs in production markup).

## SEO and content rules
- Every new page must include canonical, meta description, and relevant OG tags.
- Keep structured data (`application/ld+json`) valid JSON.
- When adding/removing public pages, update `sitemap.xml` and verify `robots.txt` still points to it.
- Maintain consistent business identity data (name, phone, address) across pages.

## Location pages (`ubicaciones/`)
- Use `ubicaciones/_template.html` as the source template.
- Replace all placeholders (`[[TITLE]]`, `[[LOCATION]]`, etc.) completely.
- Keep breadcrumb and JSON-LD aligned with final URL slug.
- Ensure internal links point back to root pages with correct relative paths.

## Change management guidance for agents
- Keep diffs focused; avoid broad refactors unrelated to the task.
- Do not introduce new tooling/config unless task explicitly requires it.
- Preserve current visual language and spacing scale.
- If you add a reusable pattern, place tokens/components in the correct CSS file.
- For major visual changes, test desktop + mobile and interactive states.
