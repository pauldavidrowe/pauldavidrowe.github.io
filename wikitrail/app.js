// ============================================================
// WikiTrail — Core game logic, Wikipedia API, and storage.
// No DOM access here — see ui.js for rendering.
//
// Internally this module is still called WikiRace, and the
// localStorage key is still "wikirace-data" — renaming either
// would orphan existing players' saved history, so they're left
// alone as implementation details invisible to the user.
// ============================================================

const WikiRace = (() => {

  const API_BASE = "https://en.wikipedia.org/w/api.php";
  const STORAGE_KEY = "wikirace-data";
  const SCHEMA_VERSION = 1;
  const MIN_LINKS = 8;
  const MAX_RANDOM_RETRIES = 6;

  // Namespace prefixes (URL-encoded form, underscores for spaces) that are
  // never playable article links — talk pages, files, categories, etc.
  const EXCLUDED_NAMESPACES = [
    "Media", "Special", "Talk", "User", "User_talk", "Wikipedia", "Wikipedia_talk",
    "File", "File_talk", "MediaWiki", "MediaWiki_talk", "Template", "Template_talk",
    "Help", "Help_talk", "Category", "Category_talk", "Portal", "Portal_talk",
    "Draft", "Draft_talk", "TimedText", "TimedText_talk", "Module", "Module_talk",
    "Gadget", "Gadget_talk", "Gadget_definition", "Gadget_definition_talk",
    "Topic", "Book", "Book_talk",
  ];
  const NAMESPACE_RE = new RegExp(`^(${EXCLUDED_NAMESPACES.join("|")}):`);

  // ---------- Wikipedia API ----------

  async function apiFetch(params) {
    const url = new URL(API_BASE);
    url.search = new URLSearchParams({ format: "json", origin: "*", ...params }).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.info || "Wikipedia API error");
    return data;
  }

  async function fetchRandomTitle() {
    const data = await apiFetch({ action: "query", list: "random", rnnamespace: 0, rnlimit: 1 });
    return data.query.random[0].title;
  }

  // Returns { title } if href points to a playable article, else null.
  // Exposed for ui.js, which uses it to decide what happens on link clicks.
  function parseWikiHref(href, className) {
    if (!href || !href.startsWith("/wiki/")) return null;
    if (className && className.includes("new")) return null; // redlink — page doesn't exist
    const raw = href.slice("/wiki/".length).split("#")[0];
    if (!raw || NAMESPACE_RE.test(raw)) return null;
    return { title: decodeURIComponent(raw).replace(/_/g, " ") };
  }

  function extractLinks(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = [];
    const seen = new Set();
    doc.querySelectorAll("a[href]").forEach(a => {
      const parsed = parseWikiHref(a.getAttribute("href"), a.className);
      if (parsed && !seen.has(parsed.title)) {
        seen.add(parsed.title);
        links.push(parsed);
      }
    });
    return links;
  }

  // Returns [{ id, text, level }] for each h2/h3 in the article — used to
  // build the table-of-contents drawer. Matches current Wikipedia parser
  // output, where heading ids live directly on the <h2>/<h3> element.
  function extractHeadings(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = [];
    doc.querySelectorAll("h2[id], h3[id]").forEach(h => {
      headings.push({
        id: h.id,
        text: h.textContent.trim(),
        level: h.tagName === "H2" ? 2 : 3,
      });
    });
    return headings;
  }

  async function parseArticle(title) {
    const data = await apiFetch({
      action: "parse",
      page: title,
      prop: "text|pageprops",
      redirects: 1,
    });
    const p = data.parse;
    const html = p.text["*"];
    return {
      title: p.title,
      pageid: p.pageid,
      html,
      isDisambiguation: !!(p.pageprops && "disambiguation" in p.pageprops),
      links: extractLinks(html),
      headings: extractHeadings(html),
    };
  }

  // Fetches a random article suitable as a start/target: a real article
  // (not a disambiguation page) with enough outbound links to be playable.
  async function fetchRandomPlayableArticle(excludeTitle) {
    for (let i = 0; i < MAX_RANDOM_RETRIES; i++) {
      const title = await fetchRandomTitle();
      if (excludeTitle && title === excludeTitle) continue;
      const article = await parseArticle(title);
      if (!article.isDisambiguation
        && article.links.length >= MIN_LINKS
        && article.title !== excludeTitle) {
        return article;
      }
    }
    throw new Error("Couldn't find a good random article — try again.");
  }

  // ---------- Storage ----------

  function loadData() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      raw = null;
    }
    if (!raw || raw.schemaVersion !== SCHEMA_VERSION) {
      return { schemaVersion: SCHEMA_VERSION, currentGame: null, games: [] };
    }
    return raw;
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  let data = loadData();

  // ---------- Game engine ----------

  function getCurrentGame() {
    return data.currentGame;
  }

  function getHistory() {
    return data.games;
  }

  function normalizeTitle(t) {
    return t.trim().toLowerCase().replace(/_/g, " ");
  }

  async function startNewGame() {
    const start = await fetchRandomPlayableArticle(null);
    const target = await fetchRandomPlayableArticle(start.title);
    const now = new Date().toISOString();
    data.currentGame = {
      id: crypto.randomUUID(),
      startedAt: now,
      finishedAt: null,
      status: "in_progress",
      start: { title: start.title, pageid: start.pageid },
      target: { title: target.title, pageid: target.pageid },
      path: [{ title: start.title, pageid: start.pageid, arrivedAt: now, viaLinkText: null }],
      backtracks: 0,
    };
    saveData();
    return { game: data.currentGame, article: start };
  }

  // Re-fetches the article for the current step — used to resume a game
  // after a page reload, since we don't persist full article HTML.
  async function loadCurrentArticle() {
    const game = data.currentGame;
    if (!game) return null;
    const last = game.path[game.path.length - 1];
    return parseArticle(last.title);
  }

  async function selectLink(title, linkText) {
    const game = data.currentGame;
    if (!game) throw new Error("No game in progress");
    const article = await parseArticle(title);
    const now = new Date().toISOString();
    game.path.push({ title: article.title, pageid: article.pageid, arrivedAt: now, viaLinkText: linkText });

    const won = normalizeTitle(article.title) === normalizeTitle(game.target.title);
    if (won) {
      finishGame("won");
    } else {
      saveData();
    }
    return { game, article, won };
  }

  function giveUp() {
    finishGame("gave_up");
  }

  function finishGame(status) {
    const game = data.currentGame;
    if (!game) return;
    game.status = status;
    game.finishedAt = new Date().toISOString();
    game.stats = {
      linksFollowed: game.path.length - 1,
      durationMs: new Date(game.finishedAt) - new Date(game.startedAt),
      backtracks: game.backtracks || 0,
    };
    data.games.unshift(game);
    data.currentGame = null;
    saveData();
  }

  // Undoes the last move (like a true "undo", not a browser-style history
  // pointer) — the popped step is gone, but we keep a count of how many
  // times the player backtracked. Returns the title to re-render, or null
  // if already at the start article.
  function goBack() {
    const game = data.currentGame;
    if (!game || game.path.length <= 1) return null;
    game.path.pop();
    game.backtracks = (game.backtracks || 0) + 1;
    saveData();
    return game.path[game.path.length - 1].title;
  }

  // Read-only article fetch — used for the target preview, which must
  // never touch game state.
  function getArticle(title) {
    return parseArticle(title);
  }

  // ---------- Stats ----------

  function computeStats() {
    const games = data.games;
    const won = games.filter(g => g.status === "won");
    const winRate = games.length ? Math.round((won.length / games.length) * 100) : 0;
    const avgLinks = won.length
      ? Math.round((won.reduce((s, g) => s + g.stats.linksFollowed, 0) / won.length) * 10) / 10
      : 0;

    const hubCounts = {};
    for (const g of games) {
      for (const step of g.path.slice(1, -1)) {
        hubCounts[step.title] = (hubCounts[step.title] || 0) + 1;
      }
    }
    const topHubs = Object.entries(hubCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    return { totalGames: games.length, wins: won.length, winRate, avgLinks, topHubs };
  }

  // ---------- Export / import ----------

  function exportData() {
    return JSON.stringify(data, null, 2);
  }

  function importData(json) {
    const parsed = JSON.parse(json);
    if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error("Unrecognized data format");
    data = parsed;
    saveData();
  }

  function clearHistory() {
    data.games = [];
    saveData();
  }

  return {
    getCurrentGame, getHistory, startNewGame, loadCurrentArticle,
    selectLink, giveUp, goBack, getArticle, computeStats, exportData, importData, clearHistory,
    parseWikiHref,
  };
})();
