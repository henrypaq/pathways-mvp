# Deploying the API to Railway

## One-time setup

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init` (run from repo root)
4. Link to project: `railway link`

## Set environment variables on Railway

In the Railway dashboard → your service → Variables, add:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `FRONTEND_URL` | https://your-app.vercel.app |

Railway auto-injects `PORT` — do not set it manually.

## Deploy
```bash
railway up
```

Railway will build the Dockerfile and deploy. Your API will be live at:
`https://<your-service>.railway.app`

## Verify

- Health check: `curl https://<your-service>.railway.app/health`
- Swagger docs: `https://<your-service>.railway.app/docs`

## Connecting the frontend

In your Vercel project settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | https://your-service.railway.app |

Then in your Next.js code, call:
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question, profile })
})
```

## ChromaDB on Railway

The pre-built ChromaDB is not baked into the Docker image.
On first deploy, Railway runs `python -m data_scrapper.main scrape` before starting the server.
This takes approximately 2–3 minutes. The health check timeout is set to 300s to accommodate this.

To skip the scrape (if you have a Railway volume with pre-built data mounted at /app/data_scrapper/data/):
Change the startCommand in railway.toml to:
```
uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Local dev (no Docker needed)
```bash
# Terminal 1 — backend
cd api && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
npm run dev
```
