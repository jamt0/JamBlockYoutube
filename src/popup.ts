const SETTINGS_KEYS = [
  "blockHomeFeed",
  "blockShorts",
  "blockRecommendations",
] as const;

type SettingKey = (typeof SETTINGS_KEYS)[number];

function getCheckbox(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

// Load saved settings and update checkboxes
chrome.storage.sync.get(
  { blockHomeFeed: true, blockShorts: true, blockRecommendations: true },
  (result) => {
    for (const key of SETTINGS_KEYS) {
      getCheckbox(key).checked = result[key];
    }
  }
);

// Save on toggle
for (const key of SETTINGS_KEYS) {
  getCheckbox(key).addEventListener("change", () => {
    chrome.storage.sync.set({ [key]: getCheckbox(key).checked });
  });
}
