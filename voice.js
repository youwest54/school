/* Pick a clear AI / neural voice for each language and speak with it. */
(function () {
  var VERSION = "2";
  var LOCALES = { ar: "ar-SA", en: "en-US", fr: "fr-FR", es: "es-ES", nl: "nl-NL" };
  var PREFERRED = {
    ar: ["zariyah", "hamed", "naayf", "salma", "google"],
    en: ["aria", "jenny", "guy", "sonia", "libby", "ryan", "google us english", "samantha", "daniel"],
    fr: ["denise", "henri", "vivienne", "google français", "google francais", "thomas", "amelie"],
    es: ["elvira", "helena", "laura", "pablo", "google español", "google espanol", "monica"],
    nl: ["colette", "fenna", "maarten", "google nederlands", "xander"]
  };

  if (localStorage.getItem("flashcardVoiceVersion") !== VERSION) {
    localStorage.setItem("flashcardVoiceSettings", JSON.stringify({
      ar: { voiceURI: null, rate: 0.9, pitch: 1 },
      en: { voiceURI: null, rate: 0.9, pitch: 1 },
      fr: { voiceURI: null, rate: 0.9, pitch: 1 },
      es: { voiceURI: null, rate: 0.9, pitch: 1 },
      nl: { voiceURI: null, rate: 0.9, pitch: 1 }
    }));
    localStorage.setItem("flashcardVoiceVersion", VERSION);
  }

  function matches(voice, lang) {
    return (voice.lang || "").toLowerCase().indexOf(lang) === 0;
  }

  function score(voice, lang) {
    if (!matches(voice, lang)) return -1;
    var name = voice.name.toLowerCase();
    var s = 0;
    if (/natural|neural/.test(name)) s += 300;
    if (/online/.test(name)) s += 80;
    if (/google/.test(name)) s += 160;
    if (/premium|enhanced/.test(name)) s += 120;
    if (voice.localService === false) s += 40;
    var prefs = PREFERRED[lang] || [];
    for (var i = 0; i < prefs.length; i++) {
      if (name.indexOf(prefs[i]) !== -1) s += 400 - i * 10;
    }
    return s;
  }

  function voicesFor(lang) {
    return speechSynthesis.getVoices().filter(function (v) {
      return matches(v, lang);
    }).sort(function (a, b) {
      return score(b, lang) - score(a, lang);
    });
  }

  function bestVoice(lang) {
    var list = voicesFor(lang);
    return list.length ? list[0] : null;
  }

  function applyDefaults(voiceSettings) {
    Object.keys(voiceSettings || {}).forEach(function (lang) {
      var cfg = voiceSettings[lang];
      if (!cfg) return;
      if (!cfg.rate) cfg.rate = 0.9;
      if (!cfg.voiceURI) return;
      var voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      var saved = voices.some(function (v) { return v.voiceURI === cfg.voiceURI; });
      if (!saved) cfg.voiceURI = null;
    });
  }

  var HOSTS = ["https://lingva.ml", "https://translate.plausibility.cloud"];
  var playToken = 0;
  var currentAudio = null;

  function splitText(text) {
    var clean = String(text).replace(/\s+/g, " ").trim();
    if (clean.length <= 180) return [clean];
    var parts = [];
    var rest = clean;
    while (rest.length > 180) {
      var slice = rest.slice(0, 180);
      var cut = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("، "), slice.lastIndexOf(", "), slice.lastIndexOf(" "));
      if (cut < 40) cut = 180;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  function fetchAudio(lang, text) {
    var path = "/api/v1/audio/" + encodeURIComponent(lang) + "/" + encodeURIComponent(text);
    var i = 0;
    function tryHost() {
      if (i >= HOSTS.length) return Promise.resolve(null);
      var host = HOSTS[i++];
      return fetch(host + path).then(function (res) {
        if (!res.ok) throw new Error("bad");
        return res.json();
      }).then(function (data) {
        if (!data || !data.audio || !data.audio.length) throw new Error("empty");
        return URL.createObjectURL(new Blob([new Uint8Array(data.audio)], { type: "audio/mpeg" }));
      }).catch(function () { return tryHost(); });
    }
    return tryHost();
  }

  function speakLocal(text, lang, cfg) {
    var synth = speechSynthesis;
    synth.cancel();
    if (keepAlive) clearInterval(keepAlive);
    var u = new SpeechSynthesisUtterance(text);
    var voice = null;
    if (cfg && cfg.voiceURI) {
      voice = synth.getVoices().filter(function (v) { return v.voiceURI === cfg.voiceURI; })[0] || null;
    }
    if (!voice) voice = bestVoice(lang);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = LOCALES[lang] || lang;
    }
    u.rate = cfg && cfg.rate ? cfg.rate : 0.9;
    u.pitch = cfg && typeof cfg.pitch === "number" ? cfg.pitch : 1;
    window.__flashUtterance = u;
    synth.speak(u);
  }

  function playCloud(text, lang, cfg, token) {
    var parts = splitText(text);
    var index = 0;
    function next() {
      if (token !== playToken) return;
      if (index >= parts.length) return;
      var part = parts[index++];
      fetchAudio(lang, part).then(function (url) {
        if (token !== playToken) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (!url) {
          speakLocal(text, lang, cfg);
          return;
        }
        var audio = new Audio(url);
        currentAudio = audio;
        audio.playbackRate = cfg && cfg.rate ? cfg.rate : 0.9;
        audio.onended = function () {
          URL.revokeObjectURL(url);
          next();
        };
        audio.onerror = function () {
          URL.revokeObjectURL(url);
          speakLocal(text, lang, cfg);
        };
        var started = audio.play();
        if (started && started.catch) {
          started.catch(function () { speakLocal(text, lang, cfg); });
        }
      });
    }
    next();
  }

  var keepAlive = null;
  function speak(text, lang, cfg) {
    if (!text) return;
    var token = ++playToken;
    speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (cfg && cfg.voiceURI) {
      speakLocal(text, lang, cfg);
      return;
    }
    playCloud(text, lang, cfg, token);
  }

  speechSynthesis.getVoices();
  window.FlashVoice = {
    voicesFor: voicesFor,
    bestVoice: bestVoice,
    applyDefaults: applyDefaults,
    speak: speak
  };
})();
