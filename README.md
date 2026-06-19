<div align="center">

# Datanaid

### Turn nonprofit data into impact.

From spreadsheets to stories — Datanaid is an open-source analytics product for mission-driven organizations that turns raw nonprofit CSVs and spreadsheets into grounded insights, board-ready visualizations, and a polished impact report.

Built with Next.js 15 · TypeScript · Tailwind · shadcn/ui · Recharts · Vercel Blob

</div>

---

## Overview

Datanaid is a self-serve analytics product for mission-driven organizations. Upload a dataset (donations, volunteer hours, clients served, attendance, expenses, and more) and Datanaid automatically:

- **Profiles** every column — types, missing values, duplicates, outliers, and a data-quality score (A–F).
- **Analyzes** trends, growth, rolling averages, category breakdowns, and correlations.
- **Models** the future with a built-in linear forecast (confidence intervals included), plus optional heavy forecasting via a separately hosted Python service.
- **Explains** findings with a **hybrid insight engine** — every insight is grounded in computed statistics. An optional LLM only *rephrases* those grounded facts into polished prose; it never invents new claims.
- **Exports** a complete Impact Report as Markdown or print-to-PDF.

Every chart ships with three plain-language annotations: **What this means**, **Why it matters**, and a **Recommended action** — so program staff and board members can act without a data-science background.

> Datanaid is open source under the MIT License and designed to be production-ready for real nonprofit workflows.

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

## Open Source and Product Use

Datanaid is both an open-source project and a deployable product.

- **Open-source core:** Use, modify, fork, and self-host the platform.
- **MIT-licensed:** Suitable for nonprofit, academic, internal, and commercial use.
- **Product-ready:** Designed for real uploads, repeatable analysis workflows, and exportable reporting.
- **Extensible architecture:** Keep the default TypeScript analytics engine, or connect external forecasting and AI services as needed.

The MIT License allows redistribution, modification, sublicensing, and commercial use, provided the copyright notice and license text are included with substantial portions of the software.[web:5][web:15]

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Route Handlers)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives), General Sans / Satoshi typography
- **Charts:** Recharts
- **Forms & validation:** React Hook Form + Zod
- **Data parsing:** PapaParse (CSV), SheetJS / `xlsx` (Excel)
- **Analytics & ML:** Custom TypeScript engine in `lib/analytics` (profiling, trends, K-Means, anomaly detection, linear forecasting)
- **Forecast service (optional):** Python serverless function (`api/forecast.py`) with a deploy-safe pure-Python linear fallback
- **Persistence:** Vercel Blob
- **Deployment:** Vercel

---

## Project Structure

```text
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
│   ├── forecast.py            # Optional pure-Python forecast serverless fn
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
├── LICENSE
├── tailwind.config.ts
├── next.config.js
├── vercel.json                # Python function memory/duration config
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Local development

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure environment variables
cp .env.example .env.local

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
| `BLOB_READ_WRITE_TOKEN` | Required in production for persistence | Vercel Blob token for persisting uploaded datasets, generated reports, and anonymous usage events. Without it, analyses live only in the current session and usage events are written to server logs. |
| `GROQ_API_KEY` | Optional | Enables LLM **phrasing** of deterministic insights through Groq's OpenAI-compatible API. Without it, Datanaid uses deterministic templates. |
| `GROQ_PHRASING_MODEL` | Optional | Groq model used for insight phrasing only. Defaults to `llama-3.1-8b-instant`. |
| `GROQ_PHRASING_MAX_TOKENS` | Optional | Max output tokens per phrasing call. Defaults to `220`. |
| `PYTHON_ML_URL` | Optional | URL of a separately hosted Python forecasting service. When unset, the built-in TypeScript linear forecast is used. |

See [`.env.example`](./.env.example) for inline documentation.

---

## Use in Your Organization

Datanaid is designed to be easy to adopt in real nonprofit and mission-driven environments.

- Deploy it as-is for internal analytics and reporting.
- Customize branding, copy, and report templates for your organization.
- Extend the analytics engine with additional metrics, heuristics, or domain-specific logic.
- Connect external ML or forecasting services when lightweight built-in forecasting is not enough.

The MIT License permits commercial and internal use without requiring derivative products to be open sourced, which makes it a common choice for product-oriented open-source software.[web:13][web:16]

---

## Anonymous Usage Tracking

Datanaid is free to use and does not require accounts. To understand usage, each completed analysis records a small anonymous event:

- Anonymous browser visitor ID and session ID
- Analysis ID, timestamp, file extension, row count, and column count
- Counts for insights, trends, forecasts, and risks
- Hashed IP/user-agent metadata for coarse duplicate detection

Raw uploaded rows and cell values are never written to usage events. When `BLOB_READ_WRITE_TOKEN` is configured, events are saved under `usage-events/YYYY-MM-DD/<analysis-id>.json` in Vercel Blob. Without Blob, events are emitted to server logs as `datanaid_usage_event`.

---

## The Hybrid Insight Engine

Datanaid's insight engine is **deterministic-first**:

1. The TypeScript analytics layer computes every statistic, including trends, growth rates, outliers, quality issues, correlations, and forecasts.
2. Each insight is assembled as structured JSON grounded directly in those computed values.
3. If `GROQ_API_KEY` is set, the LLM receives **only** grounded facts and is asked to improve phrasing without adding new claims.

Example grounded insight object:

```json
{
  "title": "Monthly Donations Structural Trend",
  "type": "trend",
  "severity": "high",
  "confidence": "medium",
  "what_happened": "Monthly donations increased across the observed period with 67% directional consistency.",
  "evidence": "First period = $12,400; last period = $16,600; total change = 34%; median period change = 6.1%.",
  "what_contributed": "This classification is based on repeated period-to-period movement, not only first-versus-last change.",
  "potential_explanations": ["Campaign timing or seasonality may be associated with the pattern."],
  "requires_investigation": true,
  "why_it_matters": "A consistent trend is more decision-useful than a single-period change.",
  "recommended_action": "Document operational context before setting board-facing targets."
}
```

Result: polished prose with grounded evidence and no invented statistics.

---

## Python Forecast Function

The TypeScript engine ships a linear forecast with confidence intervals that works out of the box. Datanaid also includes a small Python serverless function with the same deploy-safe pure-Python linear fallback:

- **File:** `api/forecast.py`
- **Dependencies:** `api/requirements.txt` is intentionally empty for Vercel Hobby and free deployments.
- **Vercel config:** `vercel.json` allocates 1024 MB and a 60-second max duration to the function.

On Vercel, files under `api/` with a `.py` extension are automatically deployed as Python serverless functions when `requirements.txt` is present.

> **Note on bundle size:** Prophet, pandas, numpy, XGBoost, and scikit-learn exceeded Vercel's Python serverless storage limit in this project. Keep those out of `api/requirements.txt` for Vercel deployments. If you want heavier forecasting later, host it as a separate Python service and point `PYTHON_ML_URL` at that service.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), click **Add New → Project** and import the `datanaid-web` repository.
3. Vercel auto-detects Next.js, so no build setting changes are required.
4. Add a Blob store under **Storage → Create → Blob**. Vercel can inject `BLOB_READ_WRITE_TOKEN` automatically.
5. Optionally add `GROQ_API_KEY` and `GROQ_PHRASING_MODEL` to enable LLM phrasing.
6. Optionally add `PYTHON_ML_URL` if you host a separate heavier forecasting service.
7. Click **Deploy**.

After the first deploy, every push to the connected branch triggers an automatic redeploy.

---

## Design Notes

- **Brand:** Emerald/teal accent on warm neutral surfaces, full dark mode via `next-themes`
- **Typography:** General Sans (display) + Satoshi (body), loaded from the Fontshare CDN
- **Accessibility:** Semantic HTML, keyboard-navigable controls, WCAG-AA contrast, visible focus states
- **Print:** A dedicated print stylesheet in `globals.css` renders the Impact Report cleanly to PDF

---

## Contributing

Contributions are welcome. For meaningful changes, open an issue first to discuss the problem, proposed solution, or roadmap fit.

Suggested ways to contribute:

- Improve dataset profiling and quality heuristics
- Add new visualization types or richer export formats
- Expand anomaly detection or segmentation logic
- Improve report generation and narrative quality
- Strengthen accessibility, testing, and performance

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

The MIT License is OSI-approved and permits reuse, modification, redistribution, sublicensing, and sale, provided the copyright and permission notice are included.
