/* =========================================
   EcoVolt AI — script.js
   ========================================= */

/* ---------- Navbar scroll ---------- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
  updateActiveNav();
});

/* ---------- Hamburger ---------- */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

/* ---------- Active Nav Highlighting ---------- */
function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
  });
  links.forEach(l => {
    l.classList.toggle('active', l.dataset.section === current);
  });
}

/* ---------- Scroll Reveal ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // stagger children within the same parent container
      const el = entry.target;
      const siblings = Array.from(el.parentElement.querySelectorAll('.reveal'));
      const idx = siblings.indexOf(el);
      setTimeout(() => {
        el.classList.add('visible');
      }, idx * 80);
      revealObserver.unobserve(el);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* =========================================
   MONITORING — Occupancy Sliders
   ========================================= */
const sliders = document.querySelectorAll('.occ-slider');

// kWh base per block (at 100% occupancy)
const maxKwh = { a: 80, b: 60, c: 120, lab: 55 };

function computeMetrics() {
  const vals = {};
  sliders.forEach(s => {
    const blk = s.dataset.block;
    vals[blk] = parseInt(s.value, 10);
  });

  const kwh = {};
  let total = 0;
  for (const k in vals) {
    kwh[k] = Math.round((vals[k] / 100) * maxKwh[k]);
    total += kwh[k];
  }

  // Update labels
  document.getElementById('occ-a').textContent   = vals.a   + '%';
  document.getElementById('occ-b').textContent   = vals.b   + '%';
  document.getElementById('occ-c').textContent   = vals.c   + '%';
  document.getElementById('occ-lab').textContent = vals.lab + '%';

  // kWh per block
  document.getElementById('kwh-a').textContent   = kwh.a   + ' kWh';
  document.getElementById('kwh-b').textContent   = kwh.b   + ' kWh';
  document.getElementById('kwh-c').textContent   = kwh.c   + ' kWh';
  document.getElementById('kwh-lab').textContent = kwh.lab + ' kWh';

  // Bar widths
  const setBar = (id, val, max) => {
    document.getElementById(id).style.width = Math.min((val / max) * 100, 100) + '%';
  };
  setBar('bar-a',   kwh.a,   maxKwh.a);
  setBar('bar-b',   kwh.b,   maxKwh.b);
  setBar('bar-c',   kwh.c,   maxKwh.c);
  setBar('bar-lab', kwh.lab, maxKwh.lab);

  // Total consumption
  document.getElementById('total-consumption').textContent = total + ' kWh';

  // Efficiency score — higher when lower total
  const maxTotal = Object.values(maxKwh).reduce((a, b) => a + b, 0);
  const effScore = Math.round(100 - (total / maxTotal) * 100);
  document.getElementById('efficiency-score').textContent = effScore + '%';
  document.getElementById('eff-bar').style.width = effScore + '%';

  // Waste risk
  const wasteRiskEl = document.getElementById('waste-risk');
  if (effScore >= 80) {
    wasteRiskEl.textContent = '🟢 Low';
    wasteRiskEl.className = 'risk-badge low';
    
  } else if (effScore >= 55) {
    wasteRiskEl.textContent = '⚠️ Moderate';
    wasteRiskEl.className = 'risk-badge moderate';
    
  } else {
    wasteRiskEl.textContent = '🔴 High';
    wasteRiskEl.className = 'risk-badge high';
    
  }

  // Optimization status
  const optEl = document.getElementById('opt-status');
  if (effScore >= 88) {
    optEl.innerHTML = '<span class="status-dot green-dot"></span> Fully Optimized';
  } else if (effScore >= 70) {
    optEl.innerHTML = '<span class="status-dot green-dot"></span> Optimizing...';
  } else {
    optEl.innerHTML = '<span class="status-dot blue-dot"></span> Monitoring Active';
  }
}

sliders.forEach(s => s.addEventListener('input', computeMetrics));
computeMetrics(); // initial call

/* =========================================
   AI ENGINE — Steps Animation & Run AI
   ========================================= */
const steps = document.querySelectorAll('.ai-step');
steps.forEach(step => {
  step.addEventListener('click', () => {
    steps.forEach(s => s.classList.remove('active'));
    step.classList.add('active');
  });
});

// Auto-cycle steps
let stepIdx = 0;
function cycleSteps() {
  steps.forEach(s => s.classList.remove('active'));
  steps[stepIdx].classList.add('active');
  stepIdx = (stepIdx + 1) % steps.length;
}
let stepInterval = setInterval(cycleSteps, 2200);

steps.forEach(s => s.addEventListener('click', () => {
  clearInterval(stepInterval);
  stepInterval = setInterval(cycleSteps, 2200);
}));

// Run AI Analysis button
const runBtn = document.getElementById('runAiBtn');
const wasteProbEl  = document.getElementById('waste-prob');
const wasteBarEl   = document.getElementById('waste-bar');
const aiEffScoreEl = document.getElementById('ai-eff-score');
const aiEffBarEl   = document.getElementById('ai-eff-bar');
const predSavingsEl = document.getElementById('pred-savings');
const riskLow    = document.getElementById('risk-low');
const riskMedium = document.getElementById('risk-medium');
const riskHigh   = document.getElementById('risk-high');

function setRisk(level) {
  [riskLow, riskMedium, riskHigh].forEach(b => b.classList.remove('active-risk'));
  if (level === 'low')    riskLow.classList.add('active-risk');
  if (level === 'medium') riskMedium.classList.add('active-risk');
  if (level === 'high')   riskHigh.classList.add('active-risk');
}

function animateValue(el, from, to, suffix, duration) {
  const start = performance.now();
  const update = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const current = Math.round(from + (to - from) * progress);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

runBtn.addEventListener('click', () => {
  runBtn.textContent = '⏳ Analyzing...';
  runBtn.disabled = true;

  // Simulate AI running
  setTimeout(() => {
    // Random results
    const wp  = Math.floor(Math.random() * 60) + 10;
    const eff = Math.floor(Math.random() * 35) + 60;
    const savings = Math.floor(Math.random() * 4000) + 1000;

    animateValue(wasteProbEl, parseInt(wasteProbEl.textContent), wp, '%', 800);
    wasteBarEl.style.width = wp + '%';

    animateValue(aiEffScoreEl, parseInt(aiEffScoreEl.textContent), eff, '%', 800);
    aiEffBarEl.style.width = eff + '%';

    predSavingsEl.textContent = '₹' + savings.toLocaleString('en-IN');

    if (wp < 25)       setRisk('low');
    else if (wp < 55)  setRisk('medium');
    else               setRisk('high');

    runBtn.textContent = '▶ Run AI Analysis';
    runBtn.disabled = false;
  }, 1600);
});

/* =========================================
   CHARTS (Chart.js)
   ========================================= */
Chart.defaults.color = 'rgba(255,255,255,0.5)';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  animation: { duration: 1000, easing: 'easeInOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(11, 22, 41, 0.95)',
      borderColor: 'rgba(59,130,246,0.3)',
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.7)',
      padding: 12,
      cornerRadius: 8,
    }
  }
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

// Daily Energy Consumption

const dailyCtx = document.getElementById('dailyChart').getContext('2d');
new Chart(dailyCtx, {
  type: 'bar',
  data: {
    labels: days,
    datasets: [
      {
        label: 'Optimized (kWh)',
        data: [200, 165, 205, 160, 175, 110, 90],
        backgroundColor: 'rgba(96, 165, 250, 0.5)',
        borderColor: 'rgba(96, 165, 250, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Actual (kWh)',
        data: [315, 280, 305, 275, 285, 145, 120],
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  },
  options: {
    ...chartDefaults,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } }, min: 0, max: 350 }
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} kWh`
        }
      }
    }
  }
});

// Waste Prediction Trend
const wasteCtx = document.getElementById('wasteChart').getContext('2d');
new Chart(wasteCtx, {
  type: 'line',
  data: {
    labels: days,
    datasets: [
      {
        label: 'Predicted Waste %',
        data: [45, 52, 48, 38, 60, 55, 42],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
      {
        label: 'Threshold',
        data: [40, 40, 40, 40, 40, 40, 40],
        borderColor: 'rgba(239, 68, 68, 0.7)',
        borderDash: [6, 4],
        tension: 0,
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
      }
    ]
  },
  options: {
    ...chartDefaults,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } }, min: 30, max: 65 }
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` }
      }
    }
  }
});

// Efficiency Performance
const effCtx = document.getElementById('efficiencyChart').getContext('2d');
const effGrad = effCtx.createLinearGradient(0, 0, 0, 220);
effGrad.addColorStop(0, 'rgba(34, 197, 94, 0.18)');
effGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
new Chart(effCtx, {
  type: 'line',
  data: {
    labels: months,
    datasets: [{
      label: 'Efficiency Score %',
      data: [58, 61, 65, 67, 72, 75, 82, 87],
      borderColor: '#22c55e',
      backgroundColor: effGrad,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#22c55e',
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 2.5,
    }]
  },
  options: {
    ...chartDefaults,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } }, min: 50, max: 100 }
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: { label: ctx => ` Efficiency Score %: ${ctx.raw}` }
      }
    }
  }
});

// Savings Forecast
const savingsCtx = document.getElementById('savingsChart').getContext('2d');
new Chart(savingsCtx, {
  type: 'bar',
  data: {
    labels: months,
    datasets: [
      {
        label: 'Actual Savings ₹',
        data: [12000, 18000, 28000, 30000, 32000, 34000, 37000, null],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Projected ₹',
        data: [null, null, null, null, null, null, null, 41000],
        backgroundColor: 'rgba(34, 211, 238, 0.5)',
        borderColor: 'rgba(34, 211, 238, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  },
  options: {
    ...chartDefaults,
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          font: { size: 11 },
          callback: val => '₹' + (val/1000).toFixed(0) + 'K'
        },
        min: 0, max: 60000
      }
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: {
          label: ctx => ctx.raw ? ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}` : ''
        }
      }
    }
  }
});

/* =========================================
   COUNTER ANIMATION for Impact Section
   ========================================= */
const impactObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.impact-value').forEach(el => {
        const text = el.textContent;
        // simple flash animation
        el.style.opacity = '0';
        setTimeout(() => {
          el.style.transition = 'opacity 0.6s ease';
          el.style.opacity = '1';
        }, 200);
      });
      impactObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const impactSection = document.getElementById('impact');
if (impactSection) impactObserver.observe(impactSection);

/* =========================================
   SMOOTH SLIDER TRACK FILL
   ========================================= */
function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
}
sliders.forEach(s => {
  updateSliderFill(s);
  s.addEventListener('input', () => updateSliderFill(s));
});
