# cronomicon.io

The home page for [Cronomicon](https://github.com/ResetSmith/cronomicon). It is a static site: plain HTML, CSS and JavaScript with no build step and no dependencies. It is ready for GitHub Pages.

## Contents

| Path | What |
|------|------|
| `index.html` | The page |
| `404.html` | GitHub Pages serves this for unknown paths |
| `docs/` | The Cronomicon manuals and guides. Only `docs/index.html`, the landing page, is maintained here; every other file is copied in by the app repo's publish workflow on each release tag (see below) |
| `assets/css/site.css` | Styles, including the `@font-face` blocks. Tokens match the app's `theme.ts` and the manuals' light palette |
| `assets/js/site.js` | Theme toggle, product tour tabs, the trailer dialog, copy buttons, workflow replay, and the Score timeline |
| `assets/fonts/` | WOFF2 subsets copied from `frontend/public/fonts/` (SIL OFL, licence included) |
| `assets/img/shots/` | App screenshots, dark and light, captured from v2.0.1 with the demo seed |
| `assets/media/` | The 40-second walkthrough at 1920×1200 (WebM and MP4) plus its poster frame, recorded from v2.0.1 with the demo seed; and the 64-second trailer (`trailer.webm`, `trailer.mp4`, `trailer-720.mp4` for small screens, `trailer.en.vtt` captions, `trailer-poster.webp`), played in the dialog the hero's **Watch the trailer** button opens and reachable directly at `/#trailer` |
| `CNAME` | `cronomicon.io`, the custom domain for a branch-based Pages deploy |
| `.nojekyll` | Tells Pages to serve the files as-is |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | Crawlers and install metadata |

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Open it over HTTP, not `file://`. The 404 page uses root-relative paths, and some browsers block local video over `file://`.

## The docs section

`docs/` holds the latest release's manuals. The app repository's
`.github/workflows/publish-images.yml` (its `docs` job) rebuilds them from the
release tag and syncs them into `docs/` here with `rsync --delete`, excluding
`docs/index.html`, then commits and pushes to `main`, so Pages redeploys. Edit
the manuals in the app repository, never here: the next release overwrites
them. Anything else you put in `docs/` is deleted by the next sync.

The job pushes with a deploy key. To set it up once:

```bash
ssh-keygen -t ed25519 -N "" -C "cronomicon docs publish" -f cronomicon-docs-key
```

1. In **this** repository: **Settings → Deploy keys → Add deploy key**. Paste
   `cronomicon-docs-key.pub`, and tick **Allow write access**.
2. In **`ResetSmith/cronomicon`**: **Settings → Secrets and variables →
   Actions → New repository secret**, named `DOCS_DEPLOY_KEY`, containing the
   whole private key file `cronomicon-docs-key`.
3. Delete both local key files.

Without the secret, the job still creates the GitHub Release and its docs zip,
and warns that it skipped the site.

The version shown on the landing page (the release chip, the deploy command and
`softwareVersion` in the JSON-LD) is edited by hand per release.

## Publish on GitHub Pages

### 1. Put the site in a repository

The simplest setup is a dedicated repository, such as `ResetSmith/cronomicon.io`, with these files at its root:

```bash
cd cronomicon-site
git init -b main
git add .
git commit -m "cronomicon.io home page"
git remote add origin git@github.com:ResetSmith/cronomicon.io.git
git push -u origin main
```

To keep it inside the main `cronomicon` repository instead, copy the files into a `docs/` folder on the `release` branch and choose that folder in step 2. `.nojekyll` and `CNAME` go in `docs/` too.

### 2. Turn on Pages

In the repository, open **Settings → Pages**:

- **Source:** Deploy from a branch
- **Branch:** `main`, folder `/ (root)`, or `release` and `/docs` if you used the main repository
- **Custom domain:** `cronomicon.io`. The `CNAME` file already sets this, so the field should fill itself in after the first deploy.

### 3. Point the domain at GitHub

At your DNS provider, add these records for `cronomicon.io`:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `ResetSmith.github.io` |

Remove any parking-page `A` or `CNAME` records the registrar added. GitHub then redirects `www.cronomicon.io` to `cronomicon.io` on its own.

### 4. Secure it

- Once DNS resolves (from a few minutes up to a day), tick **Enforce HTTPS** in **Settings → Pages**. The option stays greyed out until GitHub has issued the certificate.
- Verify the domain under your GitHub account's **Settings → Pages → Verified domains**. This stops anyone else's repository from claiming `cronomicon.io` if Pages is ever switched off here.

## Updating the page

- **Version:** `scripts/bump-version.sh X.Y.Z` sets the release chips, the `softwareVersion` in the JSON-LD block, the image tags in the Deploy commands and the sitemap dates. The main repo's publish workflow runs it on each release tag.
- **Screenshots:** recapture them from the running app (the `run-cronomicon` skill in the main repo covers launch and dev login) at 1600×1000 and 2× density. Save them to `assets/img/shots/<view>-<dark|light>.webp` at 2400×1500. Keep the dark/light pairs, because the page swaps them with the theme.
- **Links:** every outbound link points at `github.com/ResetSmith/cronomicon`. If the repository moves, search-and-replace that string.
- **The Score:** the hero timeline is generated in `assets/js/site.js` from the cron expressions in its `JOBS` array. Edit that array to change the lanes. Outcomes are derived from a hash of each fire, so the same moment always shows the same result.
