const semesterBody = document.querySelector("#semester-body");
const addRowButton = document.querySelector("#add-row");
const clearButton = document.querySelector("#clear-all");
const sampleButton = document.querySelector("#sample-data");
const scaleSelect = document.querySelector("#scale");
const cgpaOutput = document.querySelector("#cgpa");
const totalCreditsOutput = document.querySelector("#total-credits");
const totalPointsOutput = document.querySelector("#total-points");
const performanceLabel = document.querySelector("#performance-label");
const targetCgpaInput = document.querySelector("#target-cgpa");
const nextCreditsInput = document.querySelector("#next-credits");
const targetResult = document.querySelector("#target-result");

let semesters = [
  { sgpa: 8.2, credits: 21 },
  { sgpa: 8.6, credits: 22 },
  { sgpa: 8.9, credits: 20 },
];

function getScale() {
  return Number(scaleSelect.value);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, min), max);
}

function gradeLabel(cgpa, scale) {
  const normalized = scale === 4 ? (cgpa / 4) * 10 : cgpa;

  if (normalized >= 9) return "Outstanding progress";
  if (normalized >= 8) return "Excellent standing";
  if (normalized >= 7) return "Strong performance";
  if (normalized >= 6) return "Steady progress";
  if (normalized > 0) return "Room to improve";
  return "Add semesters to begin";
}

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

function renderRows() {
  semesterBody.innerHTML = "";

  if (semesters.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.className = "empty-state";
    emptyRow.innerHTML = '<td colspan="4">No semesters yet. Add one to start calculating.</td>';
    semesterBody.appendChild(emptyRow);
    updateSummary();
    return;
  }

  semesters.forEach((semester, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="semester-label">
          <span class="semester-index">${index + 1}</span>
          Semester ${index + 1}
        </div>
      </td>
      <td>
        <input class="sgpa-input" type="number" min="0" max="${getScale()}" step="0.01" value="${semester.sgpa}" aria-label="Semester ${
      index + 1
    } SGPA">
      </td>
      <td>
        <input class="credit-input" type="number" min="0" step="1" value="${semester.credits}" aria-label="Semester ${
      index + 1
    } credits">
      </td>
      <td class="remove-cell">
        <button class="remove-row" type="button" aria-label="Remove semester ${index + 1}">x</button>
      </td>
    `;

    row.querySelector(".sgpa-input").addEventListener("input", (event) => {
      semesters[index].sgpa = event.target.value;
      updateSummary();
    });

    row.querySelector(".credit-input").addEventListener("input", (event) => {
      semesters[index].credits = event.target.value;
      updateSummary();
    });

    row.querySelector(".remove-row").addEventListener("click", () => {
      semesters.splice(index, 1);
      renderRows();
    });

    semesterBody.appendChild(row);
  });

  updateSummary();
}

function updateTargetPlanner(cgpa, credits, points) {
  const target = clamp(Number(targetCgpaInput.value), 0, getScale());
  const nextCredits = Math.max(Number(nextCreditsInput.value) || 0, 0);

  if (!credits || !nextCredits) {
    targetResult.textContent = "Add current semesters to calculate a target.";
    return;
  }

  const required = ((target * (credits + nextCredits)) - points) / nextCredits;

  if (required <= 0) {
    targetResult.textContent = `Your current CGPA already supports a ${target.toFixed(2)} target.`;
  } else if (required > getScale()) {
    targetResult.textContent = `A ${target.toFixed(2)} target needs ${required.toFixed(2)} next term, above this scale.`;
  } else {
    targetResult.textContent = `You need about ${required.toFixed(2)} SGPA next term to reach ${target.toFixed(2)}.`;
  }
}

function updateSummary() {
  const { credits, points } = calculateTotals();
  const cgpa = credits ? points / credits : 0;

  cgpaOutput.textContent = cgpa.toFixed(2);
  totalCreditsOutput.textContent = credits.toString();
  totalPointsOutput.textContent = points.toFixed(2);
  performanceLabel.textContent = gradeLabel(cgpa, getScale());
  updateTargetPlanner(cgpa, credits, points);
}

function convertScale(nextScale) {
  const previousScale = nextScale === 10 ? 4 : 10;
  semesters = semesters.map((semester) => ({
    sgpa: Number(((Number(semester.sgpa) || 0) / previousScale * nextScale).toFixed(2)),
    credits: semester.credits,
  }));
}

addRowButton.addEventListener("click", () => {
  semesters.push({ sgpa: "", credits: "" });
  renderRows();
});

clearButton.addEventListener("click", () => {
  semesters = [];
  renderRows();
});

sampleButton.addEventListener("click", () => {
  semesters = [
    { sgpa: 8.2, credits: 21 },
    { sgpa: 8.6, credits: 22 },
    { sgpa: 8.9, credits: 20 },
    { sgpa: 9.1, credits: 22 },
  ];
  renderRows();
});

scaleSelect.addEventListener("change", () => {
  convertScale(getScale());
  targetCgpaInput.max = getScale();
  if (Number(targetCgpaInput.value) > getScale()) {
    targetCgpaInput.value = getScale();
  }
  renderRows();
});

[targetCgpaInput, nextCreditsInput].forEach((input) => {
  input.addEventListener("input", updateSummary);
});

targetCgpaInput.max = getScale();
renderRows();
