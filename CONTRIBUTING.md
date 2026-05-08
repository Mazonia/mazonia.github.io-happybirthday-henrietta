# Contributing Guide

Thank you for helping improve this project! Please read these guidelines before making any changes.

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable — synced to the live GitHub Pages site |
| `dev` | Active development — open PRs against this branch |
| `feature/<name>` | New features |
| `fix/<name>` | Bug fixes |

> **Never push directly to `main`.** Always open a pull request.

## Making Changes

1. **Fork / clone** the repository
2. **Create a branch** from `dev`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** — follow the existing code style (vanilla JS, Tailwind CSS utility classes)
4. **Test locally** with `npx serve .` before submitting
5. **Open a Pull Request** against `dev` using the PR template

## Content Changes

All site content lives in `data/default-site.json`. To add or edit:
- Messages → `messages[]`
- Gallery items → `gallery[]`
- Vault letters → `vault.letters[]`
- Scrapbook pages → `scrapbook.pages[]`
- Quiz questions → `questions[]`

Bump `dataVersion` by 1 whenever you edit this file so cached data is invalidated.

## Code Style

- **JS**: Plain ES5-compatible vanilla JS (no bundler, no transpiler)
- **HTML**: Semantic elements, unique IDs on all interactive elements
- **CSS**: Tailwind utility classes; custom styles in `assets/css/site.css`
- **No secrets**: Never commit passcodes, passphrases, or API keys

## Commit Messages

Use the format:
```
<type>: <short description>

Types: feat | fix | docs | style | refactor | chore
```

Example: `feat: add 4-per-page scrapbook layout`
