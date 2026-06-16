<div align="center">

# Datanaid

### Turn nonprofit data into impact.

From spreadsheets to stories — a production-quality data analysis SaaS that turns raw nonprofit CSVs and spreadsheets into grounded insights, board-ready visualizations, and a polished impact report.

Built with Next.js 15 · TypeScript · Tailwind · shadcn/ui · Recharts · Vercel Blob

</div>

---

## Overview

Datanaid is a self-serve analytics product for mission-driven organizations. Upload a dataset (donations, volunteer hours, clients served, attendance, expenses, etc.) and Datanaid automatically:

- **Profiles** every column — types, missing values, duplicates, outliers, and a data-quality score (A–F).
- **Analyzes** trends, growth, rolling averages, category breakdowns, and correlations.
- **Models** the future with a built-in linear forecast (confidence intervals included), plus optional Prophet/XGBoost forecasting via a Python serverless function.
- **Explains** findings with a **hybrid insight engine** — every insight is grounded in computed statistics. An optional LLM only *rephrases* those grounded facts into polished prose; it never invents new claims.
- **Exports** a complete Impact Report as Markdown or print-to-PDF.

Every chart ships with three plain-language annotations: **What this means**, **Why it matters**, and a **Recommended action** — so program staff and board members can act without a data-science background.

---

## Feature Highlights

| Area | What you get |
|------|--------------|
| **Upload** | Drag-and-drop CSV / XLSX, instant client-side parsing (PapaParse + SheetJS), sample dataset included. |
| **Profile** | Per-column type inference, missing-value map, duplicate detection, outlier flags, quality grade. |
| **Analysis** | Trend detection, period-over-period growth, rolling averages, K-Means segmentation, anomaly detection. |
| **Visualizations** | Trend, category, distribution, correlation heatmap, and forecast charts — all responsive and dark-mode aware. |
| **Insights** | Grounded, structured insights (`finding / evidence / importance / recommended_action`), categorized as findings, trends, risks, opportunities, and recommendations. |
| **Impact Report** | Executive summary, KPIs, trends, forecast, anomalies, and recommendations — export to Markdown or PDF. |
| **Persistence** | Analyses persisted to Vercel Blob; shareable by ID. |
| **Design** | Clean, spacious, premium SaaS aesthetic with full light/dark mode. |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Route Handlers)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives), General Sans / Satoshi typography
- **Charts:** Recharts
- **Forms & validation:** React Hook Form + Zod
- **Data parsing:** PapaParse (CSV), SheetJS / `xlsx` (Excel)
- **Analytics & ML:** Custom TypeScript engine in `lib/analytics` (profiling, trends, K-Means, anomaly detection, linear forecasting)
- **Heavy ML (optional):** Python serverless function (`api/forecast.py`) with Prophet + XGBoost
- **Persistence:** Vercel Blob
- **Deployment:** Vercel

---

## Project Structure

```
datanaid-web/
├── app/
│   ├── (app)/                 # Authenticated app shell (sidebar + topbar)
│   │   ├── upload/            # Dataset upload
│   │   ├── profile/           # Data profiling
│   │   ├── analysis/          # Trends, clusters, anomalies
│   │   ├── visualizations/    # Charts with What/Why/Action
│   │   ├── insights/          # Grounded insight cards
│   │   └── report/            # Exportable Impact Report
│   ├── api/
│   │   ├── analyze/           # Run analysis (route handler)
│   │   └── analysis/[id]/     # Load a persisted analysis
│   ├── layout.tsx             # Root layout + theme provider
│   ├── page.tsx               # Marketing landing page
│   └── globals.css            # Design tokens + print stylesheet
├── api/
│   ├── forecast.py            # Optional Prophet/XGBoost serverless fn
│   └── requirements.txt
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── charts/                # Trend/Category/Distribution/Heatmap/Forecast
│   ├── dashboard/             # KPI + insight + quality cards
│   ├── layout/                # Sidebar, Topbar, DashboardShell
│   ├── landing/               # Marketing sections
│   └── upload/                # Dropzone + parsing UI
├── lib/
│   ├── analytics/             # Ingestion, profiling, trends, ML, insights, engine
│   ├── reports/               # Markdown + print/PDF export
│   ├── storage/               # Vercel Blob persistence
│   └── store/                 # Analysis state (React context)
├── types/                     # Shared TypeScript contracts
├── public/                    # Favicon + sample dataset
├── tailwind.config.ts
├── next.config.js
├── vercel.json                # Python function memory/duration config
└── .env.example
```

---

## Getting Started (Local Development)

**Prerequisites:** Node.js 20+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure environment variables
cp .env.example .env.local
#    The app runs fully without any env vars in local dev.
#    Add a BLOB_READ_WRITE_TOKEN only if you want to test Blob persistence.

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Upload**, drop in `public/sample-nonprofit-data.csv` (or your own file), and explore the profile, analysis, visualization, insight, and report pages.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the local dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run the TypeScript compiler with no emit. |

---

## Environment Variables

All variables are **optional for local development**. The app degrades gracefully when they are absent.

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Required in production | Vercel Blob token for persisting uploaded datasets and generated reports. Without it, analyses live only in the current session. |
| `OPENAI_API_KEY` | Optional | Enables LLM **phrasing** of the deterministic insights. Without it, Datanaid uses high-quality deterministic templates. The LLM is strictly constrained to computed statistics — it never introduces new facts. |
| `OPENAI_MODEL` | Optional | Model used for phrasing only. Defaults to `gpt-4o-mini`. |
| `PYTHON_ML_URL` | Optional | URL of the deployed Python forecasting function. Only needed if you host `api/forecast.py` separately from the Next.js app. When unset, the built-in TypeScript linear forecast is used. |

See [`.env.example`](./.env.example) for inline documentation.

---

## The Hybrid Insight Engine (No Hallucinations)

Datanaid's insight engine is **deterministic-first**:

1. The TypeScript analytics layer computes every statistic (trends, growth rates, outliers, quality issues, correlations, forecasts).
2. Each insight is assembled as structured JSON, grounded directly in those numbers:

   ```json
   {
     "finding": "Monthly donations grew 34% over the analyzed period.",
     "evidence": "Total donations rose from $12,400 (Jan) to $16,600 (Jun); avg. period growth 6.1%.",
     "importance": "high",
     "recommended_action": "Reinvest in the Q2 outreach channels that drove the increase."
   }
   ```

3. If `OPENAI_API_KEY` is set, the LLM is given **only** these grounded facts and asked to rephrase them more fluidly — under a strict guard that rejects any output introducing numbers or claims not present in the source statistics.

Result: polished prose with zero fabricated facts. Without a key, the deterministic templates produce equally grounded (if slightly more formulaic) output.

---

## Python ML Function (Optional Heavy Forecasting)

The TypeScript engine ships a linear forecast with confidence intervals that works out of the box. For Prophet / XGBoost forecasting, Datanaid includes a Python serverless function:

- **File:** `api/forecast.py`
- **Dependencies:** `api/requirements.txt` (Prophet, pandas, numpy, XGBoost, scikit-learn)
- **Vercel config:** `vercel.json` allocates 1024 MB and a 60 s max duration to the function.

On Vercel, files under `api/` with a `.py` extension are automatically deployed as Python serverless functions when `requirements.txt` is present. No extra wiring is required for a same-project deployment.

> **Note on bundle size:** Prophet and its compiled dependencies are large. If the Vercel build exceeds the function size limit on the Hobby tier, comment out `prophet`/`xgboost` in `requirements.txt` — the endpoint gracefully falls back to a pure-Python linear forecast, and the app still works end-to-end.

---

## Deploying to Vercel

1. **Push this repo to GitHub** (already done if you cloned from your private repo).
2. In the [Vercel dashboard](https://vercel.com/new), click **Add New → Project** and import the `datanaid-web` repository.
3. Vercel auto-detects Next.js — no build settings changes needed.
4. **Add a Blob store:** in the project, go to **Storage → Create → Blob**. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically. (Or add it manually under **Settings → Environment Variables**.)
5. *(Optional)* Add `OPENAI_API_KEY` (and `OPENAI_MODEL`) to enable LLM insight phrasing.
6. *(Optional)* If you host the Python function separately, add `PYTHON_ML_URL`. For a standard single-project deploy, the Python function deploys automatically alongside the app.
7. Click **Deploy**.

After the first deploy, every push to the connected branch triggers an automatic redeploy.

---

## Design Notes

- **Brand:** Emerald/teal accent on warm neutral surfaces, full dark mode via `next-themes`.
- **Typography:** General Sans (display) + Satoshi (body), loaded from the Fontshare CDN.
- **Accessibility:** Semantic HTML, keyboard-navigable controls, WCAG-AA contrast, visible focus states.
- **Print:** A dedicated print stylesheet in `globals.css` renders the Impact Report cleanly to PDF (hides the app chrome, forces ink-friendly colors, avoids breaking charts across pages).

---

## License

Private project. All rights reserved.
