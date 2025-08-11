// ---------- Demo model helpers ----------
function sigmoid(x) { 
    return 1 / (1 + Math.exp(-x)); 
  }
  
  // A tiny toy "pharmacology" model to produce plausible curves for demo only.
  function computeRiskCurve({ sex, age, med, dose }) {
    const times = [1, 4, 8, 12, 48]; // time points in hours
  
    // medication modifiers (toy values)
    const medBase = { sertraline: 0.12, amlodipine: 0.08, metformin: 0.04 }[med] || 0.06;
  
    // sex multiplier -> females higher for some meds in demo
    const sexMult = (sex === 'female') ? 1.26 : 1.0;
  
    // age effect
    const ageMult = 1 + (Math.max(0, age - 30) / 100); // small increase per decade
  
    // dose effect (nonlinear)
    const doseFactor = 1 + Math.log(1 + dose / 20) / 3;
  
    // build % risk (0-100)
    const base = medBase * 100;
    const femaleCurve = times.map((t, i) => {
      const tFactor = 1 + i * 0.06; // slowly increasing over time
      const raw = base * tFactor * sexMult * ageMult * doseFactor;
      return Math.min(95, Math.round(raw * 10) / 10);
    });
    const maleCurve = times.map((t, i) => {
      const tFactor = 1 + i * 0.06;
      const raw = base * tFactor * 1.0 * ageMult * doseFactor;
      return Math.min(95, Math.round(raw * 10) / 10);
    });
  
    // recommendation: naive - scale down dose for female if risk difference > 15%
    const femaleAt50 = femaleCurve[2];
    const maleAt50 = maleCurve[2];
    const diffPct = Math.round(((femaleAt50 - maleAt50) / Math.max(maleAt50, 1)) * 100);
  
    let recommendation = { text: `Recommended: ${dose} mg (no change)`, dose: dose };
    if (sex === 'female' && diffPct > 15) {
      const recDose = Math.max(1, Math.round(dose * 0.8));
      recommendation = { text: `Recommended: ${recDose} mg (optimized for female metabolism)`, dose: recDose };
    }
  
    const metab = (med === 'sertraline')
      ? `Women metabolize sertraline ~25% slower in this demo model, which can increase plasma concentrations.`
      : `Pharmacokinetic sex differences may alter drug exposure.`;
  
    return { times, femaleCurve, maleCurve, diffPct, recommendation, metab };
  }
  
  // ---------- Chart setup ----------
  const ctx = document.getElementById('riskChart').getContext('2d');
  const labelTimes = ['1 hour', '4 hours', '8 hours', '12 hours', '48 hours'];
  
  const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labelTimes,
    datasets: [
      {
        label: 'Female',
        data: [0, 0, 0, 0, 0],
        fill: false,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderColor: '#d946ef',
        backgroundColor: 'rgba(217,70,239,0.1)',
        pointBackgroundColor: '#d946ef',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#d946ef',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      },
      {
        label: 'Male',
        data: [0, 0, 0, 0, 0],
        fill: false,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      }
    ]
  },
  options: {
    animation: { 
      duration: 600,
      easing: 'easeOutCubic'
    },
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)',
          borderColor: 'rgba(0,0,0,0.1)'
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
            weight: '400'
          }
        }
      },
      y: { 
        beginAtZero: true, 
        max: 100,
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)',
          borderColor: 'rgba(0,0,0,0.1)'
        },
        ticks: { 
          callback: (v) => v + "%",
          color: '#6b7280',
          font: {
            size: 12,
            weight: '400'
          }
        }
      }
    },
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.96)',
        titleColor: '#374151',
        bodyColor: '#6b7280',
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        padding: 12,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 12,
          weight: '400'
        }
      }
    }
  }
});
  
  // ---------- Wiring UI ----------
  const sexM = document.getElementById('sex-m');
  const sexF = document.getElementById('sex-f');
  const ageEl = document.getElementById('age');
  const medEl = document.getElementById('medication');
  const doseEl = document.getElementById('dose');
  const doseVal = document.getElementById('dose-value');
  const riskDiffVal = document.getElementById('risk-diff-val');
  const recommendText = document.getElementById('recommend-text');
  const metabText = document.getElementById('metab-text');
  
  let state = { sex: 'male', age: 35, med: 'sertraline', dose: 50 };
  
  function setSex(s) {
    state.sex = s;
    if (s === 'male') {
      sexM.classList.add('active');
      sexF.classList.remove('active');
    } else {
      sexF.classList.add('active');
      sexM.classList.remove('active');
    }
    updateAll();
  }
  
  sexM.addEventListener('click', () => setSex('male'));
  sexF.addEventListener('click', () => setSex('female'));
  ageEl.addEventListener('change', (e) => { state.age = Number(e.target.value); updateAll(); });
  medEl.addEventListener('change', (e) => { state.med = e.target.value; updateAll(); });
  doseEl.addEventListener('input', (e) => { 
    state.dose = Number(e.target.value); 
    doseVal.textContent = state.dose + ' mg'; 
    updateAll(); 
  });
  
  function updateAll() {
  const result = computeRiskCurve(state);
  
  // Animate chart update
  chart.data.datasets[0].data = result.femaleCurve;
  chart.data.datasets[1].data = result.maleCurve;
  chart.update('active');

  // Animate text updates with fade effect
  animateTextUpdate(riskDiffVal, `${result.diffPct}% higher risk for women at ~${state.dose}mg`);
  animateTextUpdate(recommendText, `<strong>${result.recommendation.text}</strong>`);
  animateTextUpdate(metabText, result.metab);
}

function animateTextUpdate(element, newContent) {
  element.style.opacity = '0.5';
  element.style.transform = 'translateY(5px)';
  
  setTimeout(() => {
    element.innerHTML = newContent;
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, 150);
}

// Add loading animation on page load
document.addEventListener('DOMContentLoaded', () => {
  // Stagger panel animations
  const panels = document.querySelectorAll('.panel');
  panels.forEach((panel, index) => {
    panel.style.animationDelay = `${index * 0.1}s`;
  });
  
  // Add hover effects to interactive elements
  const interactiveElements = document.querySelectorAll('button, select, input[type="range"], .legend .item');
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      el.style.transform = el.style.transform || '' + ' scale(1.02)';
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = el.style.transform.replace(' scale(1.02)', '');
    });
  });
});
  
  // initial render
  updateAll();
  
  /*
    How to hook your backend later:
    1. Replace computeRiskCurve(...) with a fetch to your AI endpoint, e.g.
       fetch('/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)})
         .then(r=>r.json()).then(json=>{
           chart.data.datasets[0].data = json.femaleCurve;
           chart.data.datasets[1].data = json.maleCurve;
           chart.update();
           recommendText.innerHTML = `<strong>${json.recommendation}</strong>`;
         });
  */
  