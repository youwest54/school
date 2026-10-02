/* Random cards from every part in one language. */
(function () {
  var params = new URLSearchParams(location.search);
  var track = params.get("track");
  if (!window.Pages.tracks[track]) track = "en";
  var langs = window.Pages.tracks[track].langs;
  var homes = { en: "index_en.html", es: "index_es.html", nl: "index_nl.html" };
  var home = homes[track] || "index.html";
  var title = document.getElementById("title");
  var score = document.getElementById("score");
  var from = document.getElementById("from");
  var cardBox = document.getElementById("card");
  var langLabel = document.getElementById("lang");
  var words = document.getElementById("words");
  var favBtn = document.getElementById("fav");
  var resetBtn = document.getElementById("reset");
  var playBtn = document.getElementById("play");
  var showBtn = document.getElementById("show");
  var againBtn = document.getElementById("again");
  var knewBtn = document.getElementById("knew");
  var dock = document.getElementById("dock");
  var retryBtn = document.getElementById("retry");
  var empty = document.getElementById("empty");
  var names = { en: "English", es: "Spanish", nl: "Dutch" };
  title.textContent = (names[track] || "Exam") + " exam";
  document.getElementById("return-button").href = home;
  document.getElementById("fav-page").href = "fav.html?v=2&track=" + track;

  var voiceSettings = {};
  try { voiceSettings = JSON.parse(localStorage.getItem("flashcardVoiceSettings") || "{}"); } catch (e) {}

  var pile = [];
  var cursor = 0;
  var shown = 1;
  var knew = 0;
  var again = 0;
  var current = null;
  var favMap = {};

  function extraId(name) {
    return ("x" + String(name).toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 24);
  }

  function shuffle(list) {
    var copy = list.slice();
    var i;
    for (i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function copyCard(card, edit) {
    var out = {};
    langs.forEach(function (lang) {
      if (edit) out[lang] = edit[lang] || "";
      else out[lang] = (card && card[lang]) || "";
    });
    return out;
  }

  function speak(text, lang) {
    var cfg = voiceSettings[lang] || { voiceURI: null, rate: 0.9, pitch: 1 };
    if (window.FlashVoice) window.FlashVoice.speak(text || "", lang, cfg);
  }

  function paintScore() {
    score.textContent = "I knew it: " + knew + "    Again: " + again;
  }

  function paintFav() {
    var on = current && favMap[current.key] && favMap[current.key].on;
    favBtn.hidden = !current;
    favBtn.classList.toggle("on", !!on);
    favBtn.textContent = on ? "Saved" : "Favorite";
  }

  function face(lang) {
    var text = (current && current.card[lang]) || "";
    langLabel.textContent = window.Pages.names[lang] || lang;
    words.dir = lang === "ar" ? "rtl" : "ltr";
    words.textContent = text || "—";
    playBtn.onclick = function (e) {
      e.stopPropagation();
      speak(text, lang);
    };
  }

  function showDone() {
    current = null;
    cardBox.hidden = true;
    from.hidden = true;
    dock.hidden = true;
    showBtn.hidden = true;
    againBtn.hidden = true;
    knewBtn.hidden = true;
    favBtn.hidden = true;
    empty.hidden = false;
    empty.textContent = "Finished. I knew it: " + knew + ". Again: " + again + ".";
    retryBtn.hidden = false;
    paintScore();
  }

  function nextLabel() {
    var lang = langs[shown];
    var name = (lang && window.Pages.names[lang]) || "answer";
    return "Show " + name;
  }

  function showCard() {
    if (cursor >= pile.length) {
      showDone();
      return;
    }
    current = pile[cursor];
    shown = 1;
    cardBox.hidden = false;
    dock.hidden = false;
    from.hidden = false;
    empty.hidden = true;
    retryBtn.hidden = true;
    showBtn.hidden = false;
    againBtn.hidden = false;
    knewBtn.hidden = false;
    resetBtn.hidden = false;
    showBtn.textContent = nextLabel();
    from.textContent = current.from;
    face(langs[0]);
    paintScore();
    paintFav();
  }

  function reveal() {
    if (!current) return;
    face(langs[shown]);
    shown = (shown + 1) % langs.length;
    showBtn.textContent = nextLabel();
  }

  function advance(kind) {
    if (!current) return;
    if (kind === "knew") knew += 1;
    if (kind === "again") again += 1;
    cursor += 1;
    showCard();
  }

  function start(items) {
    pile = shuffle(items);
    cursor = 0;
    knew = 0;
    again = 0;
    if (!pile.length) {
      cardBox.hidden = true;
      from.hidden = true;
      dock.hidden = true;
      showBtn.hidden = true;
      againBtn.hidden = true;
      knewBtn.hidden = true;
      favBtn.hidden = true;
      resetBtn.hidden = true;
      retryBtn.hidden = true;
      empty.hidden = false;
      empty.textContent = "No words yet.";
      score.textContent = "";
      return;
    }
    showCard();
  }

  resetBtn.onclick = function (e) {
    e.stopPropagation();
    knew = 0;
    again = 0;
    paintScore();
  };
  favBtn.onclick = function (e) {
    e.stopPropagation();
    if (!current || !window.Pages.toggleFav) return;
    favBtn.disabled = true;
    window.Pages.toggleFav(track, current).then(function (map) {
      favMap = map || favMap;
      favBtn.disabled = false;
      paintFav();
    }).catch(function () {
      favBtn.disabled = false;
    });
  };
  showBtn.onclick = function (e) {
    e.stopPropagation();
    reveal();
  };
  againBtn.onclick = function (e) {
    e.stopPropagation();
    advance("again");
  };
  knewBtn.onclick = function (e) {
    e.stopPropagation();
    advance("knew");
  };
  cardBox.onclick = reveal;
  retryBtn.onclick = function () { start(pile); };

  function addPartCards(part, extra) {
    var hidden = {};
    var edits = (extra && extra.edits) || {};
    (extra && extra.hidden || []).forEach(function (n) { hidden[String(n)] = true; });
    var items = [];
    (part.cards || []).forEach(function (card, index) {
      if (hidden[String(index)]) return;
      items.push({
        from: part.name,
        card: copyCard(card, edits[String(index)] || null),
        key: window.Pages.favKey(copyCard(card, edits[String(index)] || null), langs)
      });
    });
    ((extra && extra.cards) || []).forEach(function (card) {
      var extraCard = copyCard(card, null);
      items.push({ from: part.name, card: extraCard, key: window.Pages.favKey(extraCard, langs) });
    });
    return items;
  }

  var deckJob = track === "es"
    ? Promise.resolve({ parts: [] })
    : fetch("deck-" + track + ".json", { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("deck");
      return res.json();
    });

  score.textContent = "Loading words…";
  window.Pages.ready.then(function () { return deckJob; }).then(function (deck) {
    var jobs = (deck.parts || []).filter(function (part) {
      return !window.Pages.partGone(part.file);
    }).map(function (part) {
      return window.Pages.loadExtras(extraId(part.file), track).then(function (extra) {
        return addPartCards(part, extra);
      });
    });
    window.Pages.list(track).forEach(function (page) {
      jobs.push(window.Pages.open(page.id).then(function (full) {
        if (!full || !(full.cards || []).length) return [];
        return full.cards.map(function (card) {
          var saved = copyCard(card, null);
          return { from: full.title || "My page", card: saved, key: window.Pages.favKey(saved, langs) };
        });
      }));
    });
    return Promise.all(jobs);
  }).then(function (groups) {
    var items = [];
    groups.forEach(function (group) {
      (group || []).forEach(function (item) { items.push(item); });
    });
    window.Pages.loadFavs(track).then(function (map) {
      favMap = map || {};
      if (current) paintFav();
    }).catch(function () {});
    start(items);
  }).catch(function () {
    score.textContent = "";
    empty.hidden = false;
    empty.textContent = "Could not open the exam. Check the internet and try again.";
  });
})();
