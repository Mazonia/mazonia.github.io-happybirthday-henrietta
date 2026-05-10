/**
 * music.js — Henrietta's Birthday
 * Plays two MP3s alternately, looping forever.
 * Persists track + position across page navigation via localStorage.
 * Starts on first user interaction (autoplay-policy compliant).
 */
(function (global) {
  "use strict";

  var TRACKS = [
    "music/birthday_instrumental.mp3",
    "music/classic_birthday_instrumental.mp3"
  ];

  var STATE_KEY = "hbday.music.v1";
  var TICK_MS   = 3000;   /* how often we save position */

  var audio   = null;
  var muted   = false;
  var started = false;
  var ticker  = null;

  /* ── Resolve relative path to absolute so it matches across pages ── */
  function absTrack(rel) {
    /* Find the root by walking up until we find the music folder.
       Simplest: build URL relative to the document's origin root. */
    var origin = location.origin;
    /* Strip any sub-path — music/ lives at the repo root */
    var base = origin + "/";
    return base + rel;
  }

  function saveState() {
    if (!audio) return;
    try {
      var idx = TRACKS.indexOf(audio._rel);
      localStorage.setItem(STATE_KEY, JSON.stringify({
        idx: idx >= 0 ? idx : 0,
        pos: audio.currentTime || 0,
        ts : Date.now()
      }));
    } catch(e) {}
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      /* Estimate how much real time elapsed since we last saved
         (user was on another page). Add that to pos. */
      var elapsed = (Date.now() - (s.ts || Date.now())) / 1000;
      s.pos = (s.pos || 0) + elapsed;
      return s;
    } catch(e) { return null; }
  }

  function createAudio(relSrc) {
    var a = new Audio();
    a.preload  = "auto";
    a.volume   = muted ? 0 : 0.35;
    a._rel     = relSrc;
    a.src      = absTrack(relSrc);
    return a;
  }

  function playTrack(idx, startPos) {
    if (audio) {
      audio.pause();
      audio.onended = null;
      clearInterval(ticker);
    }
    var rel = TRACKS[idx % TRACKS.length];
    audio   = createAudio(rel);

    audio.addEventListener("canplay", function onReady() {
      audio.removeEventListener("canplay", onReady);
      /* Seek into the track if we have a saved position.
         Clamp to valid range so we don't seek past end. */
      if (startPos && startPos > 0) {
        var dur = audio.duration;
        /* duration may be NaN if metadata not yet loaded — handle both */
        if (isNaN(dur) || startPos < dur - 2) {
          try { audio.currentTime = startPos; } catch(e) {}
        } else {
          /* saved position past end → next track */
          playTrack((idx + 1) % TRACKS.length, 0);
          return;
        }
      }
      audio.play().catch(function(){});
      /* Persist state every few seconds */
      ticker = setInterval(saveState, TICK_MS);
    }, { once: false });

    audio.onended = function () {
      clearInterval(ticker);
      var nextIdx = (idx + 1) % TRACKS.length;
      saveState();
      playTrack(nextIdx, 0);
    };
  }

  function start() {
    if (started) return;
    started = true;

    var state = loadState();
    var idx   = (state && state.idx >= 0) ? (state.idx % TRACKS.length) : 0;
    var pos   = (state && state.pos > 0)  ? state.pos : 0;
    playTrack(idx, pos);
  }

  /* ── Listen for page hide to snapshot position ── */
  window.addEventListener("pagehide",  saveState);
  window.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "hidden") saveState();
  });

  function onFirst() {
    document.removeEventListener("click",   onFirst, true);
    document.removeEventListener("keydown", onFirst, true);
    start();
  }
  document.addEventListener("click",   onFirst, true);
  document.addEventListener("keydown", onFirst, true);

  global.OreMusic = {
    toggle: function () {
      muted = !muted;
      if (!started && !muted) { start(); return; }
      if (audio) audio.volume = muted ? 0 : 0.35;
      var b = document.getElementById("ore-mute-badge");
      if (b) b.style.opacity = muted ? "1" : "0";
    },
    isMuted: function () { return muted; }
  };
})(window);
