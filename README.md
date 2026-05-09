# Infi Tab

A local-first Chrome new tab extension inspired by Infinity New Tab Pro.

## MVP scope

- Chrome Manifest V3 new tab override
- Quick-link add, edit, delete, and drag reorder
- Toolbar popup for adding the current website to the new tab grid
- Folder tiles with modal folder contents
- User-uploaded wallpaper, including GIFs
- Search provider and search-box customization
- Layout customization
- Full JSON export/import backup with replace-only restore

## Development

For implementation details and current architecture notes, see
[docs/development.md](docs/development.md), [docs/hld.md](docs/hld.md), and
[docs/lld-drag-drop.md](docs/lld-drag-drop.md).

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

Run unit tests:

```bash
npm test
```

Run the browser smoke test:

```bash
npm run test:smoke
```

## Load in Chrome

Build the extension:

```bash
npm run build
```

Then:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

After each new build, click the extension card's reload button in `chrome://extensions/`.

## Releases

Releases are manual. When you intentionally want a new version:

1. Merge the release-ready changes to `main`.
2. Run the `Release` workflow from GitHub Actions on `main`.

The workflow checks out `main`, auto-advances the release version if the current
tag already exists, syncs `package.json` and `public/manifest.json` for the
build, generates release notes from commits since the previous tag, and
attaches a zipped `dist/` package to the release.
