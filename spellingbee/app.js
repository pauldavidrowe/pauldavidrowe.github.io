// ============================================================
// SpellingBee Tracker — Data Layer
// ============================================================
// Data shape stored in localStorage under key "spellingbee":
//
// {
//   words: {
//     "COCA": { missCount: 3, isValid: true },
//     "GOOGLE": { missCount: 0, isValid: false }
//   }
// }
//
// Clusters are NOT stored — computed on the fly by sorting each
// word's letters and grouping words with identical sorted keys.
// ============================================================

const STORAGE_KEY = "spellingbee";

// ── Internal helpers ─────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { words: {} };
    return JSON.parse(raw);
  } catch {
    return { words: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Returns the cluster key for a word: sorted unique letters, uppercased.
// e.g. "COCA" → "ACOO"... wait, we keep duplicates because
// "COCA" (C,O,C,A) and "CACAO" (C,A,C,A,O) have different letter multisets.
// We sort ALL letters (with repeats) so that two words cluster only when
// they use the exact same multiset of letters.
// e.g. "COCA" (A,C,C,O) → "ACCO"
//      "CACAO" (A,A,C,C,O) → "AACCO"
//      "COCOA" (A,C,C,O,O) → "ACCOO"
// These three are all different clusters — but in practice for the Bee
// words tend to share the same UNIQUE letter set rather than exact multiset.
// We'll use UNIQUE sorted letters so COCA/CACAO/COCOA all cluster together
// (they each use only the letters A, C, O):
function clusterKey(word) {
  return [...new Set(word.toUpperCase().split(""))].sort().join("");
}

function normalize(word) {
  return word.trim().toUpperCase();
}

// ── Word operations ──────────────────────────────────────────

/**
 * Log a missed word. If it already exists, increments missCount.
 * If new, adds it with missCount: 1 and isValid: true.
 */
function logMissedWord(word) {
  word = normalize(word);
  if (!word) return;
  const data = loadData();
  if (data.words[word]) {
    data.words[word].missCount += 1;
  } else {
    data.words[word] = { missCount: 1, isValid: true };
  }
  saveData(data);
}

/**
 * Add an invalid (NYT-rejected) word.
 * If already in list, marks it invalid but does NOT touch missCount.
 * If new, adds it with missCount: 0 and isValid: false.
 */
function addInvalidWord(word) {
  word = normalize(word);
  if (!word) return;
  const data = loadData();
  if (data.words[word]) {
    data.words[word].isValid = false;
  } else {
    data.words[word] = { missCount: 0, isValid: false };
  }
  saveData(data);
}

/**
 * Add a known valid word that hasn't been missed.
 * If the word already exists, marks it valid but does NOT touch missCount.
 * If new, adds it with missCount: 0 and isValid: true.
 */
function addKnownWord(word) {
  word = normalize(word);
  if (!word) return;
  const data = loadData();
  if (data.words[word]) {
    data.words[word].isValid = true;
  } else {
    data.words[word] = { missCount: 0, isValid: true };
  }
  saveData(data);
}

/**
 * Update a word's properties.
 * Accepts { missCount, isValid } — omit either to leave it unchanged.
 * Enforces constraint: isValid:false forces missCount to 0.
 */
function updateWord(word, { missCount, isValid } = {}) {
  word = normalize(word);
  if (!word) return;
  const data = loadData();
  if (!data.words[word]) return;

  if (isValid !== undefined) data.words[word].isValid = isValid;
  if (missCount !== undefined) data.words[word].missCount = Math.max(0, missCount);

  // Enforce constraint
  if (!data.words[word].isValid) data.words[word].missCount = 0;

  saveData(data);
}

/**
 * Remove a word.
 */
function removeWord(word) {
  word = normalize(word);
  const data = loadData();
  delete data.words[word];
  saveData(data);
}

// ── Lookup operations ────────────────────────────────────────

/**
 * Returns info about a single word, or null if not found.
 * {
 *   word, missCount, isValid,
 *   cluster: { key, members: ["COCA", "CACAO", "COCOA"] }
 * }
 */
function lookupWord(word) {
  word = normalize(word);
  const data = loadData();
  const entry = data.words[word];
  if (!entry) return null;

  const key = clusterKey(word);
  const wordLetters = new Set(word.split(""));
  const clusterMembers = Object.keys(data.words).filter(w =>
    [...new Set(w.split(""))].every(l => wordLetters.has(l))
  ).sort();

  return {
    word,
    missCount: entry.missCount,
    isValid: entry.isValid,
    cluster: { key, members: clusterMembers },
  };
}

/**
 * Returns all words whose autocomplete prefix matches the query.
 * Results sorted: valid words first, then invalid; within each group alphabetically.
 * Each result: { word, missCount, isValid }
 */
function autocomplete(query) {
  query = normalize(query);
  if (!query) return [];
  const data = loadData();
  return Object.entries(data.words)
    .filter(([w]) => w.startsWith(query))
    .map(([word, entry]) => ({ word, ...entry }))
    .sort((a, b) => {
      if (a.isValid !== b.isValid) return b.isValid - a.isValid; // valid first
      return a.word.localeCompare(b.word);
    });
}

/**
 * Returns all words in the list, sorted the same way as autocomplete.
 */
function allWords() {
  const data = loadData();
  return Object.entries(data.words)
    .map(([word, entry]) => ({ word, ...entry }))
    .sort((a, b) => {
      if (a.isValid !== b.isValid) return b.isValid - a.isValid;
      return a.word.localeCompare(b.word);
    });
}

// ── Export / Import ──────────────────────────────────────────

/**
 * Returns the full data object as a pretty-printed JSON string.
 */
function exportData() {
  return JSON.stringify(loadData(), null, 2);
}

/**
 * Replaces all data with the parsed contents of jsonString.
 * Throws if the JSON is invalid or doesn't match expected shape.
 */
function importData(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON — could not parse file.");
  }
  if (typeof parsed.words !== "object") {
    throw new Error("Unrecognized format — file must have a 'words' object.");
  }
  saveData(parsed);
}

// ── Expose as module-style globals ───────────────────────────
// (No ES module syntax so this works as a plain <script> tag.)

/**
 * Returns all logged words whose unique letter set is a subset of `word`'s
 * unique letter set. If `centerLetter` is provided, further filters to only
 * words that contain that letter. The source word itself is excluded.
 */
function computeCluster(word, centerLetter) {
  word = normalize(word);
  centerLetter = centerLetter ? centerLetter.toUpperCase() : null;
  const wordLetters = new Set(word.split(""));
  const data = loadData();
  return Object.keys(data.words).filter(w => {
    if (w === word) return false;
    if (data.words[w].missCount === 0) return false;
    const wLetters = new Set(w.split(""));
    const isSubset = [...wLetters].every(l => wordLetters.has(l));
    if (!isSubset) return false;
    if (centerLetter) return wLetters.has(centerLetter);
    return true;
  }).sort();
}

window.SpellingBee = {
  logMissedWord,
  addInvalidWord,
  addKnownWord,
  updateWord,
  removeWord,
  lookupWord,
  computeCluster,
  autocomplete,
  allWords,
  exportData,
  importData,
  clusterKey,   // exposed for testing
  normalize,    // exposed for testing
};
