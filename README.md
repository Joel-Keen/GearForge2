# GearForge2
Successor to Gearforge original version

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Deploy to GitHub Pages (branch-based)

1. In repository Settings -> Pages:
	 - Source: Deploy from a branch
	 - Branch: gh-pages
	 - Folder: /(root)
2. Publish:

```bash
npm run deploy
```

This command builds the app and pushes web/dist to the gh-pages branch.