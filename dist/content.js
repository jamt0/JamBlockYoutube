"use strict";
const BLOCKED_PATHS = ["/", "/feed/subscriptions", "/feed/trending", "/feed/explore"];
const JAM_MESSAGE_ID = "jam-block-message";
function isWatchPage() {
    return location.pathname === "/watch";
}
function isBrowsePage() {
    return BLOCKED_PATHS.includes(location.pathname);
}
function hide(el) {
    el.style.setProperty("display", "none", "important");
}
function show(el) {
    el.style.removeProperty("display");
}
function hideAll(selector) {
    document.querySelectorAll(selector).forEach(hide);
}
/** Hide everything in the sidebar except Historial and Ver más tarde */
function cleanSidebar() {
    const guideEntries = document.querySelectorAll("ytd-guide-section-renderer ytd-guide-entry-renderer");
    for (const entry of guideEntries) {
        const link = entry.querySelector("a");
        if (!link) {
            hide(entry);
            continue;
        }
        const href = link.getAttribute("href") ?? "";
        const keepLinks = ["/feed/history", "/playlist?list=WL"];
        if (keepLinks.some((k) => href.includes(k))) {
            show(entry);
        }
        else {
            hide(entry);
        }
    }
    const sections = document.querySelectorAll("ytd-guide-section-renderer");
    for (const section of sections) {
        const hasHistory = section.querySelector('a[href="/feed/history"]');
        if (hasHistory) {
            show(section);
            const title = section.querySelector("#guide-section-title");
            if (title)
                hide(title);
        }
        else {
            hide(section);
        }
    }
    hideAll("ytd-guide-collapsible-section-entry-renderer");
    hideAll("ytd-guide-renderer #footer");
    const miniEntries = document.querySelectorAll("ytd-mini-guide-renderer ytd-mini-guide-entry-renderer");
    for (const entry of miniEntries) {
        const link = entry.querySelector("a");
        if (!link) {
            hide(entry);
            continue;
        }
        const href = link.getAttribute("href") ?? "";
        if (href === "/") {
            show(entry);
        }
        else {
            hide(entry);
        }
    }
}
function showBlockMessage() {
    if (document.getElementById(JAM_MESSAGE_ID))
        return;
    const browse = document.querySelector("ytd-browse");
    if (!browse)
        return;
    const msg = document.createElement("div");
    msg.id = JAM_MESSAGE_ID;
    msg.className = "jam-block-message";
    msg.innerHTML = `<span>🛡️</span><p>Distractions blocked</p><p style="font-size:0.9rem">Use the search bar to find what you need</p>`;
    browse.appendChild(msg);
}
function removeBlockMessage() {
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
function applyBlocking() {
    // Clean sidebar
    cleanSidebar();
    // Block feed on browse pages
    if (isBrowsePage()) {
        FEED_SELECTORS.forEach(hideAll);
        showBlockMessage();
    }
    else {
        removeBlockMessage();
    }
    // Block shorts everywhere
    SHORTS_SELECTORS.forEach(hideAll);
    if (location.pathname.startsWith("/shorts")) {
        window.location.replace("https://www.youtube.com/");
    }
    // Block recommendations on watch page
    if (isWatchPage()) {
        RECOMMENDATION_SELECTORS.forEach(hideAll);
        document.body.classList.add("jam-no-recommendations");
    }
    else {
        document.body.classList.remove("jam-no-recommendations");
    }
}
function startObserver() {
    const observer = new MutationObserver(() => applyBlocking());
    observer.observe(document.body, { childList: true, subtree: true });
}
function watchNavigation() {
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
applyBlocking();
startObserver();
watchNavigation();
