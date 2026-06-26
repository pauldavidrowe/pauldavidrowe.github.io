// ============================================================
// SpellingBee Tracker — UI Controller
// Requires app.js (window.SpellingBee) to be loaded first.
// ============================================================

const SB = window.SpellingBee;

// ── Utility helpers ──────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showFeedback(el, message, type = "success") {
  el.textContent = message;
  el.className = "feedback " + type;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 3000);
}

function buildDropdown(items, targetUl, onSelect) {
  targetUl.innerHTML = "";
  if (!items.length) { targetUl.hidden = true; return; }

  items.slice(0, 8).forEach(item => {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "word-name";
    nameSpan.textContent = item.word;

    const metaSpan = document.createElement("span");
    metaSpan.className = "word-meta";

    if (!item.isValid) {
      const badge = document.createElement("span");
      badge.className = "badge badge-invalid";
      badge.textContent = "invalid";
      metaSpan.appendChild(badge);
    } else if (item.missCount > 0) {
      const badge = document.createElement("span");
      badge.className = "badge badge-missed";
      badge.textContent = `missed ${item.missCount}×`;
      metaSpan.appendChild(badge);
    }

    li.appendChild(nameSpan);
    li.appendChild(metaSpan);
    li.addEventListener("mousedown", e => {
      e.preventDefault(); // prevent blur before click fires
      onSelect(item.word);
    });
    targetUl.appendChild(li);
  });

  targetUl.hidden = false;
}

function wireAutocomplete(inputEl, dropdownEl, onSelect) {
  inputEl.addEventListener("input", () => {
    const q = inputEl.value.trim();
    if (!q) { dropdownEl.hidden = true; return; }
    const results = SB.autocomplete(q);
    buildDropdown(results, dropdownEl, word => {
      inputEl.value = word;
      dropdownEl.hidden = true;
      onSelect && onSelect(word);
    });
  });

  inputEl.addEventListener("blur", () => {
    // Small delay so mousedown on dropdown fires first
    setTimeout(() => { dropdownEl.hidden = true; }, 150);
  });

  inputEl.addEventListener("focus", () => {
    const q = inputEl.value.trim();
    if (q) {
      const results = SB.autocomplete(q);
      buildDropdown(results, dropdownEl, word => {
        inputEl.value = word;
        dropdownEl.hidden = true;
        onSelect && onSelect(word);
      });
    }
  });
}

// ── Tab switching ─────────────────────────────────────────────

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;
    document.querySelectorAll(".panel").forEach(p => {
      p.hidden = true;
      p.classList.remove("active");
    });
    const panel = $("panel-" + target);
    panel.hidden = false;
    panel.classList.add("active");
  });
});

// ── LOG PANEL ─────────────────────────────────────────────────

const logWordInput    = $("log-word-input");
const logWordDropdown = $("log-word-dropdown");
const logSubmitBtn    = $("log-submit-btn");
const logFeedback     = $("log-feedback");
const wordOptions     = $("word-options");
const toggleMissed    = $("toggle-missed");
const toggleValid     = $("toggle-valid");

// ── Toggle interdependency ────────────────────────────────────
// Rule: missed=true requires valid=true (can't miss an invalid word)
toggleMissed.addEventListener("change", () => {
  if (toggleMissed.checked) {
    toggleValid.checked = true;   // missed → must be valid
  }
  updateSubmitLabel();
});

toggleValid.addEventListener("change", () => {
  if (!toggleValid.checked) {
    toggleMissed.checked = false; // invalid → can't have missed it
  }
  updateSubmitLabel();
});

function updateSubmitLabel() {
  if (toggleMissed.checked) {
    logSubmitBtn.textContent = "Log missed word";
  } else if (!toggleValid.checked) {
    logSubmitBtn.textContent = "Add invalid word";
  } else {
    logSubmitBtn.textContent = "Add known word";
  }
}

wireAutocomplete(logWordInput, logWordDropdown);

logSubmitBtn.addEventListener("click", () => {
  const word = logWordInput.value.trim().toUpperCase();
  if (!word) {
    showFeedback(logFeedback, "Please enter a word.", "error");
    logWordInput.focus();
    return;
  }

  const missed  = toggleMissed.checked;
  const isValid = toggleValid.checked;

  if (missed) {
    SB.logMissedWord(word);  // sets isValid: true, increments missCount
    const count = SB.lookupWord(word).missCount;
    showFeedback(logFeedback, `"${word}" logged. Missed ${count}× total.`, "success");
  } else if (!isValid) {
    SB.addInvalidWord(word);
    showFeedback(logFeedback, `"${word}" saved as invalid.`, "success");
  } else {
    // Known valid word, not missed — add with missCount 0 and isValid true
    SB.addKnownWord(word);
    showFeedback(logFeedback, `"${word}" added to your list.`, "success");
  }

  logWordInput.value = "";
  logWordDropdown.hidden = true;
  logWordInput.focus();
});

// Allow Enter key to submit
logWordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { logSubmitBtn.click(); }
});

// ── EXPLORE PANEL ─────────────────────────────────────────────

// Sub-tab switching
document.querySelectorAll(".type-btn[data-explore]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".type-btn[data-explore]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.explore;
    document.querySelectorAll(".explore-view").forEach(v => { v.hidden = true; v.classList.remove("active"); });
    const view = $("explore-" + target);
    view.hidden = false;
    view.classList.add("active");

    if (target === "all-words") renderAllWords();
  });
});

// ── Word lookup ───────────────────────────────────────────────

const exploreWordInput    = $("explore-word-input");
const exploreWordDropdown = $("explore-word-dropdown");
const lookupResult        = $("lookup-result");

// History stack of previously-viewed lookup words, for the back button / swipe.
let lookupHistory     = [];
let currentLookupWord = null;

function goBackLookup() {
  if (!lookupHistory.length) return;
  const prev = lookupHistory.pop();
  exploreWordInput.value = prev;
  renderLookupResult(prev, { isBack: true });
}

function renderLookupResult(word, { isBack = false } = {}) {
  word = word.trim().toUpperCase();
  if (!word) { lookupResult.hidden = true; return; }

  if (!isBack && currentLookupWord && currentLookupWord !== word) {
    lookupHistory.push(currentLookupWord);
  }
  currentLookupWord = word;

  const info = SB.lookupWord(word); // null if word not in list
  const letters = [...new Set(word.split(""))].sort();
  let selectedCenter = null;
  let clusterRevealed = false;

  // ── Static card HTML ──
  const validityBadge = info && !info.isValid
    ? `<span class="badge badge-invalid">invalid</span>` : "";

  const missCountRow = info && info.isValid ? `
    <div class="result-row">
      <span class="result-label">Times missed</span>
      <span class="result-value">${info.missCount}</span>
    </div>` : "";

  const notLoggedNote = !info
    ? `<p class="not-logged-note">Not in your list</p>` : "";

  const editSection = info ? `
    <div class="result-section result-actions">
      <button class="btn-edit" id="edit-word-btn">Edit</button>
      <button class="btn-delete" id="delete-word-btn">Delete</button>
    </div>
    <div id="edit-form" class="edit-form" hidden>
      <div class="toggle-group">
        <div class="toggle-row">
          <span class="toggle-label">NYT accepts it</span>
          <label class="toggle-switch">
            <input type="checkbox" id="edit-toggle-valid" ${info.isValid ? "checked" : ""} />
            <span class="toggle-thumb"></span>
          </label>
        </div>
        <div class="toggle-row" id="edit-count-row">
          <span class="toggle-label">Times missed</span>
          <div class="stepper">
            <button class="stepper-btn" id="stepper-minus">−</button>
            <span class="stepper-value" id="stepper-count">${info.missCount}</span>
            <button class="stepper-btn" id="stepper-plus">+</button>
          </div>
        </div>
      </div>
      <div class="edit-form-actions">
        <button class="btn-primary" id="edit-save-btn">Save</button>
        <button class="btn-secondary" id="edit-cancel-btn">Cancel</button>
      </div>
    </div>` : "";

  const backButton = lookupHistory.length > 0
    ? `<button class="btn-ghost" id="lookup-back-btn">← Back</button>` : "";

  lookupResult.innerHTML = `
    ${backButton}
    <div class="result-word ${info && !info.isValid ? "invalid" : ""}">${word} ${validityBadge}</div>
    ${notLoggedNote}
    ${missCountRow}
    <div class="result-section">
      <div class="result-section-title">Center letter <span class="center-letter-hint">(tap to filter cluster)</span></div>
      <div class="letter-tiles" id="letter-tiles">
        ${letters.map(l => `<button class="letter-tile" data-letter="${l}">${l}</button>`).join("")}
      </div>
    </div>
    <div id="cluster-section"></div>
    ${editSection}
  `;
  lookupResult.hidden = false;

  if (lookupHistory.length > 0) {
    $("lookup-back-btn").addEventListener("click", goBackLookup);
  }

  // ── Render cluster (called on load and on center letter change) ──
  function renderCluster() {
    const members = SB.computeCluster(word, selectedCenter);
    const section = $("cluster-section");

    if (members.length === 0) {
      section.innerHTML = `
        <div class="result-section">
          <div class="result-section-title">Cluster</div>
          <span style="font-size:.9rem;color:var(--text-muted)">
            ${selectedCenter
              ? `No words in your list use only these letters with "${selectedCenter}".`
              : "No related words in your list yet."}
          </span>
        </div>`;
      return;
    }

    section.innerHTML = `
      <div class="result-section">
        <div class="result-section-title">Cluster</div>
        <div class="cluster-header">
          <span>${members.length} word${members.length > 1 ? "s" : ""}${selectedCenter ? ` containing "${selectedCenter}"` : ""}</span>
          <button class="btn-ghost" id="reveal-cluster-btn">${clusterRevealed ? "Hide" : "Show"}</button>
        </div>
        <div id="cluster-reveal" class="cluster-members" ${clusterRevealed ? "" : "hidden"}>
          ${members.map(w => {
            const wInfo = SB.lookupWord(w);
            const cls = wInfo && !wInfo.isValid ? "cluster-chip invalid" : "cluster-chip";
            return `<span class="${cls}">${w}</span>`;
          }).join("")}
        </div>
      </div>`;

    $("reveal-cluster-btn").addEventListener("click", () => {
      clusterRevealed = !clusterRevealed;
      $("cluster-reveal").hidden = !clusterRevealed;
      $("reveal-cluster-btn").textContent = clusterRevealed ? "Hide" : "Show";
    });

    section.querySelectorAll(".cluster-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        exploreWordInput.value = chip.textContent.trim();
        renderLookupResult(chip.textContent.trim());
        exploreWordInput.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  renderCluster();

  // ── Letter tile clicks ──
  $("letter-tiles").querySelectorAll(".letter-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const letter = tile.dataset.letter;
      if (selectedCenter === letter) {
        selectedCenter = null;
        tile.classList.remove("active");
      } else {
        $("letter-tiles").querySelectorAll(".letter-tile").forEach(t => t.classList.remove("active"));
        selectedCenter = letter;
        tile.classList.add("active");
      }
      renderCluster();
    });
  });

  // ── Delete ──
  if (info) {
    $("delete-word-btn").addEventListener("click", () => {
      if (!confirm(`Delete "${word}"? This cannot be undone.`)) return;
      SB.removeWord(word);
      lookupResult.innerHTML = `<p class="empty-state">"${word}" has been deleted.</p>`;
      exploreWordInput.value = "";
    });

    // ── Edit: show form ──
    $("edit-word-btn").addEventListener("click", () => {
      $("edit-form").hidden = false;
      $("edit-word-btn").hidden = true;
    });

    // ── Edit: toggle/stepper logic ──
    const editToggleValid = $("edit-toggle-valid");
    const editCountRow    = $("edit-count-row");
    const stepperCount    = $("stepper-count");
    let editCount = info.missCount;

    function refreshEditCountRow() {
      editCountRow.hidden = !editToggleValid.checked;
      if (!editToggleValid.checked) editCount = 0;
      stepperCount.textContent = editCount;
    }
    refreshEditCountRow();

    editToggleValid.addEventListener("change", refreshEditCountRow);

    $("stepper-minus").addEventListener("click", () => {
      if (editCount > 0) { editCount--; stepperCount.textContent = editCount; }
    });
    $("stepper-plus").addEventListener("click", () => {
      editCount++;
      stepperCount.textContent = editCount;
    });

    $("edit-save-btn").addEventListener("click", () => {
      SB.updateWord(word, { isValid: editToggleValid.checked, missCount: editCount });
      renderLookupResult(word);
    });

    $("edit-cancel-btn").addEventListener("click", () => {
      $("edit-form").hidden = true;
      $("edit-word-btn").hidden = false;
    });
  }
}

exploreWordInput.addEventListener("input", () => {
  const q = exploreWordInput.value.trim().toUpperCase();
  if (!q) { lookupResult.hidden = true; }
});

exploreWordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    exploreWordDropdown.hidden = true;
    renderLookupResult(exploreWordInput.value);
  }
});

// ── Swipe-from-left-edge to go back (Word lookup only) ─────────

let edgeSwipeStartX = null;
let edgeSwipeStartY = null;

document.addEventListener("touchstart", e => {
  const lookupView = $("explore-lookup");
  if (lookupView.hidden || !lookupHistory.length) { edgeSwipeStartX = null; return; }
  const t = e.touches[0];
  edgeSwipeStartX = t.clientX <= 24 ? t.clientX : null;
  edgeSwipeStartY = t.clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  if (edgeSwipeStartX === null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - edgeSwipeStartX;
  const dy = t.clientY - edgeSwipeStartY;
  edgeSwipeStartX = null;
  if (dx > 60 && Math.abs(dy) < 40) {
    goBackLookup();
  }
}, { passive: true });

// ── All words list ────────────────────────────────────────────

const filterInput       = $("filter-input");
const allWordsList      = $("all-words-list");
const toggleShowAllWords = $("toggle-show-all-words");

toggleShowAllWords.addEventListener("change", () => renderAllWords(filterInput.value));

function renderAllWords(filter = "") {
  filter = filter.trim().toUpperCase();
  const showAll = toggleShowAllWords.checked;
  let words = SB.allWords();
  if (!showAll) words = words.filter(w => w.missCount > 0);
  if (filter) words = words.filter(w => w.word.includes(filter));

  if (!words.length) {
    const hint = !showAll && !filter ? " (enable \"Show known & invalid words\" to see the rest)" : "";
    allWordsList.innerHTML = `<p class="empty-state">${filter ? "No words match." : "No missed words logged yet." + hint}</p>`;
    return;
  }

  allWordsList.innerHTML = words.map(w => `
    <div class="word-list-item" data-word="${w.word}">
      <span class="word-list-name ${w.isValid ? "" : "invalid"}">${w.word}</span>
      <span class="word-list-meta">
        ${!w.isValid ? '<span class="badge badge-invalid">invalid</span>' : ""}
        ${w.missCount > 0 ? `<span class="badge badge-missed">${w.missCount}×</span>` : ""}
      </span>
    </div>
  `).join("");

  // Tapping a word in the list switches to lookup view and shows result
  allWordsList.querySelectorAll(".word-list-item").forEach(item => {
    item.addEventListener("click", () => {
      // Switch to lookup sub-tab
      document.querySelectorAll(".type-btn[data-explore]").forEach(b => b.classList.remove("active"));
      document.querySelector('[data-explore="lookup"]').classList.add("active");
      document.querySelectorAll(".explore-view").forEach(v => { v.hidden = true; v.classList.remove("active"); });
      $("explore-lookup").hidden = false;
      $("explore-lookup").classList.add("active");

      exploreWordInput.value = item.dataset.word;
      renderLookupResult(item.dataset.word);
      exploreWordInput.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

filterInput.addEventListener("input", () => renderAllWords(filterInput.value));

// ── Export / Import ───────────────────────────────────────────

$("export-btn").addEventListener("click", () => {
  const json = SB.exportData();
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "spellingbee-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("import-btn").addEventListener("click", () => {
  $("import-file-input").click();
});

$("import-file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const confirmed = confirm(
    "Importing will replace ALL your current data with the contents of this file. Continue?"
  );
  if (!confirmed) { e.target.value = ""; return; }

  const reader = new FileReader();
  reader.onload = evt => {
    try {
      SB.importData(evt.target.result);
      alert("Import successful! Your data has been restored.");
    } catch (err) {
      alert("Import failed: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});
