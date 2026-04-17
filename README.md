# 🌍 EarthLens AI

> An intelligent, multimodal environmental analysis platform powered by Google Gemini.

![EarthLens AI Banner](./icons/icon-512.png) 
*Link to Live Demo: [EarthLens AI on Cloud Run](https://earthlens-1006999380256.us-central1.run.app)*

## 🚀 Overview

EarthLens AI brings the complex world of climate science down to a personal, actionable level by leveraging the powerful multimodal capabilities of the **Google Gemini API** (Gemini 3 Flash). Designed to act as a pocket environmental scientist, the application allows users to assess ecological health, track their personal footprint, and learn about sustainability effortlessly.

## ✨ Key Features

- 📸 **EcoVision Image Analysis:** Upload or snap live pictures of your surroundings (rivers, urban areas, forests) and let Gemini evaluate the *Eco Score*, *Biodiversity*, and *Sustainable Lifecycle* of the elements in the frame.
- 💬 **EcoChat Sustainability Assistant:** A conversational agent infused with climate knowledge, capable of intelligently contextualizing your uploaded photos and fielding questions about sustainable living.
- 👣 **Carbon Compass:** Calculate your mobility and lifestyle impacts with an adaptive footprint calculator that offers targeted, AI-driven recommendations.
- 🌍 **Earth Pulse & Reporting:** Get instant overviews of global climate metrics and generate/download crisp native PDF Ecological Reports to share across social media.
- 📱 **Progressive Web App (PWA):** Fully installable on iOS and Android devices directly from the browser for native-like performance.

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Custom Responsive Properties, CSS Grid, Glassmorphism UI)
- **Backend:** Node.js, Express.js CORS Proxy
- **AI Integration:** Google Gemini API (`gemini-3-flash-preview`) via the native REST interface
- **Deployment:** Containerized via Docker and deployed serverless on **Google Cloud Run**
- **Libraries:** html2pdf.js (Client-side report exports)

## 🔧 Local Development 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/parulmalhotraiitk/earthlense.git
   cd earthlense
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up your environment variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
4. **Start the local Node proxy:**
   ```bash
   npm run dev
   ```
5. **Open your browser:** Navigate to `http://localhost:3000`

---
*Built with 💚 for the planet. Empowered by Google Gemini.*
