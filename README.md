# 🌍 EarthLens AI

> An intelligent, multimodal environmental analysis platform powered by Google Gemini.

![EarthLens AI Banner](./icons/icon-512.png)

**🔗 Live Demo:** [earthlens-1006999380256.us-central1.run.app](https://earthlens-1006999380256.us-central1.run.app)

---

## 🚀 Overview

EarthLens AI brings the complex world of climate science down to a personal, actionable level by leveraging the powerful multimodal capabilities of the **Google Gemini API**. Designed to act as a pocket environmental scientist, the application allows users to assess ecological health, track their personal footprint, and learn about sustainability effortlessly.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📸 **EcoVision** | Upload or snap live photos of any environment — rivers, forests, cities, factories — and get an instant AI-powered Eco Score, Key Findings, and Recommended Actions |
| 💬 **EcoChat** | A conversational climate assistant powered by Gemini that can answer any question about sustainability, biodiversity, or climate change |
| 👣 **Carbon Compass** | A 4-step lifestyle questionnaire that calculates your personal carbon footprint and generates a tailored Gemini action plan |
| 🌍 **Earth Pulse** | Live global climate indicators (CO₂ ppm, temperature anomaly, sea level rise) narrated by Gemini AI |
| 📄 **PDF Reports** | Generates a full, properly formatted environmental intelligence report (image + score ring + summary + findings + actions + tags) — no blank pages |
| 📱 **PWA Support** | Fully installable on iOS and Android directly from the browser for native-like offline performance |

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (CSS Grid, Glassmorphism, Custom Properties)
- **Backend:** Node.js + Express.js — secure API proxy (GEMINI_API_KEY never exposed to client)
- **AI Integration:** Google Gemini API (`gemini-3-flash-preview`) via native REST
- **Deployment:** Dockerized, deployed serverless on **Google Cloud Run**
- **Libraries:** `html2pdf.js` (client-side PDF generation)

---

## 🔒 Security Model

- **API key never leaves the server.** All Gemini calls go through a backend proxy (`server.js`). The key is set as a Cloud Run environment variable — it is never in any source file.
- **Rate limiting** is enforced server-side: 30 requests / minute per IP to prevent abuse.
- **`.env` is gitignored.** Use `.env.example` as a template — never commit real keys.
- **No credentials in frontend JS.** All `js/*.js` files talk to `/api/*` endpoints only.

---

## 🏗️ Architecture

```
Browser
  │
  ├─ GET  /               → index.html (static)
  ├─ POST /api/generate   → Gemini text generation (EcoChat, Earth Pulse)
  ├─ POST /api/analyze-image → Gemini vision (EcoVision)
  └─ POST /api/stream     → Gemini SSE streaming (EcoChat streaming)
                                    │
                              server.js (Express)
                                    │
                         GEMINI_API_KEY (env var only)
                                    │
                         Google Gemini API
```

---

## 🔧 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parulmalhotraiitk/earthlens.git
   cd earthlens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Gemini API key
   ```
   Your `.env` should look like:
   ```
   GEMINI_API_KEY=your_google_gemini_api_key_here
   PORT=8080
   ```

4. **Start the local server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:** Navigate to `http://localhost:8080`

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## 🐳 Docker / Cloud Run

```bash
# Build image
docker build -t earthlens .

# Run locally
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key earthlens

# Deploy to Cloud Run
gcloud run deploy earthlens \
  --source . \
  --region us-central1 \
  --set-env-vars GEMINI_API_KEY=your_key \
  --allow-unauthenticated
```

---

## 📄 PDF Report

Clicking **Save PDF** in EcoVision generates a clean, print-optimised report containing:
- 🌍 Branded header with timestamp
- 📷 The analysed image
- 🎯 Colour-coded Eco Score ring
- 📋 AI-generated summary
- 🔍 Key Findings (numbered)
- 💡 Recommended Actions (numbered)
- 🏷️ Detected element tags

The report is built as a standalone white-background HTML document in memory (bypassing dark-mode CSS) before conversion — ensuring the PDF is never blank.

---

*Built with 💚 for Earth Day 2026 · Powered by Google Gemini*
