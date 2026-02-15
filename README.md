# 💰 SpendLens — Budget Analyzer

A modern, reactive spending dashboard hosted on **GitHub Pages**. Analyse your expenses with interactive charts, advanced filters, and real-time insights.

## ✨ Features

- **Google Sheets integration** — connect a published sheet for auto-refresh
- **CSV paste & file upload** — flexible data input
- **6 interactive charts** with chart-type switchers (line ↔ bar, donut ↔ pie, etc.)
- **Advanced filtering** — year, month, category (multi-select), keyword search in notes
- **KPI dashboard** — total spend, transactions, average, top category, highest expense
- **Sortable transaction table** with pagination
- **Light & Dark mode** with smooth transitions
- **Fully responsive** — works on mobile, tablet, and desktop
- **Zero backend** — everything runs in the browser
- **Data persisted** in `localStorage`

## 📋 CSV Format

Your data should follow this format:

| Date | Amount | Category | Note |
|---|---|---|---|
| 2026-01-15 | 450 | Grocery | Weekly vegetables |
| 2026-01-16 | 1200 | Fuel | Car petrol |

Supported date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`

## 🚀 Deployment

### GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Build and deployment**, select **GitHub Actions**
4. The included workflow (`.github/workflows/deploy.yml`) will auto-deploy on every push to `main`

### Local Development

Simply open `index.html` in a browser — no build step required. Or use a local server:

```bash
npx serve .
```

## 🔗 Google Sheets Setup

1. Open your Google Sheet with spending data
2. Go to **File → Share → Publish to web**
3. Select **Comma-separated values (.csv)** format
4. Click **Publish** and copy the link
5. Paste the link in SpendLens → **Manage Data → Google Sheets**

## 📁 Project Structure

```
├── index.html              # Main app page
├── css/styles.css           # Design system + themes
├── js/
│   ├── theme.js             # Light/dark mode
│   ├── data.js              # CSV parsing + Google Sheets
│   ├── filters.js           # Filter engine
│   ├── charts.js            # Chart.js visualisations
│   └── app.js               # Main orchestration
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages deployment
├── .nojekyll                # Bypass Jekyll on Pages
└── README.md
```

## License

MIT
