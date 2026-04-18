/* =============================================
   EARTHLENS AI — ECOVISION FEATURE
   Image analysis + live camera capture
   ============================================= */

const EcoVision = (() => {
  let currentImageBase64 = null;
  let currentMimeType    = null;
  let currentMode        = 'eco';
  let analysisCount      = parseInt(localStorage.getItem('earthlens_analyses') || '0', 10);

  const PROMPTS = {
    eco: `You are an expert environmental scientist and ecologist. Analyze this image comprehensively from an environmental perspective.

Return your analysis as a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "score": <integer 0-100, where 100 is pristine/excellent environmental health>,
  "summary": "<2-3 sentence overview of what you see and its environmental context>",
  "findings": [
    "<key environmental finding 1>",
    "<key environmental finding 2>",
    "<key environmental finding 3>"
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ],
  "tags": ["<detected element 1>", "<detected element 2>", "<detected element 3>", "<detected element 4>", "<detected element 5>"]
}`,

    bio: `You are a biodiversity expert and conservation biologist. Analyze this image for biodiversity and ecosystem health.

Return your analysis as a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "score": <integer 0-100, where 100 is extremely biodiverse/thriving ecosystem>,
  "summary": "<2-3 sentence biodiversity assessment of this image>",
  "findings": [
    "<biodiversity finding 1: species/ecosystem identified>",
    "<biodiversity finding 2: habitat quality>",
    "<biodiversity finding 3: threats or positives>"
  ],
  "recommendations": [
    "<conservation action 1>",
    "<conservation action 2>",
    "<conservation action 3>"
  ],
  "tags": ["<species or habitat tag 1>", "<species or habitat tag 2>", "<species or habitat tag 3>", "<species or habitat tag 4>", "<species or habitat tag 5>"]
}`,

    carbon: `You are a sustainability expert and carbon footprint analyst. Analyze this image from a sustainability and carbon perspective.

Return your analysis as a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "score": <integer 0-100, where 100 is fully sustainable/zero carbon>,
  "summary": "<2-3 sentence sustainability assessment of what you see in this image>",
  "findings": [
    "<sustainability finding 1: what has high or low carbon impact>",
    "<sustainability finding 2: materials/infrastructure observed>",
    "<sustainability finding 3: estimated lifecycle impact>"
  ],
  "recommendations": [
    "<sustainability recommendation 1>",
    "<sustainability recommendation 2>",
    "<sustainability recommendation 3>"
  ],
  "tags": ["<sustainability tag 1>", "<sustainability tag 2>", "<sustainability tag 3>", "<sustainability tag 4>", "<sustainability tag 5>"]
}`
  };

  const GRADE_MAP = [
    { min: 90, grade: '🌟 Excellent', desc: 'Outstanding environmental health — a model ecosystem.' },
    { min: 75, grade: '✅ Good', desc: 'Healthy environment with minor areas to improve.' },
    { min: 55, grade: '⚠️ Moderate', desc: 'Some environmental concerns present, action recommended.' },
    { min: 35, grade: '🔴 Poor', desc: 'Significant environmental issues detected.' },
    { min:  0, grade: '🚨 Critical', desc: 'Severe environmental degradation or risk detected.' }
  ];

  function getGrade(score) {
    return GRADE_MAP.find(g => score >= g.min) || GRADE_MAP[GRADE_MAP.length - 1];
  }

  function getScoreColor(score) {
    if (score >= 75) return '#22c55e';
    if (score >= 55) return '#f59e0b';
    if (score >= 35) return '#f97316';
    return '#f87171';
  }

  async function analyzeImage() {
    if (!currentImageBase64) return;

    // UI: show loading
    document.getElementById('resultsPlaceholder').style.display = 'none';
    document.getElementById('resultsContent').style.display     = 'none';
    document.getElementById('resultsLoading').style.display     = 'flex';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('analyzeBtnText').textContent = 'Analyzing...';

    // Animate steps
    let step = 0;
    const stepEls = ['step1','step2','step3'].map(id => document.getElementById(id));
    stepEls.forEach(el => el.classList.remove('active'));
    stepEls[0].classList.add('active');

    const stepInterval = setInterval(() => {
      step = Math.min(step + 1, stepEls.length - 1);
      stepEls.forEach(el => el.classList.remove('active'));
      stepEls[step].classList.add('active');
    }, 2200);

    try {
      const raw = await GeminiAPI.generateWithImage(
        currentImageBase64,
        currentMimeType,
        PROMPTS[currentMode]
      );

      clearInterval(stepInterval);

      // Parse JSON — handle potential markdown wrapping
      let data;
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        data = JSON.parse(cleaned);
      } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
        else throw new Error('Could not parse Gemini response as JSON');
      }

      renderResults(data);
      analysisCount++;
      localStorage.setItem('earthlens_analyses', analysisCount);
      const statEl = document.getElementById('stat-analyses');
      if (statEl) animateNumber(statEl, analysisCount, 800);

    } catch (err) {
      clearInterval(stepInterval);
      showToast(`Analysis failed: ${err.message}`, 'error');
      document.getElementById('resultsPlaceholder').style.display = 'flex';
      document.getElementById('resultsLoading').style.display     = 'none';
    } finally {
      document.getElementById('analyzeBtn').disabled = false;
      document.getElementById('analyzeBtnText').textContent = 'Analyze with Gemini';
    }
  }

  function renderResults(data) {
    document.getElementById('resultsLoading').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'flex';

    const score = Math.max(0, Math.min(100, parseInt(data.score, 10) || 50));
    const grade = getGrade(score);
    const color = getScoreColor(score);

    // Score ring
    const circumference = 314;
    const offset = circumference - (score / 100) * circumference;
    const ring = document.getElementById('ringProgress');
    ring.style.strokeDashoffset = circumference;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 50);

    animateNumber(document.getElementById('scoreNumber'), score, 1000);
    document.getElementById('scoreGrade').textContent = grade.grade;
    document.getElementById('scoreGrade').style.color = color;
    document.getElementById('scoreDescription').textContent = grade.desc;
    document.getElementById('resultSummary').textContent = data.summary || '—';

    // Findings
    const findList = document.getElementById('findingsList');
    findList.innerHTML = '';
    (data.findings || []).forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      findList.appendChild(li);
    });

    // Actions
    const actList = document.getElementById('actionsList');
    actList.innerHTML = '';
    (data.recommendations || []).forEach(a => {
      const li = document.createElement('li');
      li.textContent = a;
      actList.appendChild(li);
    });

    // Tags
    const tagsCont = document.getElementById('tagsList');
    tagsCont.innerHTML = '';
    (data.tags || []).forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsCont.appendChild(span);
    });

    injectRingGradient(color);
    showToast('Analysis complete! 🌿', 'success');
  }

  function injectRingGradient(endColor) {
    let defs = document.getElementById('ringGradDefs');
    if (!defs) {
      const svg = document.getElementById('scoreRingSvg');
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.id = 'ringGradDefs';
      svg.prepend(defs);
    }
    defs.innerHTML = `
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22c55e"/>
        <stop offset="100%" stop-color="${endColor}"/>
      </linearGradient>`;
  }

  function loadImageFromFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const [, base64] = dataUrl.split(',');
      currentImageBase64 = base64;
      currentMimeType = file.type;
      showImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function showImagePreview(src) {
    document.getElementById('imagePreview').src = src;
    document.getElementById('uploadZone').style.display            = 'none';
    document.getElementById('imagePreviewContainer').style.display = 'block';
    document.getElementById('analyzeBtn').disabled = false;
  }

  function resetUpload() {
    currentImageBase64 = null;
    currentMimeType    = null;
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('uploadZone').style.display            = 'flex';
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('fileInput').value = '';
    document.getElementById('resultsContent').style.display     = 'none';
    document.getElementById('resultsPlaceholder').style.display = 'flex';
    document.getElementById('resultsLoading').style.display     = 'none';
  }

  async function loadExampleImage(type) {
    const EXAMPLES = {
      forest:  { url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800', mime: 'image/jpeg' },
      ocean:   { url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800', mime: 'image/jpeg' },
      city:    { url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800', mime: 'image/jpeg' },
      factory: { url: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800', mime: 'image/jpeg' }
    };
    const ex = EXAMPLES[type];
    if (!ex) return;

    try {
      showToast('Loading example image...', 'info');
      const resp = await fetch(ex.url);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const [, base64] = e.target.result.split(',');
        currentImageBase64 = base64;
        currentMimeType    = blob.type || ex.mime;
        showImagePreview(e.target.result);
        showToast('Example loaded! Click Analyze to continue.', 'success');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      showToast('Could not load example (CORS). Please upload or use camera.', 'error');
    }
  }

  /* =============================================
     CAMERA FEATURE
     Live camera feed → snap → analyze
     ============================================= */
  function initCamera() {
    let stream      = null;
    let facingMode  = 'environment'; // rear camera by default (for field use)

    const cameraModal   = document.getElementById('cameraModal');
    const cameraFeed    = document.getElementById('cameraFeed');
    const cameraCanvas  = document.getElementById('cameraCanvas');
    const openCameraBtn = document.getElementById('openCameraBtn');
    const snapBtn       = document.getElementById('cameraSnapBtn');
    const flipBtn       = document.getElementById('cameraFlipBtn');
    const closeBtn      = document.getElementById('cameraCloseBtn');

    if (!cameraModal) return; // HTML not present

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width:  { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        cameraFeed.srcObject = stream;
        cameraModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      } catch (err) {
        console.warn('getUserMedia failed:', err);
        // Fallback: trigger native camera via <input capture>
        const input = document.createElement('input');
        input.type    = 'file';
        input.accept  = 'image/*';
        input.capture = 'environment';
        input.addEventListener('change', (e) => loadImageFromFile(e.target.files[0]));
        input.click();
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      cameraFeed.srcObject = null;
      cameraModal.classList.remove('open');
      document.body.style.overflow = '';
    }

    function capturePhoto() {
      if (!stream) return;
      const w = cameraFeed.videoWidth  || 1280;
      const h = cameraFeed.videoHeight || 720;
      cameraCanvas.width  = w;
      cameraCanvas.height = h;
      cameraCanvas.getContext('2d').drawImage(cameraFeed, 0, 0, w, h);

      cameraCanvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const [, base64] = e.target.result.split(',');
          currentImageBase64 = base64;
          currentMimeType    = 'image/jpeg';
          showImagePreview(e.target.result);
          stopCamera();
          showToast('📸 Photo captured! Click Analyze to get your report.', 'success');
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.92);
    }

    async function flipCamera() {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
          });
          cameraFeed.srcObject = stream;
        } catch (err) {
          showToast('Could not switch camera', 'error');
          facingMode = facingMode === 'user' ? 'environment' : 'user'; // revert
        }
      }
    }

    // Events
    openCameraBtn.addEventListener('click', (e) => { e.stopPropagation(); startCamera(); });
    snapBtn.addEventListener('click',        capturePhoto);
    closeBtn.addEventListener('click',       stopCamera);
    flipBtn.addEventListener('click',        flipCamera);

    // Close on backdrop click
    cameraModal.addEventListener('click', (e) => {
      if (e.target === cameraModal) stopCamera();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cameraModal.classList.contains('open')) stopCamera();
    });
  }

  function init() {
    const uploadZone   = document.getElementById('uploadZone');
    const fileInput    = document.getElementById('fileInput');
    const analyzeBtn   = document.getElementById('analyzeBtn');
    const changeBtn    = document.getElementById('changeImageBtn');
    const shareBtn     = document.getElementById('shareResultBtn');
    const modeChips    = document.querySelectorAll('.mode-chip');
    const exampleChips = document.querySelectorAll('.example-chip');

    // Set initial stat
    const statEl = document.getElementById('stat-analyses');
    if (statEl) statEl.textContent = analysisCount;

    // Click to upload
    uploadZone.addEventListener('click', (e) => {
      // Prevent bubbling loop if clicking fileInput directly
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', (e) => loadImageFromFile(e.target.files[0]));

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      loadImageFromFile(e.dataTransfer.files[0]);
    });

    // Change image
    changeBtn.addEventListener('click', resetUpload);

    // Analyze
    analyzeBtn.addEventListener('click', analyzeImage);

    // Mode chips
    modeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        modeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentMode = chip.dataset.mode;
      });
    });

    // Example chips
    exampleChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        loadExampleImage(chip.dataset.example);
      });
    });

    // Share
    shareBtn.addEventListener('click', () => {
      const score = document.getElementById('scoreNumber').textContent;
      const grade = document.getElementById('scoreGrade').textContent;
      const summary = document.getElementById('resultSummary').textContent;
      
      const findingsNodes = document.getElementById('findingsList').querySelectorAll('li');
      let findings = '';
      findingsNodes.forEach(node => { findings += `\n- ${node.textContent}`; });
      
      const actNodes = document.getElementById('actionsList').querySelectorAll('li');
      let actions = '';
      actNodes.forEach(node => { actions += `\n- ${node.textContent}`; });

      const text = `🌍 EarthLens AI Report 🌍\n\nEco Score: ${score}/100 (${grade})\n\nSummary:\n${summary}\n\nKey Findings:${findings}\n\nRecommended Actions:${actions}\n\n#EarthDay2026 #EarthLensAI`;
      
      if (navigator.share) {
        navigator.share({ title: 'EarthLens AI Report', text: text, url: window.location.href }).catch((err) => {
          if (err.name !== 'AbortError') {
            navigator.clipboard.writeText(text).then(() => showToast('Full report copied to clipboard!', 'success'));
          }
        });
      } else {
        navigator.clipboard.writeText(text).then(() => showToast('Full report copied to clipboard!', 'success'));
      }
    });

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', generatePdfReport);
    }

    // Camera
    initCamera();
  }

  /* =============================================
     PDF REPORT GENERATOR
     Opens the full report in a new browser tab
     and uses window.print() (Save as PDF).
     Bypasses html2canvas entirely — zero blank-
     page issues, works 100% of the time.
     ============================================= */
  function generatePdfReport() {
    const resultsContent = document.getElementById('resultsContent');
    if (!resultsContent || resultsContent.style.display === 'none') {
      showToast('No report available to save as PDF.', 'info');
      return;
    }

    showToast('Building report…', 'info');

    const score   = parseInt(document.getElementById('scoreNumber').textContent, 10) || 0;
    const grade   = document.getElementById('scoreGrade').textContent  || '—';
    const desc    = document.getElementById('scoreDescription').textContent || '';
    const summary = document.getElementById('resultSummary').textContent || '—';

    const findings = [...document.querySelectorAll('#findingsList li')].map(li => li.textContent);
    const actions  = [...document.querySelectorAll('#actionsList  li')].map(li => li.textContent);
    const tags     = [...document.querySelectorAll('#tagsList .tag')].map(t  => t.textContent);

    const color = getScoreColor(score);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (score / 100) * circumference;

    const imgSrc = currentImageBase64 ? `data:${currentMimeType};base64,${currentImageBase64}` : null;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const imgBlock = imgSrc
      ? `<div style="text-align:center;margin-bottom:24px;"><img src="${imgSrc}" style="max-width:100%;max-height:260px;border-radius:12px;border:2px solid #bbf7d0;object-fit:cover;display:block;margin:0 auto;" alt="Analysed image"/></div>`
      : '';

    const findingsHTML = findings.length
      ? findings.map((f, i) => `<div style="display:flex;align-items:flex-start;gap:12px;border-radius:8px;padding:12px 14px;border-left:3px solid #22c55e;margin-bottom:8px;background:#f0fdf4;"><span style="color:#22c55e;font-weight:700;font-size:13px;min-width:20px;flex-shrink:0;">${i+1}.</span><span style="color:#1e3a2e;font-size:13.5px;line-height:1.5;">${f}</span></div>`).join('')
      : '<p style="color:#9ca3af;font-style:italic;">No findings available.</p>';

    const actionsHTML = actions.length
      ? actions.map((a, i) => `<div style="display:flex;align-items:flex-start;gap:12px;border-radius:8px;padding:12px 14px;border-left:3px solid #f59e0b;margin-bottom:8px;background:#fffbeb;"><span style="color:#f59e0b;font-weight:700;font-size:13px;min-width:20px;flex-shrink:0;">${i+1}.</span><span style="color:#1e3a2e;font-size:13.5px;line-height:1.5;">${a}</span></div>`).join('')
      : '<p style="color:#9ca3af;font-style:italic;">No recommendations available.</p>';

    const tagsHTML = tags.length
      ? tags.map(t => `<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px;">${t}</span>`).join('')
      : '';

    // Open a new window and write the full report HTML directly into it.
    // Uses the browser's native print dialog (Ctrl+P / Save as PDF).
    // This CANNOT produce a blank page — it's just HTML in a new tab.
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast('Allow pop-ups for this site to generate the PDF.', 'error');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>EarthLens AI Report — ${dateStr}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;background:#fff;padding:40px 48px;max-width:816px;margin:0 auto;}
    @media print{body{padding:20px 32px;}.no-print{display:none!important;}@page{margin:0.5in;size:letter portrait;}}
    h2{font-size:15px;font-weight:700;color:#111827;margin-bottom:14px;}
    .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #22c55e;padding-bottom:16px;margin-bottom:28px;}
    .logo{font-size:22px;font-weight:800;letter-spacing:-.5px;color:#111827;} .logo span{color:#22c55e;}
    .sub{font-size:12px;color:#6b7280;margin-top:3px;}
    .dt{text-align:right;font-size:11.5px;color:#6b7280;}
    .sbox{display:flex;align-items:center;gap:28px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:20px 24px;border:1px solid #bbf7d0;margin-bottom:22px;}
    .sumbox{background:#f9fafb;border-radius:10px;padding:16px;border:1px solid #e5e7eb;font-size:13.5px;color:#374151;line-height:1.7;margin-bottom:22px;}
    .sec{margin-bottom:22px;}
    .ftr{border-top:1px solid #e5e7eb;margin-top:28px;padding-top:14px;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;}
    .pbtn{display:block;margin:0 auto 28px;padding:12px 36px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.3px;}
    .pbtn:hover{background:#16a34a;}
  </style>
</head>
<body>
  <button class="pbtn no-print" onclick="window.print()">⬇ Save as PDF / Print</button>
  <div class="hdr">
    <div><div class="logo">🌍 EarthLens <span>AI</span> Report</div><div class="sub">Environmental Intelligence — Powered by Google Gemini</div></div>
    <div class="dt"><div>${dateStr}</div><div>${timeStr}</div></div>
  </div>
  ${imgBlock}
  <div class="sbox">
    <div style="flex-shrink:0;">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#d1fae5" stroke-width="10"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="${color}" stroke-width="10"
                stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"
                stroke-linecap="round" transform="rotate(-90 60 60)"/>
        <text x="60" y="57" text-anchor="middle" font-size="26" font-weight="800" fill="#111827" font-family="Segoe UI,Arial,sans-serif">${score}</text>
        <text x="60" y="73" text-anchor="middle" font-size="10" fill="#6b7280" font-family="Segoe UI,Arial,sans-serif">ECO SCORE</text>
      </svg>
    </div>
    <div>
      <div style="font-size:22px;font-weight:800;color:${color};margin-bottom:4px;">${grade}</div>
      <div style="font-size:13.5px;color:#374151;max-width:360px;">${desc}</div>
    </div>
  </div>
  <div class="sec"><h2>📋 Summary</h2><div class="sumbox">${summary}</div></div>
  <div class="sec"><h2>🔍 Key Findings</h2>${findingsHTML}</div>
  <div class="sec"><h2>💡 Recommended Actions</h2>${actionsHTML}</div>
  ${tagsHTML ? `<div class="sec"><h2>🏷️ Detected Elements</h2><div>${tagsHTML}</div></div>` : ''}
  <div class="ftr"><span>Generated by EarthLens AI</span><span>Built with 💚 for Earth Day 2026</span></div>
</body>
</html>`);
    win.document.close();
    showToast('Report ready — click "Save as PDF" in the new tab! 📄', 'success');
  }

  return { init };
})();
