# PlayGrid

Browser game platform — Grid Pong, Grid Assault, Gridbound, and Grid Rush — with accounts, leaderboards, forums, progression, and achievements.

**Stack:** React + Vite + Tailwind, with [Supabase](https://supabase.com) for auth, leaderboards, and forums.

## Run locally

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + publishable key
npm run dev
```

## Build

```bash
npm run build   # outputs static files to dist/
```

The `dist/` folder is plain static HTML/JS/CSS and can be hosted anywhere (Netlify, Vercel, GitHub Pages, PythonAnywhere, etc.).
