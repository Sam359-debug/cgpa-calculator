// ─────────────────────────────────────
// DOM References
// ─────────────────────────────────────
const semesterBody = document.querySelector("#semester-body");
const addRowButton = document.querySelector("#add-row");
const clearButton = document.querySelector("#clear-all");
const sampleButton = document.querySelector("#sample-data");
const exportButton = document.querySelector("#export-btn");
const scaleInput = document.querySelector("#scale");
const cgpaOutput = document.querySelector("#cgpa");
const totalCreditsOutput = document.querySelector("#total-credits");
const totalPointsOutput = document.querySelector("#total-points");
const performanceLabel = document.querySelector("#performance-label");
const percentageLabel = document.querySelector("#percentage-label");
const targetCgpaInput = document.querySelector("#target-cgpa");
const nextCreditsInput = document.querySelector("#next-credits");
const targetResult = document.querySelector("#target-result");
const ringFill = document.querySelector("#ring-fill");
const trendCanvas = document.querySelector("#trend-chart");
const chartEmpty = document.querySelector("#chart-empty");
const scaleToggle = document.querySelector("#scale-toggle");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon");
const comparisonStrip = document.querySelector("#comparison-strip");
const distCanvas = document.querySelector("#distribution-chart");
const distEmpty = document.querySelector("#dist-empty");
const distLegend = document.querySelector("#dist-legend");
const toastContainer = document.querySelector("#toast-container");

// ─────────────────────────────────────
// SVG gradient for the ring (injected)
// ─────────────────────────────────────
(function injectRingGradient() {
  const svg = document.querySelector(".score-ring");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.setAttribute("id", "ring-gradient");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%");
  grad.setAttribute("y2", "100%");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#38bdf8");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#818cf8");

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.prepend(defs);
})();

// ─────────────────────────────────────
// Toast notifications
// ─────────────────────────────────────
function showToast(message, icon = "✦", duration = 2800) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─────────────────────────────────────
// Theme toggle
// ─────────────────────────────────────
function getTheme() {
  return localStorage.getItem("cgpa-theme") || "dark";
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("cgpa-theme", theme);
  themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  // Redraw canvases with new colors
  drawTrendChart();
  drawDistributionChart();
}

themeToggle.addEventListener("click", () => {
  const newTheme = getTheme() === "dark" ? "light" : "dark";
  setTheme(newTheme);
  showToast(`Switched to ${newTheme} mode`, newTheme === "dark" ? "🌙" : "☀️");
});

// Init theme
setTheme(getTheme());

// ─────────────────────────────────────
// State — with localStorage persistence
// ─────────────────────────────────────
const STORAGE_KEY = "cgpa-calc-data";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.semesters || [];
    }
  } catch (e) {
    // ignore
  }
  return [
    { sgpa: 8.2, credits: 21 },
    { sgpa: 8.6, credits: 22 },
    { sgpa: 8.9, credits: 20 },
  ];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ semesters }));
  } catch (e) {
    // ignore
  }
}

let semesters = loadState();

// ─────────────────────────────────────
// Scale toggle
// ─────────────────────────────────────
scaleToggle.querySelectorAll(".toggle-btn").forEach((btn, i) => {
  btn.addEventListener("click", () => {
    scaleToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    scaleToggle.dataset.active = String(i);
    scaleInput.value = btn.dataset.value;
    convertScale(getScale());
    targetCgpaInput.max = getScale();
    if (Number(targetCgpaInput.value) > getScale()) {
      targetCgpaInput.value = getScale();
    }
    renderRows();
    showToast(`Switched to ${getScale()}-point scale`, "📐");
  });
});

// ─────────────────────────────────────
// Utility
// ─────────────────────────────────────
function getScale() {
  return Number(scaleInput.value);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, min), max);
}

function gradeLabel(cgpa, scale) {
  const normalized = scale === 4 ? (cgpa / 4) * 10 : cgpa;
  if (normalized >= 9) return "🌟 Outstanding";
  if (normalized >= 8) return "✨ Excellent";
  if (normalized >= 7) return "💪 Strong";
  if (normalized >= 6) return "📈 Steady";
  if (normalized > 0) return "🔄 Improving";
  return "Add semesters";
}

function gradeBandIndex(cgpa, scale) {
  const normalized = scale === 4 ? (cgpa / 4) * 10 : cgpa;
  if (normalized >= 9) return 0;
  if (normalized >= 8) return 1;
  if (normalized >= 7) return 2;
  if (normalized >= 6) return 3;
  return -1;
}

function sgpaToPercentage(sgpa, scale) {
  // Standard approximate conversion
  const normalized = scale === 4 ? (sgpa / 4) * 10 : sgpa;
  return (normalized - 0.75) * 10;
}

function getChartTextColor() {
  return getTheme() === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
}

function getChartGridColor() {
  return getTheme() === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
}

function getChartBg() {
  return getTheme() === "dark" ? "#0a0e1a" : "#ffffff";
}

// ─────────────────────────────────────
// Calculations
// ─────────────────────────────────────
function calculateTotals() {
  return semesters.reduce(
    (totals, semester) => {
      const sgpa = clamp(Number(semester.sgpa), 0, getScale());
      const credits = Math.max(Number(semester.credits) || 0, 0);
      totals.credits += credits;
      totals.points += sgpa * credits;
      return totals;
    },
    { credits: 0, points: 0 }
  );
}

// ─────────────────────────────────────
// Animated number counter
// ─────────────────────────────────────
const counterState = { cgpa: 0, credits: 0, points: 0 };

function animateValue(element, start, end, decimals, key) {
  const duration = 500;
  const startTime = performance.now();

  element.classList.add("counting");
  setTimeout(() => element.classList.remove("counting"), 200);

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;

    element.textContent = current.toFixed(decimals);
    counterState[key] = current;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = end.toFixed(decimals);
      counterState[key] = end;
    }
  }

  requestAnimationFrame(tick);
}

// ─────────────────────────────────────
// Ring animation
// ─────────────────────────────────────
const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // ~326.73

function updateRing(cgpa) {
  const scale = getScale();
  const fraction = scale > 0 ? clamp(cgpa / scale, 0, 1) : 0;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  ringFill.style.strokeDashoffset = offset;
}

// ─────────────────────────────────────
// Trend chart (Canvas)
// ─────────────────────────────────────
function drawTrendChart() {
  const ctx = trendCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = trendCanvas.getBoundingClientRect();

  trendCanvas.width = rect.width * dpr;
  trendCanvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (semesters.length < 2) {
    chartEmpty.style.display = "flex";
    trendCanvas.style.opacity = "0.2";
    return;
  }

  chartEmpty.style.display = "none";
  trendCanvas.style.opacity = "1";

  const scale = getScale();
  const values = semesters.map((s) => clamp(Number(s.sgpa), 0, scale));
  const pad = { top: 20, right: 20, bottom: 30, left: 36 };
  const w = rect.width - pad.left - pad.right;
  const h = rect.height - pad.top - pad.bottom;

  const minV = Math.max(0, Math.min(...values) - 0.5);
  const maxV = Math.min(scale, Math.max(...values) + 0.5);
  const range = maxV - minV || 1;

  function x(i) { return pad.left + (i / (values.length - 1)) * w; }
  function y(v) { return pad.top + (1 - (v - minV) / range) * h; }

  // Grid lines
  ctx.strokeStyle = getChartGridColor();
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gy = pad.top + (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(pad.left + w, gy);
    ctx.stroke();
  }

  // Accent color
  const accentColor = getTheme() === "dark" ? "56, 189, 248" : "2, 132, 199";

  // Area fill
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
  gradient.addColorStop(0, `rgba(${accentColor}, 0.25)`);
  gradient.addColorStop(1, `rgba(${accentColor}, 0.01)`);

  ctx.beginPath();
  ctx.moveTo(x(0), y(values[0]));
  for (let i = 1; i < values.length; i++) {
    const cx1 = (x(i - 1) + x(i)) / 2;
    ctx.bezierCurveTo(cx1, y(values[i - 1]), cx1, y(values[i]), x(i), y(values[i]));
  }
  ctx.lineTo(x(values.length - 1), pad.top + h);
  ctx.lineTo(x(0), pad.top + h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(x(0), y(values[0]));
  for (let i = 1; i < values.length; i++) {
    const cx1 = (x(i - 1) + x(i)) / 2;
    ctx.bezierCurveTo(cx1, y(values[i - 1]), cx1, y(values[i]), x(i), y(values[i]));
  }
  ctx.strokeStyle = `rgb(${accentColor})`;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Points
  const bgColor = getChartBg();
  values.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 5, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x(i), y(v), 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgb(${accentColor})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Glow
    ctx.beginPath();
    ctx.arc(x(i), y(v), 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accentColor}, 0.15)`;
    ctx.fill();
  });

  // Labels
  ctx.fillStyle = getChartTextColor();
  ctx.font = "600 10px Inter, sans-serif";
  ctx.textAlign = "center";
  values.forEach((v, i) => {
    ctx.fillText(`S${i + 1}`, x(i), pad.top + h + 18);
  });

  // Y-axis labels
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = minV + (range * (4 - i)) / 4;
    ctx.fillText(val.toFixed(1), pad.left - 6, pad.top + (i / 4) * h + 4);
  }
}

// ─────────────────────────────────────
// GPA Distribution Donut Chart
// ─────────────────────────────────────
const DIST_COLORS = [
  { label: "Outstanding (9+)", color: "#38bdf8", lightColor: "#0284c7" },
  { label: "Excellent (8-8.99)", color: "#34d399", lightColor: "#059669" },
  { label: "Strong (7-7.99)", color: "#fbbf24", lightColor: "#d97706" },
  { label: "Steady (6-6.99)", color: "#fb923c", lightColor: "#ea580c" },
  { label: "Below 6", color: "#fb7185", lightColor: "#e11d48" },
];

function getDistribution() {
  const scale = getScale();
  const counts = [0, 0, 0, 0, 0]; // outstanding, excellent, strong, steady, below

  semesters.forEach((sem) => {
    const sgpa = clamp(Number(sem.sgpa), 0, scale);
    const normalized = scale === 4 ? (sgpa / 4) * 10 : sgpa;
    if (normalized >= 9) counts[0]++;
    else if (normalized >= 8) counts[1]++;
    else if (normalized >= 7) counts[2]++;
    else if (normalized >= 6) counts[3]++;
    else counts[4]++;
  });

  return counts;
}

function drawDistributionChart() {
  const ctx = distCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = distCanvas.getBoundingClientRect();

  distCanvas.width = rect.width * dpr;
  distCanvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const counts = getDistribution();
  const total = counts.reduce((a, b) => a + b, 0);

  if (total === 0) {
    distEmpty.style.display = "flex";
    distCanvas.style.opacity = "0.2";
    distLegend.innerHTML = "";
    return;
  }

  distEmpty.style.display = "none";
  distCanvas.style.opacity = "1";

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const outerR = Math.min(cx, cy) - 10;
  const innerR = outerR * 0.55;
  const isDark = getTheme() === "dark";

  let startAngle = -Math.PI / 2;

  counts.forEach((count, i) => {
    if (count === 0) return;
    const sliceAngle = (count / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isDark ? DIST_COLORS[i].color : DIST_COLORS[i].lightColor;
    ctx.fill();

    // Label if slice is large enough
    if (sliceAngle > 0.4) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = (outerR + innerR) / 2;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;

      ctx.fillStyle = "#fff";
      ctx.font = "700 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count, lx, ly);
    }

    startAngle = endAngle;
  });

  // Center text
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
  ctx.font = "800 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, cx, cy - 6);

  ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  ctx.font = "600 10px Inter, sans-serif";
  ctx.fillText("semesters", cx, cy + 12);

  // Update legend
  distLegend.innerHTML = counts
    .map((count, i) => {
      if (count === 0) return "";
      const color = isDark ? DIST_COLORS[i].color : DIST_COLORS[i].lightColor;
      return `<div class="dist-legend-item">
        <span class="dist-legend-dot" style="background:${color}"></span>
        ${DIST_COLORS[i].label}: ${count}
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────
// Grade bands highlight
// ─────────────────────────────────────
function highlightBand(cgpa) {
  const bands = document.querySelectorAll(".band");
  const idx = gradeBandIndex(cgpa, getScale());
  bands.forEach((b, i) => {
    b.classList.toggle("active-band", i === idx);
  });
}

// ─────────────────────────────────────
// Semester comparison
// ─────────────────────────────────────
function updateComparison() {
  comparisonStrip.innerHTML = "";

  if (semesters.length < 2) return;

  const scale = getScale();
  const values = semesters.map((s) => clamp(Number(s.sgpa), 0, scale));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const bestIdx = values.indexOf(max);
  const worstIdx = values.lastIndexOf(min);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Best semester
  comparisonStrip.innerHTML += `
    <span class="comp-badge best">🏅 Best: Sem ${bestIdx + 1} (${max.toFixed(2)})</span>
  `;

  // Worst semester
  if (bestIdx !== worstIdx) {
    comparisonStrip.innerHTML += `
      <span class="comp-badge worst">📉 Lowest: Sem ${worstIdx + 1} (${min.toFixed(2)})</span>
    `;
  }

  // Average
  comparisonStrip.innerHTML += `
    <span class="comp-badge avg">📊 Avg SGPA: ${avg.toFixed(2)}</span>
  `;

  // Improvement trend (last 2 semesters)
  if (semesters.length >= 2) {
    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    const diff = last - prev;
    if (diff > 0) {
      comparisonStrip.innerHTML += `
        <span class="comp-badge improvement">📈 +${diff.toFixed(2)} last semester</span>
      `;
    } else if (diff < 0) {
      comparisonStrip.innerHTML += `
        <span class="comp-badge worst">📉 ${diff.toFixed(2)} last semester</span>
      `;
    }
  }
}

// ─────────────────────────────────────
// Render table rows
// ─────────────────────────────────────
function renderRows() {
  semesterBody.innerHTML = "";

  if (semesters.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    emptyRow.innerHTML = '<td colspan="5">No semesters yet. Tap <strong>+ Add</strong> to start.</td>';
    semesterBody.appendChild(emptyRow);
    updateSummary();
    return;
  }

  // Find best/worst for badges
  const scale = getScale();
  const values = semesters.map((s) => clamp(Number(s.sgpa), 0, scale));
  const max = Math.max(...values);
  const min = Math.min(...values);
  const bestIdx = values.indexOf(max);
  const worstIdx = semesters.length > 1 ? values.lastIndexOf(min) : -1;

  semesters.forEach((semester, index) => {
    const row = document.createElement("tr");
    row.style.animationDelay = `${index * 60}ms`;

    const sgpaVal = clamp(Number(semester.sgpa), 0, scale);
    const pct = semester.sgpa !== "" && !isNaN(Number(semester.sgpa))
      ? sgpaToPercentage(sgpaVal, scale)
      : null;

    let badge = "";
    if (semesters.length > 1) {
      if (index === bestIdx && max !== min) badge = '<span class="row-badge best">★ Best</span>';
      else if (index === worstIdx && max !== min) badge = '<span class="row-badge worst">▼ Low</span>';
    }

    row.innerHTML = `
      <td>
        <div class="semester-label">
          <span class="semester-index">${index + 1}</span>
          Sem ${index + 1}${badge}
        </div>
      </td>
      <td>
        <input class="sgpa-input" type="number" min="0" max="${getScale()}" step="0.01" value="${semester.sgpa}" aria-label="Semester ${index + 1} SGPA">
      </td>
      <td>
        <input class="credit-input" type="number" min="0" step="1" value="${semester.credits}" aria-label="Semester ${index + 1} credits">
      </td>
      <td class="pct-cell">${pct !== null ? pct.toFixed(1) + "%" : "—"}</td>
      <td class="remove-cell">
        <button class="remove-row" type="button" aria-label="Remove semester ${index + 1}">✕</button>
      </td>
    `;

    row.querySelector(".sgpa-input").addEventListener("input", (event) => {
      semesters[index].sgpa = event.target.value;
      updateSummary();
      saveState();
    });

    row.querySelector(".credit-input").addEventListener("input", (event) => {
      semesters[index].credits = event.target.value;
      updateSummary();
      saveState();
    });

    row.querySelector(".remove-row").addEventListener("click", () => {
      // animate out
      row.style.transition = "all 300ms cubic-bezier(0.16, 1, 0.3, 1)";
      row.style.opacity = "0";
      row.style.transform = "translateX(20px)";
      setTimeout(() => {
        semesters.splice(index, 1);
        saveState();
        renderRows();
        showToast(`Semester ${index + 1} removed`, "🗑️");
      }, 250);
    });

    semesterBody.appendChild(row);
  });

  updateSummary();
}

// ─────────────────────────────────────
// Target planner
// ─────────────────────────────────────
function updateTargetPlanner(cgpa, credits, points) {
  const target = clamp(Number(targetCgpaInput.value), 0, getScale());
  const nextCredits = Math.max(Number(nextCreditsInput.value) || 0, 0);

  if (!credits || !nextCredits) {
    targetResult.textContent = "Add current semesters to calculate a target.";
    return;
  }

  const required = (target * (credits + nextCredits) - points) / nextCredits;

  if (required <= 0) {
    targetResult.textContent = `🎉 You've already surpassed your ${target.toFixed(2)} target! Keep it up!`;
  } else if (required > getScale()) {
    targetResult.textContent = `⚠️ A ${target.toFixed(2)} target needs ${required.toFixed(2)} SGPA next term — beyond this scale.`;
  } else {
    targetResult.textContent = `📊 Aim for ${required.toFixed(2)} SGPA next term to hit your ${target.toFixed(2)} target.`;
  }
}

// ─────────────────────────────────────
// Summary update
// ─────────────────────────────────────
function updateSummary() {
  const { credits, points } = calculateTotals();
  const cgpa = credits ? points / credits : 0;

  animateValue(cgpaOutput, counterState.cgpa, cgpa, 2, "cgpa");
  animateValue(totalCreditsOutput, counterState.credits, credits, 0, "credits");
  animateValue(totalPointsOutput, counterState.points, points, 2, "points");

  performanceLabel.textContent = gradeLabel(cgpa, getScale());

  // Percentage equivalent
  if (cgpa > 0) {
    const pct = sgpaToPercentage(cgpa, getScale());
    percentageLabel.textContent = `≈ ${pct.toFixed(1)}%`;
  } else {
    percentageLabel.textContent = "";
  }

  updateRing(cgpa);
  drawTrendChart();
  drawDistributionChart();
  highlightBand(cgpa);
  updateTargetPlanner(cgpa, credits, points);
  updateComparison();
}

// ─────────────────────────────────────
// Scale conversion
// ─────────────────────────────────────
function convertScale(nextScale) {
  const previousScale = nextScale === 10 ? 4 : 10;
  semesters = semesters.map((semester) => ({
    sgpa: Number(((Number(semester.sgpa) || 0) / previousScale * nextScale).toFixed(2)),
    credits: semester.credits,
  }));
  saveState();
}

// ─────────────────────────────────────
// Export functionality
// ─────────────────────────────────────
function exportReport() {
  const { credits, points } = calculateTotals();
  const cgpa = credits ? points / credits : 0;
  const scale = getScale();
  const pct = sgpaToPercentage(cgpa, scale);

  let report = `╔══════════════════════════════════════╗\n`;
  report +=    `║     📚 CGPA REPORT CARD              ║\n`;
  report +=    `╠══════════════════════════════════════╣\n`;
  report +=    `║                                      ║\n`;
  report +=    `║  CGPA: ${cgpa.toFixed(2)} / ${scale}${" ".repeat(24 - cgpa.toFixed(2).length)}║\n`;
  report +=    `║  Percentage: ≈ ${pct.toFixed(1)}%${" ".repeat(19 - pct.toFixed(1).length)}║\n`;
  report +=    `║  Grade: ${gradeLabel(cgpa, scale).replace(/^[^ ]+ /, "")}${" ".repeat(Math.max(0, 26 - gradeLabel(cgpa, scale).replace(/^[^ ]+ /, "").length))}║\n`;
  report +=    `║  Total Credits: ${credits}${" ".repeat(Math.max(0, 19 - String(credits).length))}║\n`;
  report +=    `║  Weighted Points: ${points.toFixed(2)}${" ".repeat(Math.max(0, 17 - points.toFixed(2).length))}║\n`;
  report +=    `║                                      ║\n`;
  report +=    `╠══════════════════════════════════════╣\n`;
  report +=    `║  SEMESTER BREAKDOWN                  ║\n`;
  report +=    `╠══════════════════════════════════════╣\n`;

  semesters.forEach((sem, i) => {
    const s = clamp(Number(sem.sgpa), 0, scale);
    const c = Math.max(Number(sem.credits) || 0, 0);
    const p = sgpaToPercentage(s, scale);
    const line = `  Sem ${i + 1}: SGPA ${s.toFixed(2)} | ${c} cr | ≈${p.toFixed(1)}%`;
    report += `║${line}${" ".repeat(Math.max(0, 38 - line.length))}║\n`;
  });

  report += `╠══════════════════════════════════════╣\n`;
  report += `║  Generated: ${new Date().toLocaleDateString()}${" ".repeat(Math.max(0, 23 - new Date().toLocaleDateString().length))}║\n`;
  report += `╚══════════════════════════════════════╝\n`;

  // Copy to clipboard
  navigator.clipboard.writeText(report).then(() => {
    showToast("Report copied to clipboard!", "📋");
  }).catch(() => {
    // Fallback: download as file
    downloadTextFile(report, "cgpa-report.txt");
  });

  // Also download
  downloadTextFile(report, "cgpa-report.txt");
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────
// Event listeners
// ─────────────────────────────────────
addRowButton.addEventListener("click", () => {
  semesters.push({ sgpa: "", credits: "" });
  saveState();
  renderRows();
  showToast(`Semester ${semesters.length} added`, "➕");
  // Scroll to bottom of table
  setTimeout(() => {
    const lastRow = semesterBody.lastElementChild;
    if (lastRow) lastRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 50);
});

clearButton.addEventListener("click", () => {
  if (semesters.length === 0) return;
  semesters = [];
  saveState();
  renderRows();
  showToast("All semesters cleared", "🗑️");
});

sampleButton.addEventListener("click", () => {
  semesters = [
    { sgpa: 8.2, credits: 21 },
    { sgpa: 8.6, credits: 22 },
    { sgpa: 8.9, credits: 20 },
    { sgpa: 9.1, credits: 22 },
  ];
  saveState();
  renderRows();
  showToast("Sample data loaded", "✦");
});

exportButton.addEventListener("click", exportReport);

[targetCgpaInput, nextCreditsInput].forEach((input) => {
  input.addEventListener("input", updateSummary);
});

// ─────────────────────────────────────
// Keyboard shortcuts
// ─────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ctrl+Enter: Add semester
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    addRowButton.click();
  }

  // Ctrl+Backspace: Remove last semester
  if ((e.ctrlKey || e.metaKey) && e.key === "Backspace") {
    e.preventDefault();
    if (semesters.length > 0) {
      const removed = semesters.length;
      semesters.pop();
      saveState();
      renderRows();
      showToast(`Semester ${removed} removed`, "⌫");
    }
  }

  // Ctrl+S: Export
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    exportReport();
  }
});

// ─────────────────────────────────────
// Particles background
// ─────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let particles = [];
  const COUNT = 60;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.3 + 0.05,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = getTheme() === "dark";
    const particleRGB = isDark ? "56, 189, 248" : "2, 132, 199";

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleRGB}, ${p.alpha})`;
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${particleRGB}, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  init();
  draw();
})();

// ─────────────────────────────────────
// Confetti celebration
// ─────────────────────────────────────
const confettiCanvas = document.getElementById("confetti");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiActive = false;
let lastCelebrated = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function triggerConfetti() {
  if (confettiActive) return;
  confettiActive = true;
  resizeConfetti();

  const colors = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#fb923c"];
  confettiPieces = Array.from({ length: 120 }, () => ({
    x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
    y: confettiCanvas.height / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 16 - 4,
    r: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    gravity: 0.25 + Math.random() * 0.1,
    alpha: 1,
  }));

  function animate() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    confettiPieces.forEach((p) => {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.alpha -= 0.008;
      if (p.alpha < 0) p.alpha = 0;
      if (p.alpha > 0) alive = true;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = p.alpha;
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
      confettiCtx.restore();
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      confettiActive = false;
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  animate();
}

// Handle resize for trend chart
window.addEventListener("resize", () => {
  drawTrendChart();
  drawDistributionChart();
  resizeConfetti();
});

// ─────────────────────────────────────
// Initialize
// ─────────────────────────────────────
targetCgpaInput.max = getScale();
renderRows();

// Initial celebration check
(function checkInitialCelebration() {
  const { credits, points } = calculateTotals();
  const cgpa = credits ? points / credits : 0;
  const normalized = getScale() === 4 ? (cgpa / 4) * 10 : cgpa;
  if (normalized >= 9) lastCelebrated = true;
})();

// Hook confetti into updateSummary via MutationObserver
const cgpaObserver = new MutationObserver(() => {
  const val = parseFloat(cgpaOutput.textContent);
  const normalized = getScale() === 4 ? (val / 4) * 10 : val;
  if (normalized >= 9 && !lastCelebrated) {
    lastCelebrated = true;
    triggerConfetti();
    showToast("🎉 Outstanding CGPA! You're crushing it!", "🏆", 4000);
  } else if (normalized < 9) {
    lastCelebrated = false;
  }
});

cgpaObserver.observe(cgpaOutput, { childList: true, characterData: true, subtree: true });
