# 🎂 Happy Birthday Henrietta — Ore Celebrations

> A private, interactive birthday celebration web app built with love and way too many late nights.

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-yellow?style=flat-square&logo=github)](https://mazonia.github.io/mazonia.github.io-happybirthday-henrietta)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)]()

---

## ✨ Features

| Page | Description |
|---|---|
| 🏠 **Home** | Hero section, memory gallery, countdown / welcome screen |
| 📸 **Scrapbook** | Album-style flipbook — 4 items per page, 8 per spread, mixed images & videos |
| 💎 **Vault** | Password-protected personal letters and timeline |
| 🖼️ **Gallery** | Full-screen media viewer with hover effects |
| 📌 **Messages** | Virtual corkboard of birthday wishes from friends |
| ⛏️ **Truth Drill** | Interactive Q&A quiz with locked / revealed answers |
| 🔐 **Admin** | Password-protected dashboard to manage all site content |

---

## 🛠️ Tech Stack

- **HTML5 / Vanilla JS** — no build step, no framework
- **Tailwind CSS** (CDN) — utility-first styling
- **Google Fonts** — Inter + Caveat
- **Material Symbols** — icon set
- **Service Worker** (`sw.js`) — offline support & asset caching
- **localStorage** — persists admin edits and access sessions
- `data/default-site.json` — single source of truth for all content

---

## 🚀 Running Locally

```bash
# Serve the project (requires Node.js)
npx serve .
```

Then open **http://localhost:3000** in your browser.

> **Note:** Videos and some assets are large and are excluded from version control via `.gitignore`.

---

## 🔑 Access

The site has two access tiers controlled via `shell.js`:

| Tier | Description |
|---|---|
| **Visitor** | Timed 5-minute session — enter passcode on the lockdown screen |
| **Admin** | Unlimited — enter admin passphrase to unlock the admin dashboard |

Passcodes are set in `data/default-site.json` under `meta.adminPassphrase` and `vault.passphrase`.

---

## 📁 Project Structure

```
├── index.html           # Homepage
├── scrapbook.html       # Album flipbook
├── vault.html           # Private letters & timeline
├── gallery.html         # Photo/video gallery
├── messages.html        # Birthday messages board
├── quiz.html            # Truth Drill quiz
├── admin/               # Admin dashboard pages
├── assets/
│   ├── js/
│   │   ├── shell.js     # Global nav, access gate, lockdown
│   │   ├── site-data.js # Data loading & localStorage management
│   │   └── tailwind-config.js
│   └── css/site.css
├── data/
│   └── default-site.json  # All site content (messages, gallery, vault, etc.)
├── images/              # Static image assets
└── videos/              # Video clips (gitignored if large)
```

---

## 🤝 Contributing

This is a private personal project. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines if you've been granted access.

---

## 📄 License

Private — all rights reserved. Not for redistribution.

---

*Built by the Developer at 3:38 AM, 8th May 2026. Still on water.* 💛