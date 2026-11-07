/* Clear names for the bottom bar buttons, and reopen the last page. */
(function () {
  var LAST_KEY = "schoolLastPage";
  var SESSION_KEY = "schoolLastSession";

  function currentPage() {
    var name = "";
    try {
      name = decodeURIComponent(location.pathname.split("/").pop() || "");
    } catch (e) {
      name = location.pathname.split("/").pop() || "";
    }
    return name + location.search;
  }

  function isHome(page) {
    var file = String(page || "").split("?")[0];
    return !file || file === "index.html" || file === "/";
  }

  function safePage(page) {
    page = String(page || "");
    if (!page || page.indexOf("://") !== -1 || page.indexOf("//") === 0) return "";
    if (page.indexOf("..") !== -1) return "";
    if (!/^[a-zA-Z0-9 _.-]+\.html(\?[a-zA-Z0-9_=&%+.-]*)?$/.test(page)) return "";
    return page;
  }

  function rememberHere() {
    var page = safePage(currentPage());
    if (!page) return;
    try { localStorage.setItem(LAST_KEY, page); } catch (e) {}
  }

  function reopenLast() {
    if (!isHome(currentPage())) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
      rememberHere();
      return;
    }
    var seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}
    if (seen) {
      rememberHere();
      return;
    }
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
    var last = "";
    try { last = safePage(localStorage.getItem(LAST_KEY) || ""); } catch (e) {}
    if (!last || isHome(last)) {
      rememberHere();
      return;
    }
    location.replace(last);
  }

  reopenLast();

  function languageHome(file) {
    file = String(file || "");
    if (window.Pages && window.Pages.partHome && window.Pages.isPart && window.Pages.isPart(file)) {
      return window.Pages.partHome(file);
    }
    if (/_nl\.html$/i.test(file) || /^[1-4]_nl\.html$/i.test(file)) return "index_nl.html?v=23";
    if (/_en\.html$/i.test(file) || /^part /i.test(file)) return "index_en.html?v=23";
    return "";
  }

  var back = document.getElementById("return-button");
  var flip = document.getElementById("flip-all-button");
  var voice = document.getElementById("settings-button");
  if (back) {
    back.textContent = "Back";
    back.setAttribute("aria-label", "Back");
    if (back.tagName === "BUTTON") {
      back.onclick = function (e) {
        if (e) e.preventDefault();
        var home = languageHome(currentPage().split("?")[0]);
        location.href = home || "index.html";
      };
    }
  }
  if (flip) {
    flip.textContent = "Flip";
    flip.setAttribute("aria-label", "Flip all cards");
  }
  if (voice) {
    voice.textContent = "Voice";
    voice.setAttribute("aria-label", "Voice settings");
  }
  var note = document.querySelector(".hold-note");
  if (note) note.textContent = "Tap a card to flip it. Hold a card to edit or delete.";

  function shorten() {
    document.querySelectorAll(".remember-button").forEach(function (btn) {
      var next = btn.classList.contains("remembered") ? "Remembered" : "Remember";
      if (btn.textContent !== next) btn.textContent = next;
    });
  }
  shorten();
  document.addEventListener("DOMContentLoaded", shorten);
  if (document.body) {
    new MutationObserver(shorten).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }
})();
