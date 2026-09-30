/* Shared checkmarks. Any computer that opens the site sees the same marks. */
(function () {
  var APP = "iw25d7l8";
  var API = "https://keyvalue.immanuel.co/api/KeyVal/";
  var CACHE_KEY = "schoolSharedMarks";
  var MIGRATED_KEY = "schoolMarksMigrated";
  var PAGES = [
    "part 1_en.html", "part 2_en.html", "part 3_en.html", "part 4_en.html",
    "part 5_en.html", "part 6_en.html", "part 7_en.html", "part 8_en.html",
    "part 9_en.html", "part 10_en.html", "part 11_en.html", "part 12_en.html",
    "part 13_en.html", "part 14_en.html", "part 15_en.html", "part 16_en.html",
    "part 17_en.html", "part 18_en.html",
    "1_nl.html", "2_nl.html", "3_nl.html", "4_nl.html"
  ];

  var state = { done: {}, cards: {} };
  var listeners = [];
  var tail = Promise.resolve();

  function now() {
    return Math.floor(Date.now() / 1000);
  }

  function pageName() {
    var name = "";
    try {
      name = decodeURIComponent(location.pathname.split("/").pop() || "");
    } catch (e) {
      name = location.pathname.split("/").pop() || "";
    }
    if (name === "custom.html") {
      var match = /(?:^|[?&])id=([a-z0-9]+)/.exec(location.search || "");
      if (match) return "custom_" + match[1] + ".html";
    }
    return name || "index.html";
  }

  function storageKey(name) {
    return String(name).replace(/[^a-zA-Z0-9]/g, "_");
  }

  function pack(bag) {
    return Object.keys(bag || {}).sort().map(function (k) {
      return k + "-" + (bag[k] && bag[k].v ? "1" : "0") + "-" + ((bag[k] && bag[k].t) || 0);
    }).join("~");
  }

  function unpack(str) {
    var bag = {};
    if (!str || typeof str !== "string") return bag;
    str.split("~").forEach(function (part) {
      if (!part) return;
      var bits = part.split("-");
      if (bits.length < 3) return;
      var t = bits.pop();
      var v = bits.pop();
      var k = bits.join("-");
      if (!k) return;
      bag[k] = { v: v === "1", t: parseInt(t, 10) || 0 };
    });
    return bag;
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function loadCache() {
    try {
      var saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (saved && typeof saved === "object") {
        state.done = saved.done || {};
        state.cards = saved.cards || {};
      }
    } catch (e) {}
  }

  function mergeBag(localBag, remoteBag) {
    var out = {};
    var key;
    localBag = localBag || {};
    remoteBag = remoteBag || {};
    for (key in localBag) {
      if (Object.prototype.hasOwnProperty.call(localBag, key) && localBag[key]) out[key] = localBag[key];
    }
    for (key in remoteBag) {
      if (!Object.prototype.hasOwnProperty.call(remoteBag, key) || !remoteBag[key]) continue;
      if (typeof remoteBag[key].v === "undefined") continue;
      var prev = out[key];
      if (!prev || (remoteBag[key].t || 0) >= (prev.t || 0)) {
        out[key] = { v: !!remoteBag[key].v, t: remoteBag[key].t || 0 };
      }
    }
    return out;
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
  }

  function enqueue(task) {
    var run = tail.then(task, task);
    tail = run.then(function () {}, function () {});
    return run;
  }

  function migrate() {
    if (localStorage.getItem(MIGRATED_KEY) === "1") return;
    var i;
    for (i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf("done_") !== 0) continue;
      var href = storageKey(key.slice(5));
      if (!state.done[href]) state.done[href] = { v: localStorage.getItem(key) === "true", t: 0 };
    }
    var oldCards = {};
    try { oldCards = JSON.parse(localStorage.getItem("flashcardRemembered") || "{}") || {}; } catch (e) {}
    PAGES.forEach(function (page) {
      var pageKey = storageKey(page);
      Object.keys(oldCards).forEach(function (index) {
        if (!oldCards[index]) return;
        if (!state.cards[pageKey]) state.cards[pageKey] = {};
        if (!state.cards[pageKey][index]) state.cards[pageKey][index] = { v: true, t: 0 };
      });
    });
    try { localStorage.setItem(MIGRATED_KEY, "1"); } catch (e) {}
    saveCache();
  }

  function readValue(remoteKey) {
    return fetch(API + "GetValue/" + APP + "/" + remoteKey, { cache: "no-store" }).then(function (res) {
      if (!res.ok) return "";
      return res.json();
    }).then(function (value) {
      return typeof value === "string" ? value : "";
    }).catch(function () { return ""; });
  }

  function writeValue(remoteKey, packed) {
    if (!packed) return Promise.resolve();
    return fetch(API + "UpdateValue/" + APP + "/" + remoteKey + "/" + encodeURIComponent(packed), {
      method: "POST"
    }).catch(function () {});
  }

  function syncBag(remoteKey, getBag, setBag) {
    return readValue(remoteKey).then(function (raw) {
      var remote = unpack(raw);
      var local = getBag() || {};
      var merged = mergeBag(local, remote);
      var before = pack(local);
      setBag(merged);
      saveCache();
      if (pack(merged) !== before) emit();
      if (pack(merged) !== pack(remote)) return writeValue(remoteKey, pack(merged));
    });
  }

  function sync() {
    var jobs = [];
    if (document.querySelector(".grid a")) {
      jobs.push(syncBag("school_done", function () { return state.done; }, function (bag) { state.done = bag; }));
    }
    if (document.getElementById("card-container")) {
      var pageKey = storageKey(pageName());
      jobs.push(syncBag(
        "school_c_" + pageKey,
        function () { return state.cards[pageKey] || {}; },
        function (bag) { state.cards[pageKey] = bag; }
      ));
    }
    return Promise.all(jobs);
  }

  loadCache();
  migrate();

  var ready = enqueue(sync);
  setInterval(function () { enqueue(sync); }, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") enqueue(sync);
  });

  window.Marks = {
    ready: ready,
    isDone: function (href) {
      var slot = state.done[storageKey(href)];
      return !!(slot && slot.v);
    },
    setDone: function (href, value) {
      var key = storageKey(href);
      var v = !!value;
      var prev = state.done[key];
      if (prev && !!prev.v === v) return;
      state.done[key] = { v: v, t: now() };
      saveCache();
      emit();
      enqueue(sync);
    },
    cardsForPage: function () {
      var bag = state.cards[storageKey(pageName())] || {};
      var out = {};
      Object.keys(bag).forEach(function (k) { out[k] = !!bag[k].v; });
      return out;
    },
    writeCards: function (boolMap) {
      var page = storageKey(pageName());
      if (!state.cards[page]) state.cards[page] = {};
      var bag = state.cards[page];
      var changed = false;
      var t = now();
      Object.keys(boolMap || {}).forEach(function (k) {
        var v = !!boolMap[k];
        if (!bag[k] || !!bag[k].v !== v) {
          bag[k] = { v: v, t: t };
          changed = true;
        }
      });
      if (!changed) return;
      saveCache();
      emit();
      enqueue(sync);
    },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
