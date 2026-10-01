/* Add words to a page that already exists. Saved on every computer. */
(function () {
  var container = document.getElementById("card-container");
  if (!container || !window.Pages) return;

  var style = document.createElement("style");
  style.textContent = [
    ".add-word-bar{max-width:640px;margin:0 auto 1rem}",
    ".add-word-bar button{font-size:1rem;border-radius:8px;padding:.55rem .9rem;cursor:pointer}",
    "#open-add-word,#save-added-word{background:#1976d2;color:#fff;border:none}",
    "#delete-part-page{background:#fff;color:#c62828;border:1px solid #e57373;border-radius:8px;padding:.55rem .9rem;cursor:pointer;margin-left:.5rem}",
    "#cancel-add-word,.extra-remove{background:#fff;color:#333;border:1px solid #ccc}",
    "#add-word-form{background:#fff;border:1px solid #ddd;border-radius:12px;padding:1rem;margin-top:.7rem}",
    "#add-word-form label{display:block;margin:.55rem 0 .2rem}",
    "#add-word-form input{width:100%;font-size:1rem;padding:.55rem;border:1px solid #ccc;border-radius:8px}",
    ".add-word-actions{display:flex;gap:.5rem;margin-top:.8rem}",
    ".add-word-error{color:#c62828;min-height:1.2rem;margin-top:.4rem}",
    ".extra-card{background:#fff;border:1px solid #1976d2;border-radius:12px;padding:1.1rem;margin-bottom:1.2rem;min-height:160px;cursor:pointer}",
    ".extra-card .content{min-height:5em;display:flex;align-items:center;justify-content:center;text-align:center;margin-bottom:.75rem}",
    ".extra-card .buttons{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}",
    ".extra-card .buttons button{flex:1 1 30%;padding:.5rem;font-size:1rem;border:none;border-radius:8px;cursor:pointer}",
    ".extra-card .play-button{flex:none;width:4rem;height:4rem;padding:0;border-radius:50%;font-size:2rem;background:#fff;color:#1976d2;box-shadow:0 2px 6px rgba(0,0,0,.2)}",
    ".extra-card.remembered{border-color:#43a047}",
    ".extra-card .remember-button.remembered{background:#43a047;color:#fff}",
    ".hold-note{text-align:center;color:#666;font-size:.9rem;margin:.35rem 0 0}",
    ".flashcard.hold-pick,.extra-card.hold-pick{box-shadow:inset 0 0 0 4px #1976d2}",
    ".flashcard.hold-delete,.extra-card.hold-delete{box-shadow:inset 0 0 0 4px #c62828;background:#ffebee}",
    "#sure-delete{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1100;display:flex;align-items:center;justify-content:center;padding:1rem}",
    "#sure-delete[hidden]{display:none}",
    ".sure-box{background:#fff;color:#222;border-radius:12px;padding:1.2rem;width:min(92vw,340px);text-align:center}",
    ".sure-box p{font-size:1.15rem;margin-bottom:1rem}",
    ".sure-actions{display:flex;gap:.6rem}",
    ".sure-actions button{flex:1;font-size:1.1rem;padding:.75rem;border-radius:8px;border:none;cursor:pointer}",
    "#sure-edit{background:#1976d2;color:#fff}",
    "#sure-delete-choice,#sure-yes{background:#c62828;color:#fff}",
    "#sure-no,#sure-cancel{background:#eee;color:#222}",
    "#sure-cancel{margin-top:.6rem;width:100%}",
    "@media(prefers-color-scheme:dark){#add-word-form,.extra-card,.sure-box,#delete-part-page{background:#1c1c1e;color:#e4e4e4;border-color:#333}#add-word-form input{background:#111;color:#eee;border-color:#444}.hold-note{color:#bbb}.flashcard.hold-delete,.extra-card.hold-delete{background:#3a1d1d}#sure-no,#sure-cancel{background:#333;color:#eee}#delete-part-page{color:#ef9a9a}}"
  ].join("");
  document.head.appendChild(style);

  function fileName() {
    try { return decodeURIComponent(location.pathname.split("/").pop() || ""); }
    catch (e) { return location.pathname.split("/").pop() || ""; }
  }

  function extraId(name) {
    return ("x" + name.toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 24);
  }

  function trackFromName(name) {
    return /_nl\.html$/i.test(name) ? "nl" : "en";
  }

  var bar = document.createElement("div");
  var openBtn = document.createElement("button");
  var form = document.createElement("form");
  var error = document.createElement("p");
  var fields = document.createElement("div");
  var actions = document.createElement("div");
  var saveBtn = document.createElement("button");
  var cancelBtn = document.createElement("button");
  bar.className = "add-word-bar";
  openBtn.id = "open-add-word";
  openBtn.type = "button";
  openBtn.textContent = "Add word";
  form.id = "add-word-form";
  form.hidden = true;
  error.className = "add-word-error";
  actions.className = "add-word-actions";
  saveBtn.id = "save-added-word";
  saveBtn.type = "submit";
  saveBtn.textContent = "Save word";
  cancelBtn.id = "cancel-add-word";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  actions.append(saveBtn, cancelBtn);
  form.append(fields, actions, error);
  var note = document.createElement("p");
  note.className = "hold-note";
  note.textContent = "Hold a card. Then choose Edit or Delete.";
  bar.append(openBtn, note, form);
  if (window.Pages.isPart(fileName())) {
    var delPage = document.createElement("button");
    delPage.id = "delete-part-page";
    delPage.type = "button";
    delPage.textContent = "Delete page";
    delPage.onclick = function () {
      var btn = this;
      var name = fileName();
      btn.disabled = true;
      window.Pages.askHidePart(name).then(function (ok) {
        if (ok) location.href = window.Pages.partHome(name);
        else btn.disabled = false;
      }).catch(function () {
        btn.disabled = false;
        alert("Could not delete. Check the internet and try again.");
      });
    };
    openBtn.insertAdjacentElement("afterend", delPage);
    window.Pages.ready.then(function () {
      var name = fileName();
      if (window.Pages.partGone(name)) location.replace(window.Pages.partHome(name));
    });
  }
  var heading = document.querySelector("h1");
  if (heading && heading.parentNode) heading.parentNode.insertBefore(bar, heading.nextSibling);
  else container.parentNode.insertBefore(bar, container);

  function drawFields(langs) {
    fields.innerHTML = "";
    langs.forEach(function (lang) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      label.textContent = window.Pages.names[lang] || lang;
      input.type = "text";
      input.dataset.lang = lang;
      input.placeholder = window.Pages.names[lang] || lang;
      fields.append(label, input);
    });
  }

  function readCard(langs) {
    var card = {};
    var any = false;
    langs.forEach(function (lang) {
      var input = fields.querySelector('[data-lang="' + lang + '"]');
      card[lang] = input ? input.value : "";
      if (String(card[lang]).trim()) any = true;
    });
    return any ? card : null;
  }

  openBtn.onclick = function () {
    editingEl = null;
    fillForm(null);
    form.hidden = false;
    openBtn.hidden = true;
    error.textContent = "";
  };
  cancelBtn.onclick = function () {
    editingEl = null;
    form.hidden = true;
    openBtn.hidden = false;
    error.textContent = "";
  };

  function paintExtra(card, langs) {
    var box = document.createElement("div");
    var content = document.createElement("div");
    var buttons = document.createElement("div");
    var remember = document.createElement("button");
    var play = document.createElement("button");
    var remove = document.createElement("button");
    var side = 0;
    box.className = "extra-card";
    box.dataset.id = card.id;
    content.className = "content";
    buttons.className = "buttons";
    function show() { content.textContent = card[langs[side]] || ""; }
    show();
    box.onclick = function (e) {
      if (e.target.closest("button")) return;
      side = (side + 1) % langs.length;
      show();
    };
    remember.type = "button";
    remember.className = "remember-button";
    function applyRemembered() {
      var on = !!(window.Marks.cardsForPage()[card.id]);
      box.classList.toggle("remembered", on);
      remember.classList.toggle("remembered", on);
      remember.textContent = on ? "Unmark Remembered" : "Mark as Remembered";
    }
    applyRemembered();
    remember.onclick = function () {
      var bag = window.Marks.cardsForPage();
      bag[card.id] = !bag[card.id];
      window.Marks.writeCards(bag);
      applyRemembered();
    };
    play.type = "button";
    play.className = "play-button";
    play.textContent = "🔊";
    play.onclick = function () {
      var lang = langs[side];
      var cfg = (window.voiceSettings && window.voiceSettings[lang]) || { voiceURI: null, rate: 0.9, pitch: 1 };
      if (window.FlashVoice) window.FlashVoice.speak(card[lang] || "", lang, cfg);
    };
    remove.type = "button";
    remove.className = "extra-remove";
    remove.textContent = "Remove word";
    remove.onclick = function () {
      if (!box.onremove) return;
      remove.disabled = true;
      box.onremove().catch(function () {
        remove.disabled = false;
        error.textContent = "Could not remove the word. Check the internet and try again.";
      });
    };
    buttons.append(remember, play, remove);
    box.append(content, buttons);
    if (window.Marks) window.Marks.onChange(applyRemembered);
    return box;
  }

  function showExtraCards(cards, langs, onRemove) {
    container.querySelectorAll(".extra-card").forEach(function (node) { node.remove(); });
    (cards || []).forEach(function (card) {
      var box = paintExtra(card, langs);
      box.onremove = function () { return onRemove(card.id); };
      container.appendChild(box);
    });
  }

  var editingEl = null;
  var pageLangs = [];
  var readWords = function () { return null; };
  var commitEdit = function () { return Promise.resolve(); };

  function fillForm(words) {
    pageLangs.forEach(function (lang) {
      var input = fields.querySelector('[data-lang="' + lang + '"]');
      if (input) input.value = (words && words[lang]) || "";
    });
  }

  function startEdit(card) {
    var words = readWords(card);
    if (!words) {
      error.textContent = "Wait a moment, then hold the card again.";
      return;
    }
    editingEl = card;
    fillForm(words);
    error.textContent = "";
    saveBtn.textContent = "Save word";
    form.hidden = false;
    openBtn.hidden = true;
    form.scrollIntoView({ block: "center" });
  }

  function wire(langs, saveCards) {
    pageLangs = langs;
    drawFields(langs);
    form.onsubmit = function (e) {
      var card = readCard(langs);
      var job;
      e.preventDefault();
      error.textContent = "";
      if (!card) {
        error.textContent = "Type a word first.";
        return;
      }
      saveBtn.disabled = true;
      job = editingEl ? commitEdit(editingEl, card) : saveCards(card);
      job.then(function () {
        saveBtn.disabled = false;
        editingEl = null;
        form.reset();
        form.hidden = true;
        openBtn.hidden = false;
      }).catch(function (err) {
        saveBtn.disabled = false;
        error.textContent = err && err.message === "full"
          ? "40 added words is the limit for this page."
          : "Could not save the word. Check the internet and try again.";
      });
    };
  }

  var hold = null;
  var asking = null;
  var deleteHeld = function () { return Promise.resolve(); };
  var sure = document.createElement("div");
  var sureBox = document.createElement("div");
  var sureText = document.createElement("p");
  var choiceRow = document.createElement("div");
  var confirmRow = document.createElement("div");
  var sureEdit = document.createElement("button");
  var sureDelete = document.createElement("button");
  var sureCancel = document.createElement("button");
  var sureYes = document.createElement("button");
  var sureNo = document.createElement("button");
  sure.id = "sure-delete";
  sure.hidden = true;
  sureBox.className = "sure-box";
  sureText.textContent = "Edit or delete this card?";
  choiceRow.className = "sure-actions";
  confirmRow.className = "sure-actions";
  confirmRow.hidden = true;
  sureEdit.id = "sure-edit";
  sureEdit.type = "button";
  sureEdit.textContent = "Edit";
  sureDelete.id = "sure-delete-choice";
  sureDelete.type = "button";
  sureDelete.textContent = "Delete";
  sureCancel.id = "sure-cancel";
  sureCancel.type = "button";
  sureCancel.textContent = "Cancel";
  sureYes.id = "sure-yes";
  sureYes.type = "button";
  sureYes.textContent = "Yes";
  sureNo.id = "sure-no";
  sureNo.type = "button";
  sureNo.textContent = "No";
  choiceRow.append(sureEdit, sureDelete);
  confirmRow.append(sureNo, sureYes);
  sureBox.append(sureText, choiceRow, confirmRow, sureCancel);
  sure.appendChild(sureBox);
  document.body.appendChild(sure);

  function closeAsk() {
    sure.hidden = true;
    choiceRow.hidden = false;
    confirmRow.hidden = true;
    sureCancel.hidden = false;
    sureText.textContent = "Edit or delete this card?";
    if (asking) {
      asking.classList.remove("hold-delete", "hold-pick");
      asking.dataset.held = "";
    }
    asking = null;
  }

  function askSure(card) {
    if (!card || asking) return;
    asking = card;
    card.classList.remove("hold-delete");
    card.classList.add("hold-pick");
    card.dataset.held = "1";
    choiceRow.hidden = false;
    confirmRow.hidden = true;
    sureCancel.hidden = false;
    sureText.textContent = "Edit or delete this card?";
    sure.hidden = false;
  }

  sureEdit.onclick = function (e) {
    var card = asking;
    e.preventDefault();
    e.stopPropagation();
    closeAsk();
    if (card) startEdit(card);
  };
  sureDelete.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!asking) return;
    asking.classList.remove("hold-pick");
    asking.classList.add("hold-delete");
    sureText.textContent = "Are you sure you want to delete this card?";
    choiceRow.hidden = true;
    sureCancel.hidden = true;
    confirmRow.hidden = false;
  };
  sureYes.onclick = function (e) {
    var card = asking;
    e.preventDefault();
    e.stopPropagation();
    closeAsk();
    if (!card) return;
    deleteHeld(card).catch(function () {
      error.textContent = "Could not delete the card. Check the internet and try again.";
    });
  };
  sureNo.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeAsk();
  };
  sureCancel.onclick = sureNo.onclick;

  function clearHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    if (!asking || asking !== hold.card) hold.card.classList.remove("hold-delete", "hold-pick");
    hold = null;
  }

  container.addEventListener("pointerdown", function (e) {
    var card = e.target.closest(".flashcard, .extra-card");
    if (asking || !card || e.target.closest("button, a, input, select") || (e.button && e.button !== 0)) return;
    clearHold();
    hold = {
      card: card,
      x: e.clientX,
      y: e.clientY,
      started: Date.now(),
      timer: setTimeout(function () {
        if (!hold || hold.card !== card) return;
        clearHold();
        askSure(card);
      }, 500)
    };
  });
  window.addEventListener("pointermove", function (e) {
    if (!hold) return;
    if (Math.abs(e.clientX - hold.x) > 14 || Math.abs(e.clientY - hold.y) > 14) clearHold();
  });
  window.addEventListener("pointerup", clearHold);
  window.addEventListener("pointercancel", function () {
    if (!hold) return;
    var card = hold.card;
    var elapsed = Date.now() - hold.started;
    clearTimeout(hold.timer);
    hold = null;
    if (elapsed >= 350) askSure(card);
    else card.classList.remove("hold-delete", "hold-pick");
  });
  container.addEventListener("contextmenu", function (e) {
    if (e.target.closest(".flashcard, .extra-card")) e.preventDefault();
  });
  container.addEventListener("click", function (e) {
    var card = e.target.closest(".flashcard, .extra-card");
    if (!card || card.dataset.held !== "1") return;
    e.preventDefault();
    e.stopPropagation();
    card.dataset.held = "";
  }, true);

  var name = fileName();
  if (name === "custom.html") {
    var pageId = (new URLSearchParams(location.search).get("id") || "").replace(/[^a-z0-9]/g, "");
    window.Pages.ready.then(function () { return window.Pages.open(pageId); }).then(function (page) {
      if (!page) return;
      var langs = (window.Pages.tracks[page.track] && window.Pages.tracks[page.track].langs) || ["en"];
      function cardById(id) {
        var found = null;
        (page.cards || []).forEach(function (item) {
          if (item.id === id) found = item;
        });
        return found;
      }
      readWords = function (card) {
        var item = card._source || cardById(card.dataset.id);
        var words = {};
        if (!item) return null;
        langs.forEach(function (lang) { words[lang] = item[lang] || ""; });
        return words;
      };
      commitEdit = function (card, words) {
        var source = card._source || cardById(card.dataset.id);
        var cards;
        var content;
        if (!source) return Promise.resolve();
        langs.forEach(function (lang) { source[lang] = words[lang] || ""; });
        content = card.querySelector(".content");
        if (content) content.textContent = source[langs[+card.dataset.side || 0]] || "";
        cards = (page.cards || []).map(function (item) {
          if (item.id !== card.dataset.id) return item;
          var copy = { id: item.id };
          langs.forEach(function (lang) { copy[lang] = source[lang] || ""; });
          return copy;
        });
        return window.Pages.save({
          id: page.id,
          title: page.title,
          track: page.track,
          cards: cards
        }).then(function (saved) {
          page = saved;
        });
      };
      deleteHeld = function (card) {
        if (!card.dataset.id || !page.cards) return Promise.resolve();
        var cards = page.cards.filter(function (item) { return item.id !== card.dataset.id; });
        return window.Pages.save({
          id: page.id,
          title: page.title,
          track: page.track,
          cards: cards
        }).then(function (saved) {
          page = saved;
          card.remove();
        });
      };
      wire(langs, function (card) {
        var cards = (page.cards || []).slice();
        if (cards.length >= 40) return Promise.reject(new Error("full"));
        cards.push(card);
        return window.Pages.save({
          id: page.id,
          title: page.title,
          track: page.track,
          cards: cards
        }).then(function () { location.reload(); });
      });
    }).catch(function () {});
    return;
  }

  var id = extraId(name);
  var track = trackFromName(name);
  var langs = (window.Pages.tracks[track] && window.Pages.tracks[track].langs) || ["en"];
  var current = { cards: [] };
  window.Pages.ready.then(function () {
    return window.Pages.loadExtras(id, track);
  }).then(function (page) {
    current = page || { cards: [] };
    function persist(cards, hidden, edits) {
      return window.Pages.saveExtras(
        id,
        track,
        cards,
        hidden == null ? (current.hidden || []) : hidden,
        edits == null ? (current.edits || {}) : edits
      ).then(function (saved) {
        current = saved;
        showExtraCards(saved.cards, langs, removeCard);
        hideOriginals();
      });
    }
    function showOriginal(card) {
      var data = window.CARDS && window.CARDS[card.dataset.origin];
      var content = card.querySelector(".content");
      if (!data || !content) return;
      content.textContent = data[langs[+card.dataset.side || 0]] || "";
    }
    function hideOriginals() {
      var hidden = {};
      var next = 0;
      (current.hidden || []).forEach(function (n) { hidden[String(n)] = true; });
      container.querySelectorAll(".flashcard").forEach(function (card) {
        if (!card.dataset.origin) {
          card.dataset.origin = String(next);
          next += 1;
        } else {
          next = Math.max(next, parseInt(card.dataset.origin, 10) + 1);
        }
        if (hidden[card.dataset.origin]) card.remove();
      });
      container.querySelectorAll(".flashcard").forEach(function (card) {
        var edit = (current.edits || {})[card.dataset.origin];
        var data = window.CARDS && window.CARDS[card.dataset.origin];
        if (!edit || !data) return;
        langs.forEach(function (lang) { data[lang] = edit[lang] || ""; });
        showOriginal(card);
      });
    }
    readWords = function (card) {
      var words = {};
      var data = null;
      if (card.classList.contains("extra-card")) {
        (current.cards || []).forEach(function (item) {
          if (item.id === card.dataset.id) data = item;
        });
      } else if (window.CARDS) {
        data = window.CARDS[card.dataset.origin];
      }
      if (!data) return null;
      langs.forEach(function (lang) { words[lang] = data[lang] || ""; });
      return words;
    };
    commitEdit = function (card, words) {
      var edits;
      if (card.classList.contains("extra-card")) {
        var cards = (current.cards || []).map(function (item) {
          if (item.id !== card.dataset.id) return item;
          langs.forEach(function (lang) { item[lang] = words[lang] || ""; });
          return item;
        });
        return persist(cards);
      }
      if (!card.dataset.origin || !window.CARDS || !window.CARDS[card.dataset.origin]) return Promise.resolve();
      edits = {};
      Object.keys(current.edits || {}).forEach(function (key) { edits[key] = current.edits[key]; });
      edits[card.dataset.origin] = {};
      langs.forEach(function (lang) {
        edits[card.dataset.origin][lang] = words[lang] || "";
        window.CARDS[card.dataset.origin][lang] = words[lang] || "";
      });
      showOriginal(card);
      return persist(current.cards || [], current.hidden || [], edits);
    };
    deleteHeld = function (card) {
      if (card.classList.contains("extra-card")) {
        return card.onremove ? card.onremove() : Promise.resolve();
      }
      var origin = card.dataset.origin;
      if (!origin) return Promise.resolve();
      var hidden = (current.hidden || []).slice();
      if (hidden.indexOf(origin) === -1) hidden.push(origin);
      card.remove();
      return window.Pages.saveExtras(id, track, current.cards || [], hidden, current.edits || {}).then(function (saved) {
        current = saved;
      });
    };
    document.addEventListener("DOMContentLoaded", function () { setTimeout(hideOriginals, 0); });
    setTimeout(hideOriginals, 0);
    function removeCard(cardId) {
      return persist((current.cards || []).filter(function (card) { return card.id !== cardId; }));
    }
    showExtraCards(current.cards, langs, removeCard);
    wire(langs, function (card) {
      var cards = (current.cards || []).slice();
      if (cards.length >= 40) return Promise.reject(new Error("full"));
      cards.push(card);
      return persist(cards);
    });
  }).catch(function () {
    error.textContent = "Could not open saved words. Check the internet and try again.";
  });
})();
