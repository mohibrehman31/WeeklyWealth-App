# Deployment Guide: Railway + Vercel

This app can be deployed in two ways:

## Option A: Full-stack on Railway (simplest)

Deploy everything (frontend + backend) to Railway. No Vercel needed.

1. **Push to GitHub** (if not already)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select this repo
4. Railway will detect the Dockerfile and deploy
5. Add a **Volume** (Railway dashboard → your service → Volumes → Add Volume) and mount at `/data`
6. Set env vars:
   - `DATABASE_PATH` = `/data/budget.db`
   - `GEMINI_API_KEY` = your Gemini API key
7. Deploy. Your app will be live at `https://your-app.railway.app`

---

## Option B: Split deployment (Frontend on Vercel, Backend on Railway)

Best for global CDN for the frontend + dedicated backend.

### Step 1: Deploy backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repo
3. Railway will use the Dockerfile
4. Add a **Volume** mounted at `/data`
5. Set env vars:
   - `DATABASE_PATH` = `/data/budget.db`
   - `GEMINI_API_KEY` = your Gemini API key
   - `CORS_ORIGIN` = leave empty for now (you’ll set it after Vercel deploy)
6. Deploy and copy your Railway URL (e.g. `https://weeklywealth-production.up.railway.app`)

### Step 2: Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project → Import from GitHub
2. Select this repo
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add env var:
   - `VITE_API_URL` = your Railway URL (e.g. `https://weeklywealth-production.up.railway.app`)
5. Deploy

### Step 3: Update CORS on Railway

1. In Railway, add env var:
   - `CORS_ORIGIN` = your Vercel URL (e.g. `https://weeklywealth.vercel.app`)
2. Redeploy the Railway service

---

## Environment variables summary

| Variable        | Where   | Description                                      |
|----------------|---------|--------------------------------------------------|
| `GEMINI_API_KEY` | Both   | Gemini API key for AI features                   |
| `DATABASE_PATH` | Railway | SQLite path, e.g. `/data/budget.db` with volume  |
| `CORS_ORIGIN`  | Railway | Vercel frontend URL (split deployment only)      |
| `VITE_API_URL` | Vercel  | Railway backend URL (split deployment only)      |
