/* =============================================
   EARTHLENS AI — BACKEND PROXY SERVER
   Runs on Google Cloud Run. Reads GEMINI_API_KEY
   from environment — users never see the key.
   ============================================= */

'use strict';

const express = require('express');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta/models';
const FLASH_MODEL = 'gemini-3-flash-preview';

/* ---- Startup validation ---- */
if (!GEMINI_KEY) {
  console.error('❌  GEMINI_API_KEY environment variable is not set. Exiting.');
  process.exit(1);
}

/* ---- Body parser (25 MB for base64 images) ---- */
app.use(express.json({ limit: '25mb' }));

/* ---- Simple in-memory rate limiter: 30 req / min per IP ---- */
const rateLimitMap = new Map();
const RATE_WINDOW  = 60_000; // 1 minute
const RATE_LIMIT   = 30;

function rateLimit(req, res, next) {
  const ip  = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }
  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute before trying again.'
    });
  }
  entry.count++;
  next();
}

// Clean up stale entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.start > RATE_WINDOW) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW);

/* ---- Apply rate limit to all /api/ routes ---- */
app.use('/api', rateLimit);

/* ================================================
   API ROUTE: POST /api/generate
   Text-only generation (non-streaming)
   Body: { prompt, systemInstruction?, temperature?, maxTokens? }
   ================================================ */
app.post('/api/generate', async (req, res) => {
  try {
    const {
      prompt,
      systemInstruction = '',
      temperature = 0.7,
      maxTokens   = 1024
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };
    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const geminiRes = await fetch(
      `${BASE_URL}/${FLASH_MODEL}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    console.error('/api/generate error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ================================================
   API ROUTE: POST /api/analyze-image
   Multimodal (image + text) generation
   Body: { base64Image, mimeType, prompt, temperature?, maxTokens? }
   ================================================ */
app.post('/api/analyze-image', async (req, res) => {
  try {
    const {
      base64Image,
      mimeType,
      prompt,
      temperature = 0.6,
      maxTokens   = 1500
    } = req.body;

    if (!base64Image || !mimeType || !prompt) {
      return res.status(400).json({ error: 'base64Image, mimeType, and prompt are required' });
    }

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt }
        ]
      }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };

    const geminiRes = await fetch(
      `${BASE_URL}/${FLASH_MODEL}:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err.error?.message || 'Vision API error' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    console.error('/api/analyze-image error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ================================================
   API ROUTE: POST /api/stream
   Streaming text generation — proxies SSE from Gemini
   Body: { prompt, systemInstruction?, temperature?, maxTokens? }
   ================================================ */
app.post('/api/stream', async (req, res) => {
  try {
    const {
      prompt,
      systemInstruction = '',
      temperature = 0.8,
      maxTokens   = 1024
    } = req.body;

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };
    if (systemInstruction) {
      body.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const geminiRes = await fetch(
      `${BASE_URL}/${FLASH_MODEL}:streamGenerateContent?key=${GEMINI_KEY}&alt=sse`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err.error?.message || 'Stream error' });
    }

    // Set SSE response headers
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if used

    // Pipe the SSE stream from Gemini → client
    const reader  = geminiRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();

  } catch (err) {
    console.error('/api/stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

/* ================================================
   STATIC FILE SERVING
   Serves all frontend assets (HTML, CSS, JS, icons)
   API routes above take priority over static files
   ================================================ */
app.use(express.static(path.join(__dirname), {
  // Don't expose server source files
  dotfiles: 'deny',
  index: 'index.html'
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ---- Start ---- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌍 EarthLens AI is running on port ${PORT}`);
  console.log(`🔑 Gemini API key loaded: ${GEMINI_KEY.slice(0, 8)}...`);
});
