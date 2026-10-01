/* Clear names for the bottom bar buttons. */
(function () {
  var back = document.getElementById("return-button");
  var flip = document.getElementById("flip-all-button");
  var voice = document.getElementById("settings-button");
  if (back) {
    back.textContent = "Back";
    back.setAttribute("aria-label", "Back");
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
