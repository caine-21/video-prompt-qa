const DEFAULT_API_BASE = "https://videopromptqa.netlify.app";

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get("apiBase", (result) => {
      resolve((result.apiBase || "").trim() || DEFAULT_API_BASE);
    });
  });
}

async function evaluatePrompt(prompt) {
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, provider: "deepseek" }),
  });
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// Register context menu once on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "evaluate-prompt",
    title: "Evaluate Prompt",
    contexts: ["selection"],
  });
});

// Context menu click → evaluate → store pending result + update badge
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "evaluate-prompt" || !info.selectionText) return;
  const prompt = info.selectionText.trim();
  chrome.action.setBadgeText({ text: "…" });
  chrome.action.setBadgeBackgroundColor({ color: "#888888" });
  evaluatePrompt(prompt)
    .then((data) => {
      const score = typeof data.overallScore === "number" ? data.overallScore.toFixed(1) : "?";
      chrome.storage.local.set({ pendingResult: { success: true, data, prompt } });
      chrome.action.setBadgeText({ text: score });
      chrome.action.setBadgeBackgroundColor({
        color: data.overallScore >= 7 ? "#22c55e" : data.overallScore >= 5 ? "#f59e0b" : "#ef4444",
      });
    })
    .catch((err) => {
      chrome.storage.local.set({ pendingResult: { success: false, error: err.message, prompt } });
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    });
});

// Message handler for popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "EVALUATE") {
    evaluatePrompt(msg.prompt)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }
  if (msg.type === "GET_API_BASE") {
    getApiBase().then((base) => sendResponse({ base }));
    return true;
  }
  if (msg.type === "CLEAR_BADGE") {
    chrome.action.setBadgeText({ text: "" });
  }
});
