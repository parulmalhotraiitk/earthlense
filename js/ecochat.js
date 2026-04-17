/* =============================================
   EARTHLENS AI — ECOCHAT FEATURE
   ============================================= */

const EcoChat = (() => {
  const SYSTEM_PROMPT = `You are EcoChat, a knowledgeable and passionate AI companion on EarthLens AI — an Earth Day platform built with Google Gemini.

Your role:
- Answer questions about climate science, biodiversity, sustainability, ecosystems, renewable energy, conservation, and environmental policy
- Be factual, accurate, and cite relevant data where helpful (e.g., IPCC reports, WWF, NASA)
- Be inspiring and action-oriented — always try to end with something hopeful or actionable
- Keep responses concise but substantive (150-300 words unless the user asks for detail)
- Use appropriate emojis sparingly to make responses engaging
- Be respectful, inclusive, and avoid political bias; focus on science and evidence

Never roleplay as anything other than EcoChat. If asked about non-environmental topics, gently redirect to Earth-related subjects.

Today is Earth Day 2026. 🌍`;

  const history = [];

  function addMessage(role, text, isStreaming = false) {
    const chatWindow = document.getElementById('chatWindow');

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role === 'user' ? 'user' : 'ai'}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🌍';

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    if (isStreaming) {
      bubble.id = 'streaming-bubble';
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    return bubble;
  }

  function addTypingIndicator() {
    const chatWindow = document.getElementById('chatWindow');
    const div = document.createElement('div');
    div.className = 'chat-message ai';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="chat-avatar">🌍</div>
      <div class="chat-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function formatResponse(text) {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  async function sendMessage(userText) {
    if (!userText.trim()) return;

    // Hide suggestions after first message
    document.getElementById('chatSuggestions').style.display = 'none';

    const chatInput  = document.getElementById('chatInput');
    const sendBtn    = document.getElementById('chatSendBtn');

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Add user message
    const userBubble = addMessage('user', userText);
    userBubble.textContent = userText;

    // Add to history
    history.push({ role: 'user', text: userText });

    // Show typing
    const typingEl = addTypingIndicator();

    try {
      // Build conversation context
      // history already includes current user message (pushed above)
      let prompt = '';
      if (history.length > 1) {
        // Include up to last 8 turns (4 exchanges) for context
        prompt = history
          .slice(-8)
          .map(h => `${h.role === 'user' ? 'User' : 'EcoChat'}: ${h.text}`)
          .join('\n\n');
      } else {
        // First message — send plain
        prompt = userText;
      }

      let fullResponse = '';

      removeTypingIndicator();
      const aiBubble = addMessage('ai', '', true);

      try {
        // Try streaming first
        await GeminiAPI.streamText(prompt, SYSTEM_PROMPT, (chunk) => {
          fullResponse += chunk;
          aiBubble.innerHTML = formatResponse(fullResponse);
          const chatWindow = document.getElementById('chatWindow');
          chatWindow.scrollTop = chatWindow.scrollHeight;
        });
      } catch (streamErr) {
        // Fallback to non-streaming
        fullResponse = await GeminiAPI.generateText(prompt, SYSTEM_PROMPT);
        aiBubble.innerHTML = formatResponse(fullResponse);
      }

      aiBubble.id = '';
      history.push({ role: 'assistant', text: fullResponse });

    } catch (err) {
      removeTypingIndicator();
      const errBubble = addMessage('ai', '');
      errBubble.innerHTML = `<span style="color: var(--col-red)">Sorry, I couldn't connect to Gemini. Please check your API key and try again.</span>`;
      showToast(`Chat error: ${err.message}`, 'error');
    } finally {
      sendBtn.disabled = false;
      // chatInput.focus(); // Removed to prevent keyboard popping up on mobile
    }
  }

  function init() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn   = document.getElementById('chatSendBtn');
    const suggestions = document.querySelectorAll('.suggestion-chip');

    // Send on Enter (Shift+Enter for newline)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
      }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

    // Suggestion chips
    suggestions.forEach(chip => {
      chip.addEventListener('click', () => {
        sendMessage(chip.dataset.msg);
      });
    });
  }

  return { init };
})();
