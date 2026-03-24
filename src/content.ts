interface BlockSettings {
  blockHomeFeed: boolean;
  blockShorts: boolean;
  blockRecommendations: boolean;
}

const DEFAULT_SETTINGS: BlockSettings = {
  blockHomeFeed: true,
  blockShorts: true,
  blockRecommendations: true,
};

const BLOCKED_PATHS = ["/", "/feed/subscriptions", "/feed/trending", "/feed/explore"];

const JAM_MESSAGE_ID = "jam-block-message";

let settings: BlockSettings = { ...DEFAULT_SETTINGS };

function loadSettings(): Promise<BlockSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result as BlockSettings);
    });
  });
}

function isWatchPage(): boolean {
  return location.pathname === "/watch";
}

function isBrowsePage(): boolean {
  return BLOCKED_PATHS.includes(location.pathname);
}

function hide(el: HTMLElement): void {
  el.style.setProperty("display", "none", "important");
}

function show(el: HTMLElement): void {
  el.style.removeProperty("display");
}

function hideAll(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(hide);
}

function showAll(selector: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(show);
}

/** Hide everything in the sidebar except Historial and Ver más tarde */
function cleanSidebar(): void {
  // --- Full guide (expanded sidebar) ---
  const guideEntries = document.querySelectorAll<HTMLElement>(
    "ytd-guide-section-renderer ytd-guide-entry-renderer"
  );
  for (const entry of guideEntries) {
    const link = entry.querySelector("a");
    if (!link) { hide(entry); continue; }
    const href = link.getAttribute("href") ?? "";
    const keepLinks = ["/feed/history", "/playlist?list=WL"];
    if (keepLinks.some((k) => href.includes(k))) {
      show(entry);
    } else {
      hide(entry);
    }
  }

  // Hide section headers (Suscripciones, Tú, Explorar, etc.)
  // but keep the section that contains history/watch-later visible
  const sections = document.querySelectorAll<HTMLElement>("ytd-guide-section-renderer");
  for (const section of sections) {
    const hasHistory = section.querySelector('a[href="/feed/history"]');
    if (hasHistory) {
      show(section);
      // Hide the section title "Tú >"
      const title = section.querySelector<HTMLElement>("#guide-section-title");
      if (title) hide(title);
    } else {
      hide(section);
    }
  }

  // Hide collapsible sections (extra subscriptions)
  hideAll("ytd-guide-collapsible-section-entry-renderer");

  // Hide footer
  hideAll("ytd-guide-renderer #footer");

  // --- Mini guide (collapsed sidebar icons) ---
  const miniEntries = document.querySelectorAll<HTMLElement>(
    "ytd-mini-guide-renderer ytd-mini-guide-entry-renderer"
  );
  for (const entry of miniEntries) {
    const link = entry.querySelector("a");
    if (!link) { hide(entry); continue; }
    const href = link.getAttribute("href") ?? "";
    // Only keep home icon (needed for navigation)
    if (href === "/") {
      show(entry);
    } else {
      hide(entry);
    }
  }
}

function restoreSidebar(): void {
  showAll("ytd-guide-section-renderer");
  showAll("ytd-guide-section-renderer ytd-guide-entry-renderer");
  showAll("ytd-guide-collapsible-section-entry-renderer");
  showAll("ytd-guide-renderer #footer");
  showAll("ytd-mini-guide-renderer ytd-mini-guide-entry-renderer");
  const titles = document.querySelectorAll<HTMLElement>("#guide-section-title");
  titles.forEach(show);
}

function showBlockMessage(): void {
  if (document.getElementById(JAM_MESSAGE_ID)) return;
  const browse = document.querySelector("ytd-browse");
  if (!browse) return;

  const msg = document.createElement("div");
  msg.id = JAM_MESSAGE_ID;
  msg.className = "jam-block-message";
  msg.innerHTML = `<span>🛡️</span><p>Distractions blocked</p><p style="font-size:0.9rem">Use the search bar to find what you need</p>`;
  browse.appendChild(msg);
}

function removeBlockMessage(): void {
  document.getElementById(JAM_MESSAGE_ID)?.remove();
}

const FEED_SELECTORS = [
  "ytd-browse ytd-rich-grid-renderer",
  "ytd-browse ytd-two-column-browse-results-renderer",
  "ytd-browse ytd-section-list-renderer",
  "ytd-browse #primary",
  "ytd-browse #contents",
];

const SHORTS_SELECTORS = [
  "ytd-rich-shelf-renderer[is-shorts]",
  "ytd-reel-shelf-renderer",
  "[is-shorts]",
];

const RECOMMENDATION_SELECTORS = [
  "ytd-watch-next-secondary-results-renderer",
  "#related",
];

function applyBlocking(): void {
  // Clean sidebar (always, to remove subscriptions/shorts/etc.)
  if (settings.blockHomeFeed) {
    cleanSidebar();
  } else {
    restoreSidebar();
  }

  // Block feed on browse pages
  if (settings.blockHomeFeed && isBrowsePage()) {
    FEED_SELECTORS.forEach(hideAll);
    showBlockMessage();
  } else {
    FEED_SELECTORS.forEach(showAll);
    removeBlockMessage();
  }

  // Block shorts everywhere
  if (settings.blockShorts) {
    SHORTS_SELECTORS.forEach(hideAll);
    if (location.pathname.startsWith("/shorts")) {
      window.location.replace("https://www.youtube.com/");
    }
  } else {
    SHORTS_SELECTORS.forEach(showAll);
  }

  // Block recommendations on watch page
  if (settings.blockRecommendations && isWatchPage()) {
    RECOMMENDATION_SELECTORS.forEach(hideAll);
    document.body.classList.add("jam-no-recommendations");
  } else {
    RECOMMENDATION_SELECTORS.forEach(showAll);
    document.body.classList.remove("jam-no-recommendations");
  }
}

// Observe DOM changes since YouTube is a SPA
function startObserver(): void {
  const observer = new MutationObserver(() => {
    applyBlocking();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function watchNavigation(): void {
  let lastUrl = location.href;
  const check = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      applyBlocking();
    }
  };
  document.addEventListener("yt-navigate-finish", () => applyBlocking());
  setInterval(check, 1000);
}

chrome.storage.onChanged.addListener((changes) => {
  for (const key of Object.keys(changes)) {
    if (key in settings) {
      (settings as unknown as Record<string, boolean>)[key] = changes[key].newValue;
    }
  }
  applyBlocking();
});

async function init(): Promise<void> {
  settings = await loadSettings();
  applyBlocking();
  startObserver();
  watchNavigation();
}

init();
