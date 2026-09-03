# AI Form Builder (Typeform Clone)

A MERN starter for an AI-assisted form builder inspired by Typeform.

## What it includes

- AI prompt to form schema generation
- Multi-step form filling experience
- Shareable public form links
- Response dashboard with summary stats
- MERN structure with React frontend and Express + MongoDB backend
- Deterministic fallback schema generation when no AI API key is configured

## Stack

- MongoDB
- Express
- React + Vite
- Node.js
- Optional AI provider via `GROQ_API_KEY`

## Project structure

- `client` - React app
- `server` - Express API

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Add environment variables in `server/.env`:

```bash
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/typeform-clone
GROQ_API_KEY=
```

3. Run the app:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## AI generation

If `GROQ_API_KEY` is present, the server will try to generate a schema using a chat model. If not, it falls back to a local rules-based generator so the app still works during development.

## Core flows

- Builder creates a form from a prompt
- Form schema can be edited before publishing
- Public users fill the form using a step-by-step interface
- Responses are stored and shown in a dashboard
