const input = document.getElementById("prompt-input");
const btn = document.getElementById("evaluate-btn");
const resultArea = document.getElementById("result-area");

function scoreClass(s) {
  return s >= 7 ? "high" : s >= 5 ? "mid" : "low";
}

function barColor(s) {
  return s >= 7 ? "bar-high" : s >= 5 ? "bar-mid" : "bar-low";
}

function renderResult(prompt, data) {
  const s = data.overallScore;
  const cls = scoreClass(s);
  const labelClass = `label-${cls}`;
  const scoreClass_ = `score-${cls}`;

  const subjectAnatomy = (data.anatomy || []).find((a) => a.component === "Subject");
  const subjectAbsent = subjectAnatomy?.status === "absent";
  const weakDims = (data.dimensions || []).filter((d) => d.score < 5);

  const warningsHtml = (() => {
    const items = [];
    if (subjectAbsent) {
      items.push(`<div class="warning-item"><span class="warning-icon">⚠</span><span>Missing subject — Specificity capped at ≤3. The model won't know what to generate.</span></div>`);
    }
    weakDims.forEach((d) => {
      if (d.name === "Specificity" && subjectAbsent) return; // already covered
      items.push(`<div class="warning-item"><span class="warning-icon">⚠</span><span>${d.name} is low (${d.score}/10)</span></div>`);
    });
    return items.length ? `<div class="warnings">${items.join("")}</div>` : "";
  })();

  const dimsHtml = (data.dimensions || []).map((d) => {
    const barW = Math.round(d.score * 10);
    const bc = barColor(d.score);
    const shortName = d.name.replace("Technical Feasibility", "Tech Feasibility").replace("Cinematic Quality", "Cinematic");
    return `
      <div class="dim-row" title="${d.feedback}">
        <div class="dim-name">${shortName}</div>
        <div class="dim-bar-wrap"><div class="dim-bar-fill ${bc}" style="width:${barW}%"></div></div>
        <div class="dim-score">${d.score}</div>
      </div>`;
  }).join("");

  const topImprovements = (data.improvements || []).slice(0, 2);
  const improvementsHtml = topImprovements.length ? `
    <div class="improvements">
      <div class="section-label">Suggestions</div>
      ${topImprovements.map((imp) => `<div class="imp-item">${imp}</div>`).join("")}
    </div>` : "";

  resultArea.innerHTML = `
    <div class="score-block">
      <span class="score-num ${scoreClass_}">${s.toFixed(1)}</span>
      <span class="score-denom">/ 10</span>
      <span class="score-label ${labelClass}">${s >= 7 ? "STRONG" : s >= 5 ? "WEAK" : "FAIL"}</span>
    </div>
    ${warningsHtml}
    <div class="dimensions">${dimsHtml}</div>
    ${improvementsHtml}
    <div class="footer">
      <span>${data.provider?.toUpperCase() ?? "GROQ"} · ${new Date(data.timestamp).toLocaleTimeString()}</span>
      <a href="https://videopromptqa.netlify.app" target="_blank">Open full app ↗</a>
    </div>`;
}

function renderError(msg) {
  resultArea.innerHTML = `<div class="error-block">Error: ${msg}</div>`;
}

function renderLoading() {
  resultArea.innerHTML = `<div class="loading">Evaluating…</div>`;
}

async function doEvaluate(prompt) {
  if (!prompt.trim()) return;
  btn.disabled = true;
  renderLoading();
  chrome.runtime.sendMessage({ type: "EVALUATE", prompt: prompt.trim() }, (res) => {
    btn.disabled = false;
    if (chrome.runtime.lastError) {
      renderError(chrome.runtime.lastError.message);
      return;
    }
    if (res?.success) {
      renderResult(prompt, res.data);
    } else {
      renderError(res?.error || "Unknown error");
    }
  });
}

btn.addEventListener("click", () => doEvaluate(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) doEvaluate(input.value);
});

// On popup open: check for pending result from context menu
chrome.storage.local.get("pendingResult", (stored) => {
  if (stored.pendingResult) {
    const { success, data, prompt, error } = stored.pendingResult;
    chrome.storage.local.remove("pendingResult");
    chrome.runtime.sendMessage({ type: "CLEAR_BADGE" });
    if (prompt) input.value = prompt;
    if (success && data) {
      renderResult(prompt, data);
    } else if (error) {
      renderError(error);
    }
  }
});

// Settings link → open options in a new tab (chrome extension pages can't be iframed)
document.getElementById("settings-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
