/* =============================================
   EARTHLENS AI — GEMINI API CLIENT
   Calls the /api/* backend proxy instead of
   Gemini directly. The actual API key lives
   server-side in the GEMINI_API_KEY env var.
   ============================================= */

const GeminiAPI = (() => {
  /* ---- Text generation (non-streaming) ---- */
  async function generateText(prompt, systemInstruction = '', opts = {}) {
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        temperature: opts.temperature ?? 0.7,
        maxTokens:   opts.maxTokens   ?? 1024
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    return data.text || '';
  }

  /* ---- Image + text (vision) generation ---- */
  async function generateWithImage(base64Image, mimeType, prompt, opts = {}) {
    const resp = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Image,
        mimeType,
        prompt,
        temperature: opts.temperature ?? 0.6,
        maxTokens:   opts.maxTokens   ?? 1500
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const data = await resp.json();
    return data.text || '';
  }

  /* ---- Streaming text generation ---- */
  async function streamText(prompt, systemInstruction, onChunk, opts = {}) {
    const resp = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        temperature: opts.temperature ?? 0.8,
        maxTokens:   opts.maxTokens   ?? 1024
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${resp.status}`);
    }

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk  = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunk) onChunk(chunk);
        } catch (_) { /* skip malformed lines */ }
      }
    }
  }

  return { generateText, generateWithImage, streamText };
})();
