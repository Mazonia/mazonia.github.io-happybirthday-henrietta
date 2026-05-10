/**
 * music.js — Henrietta's Birthday
 * Plays two MP3s alternately, looping forever.
 * Persists track + position across page navigation via localStorage.
 * Attempts autoplay on page load (works if user has previously interacted);
 * falls back to first user click/keydown if browser blocks it.
 */
(function (global) {
  "use strict";

  var TRACKS = [
    "music/birthday_instrumental.mp3",
    "music/classic_birthday_instrumental.mp3"
  ];

  var STATE_KEY = "hbday.music.v1";
  var TICK_MS   = 4000;

  var audio      = null;
  var muted      = false;
  var started    = false;
  var ticker     = null;
  var curIdx     = 0;
  var retryBound = false;

  /* ── Resolve path relative to site root regardless of current page ── */
  function trackSrc(rel) {
    /* Works for: localhost, GH Pages at root (mazonia.github.io/) */
    var base = location.origin + "/";
    /* If site is in a sub-folder (e.g. /repo-name/), detect it */
    var m = location.pathname.match(/^(\/[^/]+\/)/);
    if (m) base = location.origin + m[1];
    return base + rel;
  }

  function saveState() {
    if (!audio) return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        idx: curIdx,
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
      s.pos = (s.pos || 0) + (Date.now() - (s.ts || Date.now())) / 1000;
      return s;
    } catch(e) { return null; }
  }

  function attachRetryClick() {
    if (retryBound) return;
    retryBound = true;
    function onRetry() {
      document.removeEventListener("click",   onRetry, true);
      document.removeEventListener("keydown", onRetry, true);
      retryBound = false;
      if (audio && audio.paused && !muted) {
        audio.play().catch(function(){});
      }
    }
    document.addEventListener("click",   onRetry, true);
    document.addEventListener("keydown", onRetry, true);
  }

  function playTrack(idx, startPos) {
    if (audio) {
      clearInterval(ticker);
      audio.onended = null;
      audio.pause();
    }

    curIdx = idx % TRACKS.length;
    audio  = new Audio();
    audio.volume  = muted ? 0 : 0.35;
    audio.preload = "auto";
    audio.src     = trackSrc(TRACKS[curIdx]);

    /* Seek to saved position when metadata arrives (async is fine for seek) */
    if (startPos && startPos > 1) {
      audio.addEventListener("loadedmetadata", function () {
        var dur = audio.duration;
        if (!isNaN(dur) && startPos < dur - 2) {
          try { audio.currentTime = startPos; } catch(e) {}
        }
      }, { once: true });
    }

    audio.onended = function () {
      clearInterval(ticker);
      saveState();
      playTrack((curIdx + 1) % TRACKS.length, 0);
    };

    /* Attempt play — may succeed immediately if user has interacted before */
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        /* Autoplay blocked — wait for next user gesture */
        attachRetryClick();
      });
    }

    clearInterval(ticker);
    ticker = setInterval(saveState, TICK_MS);
  }

  function start() {
    if (started) return;
    started = true;
    var state = loadState();
    var idx = (state && state.idx >= 0) ? (state.idx % TRACKS.length) : 0;
    var pos = (state && state.pos > 1)  ? state.pos : 0;
    playTrack(idx, pos);
  }

  /* Save on page leave */
  window.addEventListener("pagehide", saveState);
  window.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveState();
  });

  /* ── Attempt autoplay as soon as DOM is ready ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    /* DOM already ready (script loaded late) */
    start();
  }

  /* ── Fallback: also start on first explicit interaction (lockdown click, etc.) ── */
  function onFirst() {
    document.removeEventListener("click",   onFirst, true);
    document.removeEventListener("keydown", onFirst, true);
    start(); /* no-op if already started */
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
