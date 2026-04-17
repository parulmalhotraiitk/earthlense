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
    uploadZone.addEventListener('click', () => fileInput.click());
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
        navigator.share({ title: 'EarthLens AI Report', text: text }).catch(() => {
          navigator.clipboard.writeText(text).then(() => showToast('Full report copied to clipboard!', 'success'));
        });
      } else {
        navigator.clipboard.writeText(text).then(() => showToast('Full report copied to clipboard!', 'success'));
      }
    });

    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener('click', () => {
        const element = document.getElementById('resultsContent');
        if (!element || element.style.display === 'none') {
          showToast('No report available to save as PDF.', 'info');
          return;
        }
        showToast('Generating PDF...', 'info');
        const opt = {
          margin:       0.5,
          filename:     'EarthLens-AI-Report.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(() => showToast('PDF downloaded successfully!', 'success'));
      });
    }

    // Camera
    initCamera();
  }

  return { init };
})();
