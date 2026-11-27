# 5e Feat Wiki

Data sources

The project uses two APIs:

Public online API: Open5e. Provides feats from open-licensed sources such as the SRD and the Adventurers Guild.
My own local API (Express, in server/). I built a small REST API that serves feats from a JSON file I prepared. The raw data is messy (nested entries, markup tags such as {@dice 1d4}, structured prerequisites), so the server converts every feat into a simple shape before sending it:



## Run (two terminals)
```bash
# terminal 1 - API on http://localhost:3001
cd server && npm run dev

# terminal 2 - React app
npm run dev
```
Try the API in your browser: http://localhost:3001/api/feats

## Running locally

Requires Node.js 18 or newer. Use two terminals.

```bash
# Terminal 1: API on http://localhost:3001
cd server
npm install
npm run dev

# Terminal 2: React app (from the project root)
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173). The API can be checked directly at http://localhost:3001/api/feats.

The React app reads the API address from the `VITE_API_URL` environment variable and falls back to `http://localhost:3001/api`.

## Endpoints
- `GET /api/feats`  (optional `?search=text` and `?source=XPHB`)
- `GET /api/feats/:id`

## Deploying
- API: Render or Railway, root directory `server`, start command `npm start`.
  Set `DATA_FILE` to a smaller file that is safe to publish.
- React app: Vercel. Set `VITE_API_URL` to your API address ending in `/api`.
  Add `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }`
