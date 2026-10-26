// ============================================================
// WikiTrail — DOM rendering and event wiring.
// All WikiRace.* calls come from app.js (see app.js for why that
// module is still named WikiRace internally); this file never
// talks to the Wikipedia API directly.
// ============================================================

(() => {

  const el = (id) => document.getElementById(id);

  const tabs = document.querySelectorAll(".tab");
  const panels = {
    play: el("panel-play"),
    history: el("panel-history"),
    explore: el("panel-explore"),
  };

  const gameBanner = el("game-banner");
  const bannerStart = el("banner-start");
  const bannerTarget = el("banner-target");
  const bannerLinks = el("banner-links");
  const backBtn = el("back-btn");
  const tocBtn = el("toc-btn");
  const giveUpBtn = el("give-up-btn");
  const pathTrail = el("path-trail");
  const playEmpty = el("play-empty");
  const playLoading = el("play-loading");
  const articleArea = el("article-area");
  const articleWrap = el("article-wrap");
  const articleFrame = el("article-frame");
  const previewBanner = el("preview-banner");
  const playToast = el("play-toast");

  const resultModal = el("result-modal");
  const resultTitle = el("result-title");
  const resultSummary = el("result-summary");
  const resultPath = el("result-path");

  const tocDrawer = el("toc-drawer");
  const tocBackdrop = el("toc-backdrop");
  const tocList = el("toc-list");

  const exploreFrame = el("explore-frame");

  // Article currently shown for real gameplay (not a target preview) —
  // cached so "back to game" can restore it without a network round trip.
  let liveArticle = null;
  let liveScrollY = 0; // scroll position in liveArticle when preview was opened
  let activeHeadings = [];
  let inPreviewMode = false;

  // scrollPositions[i] = scrollY captured the moment the player clicked a
  // link out of path[i], so "back" can return them to that exact spot
  // instead of the top of the article. Session-only, not persisted.
  let scrollPositions = [];
  let pendingScrollY = 0;

  // ---------- small helpers ----------

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatDuration(ms) {
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  let toastTimer = null;
  function showToast(msg) {
    playToast.textContent = msg;
    playToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { playToast.hidden = true; }, 2200);
  }

  // Disabling these while a fetch is in flight closes a real race: without
  // it, tapping TOC/Back/Give-up between a link click and that article's
  // fetch resolving reads state (activeHeadings, game.path) that still
  // belongs to the article being left, not the one being loaded.
  function setLoading(isLoading) {
    playLoading.hidden = !isLoading;
    if (isLoading) articleArea.hidden = true;
    tocBtn.disabled = isLoading;
    backBtn.disabled = isLoading;
    giveUpBtn.disabled = isLoading;
    bannerTarget.disabled = isLoading;
  }

  function canGoBackNow() {
    const game = WikiRace.getCurrentGame();
    return !!game && game.path.length > 1;
  }

  // ---------- tabs ----------

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.toggle("active", b === btn));
      Object.entries(panels).forEach(([name, panel]) => {
        panel.hidden = name !== btn.dataset.tab;
      });
      if (btn.dataset.tab === "history") renderHistoryTab();
      if (btn.dataset.tab === "explore") ensureExploreLoaded();
    });
  });

  // ---------- play panel ----------

  function updateBanner(game) {
    gameBanner.hidden = false;
    bannerStart.textContent = game.start.title;
    bannerTarget.textContent = game.target.title;
    const n = game.path.length - 1;
    bannerLinks.textContent = `${n} link${n === 1 ? "" : "s"}`;
  }

  function updatePathTrail(game) {
    pathTrail.hidden = false;
    pathTrail.innerHTML = game.path
      .map(step => `<span class="trail-step">${escapeHtml(step.title)}</span>`)
      .join('<span class="trail-arrow">→</span>');
    pathTrail.scrollLeft = pathTrail.scrollWidth;
  }

  function buildFrameDoc(article) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<base href="https://en.wikipedia.org/wiki/">
<link rel="stylesheet" href="https://en.wikipedia.org/w/load.php?lang=en&modules=site.styles&only=styles&skin=vector-2022">
<style>
  body { margin: 16px; font-family: sans-serif; font-size: 16px; line-height: 1.5; touch-action: pan-y; }
  .mw-editsection { display: none; }
  table.infobox { float: none; width: 100%; margin: 1em 0; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${escapeHtml(article.title)}</h1>
<div class="mw-parser-output">${article.html}</div>
</body>
</html>`;
  }

  // preview: true shows this article in the visually-distinct, links-dead
  // preview mode (used for the target peek); false is normal gameplay.
  // scrollY, if given, is restored once the frame finishes loading.
  function loadArticleIntoFrame(article, { preview = false, scrollY = 0 } = {}) {
    // Un-hide before writing content, not after — rendering into a
    // display:none iframe is the kind of thing WebKit can handle
    // differently (e.g. an incomplete snapshot) than a visible one.
    articleArea.hidden = false;
    playLoading.hidden = true;
    articleFrame.srcdoc = buildFrameDoc(article);
    activeHeadings = article.headings || [];
    pendingScrollY = scrollY;

    inPreviewMode = preview;
    articleWrap.classList.toggle("preview-mode", preview);
    previewBanner.hidden = !preview;
    backBtn.hidden = preview || !canGoBackNow();

    if (!preview) liveArticle = article;
  }

  // Attached once; fires on every srcdoc load, including reloads.
  articleFrame.addEventListener("load", () => {
    const doc = articleFrame.contentDocument;
    if (!doc) {
      // The iframe navigated somewhere we don't have same-origin access to
      // (e.g. it escaped to a real external page) — we've lost JS control
      // over it. Recover by re-rendering our own last-known-good content
      // rather than leaving the player stuck looking at it silently.
      showToast("Something went wrong with that page — reloading it.");
      if (liveArticle) loadArticleIntoFrame(liveArticle, { preview: inPreviewMode });
      return;
    }
    if (pendingScrollY) {
      // Instant, not smooth — smooth scrolling doesn't run in this
      // sandboxed iframe (no script context of its own to animate it).
      articleFrame.contentWindow.scrollTo(0, pendingScrollY);
      pendingScrollY = 0;
    }
    doc.addEventListener("click", (e) => {
      // preventDefault unconditionally, before anything else — if a click
      // inside this iframe is ever allowed through to the browser's
      // default handling, it natively navigates to the real Wikipedia
      // page, which silently takes the iframe cross-origin and permanently
      // strips our JS access to it (no more click interception, nothing —
      // not recoverable without a full reload). Finding the <a> and
      // deciding what to do with it happens only after this.
      e.preventDefault();
      let a = null;
      try {
        a = e.target && e.target.closest ? e.target.closest("a") : null;
      } catch {
        a = null;
      }
      if (!a) return;
      if (inPreviewMode) {
        showToast("Links are disabled while previewing.");
        return;
      }
      const parsed = WikiRace.parseWikiHref(a.getAttribute("href"), a.className);
      if (parsed) {
        handleLinkClick(parsed.title, a.textContent.trim());
      } else {
        showToast("That link won't help you here.");
      }
    }, true);
  });

  async function handleLinkClick(title, linkText) {
    const current = WikiRace.getCurrentGame();
    if (current) scrollPositions[current.path.length - 1] = articleFrame.contentWindow.scrollY;
    setLoading(true);
    try {
      const { game, article, won } = await WikiRace.selectLink(title, linkText);
      if (won) {
        showResultModal(game, "won");
        resetPlayPanel();
      } else {
        updateBanner(game);
        updatePathTrail(game);
        loadArticleIntoFrame(article);
      }
    } catch (err) {
      showToast("Couldn't load that article — try another link.");
    } finally {
      setLoading(false);
    }
  }

  function setEmptyState(visible) {
    playEmpty.hidden = !visible;
  }

  function resetPlayPanel() {
    gameBanner.hidden = true;
    pathTrail.hidden = true;
    articleArea.hidden = true;
    playEmpty.hidden = false;
    inPreviewMode = false;
    liveArticle = null;
    liveScrollY = 0;
    activeHeadings = [];
    previewBanner.hidden = true;
    articleWrap.classList.remove("preview-mode");
    scrollPositions = [];
  }

  async function handleNewGame() {
    setEmptyState(false);
    setLoading(true);
    scrollPositions = [];
    try {
      const { game, article } = await WikiRace.startNewGame();
      updateBanner(game);
      updatePathTrail(game);
      loadArticleIntoFrame(article);
    } catch (err) {
      showToast(err.message || "Something went wrong — try again.");
      resetPlayPanel();
    } finally {
      setLoading(false);
    }
  }

  function handleGiveUp() {
    const game = WikiRace.getCurrentGame();
    if (!game) return; // no game in progress — button shouldn't be reachable, but don't crash if it is
    if (inPreviewMode) closePreview();
    if (!confirm("Give up on this trail?")) return;
    WikiRace.giveUp();
    showResultModal(game, "gave_up");
    resetPlayPanel();
  }

  el("new-game-btn").addEventListener("click", handleNewGame);
  giveUpBtn.addEventListener("click", handleGiveUp);

  // ---------- target preview ----------

  async function handlePreviewTarget() {
    const game = WikiRace.getCurrentGame();
    if (!game || inPreviewMode) return;
    liveScrollY = articleFrame.contentWindow.scrollY;
    setLoading(true);
    try {
      const article = await WikiRace.getArticle(game.target.title);
      loadArticleIntoFrame(article, { preview: true });
    } catch {
      showToast("Couldn't load a preview — try again.");
    } finally {
      setLoading(false);
    }
  }

  function closePreview() {
    if (!inPreviewMode || !liveArticle) return;
    loadArticleIntoFrame(liveArticle, { preview: false, scrollY: liveScrollY });
  }

  bannerTarget.addEventListener("click", handlePreviewTarget);
  el("preview-close-btn").addEventListener("click", closePreview);

  // ---------- back navigation ----------

  async function handleBack() {
    if (inPreviewMode) { closePreview(); return; }
    if (!canGoBackNow()) return;
    setLoading(true);
    try {
      WikiRace.goBack();
      const game = WikiRace.getCurrentGame();
      updateBanner(game);
      updatePathTrail(game);
      const article = await WikiRace.loadCurrentArticle();
      const savedScrollY = scrollPositions[game.path.length - 1] || 0;
      loadArticleIntoFrame(article, { scrollY: savedScrollY });
    } catch {
      showToast("Couldn't go back — try again.");
    } finally {
      setLoading(false);
    }
  }

  backBtn.addEventListener("click", handleBack);

  // ---------- table of contents drawer ----------

  function renderToc() {
    tocList.innerHTML = activeHeadings.length
      ? activeHeadings.map(h =>
          `<button type="button" class="toc-item level-${h.level}" data-id="${escapeHtml(h.id)}">${escapeHtml(h.text)}</button>`
        ).join("")
      : `<p class="toc-empty">No sections found.</p>`;
  }

  function openToc() {
    renderToc();
    tocDrawer.classList.add("open");
    tocBackdrop.classList.add("open");
  }

  function closeToc() {
    tocDrawer.classList.remove("open");
    tocBackdrop.classList.remove("open");
  }

  tocBtn.addEventListener("click", openToc);
  el("toc-close-btn").addEventListener("click", closeToc);
  tocBackdrop.addEventListener("click", closeToc);

  tocList.addEventListener("click", (e) => {
    const btn = e.target.closest(".toc-item");
    if (!btn) return;
    const doc = articleFrame.contentDocument;
    const target = doc && doc.getElementById(btn.dataset.id);
    // Smooth scrolling doesn't run inside this sandboxed iframe (it has no
    // script context of its own to drive the animation), so jump instantly.
    if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
    closeToc();
  });

  // ---------- result modal ----------

  function showResultModal(game, status) {
    if (status === "won") {
      resultTitle.textContent = "🎉 You made it!";
      resultSummary.textContent =
        `${game.stats.linksFollowed} link${game.stats.linksFollowed === 1 ? "" : "s"} in ${formatDuration(game.stats.durationMs)}`;
    } else {
      resultTitle.textContent = "Gave up";
      resultSummary.textContent =
        `You made it ${game.stats.linksFollowed} link${game.stats.linksFollowed === 1 ? "" : "s"} toward "${game.target.title}".`;
    }

    resultPath.innerHTML = game.path.map((step, i) => {
      const via = step.viaLinkText
        ? ` <span class="via">via "${escapeHtml(step.viaLinkText)}"</span>`
        : "";
      return `<div class="path-step">${i + 1}. ${escapeHtml(step.title)}${via}</div>`;
    }).join("");

    resultModal.hidden = false;
  }

  el("result-close-btn").addEventListener("click", () => { resultModal.hidden = true; });
  el("result-again-btn").addEventListener("click", () => {
    resultModal.hidden = true;
    handleNewGame();
  });

  // ---------- history panel ----------

  function renderHistoryTab() {
    const stats = WikiRace.computeStats();
    const summaryEl = el("stats-summary");
    summaryEl.innerHTML = `
      <div class="stat"><span class="stat-value">${stats.totalGames}</span><span class="stat-label">games</span></div>
      <div class="stat"><span class="stat-value">${stats.wins}</span><span class="stat-label">won</span></div>
      <div class="stat"><span class="stat-value">${stats.winRate}%</span><span class="stat-label">win rate</span></div>
      <div class="stat"><span class="stat-value">${stats.avgLinks}</span><span class="stat-label">avg links</span></div>
    `;

    const hubsEl = el("stats-hubs");
    hubsEl.innerHTML = stats.topHubs.length
      ? `<p class="hubs-label">Your most-crossed articles</p><ul>${
          stats.topHubs.map(h => `<li>${escapeHtml(h.title)} <span class="hub-count">×${h.count}</span></li>`).join("")
        }</ul>`
      : "";

    const games = WikiRace.getHistory();
    const listEl = el("history-list");
    listEl.innerHTML = games.length ? games.map(renderHistoryItem).join("") : `<p class="empty-note">No games yet.</p>`;
  }

  function renderHistoryItem(game) {
    const when = new Date(game.finishedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const outcome = game.status === "won"
      ? `Won in ${game.stats.linksFollowed} link${game.stats.linksFollowed === 1 ? "" : "s"} (${formatDuration(game.stats.durationMs)})`
      : `Gave up after ${game.stats.linksFollowed} link${game.stats.linksFollowed === 1 ? "" : "s"}`;

    const pathHtml = game.path.map((step, i) => {
      const via = step.viaLinkText ? ` <span class="via">via "${escapeHtml(step.viaLinkText)}"</span>` : "";
      return `<div class="path-step">${i + 1}. ${escapeHtml(step.title)}${via}</div>`;
    }).join("");

    return `
      <details class="history-item">
        <summary>
          <span class="history-route">${escapeHtml(game.start.title)} → ${escapeHtml(game.target.title)}</span>
          <span class="history-outcome ${game.status}">${outcome}</span>
          <span class="history-when">${when}</span>
        </summary>
        <div class="history-detail">${pathHtml}</div>
      </details>
    `;
  }

  // ---------- data management ----------

  el("export-btn").addEventListener("click", () => {
    const blob = new Blob([WikiRace.exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wikitrail-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  el("import-btn").addEventListener("click", () => el("import-file-input").click());

  el("import-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      WikiRace.importData(await file.text());
      renderHistoryTab();
      showToast("Import complete.");
    } catch (err) {
      alert("Couldn't import that file: " + err.message);
    }
    e.target.value = "";
  });

  el("clear-btn").addEventListener("click", () => {
    if (!confirm("Clear all game history? This can't be undone.")) return;
    WikiRace.clearHistory();
    renderHistoryTab();
  });

  // ---------- explore panel ----------
  // A plain Wikipedia browser — the real mobile site, embedded directly.
  // No game state is read or written from here.

  let exploreLoaded = false;
  function ensureExploreLoaded() {
    if (exploreLoaded) return;
    exploreFrame.src = "https://en.m.wikipedia.org/";
    exploreLoaded = true;
  }

  el("explore-search-btn").addEventListener("click", () => {
    exploreFrame.src = "https://en.m.wikipedia.org/wiki/Special:Search";
  });

  el("explore-random-btn").addEventListener("click", () => {
    exploreFrame.src = "https://en.m.wikipedia.org/wiki/Special:Random";
  });

  // ---------- init ----------

  async function init() {
    ensureExploreLoaded(); // Explore is the default tab shown on load
    const game = WikiRace.getCurrentGame();
    if (!game) return;
    setEmptyState(false);
    setLoading(true);
    updateBanner(game);
    updatePathTrail(game);
    try {
      const article = await WikiRace.loadCurrentArticle();
      loadArticleIntoFrame(article);
    } catch {
      showToast("Couldn't reload your game — check your connection and refresh.");
    } finally {
      setLoading(false);
    }
  }

  init();
})();
