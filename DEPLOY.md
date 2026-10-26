# Deploying: frontend on Vercel, R backend on Render

```
Maths R presentation/
├── site/          ← frontend (Next.js)            → Vercel
├── r/api/         ← backend (R + plumber, Docker) → Render
├── r/analysis.R   ← offline analysis (run on your laptop, outputs are committed)
└── render.yaml    ← Render blueprint
```

**How the pieces fit:** R runs the analysis once on your laptop and writes `site/data/*.json`, the plots and
the film frames. The website is fully static. The R API on Render only powers the live
“Try to fool the filter” slide. If the API is asleep or down, that slide automatically uses the identical
model built into the page, so **the presentation never breaks**.

Deploy the **backend first**, because the frontend needs its URL.

---

## Step 0 · Put the project on GitHub (once)

1. On github.com → **New repository** → name it e.g. `spam-maths-r` → **Create** (empty, no README).
2. In a terminal in the project folder:

```bash
cd "C:/Users/shris/OneDrive/Desktop/Maths R presentation"
git init
git add .
git commit -m "Spam filter maths deck: R analysis, R API, Next.js site"
git branch -M main
git remote add origin https://github.com/<your-username>/spam-maths-r.git
git push -u origin main
```

`site/.gitignore` already keeps `node_modules`, `.next` and `.env*` out of the repo.

---

## Step 1 · Backend on Render (R API)

| Field | Value |
|---|---|
| Where | dashboard.render.com → **New +** → **Blueprint** |
| Repository | `spam-maths-r` |
| Blueprint file | `render.yaml` (found automatically) |
| Service name | `spam-filter-r-api` |
| Runtime | Docker (from `r/api/Dockerfile`, image `rstudio/plumber`) |
| Plan | Free |
| Health check path | `/health` |
| Environment variables | none needed (Render sets `PORT`; `run.R` reads it) |

Click **Apply**. The first build takes ~3–5 minutes.

*No Blueprints option? Use **New + → Web Service** instead, then: Runtime **Docker**, Dockerfile path
`./r/api/Dockerfile`, Docker build context `./r/api`, Instance type **Free**, Health check path `/health`.*

**Test it.** Your URL looks like `https://spam-filter-r-api.onrender.com`:

```bash
curl https://spam-filter-r-api.onrender.com/health
```

You should get `{"ok":true,"words":7211,"r":"R version 4.x ..."}`. Then:

```bash
curl -X POST https://spam-filter-r-api.onrender.com/classify -H "Content-Type: application/json" -d "{\"text\":\"WIN a FREE prize, call now\"}"
```

You should get `"post": 1` or very close to it.

---

## Step 2 · Frontend on Vercel (Next.js site)

| Field | Value |
|---|---|
| Where | vercel.com → **Add New…** → **Project** → import `spam-maths-r` |
| Framework preset | Next.js (auto-detected) |
| **Root Directory** | `site`  ← important |
| Build command | default (`next build`) |
| Output directory | default |
| Install command | default (`npm install`) |
| Node.js version | 20.x or newer (Project → Settings → General) |
| **Environment variable** | `NEXT_PUBLIC_API_URL` = `https://spam-filter-r-api.onrender.com` (your Render URL, **no trailing slash**) |

Click **Deploy**. You get a URL like `https://spam-maths-r.vercel.app`.

**Check it:** open the site, go to slide 10 (“Try to fool the filter”). Under the verdict, the status
line should turn green and read **“computed live by R 4.x (plumber API)”**. While Render is waking up it
says “waking the R server… (using the in-page model meanwhile)”.

> `NEXT_PUBLIC_*` variables are baked in at build time. If you add or change it later, **redeploy**
> (Deployments → ⋯ → Redeploy).

---

## Step 3 · On presentation day

- Render's free plan **sleeps after ~15 minutes idle**, and waking takes up to a minute. **Two minutes
  before you start**, open `https://<your-render-url>/health` in a browser tab to wake it.
- Open the Vercel URL, press **F11**, click once on the page, and present.
- No Wi-Fi? Run it locally: `cd site && npm run build && npm run start`. The live slide uses the
  in-page model, with the same answers.

---

## Updating after you change the R analysis

```bash
Rscript r/analysis.R        # rewrites site/data, site/public/r, r/api/model.json
git add . && git commit -m "Re-run analysis" && git push
```

Both Vercel and Render redeploy automatically on push.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Vercel build: `ENOENT ... data/analysis.R` | Run `Rscript r/analysis.R` once and commit `site/data/`. |
| Vercel builds the wrong folder | Root Directory must be `site`. |
| Slide 10 always says “computed in the page” | `NEXT_PUBLIC_API_URL` is missing or has a typo/trailing slash. Fix it, then **redeploy**. |
| Status stuck on “waking…” | Open `<render-url>/health` directly; check Render → Logs. The free plan can take ~60 s. |
| Render build fails pulling the image | Retry the deploy (Docker Hub rate limits). |
| CORS error in the browser console | `plumber.R` already sends `Access-Control-Allow-Origin: *`; make sure Render deployed the latest commit. |

## Run the API locally (optional)

```bash
Rscript -e "install.packages(c('plumber','jsonlite'))"
cd r/api && Rscript run.R          # → http://localhost:8000/health
```

To make the local site use it, create `site/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`,
then rebuild.
