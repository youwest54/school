/* Custom flashcard pages. Saved on this computer and on every other computer. */
(function () {
  var APP = "iw25d7l8";
  var API = "https://keyvalue.immanuel.co/api/KeyVal/";
  var CACHE_KEY = "schoolCustomPages";
  var CHUNK = 160;

  var TRACKS = {
    en: { langs: ["ar", "en", "fr"] },
    es: { langs: ["ar", "es", "fr"] },
    nl: { langs: ["fr", "nl"] }
  };
  var NAMES = { ar: "Arabic", en: "English", fr: "French", es: "Spanish", nl: "Dutch" };

  var state = { index: {}, pages: {} };
  var listeners = [];
  var tail = Promise.resolve();

  function now() {
    return Math.floor(Date.now() / 1000);
  }

  function newId() {
    var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    var id = "";
    var i;
    for (i = 0; i < 8; i++) id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    if (state.index[id]) return newId();
    return id;
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

  function b64url(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    var i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function unb64url(s) {
    if (!s) return "";
    s = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    var i;
    for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function chunkString(s) {
    var out = [];
    var i;
    if (!s) return [];
    for (i = 0; i < s.length; i += CHUNK) out.push(s.slice(i, i + CHUNK));
    return out;
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function loadCache() {
    try {
      var saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (saved && typeof saved === "object") {
        state.index = saved.index || {};
        state.pages = saved.pages || {};
      }
    } catch (e) {}
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

  function readValue(key) {
    return fetch(API + "GetValue/" + APP + "/" + key, { cache: "no-store" }).then(function (res) {
      if (!res.ok) return "";
      return res.json();
    }).then(function (value) {
      return typeof value === "string" ? value : "";
    }).catch(function () { return ""; });
  }

  function writeValue(key, value) {
    if (value == null || value === "") return Promise.resolve();
    return fetch(API + "UpdateValue/" + APP + "/" + key + "/" + encodeURIComponent(value), {
      method: "POST"
    }).then(function (res) {
      if (!res.ok) throw new Error("save");
    });
  }

  function readPacked(countKey, chunkKey) {
    return readValue(countKey).then(function (nRaw) {
      var n = parseInt(nRaw, 10) || 0;
      var jobs = [];
      var i;
      if (n < 1) return "";
      if (n > 40) n = 40;
      for (i = 0; i < n; i++) jobs.push(readValue(chunkKey(i)));
      return Promise.all(jobs).then(function (parts) { return parts.join(""); });
    });
  }

  function writePacked(countKey, chunkKey, text) {
    var parts = chunkString(text);
    var chain = Promise.resolve();
    if (!parts.length) parts = ["0"];
    parts.forEach(function (part, i) {
      chain = chain.then(function () { return writeValue(chunkKey(i), part); });
    });
    return chain.then(function () { return writeValue(countKey, String(parts.length)); });
  }

  function manifestKey(id) { return "school_m_" + id; }
  function dataKey(id, i) { return "school_d_" + id + "_" + i; }

  function encodePage(page) {
    return b64url(JSON.stringify({
      id: page.id,
      title: page.title,
      track: page.track,
      t: page.t,
      cards: page.cards || [],
      hidden: page.hidden || []
    }));
  }

  function decodePage(raw) {
    try {
      var obj = JSON.parse(unb64url(raw));
      if (!obj || typeof obj !== "object" || !obj.id) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  function fitManifest(page, n) {
    var title = String(page.title || "New page").slice(0, 30);
    var encoded = "";
    while (title.length > 0) {
      encoded = b64url(JSON.stringify({ title: title, track: page.track, t: page.t, n: n }));
      if (encoded.length <= CHUNK) return encoded;
      title = title.slice(0, -1);
    }
    return b64url(JSON.stringify({ title: "Page", track: page.track, t: page.t, n: n }));
  }

  function readManifest(id) {
    return readValue(manifestKey(id)).then(function (raw) {
      if (!raw) return null;
      try { return JSON.parse(unb64url(raw)); } catch (e) { return null; }
    });
  }

  function readBody(id, n) {
    var jobs = [];
    var i;
    n = parseInt(n, 10) || 0;
    if (n < 1) return Promise.resolve(null);
    if (n > 80) n = 80;
    for (i = 0; i < n; i++) jobs.push(readValue(dataKey(id, i)));
    return Promise.all(jobs).then(function (parts) { return decodePage(parts.join("")); });
  }

  function writePage(page) {
    var parts = chunkString(encodePage(page));
    var chain = Promise.resolve();
    parts.forEach(function (part, i) {
      chain = chain.then(function () { return writeValue(dataKey(page.id, i), part); });
    });
    return chain.then(function () {
      return writeValue(manifestKey(page.id), fitManifest(page, parts.length));
    });
  }

  function syncIndex() {
    return readPacked("school_i_n", function (i) { return "school_i_" + i; }).then(function (raw) {
      var remote = unpack(raw);
      var merged = mergeBag(state.index, remote);
      var before = pack(state.index);
      state.index = merged;
      saveCache();
      if (pack(merged) !== before) emit();
      if (pack(merged) !== pack(remote)) {
        return writePacked("school_i_n", function (i) { return "school_i_" + i; }, pack(merged));
      }
    });
  }

  function syncManifests() {
    var ids = Object.keys(state.index).filter(function (id) {
      return state.index[id] && state.index[id].v;
    });
    return Promise.all(ids.map(function (id) {
      return readManifest(id).then(function (man) {
        var local = state.pages[id];
        if (local && local.cards && man && (local.t || 0) > (man.t || 0)) return writePage(local);
        if (!man) return;
        if (!local || (man.t || 0) >= (local.t || 0)) {
          state.pages[id] = {
            id: id,
            title: man.title || (local && local.title) || "New page",
            track: man.track || (local && local.track) || "",
            t: man.t || 0,
            cards: local && (local.t || 0) === (man.t || 0) ? local.cards : null
          };
        }
      });
    })).then(function () {
      saveCache();
      emit();
    });
  }

  function sync() {
    return syncIndex().then(syncManifests);
  }

  function cleanCard(track, card) {
    var langs = TRACKS[track].langs;
    var out = { id: (card && card.id && /^[a-z0-9]+$/.test(card.id)) ? card.id : newId() };
    var any = false;
    langs.forEach(function (lang) {
      out[lang] = String((card && card[lang]) || "").trim();
      if (out[lang]) any = true;
    });
    return any ? out : null;
  }

  function save(input) {
    var track = input && TRACKS[input.track] ? input.track : "";
    var page;
    var cards;
    if (!track) return Promise.reject(new Error("language"));
    cards = (input.cards || []).map(function (card) {
      return cleanCard(track, card);
    }).filter(Boolean).slice(0, 40);
    page = {
      id: (input.id && /^[a-z0-9]+$/.test(input.id)) ? input.id : newId(),
      title: String(input.title || "New page").trim().slice(0, 30) || "New page",
      track: track,
      t: now(),
      cards: cards
    };
    state.pages[page.id] = page;
    state.index[page.id] = { v: true, t: page.t };
    saveCache();
    emit();
    return enqueue(function () {
      return writePage(page).then(syncIndex).then(function () { return page; });
    });
  }

  function remove(id) {
    if (!id) return Promise.resolve();
    state.index[id] = { v: false, t: now() };
    saveCache();
    emit();
    return enqueue(syncIndex);
  }

  function askRemove(id) {
    if (!id || !confirm("Delete this page?")) return Promise.resolve(false);
    return remove(id).then(function () { return true; });
  }

  function blankExtra(id, track) {
    return { id: id, title: "extra", track: track, t: 0, cards: [], hidden: [] };
  }

  function loadExtras(id, track) {
    return readManifest(id).then(function (man) {
      var local = state.pages[id];
      if (local && local.cards && (!man || (local.t || 0) >= (man.t || 0))) {
        if (man && (local.t || 0) > (man.t || 0)) return writePage(local).then(function () { return local; });
        return local;
      }
      if (!man) return blankExtra(id, track);
      return readBody(id, man.n).then(function (page) {
        if (!page) return local && local.cards ? local : blankExtra(id, track);
        page.track = man.track || page.track || track;
        page.title = "extra";
        page.t = man.t || page.t || 0;
        state.pages[id] = page;
        saveCache();
        return page;
      });
    });
  }

  function cleanHidden(list) {
    var out = [];
    (list || []).forEach(function (n) {
      var s = String(n);
      if (/^\d+$/.test(s) && out.indexOf(s) === -1) out.push(s);
    });
    return out.slice(0, 300);
  }

  function saveExtras(id, track, cards, hidden) {
    var cleaned;
    if (!TRACKS[track] || !/^[a-z0-9]+$/.test(id || "")) return Promise.reject(new Error("language"));
    cleaned = (cards || []).map(function (card) {
      return cleanCard(track, card);
    }).filter(Boolean).slice(0, 40);
    var page = { id: id, title: "extra", track: track, t: now(), cards: cleaned, hidden: cleanHidden(hidden) };
    state.pages[id] = page;
    saveCache();
    return enqueue(function () {
      return writePage(page).then(function () { return page; });
    });
  }

  function open(id) {
    if (!id) return Promise.resolve(null);
    return readManifest(id).then(function (man) {
      var local = state.pages[id];
      if (!state.index[id] || !state.index[id].v) {
        if (man && (!local || (man.t || 0) >= (local.t || 0))) return null;
      }
      if (local && local.cards && (!man || (local.t || 0) > (man.t || 0))) {
        if (man && (local.t || 0) > (man.t || 0)) {
          return writePage(local).then(function () { return local; });
        }
        return local;
      }
      if (!man) return local && local.cards ? local : null;
      return readBody(id, man.n).then(function (page) {
        if (!page) return local && local.cards ? local : null;
        page.title = man.title || page.title || "New page";
        page.track = man.track || page.track;
        page.t = man.t || page.t || 0;
        state.pages[id] = page;
        if (!state.index[id]) state.index[id] = { v: true, t: page.t };
        saveCache();
        emit();
        return page;
      });
    });
  }

  function list(track) {
    return Object.keys(state.index).filter(function (id) {
      var page = state.pages[id];
      return state.index[id] && state.index[id].v && page && page.track && (!track || page.track === track);
    }).sort(function (a, b) {
      return ((state.index[a] && state.index[a].t) || 0) - ((state.index[b] && state.index[b].t) || 0);
    }).map(function (id) {
      return {
        id: id,
        title: state.pages[id].title || "New page",
        track: state.pages[id].track
      };
    });
  }

  loadCache();
  var ready = enqueue(sync);
  setInterval(function () { enqueue(sync); }, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") enqueue(sync);
  });

  window.Pages = {
    ready: ready,
    tracks: TRACKS,
    names: NAMES,
    list: list,
    open: open,
    save: save,
    remove: remove,
    askRemove: askRemove,
    loadExtras: loadExtras,
    saveExtras: saveExtras,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
