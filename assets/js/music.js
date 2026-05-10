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
  var TICK_MS   = 4000;

  var audio   = null;
  var muted   = false;
  var started = false;
  var ticker  = null;
  var curIdx  = 0;

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
      /* add elapsed real time since save (spent on another page) */
      s.pos = (s.pos || 0) + (Date.now() - (s.ts || Date.now())) / 1000;
      return s;
    } catch(e) { return null; }
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
    audio.src     = TRACKS[curIdx];

    /* Seek to saved position once metadata is ready.
       We do NOT wait for this before calling play() —
       play() must be called synchronously inside the user gesture. */
    if (startPos && startPos > 1) {
      audio.addEventListener("loadedmetadata", function () {
        var dur = audio.duration;
        if (!isNaN(dur) && startPos < dur - 2) {
          audio.currentTime = startPos;
        }
        /* if startPos >= dur the track will just play from 0 which is fine */
      }, { once: true });
    }

    audio.onended = function () {
      clearInterval(ticker);
      saveState();
      playTrack((curIdx + 1) % TRACKS.length, 0);
    };

    /* play() called immediately — still within the user gesture call stack */
    var promise = audio.play();
    if (promise && promise.catch) {
      promise.catch(function(e) {
        /* If blocked, retry once on next click */
        if (!muted) {
          function retry() {
            document.removeEventListener("click", retry, true);
            audio.play().catch(function(){});
          }
          document.addEventListener("click", retry, true);
        }
      });
    }

    /* Save position periodically */
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

  /* Start on first interaction */
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
