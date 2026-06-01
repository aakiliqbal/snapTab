<div align="center">

# GitGlance

**The Ultimate GitHub Profile Visualizer.**

Generate high-fidelity, shareable summary cards of your GitHub contribution history, repositories, and achievements. Powered by a secure Vercel serverless GraphQL architecture.

**Live Demo:** [igitglance.vercel.app](https://igitglance.vercel.app)

[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-v4-E10098?logo=graphql&logoColor=white)](https://graphql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## ✨ Features

- **📊 Contribution Heatmap** — A real-time visual grid showing your last 70 days of activity.
- **🪄 Interactive Language Visualization** — A unified, hover-interactive bar showing your exact language distribution.
- **🏢 Organization Spotlight** — Automatic detection and rendering of organization affiliations with high-res logos.
- **🔗 Social Identity Bar** — Seamless integration for Twitter, LinkedIn, and personal website links.
- **🏆 S-Tier Performance Badging** — Gamified ranking system (S+, S, A, B) based on advanced data analytics.
- **Official Developer Badges** — Displays GitHub Star, Campus Expert, and Staff statuses.
- **📌 Pinned Repositories Spotlight** — High-fidelity rendering of your customized pinned repositories grid.
- **🖼️ Dynamic SEO & OpenGraph** — Automatic page title and meta updates for perfect social sharing.
- **🚀 Serverless GraphQL Engine** — Secure backend architecture protects API tokens while providing deep data insights.
- **💾 PNG Export & Share** — High-resolution card exports with full mobile support and one-click sharing to X (Twitter).
- **🎨 Multiple Themes** — Geist Dark, Aurora, Cyberpunk, and Glass Frost visual themes.
- **📱 Mobile Friendly** — Responsive design with mobile-compatible image downloads.

---

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | [Vite 8](https://vitejs.dev/) + [Vanilla JS](https://developer.mozilla.org/en-US/docs/Web/JavaScript) |
| **Styling** | [Geist Design System](https://vercel.com/design) (Vanilla CSS) |
| **Backend** | [Vercel Serverless Functions](https://vercel.com/docs/functions) |
| **Data Engine** | [GitHub GraphQL API v4](https://docs.github.com/en/graphql) |
| **Icons** | Custom Minimalist SVG Library |
| **Export** | [html2canvas-pro](https://github.com/nicktomlin/html2canvas-pro) |

---

## 📁 Project Structure

```
gitglance/
├── api/
│   └── github.js            # Vercel serverless function (GitHub API proxy)
├── src/
│   ├── api/
│   │   └── githubGraphQL.js  # GraphQL query builder
│   ├── components/
│   │   └── statsCard.js      # Profile card renderer
│   ├── styles/
│   │   ├── index.css         # Global styles
│   │   ├── card.css          # Card component styles & themes
│   │   └── search.css        # Search & hero section styles
│   ├── utils/
│   │   └── export.js         # PNG export with mobile support
│   └── main.js               # App entry point
├── index.html
├── vite.config.js            # Vite config with local API proxy plugin
├── vercel.json               # Vercel deployment config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A [GitHub Personal Access Token](https://github.com/settings/tokens) (Classic or Fine-grained)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/i-viki/gitglance.git
   cd gitglance
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then add your GitHub token to `.env`:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```
   The app runs at `http://localhost:3000` with a built-in API proxy that emulates Vercel serverless functions locally.

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server with local API proxy |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run vercel` | Run via Vercel CLI (alternative) |

---

## 📦 Deployment

1. Connect your repository to [Vercel](https://vercel.com/).
2. Add your `GITHUB_TOKEN` in **Project Settings > Environment Variables**.
3. Deploy! The serverless functions in `api/` handle all API proxying automatically.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ by [jv](https://jayavignesh.dev)

</div>