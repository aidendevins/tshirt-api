# T‑Shirt React App

This React app provides a landing page and a route that embeds your existing `test.html` creator in an iframe. Your original project files are unchanged.

## Prerequisites
- Node 18+
- The API server from the repo root running at `http://localhost:3000` (`npm run dev` from repo root)

## Run
```bash
cd react-app
npm install
npm run dev
```
Open `http://localhost:5173`.

- Landing page is at `/`.
- Creator is at `/creator` and loads `http://localhost:3000/test` in an iframe.

## Build
```bash
npm run build
npm run preview
```

## Notes
- If your backend uses a different port, update the URL in `src/pages/Creator.jsx`.
