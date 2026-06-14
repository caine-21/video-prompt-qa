const DEFAULT_API_BASE = "https://videopromptqa.netlify.app";

const input = document.getElementById("api-base");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");
const savedMsg = document.getElementById("saved-msg");
const currentDisplay = document.getElementById("current-display");

function showCurrent(base) {
  const url = (base || "").trim() || DEFAULT_API_BASE;
  currentDisplay.textContent = `${url}/api/evaluate`;
}

chrome.storage.local.get("apiBase", (result) => {
  const saved = result.apiBase || "";
  input.value = saved;
  showCurrent(saved);
});

saveBtn.addEventListener("click", () => {
  const val = input.value.trim().replace(/\/$/, ""); // strip trailing slash
  chrome.storage.local.set({ apiBase: val }, () => {
    showCurrent(val);
    savedMsg.style.display = "block";
    setTimeout(() => { savedMsg.style.display = "none"; }, 2000);
  });
});

resetBtn.addEventListener("click", () => {
  input.value = "";
  chrome.storage.local.remove("apiBase", () => {
    showCurrent("");
    savedMsg.textContent = "✓ Reset to default";
    savedMsg.style.display = "block";
    setTimeout(() => {
      savedMsg.style.display = "none";
      savedMsg.textContent = "✓ Saved";
    }, 2000);
  });
});
