# JM20 Agentic Customer Support Services

## Overview
A React + Vite frontend prototype providing a secure chat interface backed by n8n AI agents, with authentication via Supabase.

## Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion (motion/react)
- **Icons**: Lucide React
- **Auth/DB**: Supabase (REST API, customers table)
- **Agent Backend**: n8n webhook

## Project Structure
```
src/
  App.tsx       - Main app (login + chat UI)
  main.tsx      - Entry point
  index.css     - Global styles + Tailwind
index.html      - HTML template
vite.config.ts  - Vite config (port 5000, proxy for n8n webhook)
package.json    - Dependencies
```

## Key Configuration
- Dev server: `0.0.0.0:5000`, all hosts allowed (Replit proxy compatible)
- n8n webhook proxied at `/n8n-webhook` → `https://gpixie.app.n8n.cloud/webhook/...`
- Supabase URL and anon key hardcoded in `src/App.tsx`

## Running
```bash
npm run dev
```
