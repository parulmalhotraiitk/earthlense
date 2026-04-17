/* =============================================
   EARTHLENS AI — CARBON COMPASS FEATURE
   ============================================= */

const CarbonCompass = (() => {
  let currentStep = 0;
  const totalSteps = 4;
  const answers = {};

  const CARBON_VALUES = {
    transport: { walk: 0.1, transit: 1.0, ev: 1.5, car: 4.5, fly: 7.5 },
    diet:      { vegan: 0.5, vegetarian: 1.0, flexitarian: 1.7, omnivore: 2.5, heavy_meat: 3.8 },
    energy:    { solar: 0.3, green_grid: 0.8, mixed: 2.0, fossil: 3.5 },
    shopping:  { minimal: 0.3, secondhand: 0.7, moderate: 1.8, fast_fashion: 2.8, heavy: 4.0 }
  };

  const AVG_GLOBAL = 4.7; // tonnes CO2e per year global average

  function getNextStepQuestion() {
    return Math.min(currentStep, totalSteps - 1);
  }

  function updateStepDots(step) {
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i < step) dot.classList.add('completed');
      else if (i === step) dot.classList.add('active');
    });
  }

  function showStep(step) {
    const contents = document.querySelectorAll('.step-content');
    contents.forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`step-${step}`);
    if (target) target.classList.add('active');
    updateStepDots(step);

    // Buttons
    const prevBtn     = document.getElementById('prevStepBtn');
    const nextBtn     = document.getElementById('nextStepBtn');
    const calcBtn     = document.getElementById('calculateBtn');
    prevBtn.disabled = step === 0;

    if (step === totalSteps - 1) {
      nextBtn.style.display = 'none';
      calcBtn.style.display = 'flex';
    } else {
      nextBtn.style.display = 'block';
      calcBtn.style.display = 'none';
    }
  }

  function collectAnswer(step) {
    const names = ['transport', 'diet', 'energy', 'shopping'];
    const name = names[step];
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    if (checked) answers[name] = checked.value;
  }

  function calculateTonnes() {
    return {
      transport: CARBON_VALUES.transport[answers.transport] || 2.5,
      diet:      CARBON_VALUES.diet[answers.diet]           || 2.0,
      energy:    CARBON_VALUES.energy[answers.energy]       || 2.0,
      shopping:  CARBON_VALUES.shopping[answers.shopping]   || 1.8
    };
  }

  async function calculate() {
    collectAnswer(currentStep);

    // Validate all answered
    const required = ['transport', 'diet', 'energy', 'shopping'];
    const missing = required.filter(k => !answers[k]);
    if (missing.length > 0) {
      showToast(`Please answer all questions first`, 'error');
      return;
    }

    // Show results container with loading
    document.getElementById('carbonForm').style.display    = 'none';
    document.getElementById('carbonResults').style.display = 'block';
    document.getElementById('carbonLoading').style.display = 'flex';
    document.getElementById('carbonReport').style.display  = 'none';

    try {
      const breakdown = calculateTonnes();
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

      const prompt = `You are a carbon footprint advisor. A user answered a lifestyle questionnaire:
- Transport: ${answers.transport} (${breakdown.transport} tonnes CO2e/year)
- Diet: ${answers.diet} (${breakdown.diet} tonnes CO2e/year)
- Home Energy: ${answers.energy} (${breakdown.energy} tonnes CO2e/year)
- Shopping habits: ${answers.shopping} (${breakdown.shopping} tonnes CO2e/year)
- TOTAL: ${total.toFixed(1)} tonnes CO2e/year
- Global average: ${AVG_GLOBAL} tonnes CO2e/year

Write a personalized, actionable carbon reduction plan in 4-5 short bullet points. Each bullet should:
1. Start with an emoji
2. Be specific to their answers (not generic)
3. Give a concrete action they can take this week
4. Mention approximate CO2 savings where possible

Keep the tone encouraging and empowering. End with a motivating one-liner about Earth Day.
Write in plain text only, no markdown headers.`;

      const actionPlan = await GeminiAPI.generateText(prompt);

      renderCarbonReport(breakdown, total, actionPlan);

    } catch (err) {
      showToast(`Calculation error: ${err.message}`, 'error');
      document.getElementById('carbonForm').style.display    = 'block';
      document.getElementById('carbonResults').style.display = 'none';
    }
  }

  function renderCarbonReport(breakdown, total, actionPlan) {
    document.getElementById('carbonLoading').style.display = 'none';
    document.getElementById('carbonReport').style.display  = 'flex';

    // Total tonnes
    animateNumber(document.getElementById('carbonTonnes'), total, 1500, 1);

    // Comparison
    const diff = total - AVG_GLOBAL;
    const compEl = document.getElementById('carbonComparison');
    if (diff < 0) {
      compEl.innerHTML = `<span style="color:var(--col-green)">🌟 ${Math.abs(diff).toFixed(1)} tonnes below the global average (${AVG_GLOBAL} t)</span>`;
    } else if (diff === 0) {
      compEl.textContent = `Equal to the global average (${AVG_GLOBAL} tonnes/year)`;
    } else {
      compEl.innerHTML = `<span style="color:var(--col-amber)">⚠️ ${diff.toFixed(1)} tonnes above the global average (${AVG_GLOBAL} t)</span>`;
    }

    // Bars
    const maxVal = 8;
    const renderBar = (barId, valId, value) => {
      const pct = Math.min((value / maxVal) * 100, 100);
      setTimeout(() => {
        const bar = document.getElementById(barId);
        if (bar) bar.style.width = pct + '%';
      }, 200);
      document.getElementById(valId).textContent = value.toFixed(1) + ' t';
    };

    renderBar('transportBar', 'transportVal', breakdown.transport);
    renderBar('dietBar',      'dietVal',      breakdown.diet);
    renderBar('energyBar',    'energyVal',    breakdown.energy);
    renderBar('shoppingBar',  'shoppingVal',  breakdown.shopping);

    // Action Plan
    const planEl = document.getElementById('actionPlanContent');
    planEl.textContent = '';
    // Typewriter effect
    let i = 0;
    const chars = actionPlan.split('');
    const typewriter = setInterval(() => {
      if (i < chars.length) {
        planEl.textContent += chars[i];
        i++;
      } else {
        clearInterval(typewriter);
      }
    }, 12);
  }

  function reset() {
    // Clear answers
    Object.keys(answers).forEach(k => delete answers[k]);
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    currentStep = 0;
    showStep(0);
    document.getElementById('carbonForm').style.display    = 'block';
    document.getElementById('carbonResults').style.display = 'none';
    document.getElementById('carbonLoading').style.display = 'flex';
    document.getElementById('carbonReport').style.display  = 'none';
  }

  function init() {
    const nextBtn   = document.getElementById('nextStepBtn');
    const prevBtn   = document.getElementById('prevStepBtn');
    const calcBtn   = document.getElementById('calculateBtn');
    const resetBtn  = document.getElementById('recalculateBtn');

    nextBtn.addEventListener('click', () => {
      collectAnswer(currentStep);
      if (currentStep < totalSteps - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });

    prevBtn.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });

    calcBtn.addEventListener('click', calculate);
    resetBtn.addEventListener('click', reset);

    showStep(0);
  }

  return { init };
})();
