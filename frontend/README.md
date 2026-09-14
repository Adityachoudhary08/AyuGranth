# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Multilingual UI (i18n)

AayuGranth supports 5 UI languages: **English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी)**.

Translation files are pre-generated and committed — they are **not** fetched at runtime:

```
frontend/src/i18n/
├── en.json   ← source of truth (edit this)
├── hi.json   ← generated via Bhashini API
├── ta.json   ← generated via Bhashini API
├── te.json   ← generated via Bhashini API
└── mr.json   ← generated via Bhashini API
```

### Adding new UI strings

> ⚠️ **IMPORTANT**: Whenever you add new static UI text, you **must** re-run the
> translation generation script before merging your PR. Translations silently fall
> back to English for missing keys, but keeping files in sync is a project requirement.

1. Add the new string key + English value to `frontend/src/i18n/en.json`
2. Use it in React via `const { t } = useTranslation(); t('your.key')`
3. Re-generate all language files:
   ```bash
   # From the project root:
   python scripts/generate_ui_translations.py --env backend/.env
   ```
4. Commit all 4 generated JSON files (`hi.json`, `ta.json`, `te.json`, `mr.json`) alongside your code change.

### Architecture

- i18n is initialised in `src/i18n/index.js` (imported in `src/main.jsx`)
- The Navbar language selector calls `i18n.changeLanguage(code)` and persists to `localStorage`
- The chatbot (`AskAayuGranth.jsx`) syncs with the global language and passes it to the backend `/ask` endpoint
- Backend runtime translation (Part B) is handled by `backend/routes/multilingual.py` via Bhashini API
- Voice input/output (Part C) uses Bhashini ASR/TTS via the same route
