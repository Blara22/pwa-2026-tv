import { canPromptInstall, promptInstall, isStandalone } from "./installPrompt.js";

const button = () => document.getElementById("install-btn");

function paint() {
  const el = button();
  if (!el) return;
  el.hidden = !canPromptInstall() || isStandalone();
}

export function initInstallButton() {
  paint();
  window.addEventListener("install-state-changed", paint);
  button()?.addEventListener("click", async () => {
    await promptInstall();
    paint();
  });
}