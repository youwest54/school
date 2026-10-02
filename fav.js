/* Favorites for one language. */
(function () {
  var params = new URLSearchParams(location.search);
  var track = params.get("track");
  if (!window.Pages.tracks[track]) track = "en";
  var langs = window.Pages.tracks[track].langs;
  var homes = { en: "index_en.html?v=20", es: "index_es.html?v=20", nl: "index_nl.html?v=20" };
  var names = { en: "English", es: "Spanish", nl: "Dutch" };
  var title = document.getElementById("title");
  var list = document.getElementById("list");
  var empty = document.getElementById("empty");
  title.textContent = (names[track] || "Favorites") + " favorites";
  document.getElementById("return-button").href = homes[track] || "index.html";

  var voiceSettings = {};
  try { voiceSettings = JSON.parse(localStorage.getItem("flashcardVoiceSettings") || "{}"); } catch (e) {}

  function speak(text, lang) {
    var cfg = voiceSettings[lang] || { voiceURI: null, rate: 0.9, pitch: 1 };
    if (window.FlashVoice) window.FlashVoice.speak(text || "", lang, cfg);
  }

  function render() {
    var items = window.Pages.favList(track);
    list.innerHTML = "";
    empty.hidden = items.length > 0;
    items.forEach(function (item) {
      var card = document.createElement("article");
      var from = document.createElement("p");
      var actions = document.createElement("div");
      var remove = document.createElement("button");
      card.className = "fav-card";
      from.className = "fav-from";
      from.textContent = item.from || "Favorite";
      card.appendChild(from);
      langs.forEach(function (lang) {
        var line = document.createElement("div");
        var label = document.createElement("p");
        var words = document.createElement("p");
        line.className = "fav-line";
        label.className = "fav-lang";
        label.textContent = window.Pages.names[lang] || lang;
        words.className = "fav-words";
        words.dir = lang === "ar" ? "rtl" : "ltr";
        words.textContent = (item.card && item.card[lang]) || "—";
        line.append(label, words);
        card.appendChild(line);
      });
      actions.className = "fav-actions";
      langs.forEach(function (lang) {
        var play = document.createElement("button");
        play.type = "button";
        play.className = "fav-speak";
        play.textContent = window.Pages.names[lang] || "Speak";
        play.onclick = function () { speak(item.card && item.card[lang], lang); };
        actions.appendChild(play);
      });
      remove.type = "button";
      remove.className = "fav-remove";
      remove.textContent = "Remove";
      remove.onclick = function () {
        remove.disabled = true;
        window.Pages.toggleFav(track, item).then(render).catch(function () {
          remove.disabled = false;
        });
      };
      actions.appendChild(remove);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  window.Pages.ready.then(function () {
    return window.Pages.loadFavs(track);
  }).then(render).catch(function () {
    empty.hidden = false;
    empty.textContent = "Could not open favorites. Check the internet and try again.";
  });
})();
