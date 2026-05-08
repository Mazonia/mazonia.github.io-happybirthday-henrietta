(function (global) {
  var FEATURE_ATTR = "[data-feature]";

  // ── Client access gate ──────────────────────────────────────────────────────
  var ACCESS_KEY   = "oreCelebrations.access.v1";
  var VISITOR_PASS = "henrietta@20";   // 5-minute timed access
  var ADMIN_PASS   = "admin@herty";    // unlimited access
  var VISITOR_MS   = 5 * 60 * 1000;   // 5 minutes

  function normPass(s) { return String(s || "").trim().toLowerCase(); }

  function getAccess() {
    try { return JSON.parse(sessionStorage.getItem(ACCESS_KEY)) || null; }
    catch(e) { return null; }
  }
  function setAccess(type) {
    sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ type: type, ts: Date.now() }));
  }
  function clearAccess() { sessionStorage.removeItem(ACCESS_KEY); }

  function hasValidAccess() {
    var a = getAccess();
    if (!a) return false;
    if (a.type === "admin") return true;
    if (a.type === "visitor") return Date.now() - a.ts < VISITOR_MS;
    return false;
  }

  function injectAccessStyles() {
    if (document.getElementById("ore-access-styles")) return;
    var s = document.createElement("style");
    s.id = "ore-access-styles";
    s.textContent = [
      ".ore-gate{position:fixed;inset:0;z-index:99995;display:flex;align-items:center;justify-content:center;padding:1rem;",
        "background:radial-gradient(ellipse at 20% 20%,rgba(250,204,21,.07),transparent 50%),",
        "radial-gradient(ellipse at 80% 80%,rgba(167,139,250,.07),transparent 50%),",
        "rgba(5,7,15,.92);backdrop-filter:blur(20px);}",
      ".ore-gate-card{max-width:28rem;width:100%;background:rgba(15,18,32,.85);border:1px solid rgba(255,255,255,.1);",
        "border-radius:24px;padding:2rem;display:flex;flex-direction:column;align-items:center;gap:1.2rem;",
        "box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(250,204,21,.08);}",
      ".ore-gate-icon{width:56px;height:56px;border-radius:999px;background:rgba(250,204,21,.12);",
        "border:1px solid rgba(250,204,21,.25);display:flex;align-items:center;justify-content:center;",
        "font-size:1.6rem;}",
      ".ore-gate-title{font-weight:700;font-size:1.3rem;color:#fde68a;letter-spacing:-.01em;margin:0;}",
      ".ore-gate-sub{font-size:.82rem;color:rgba(203,213,225,.6);margin:0;text-align:center;line-height:1.5;}",
      ".ore-gate-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);",
        "border-radius:12px;padding:.7rem 1rem;font-size:1rem;color:#f1f5f9;outline:none;transition:border .2s;",
        "font-family:inherit;box-sizing:border-box;}",
      ".ore-gate-input:focus{border-color:rgba(250,204,21,.5);}",
      ".ore-gate-btn{width:100%;padding:.75rem;border-radius:12px;background:linear-gradient(135deg,#facc15,#f59e0b);",
        "color:#1a1000;font-weight:700;font-size:.95rem;border:none;cursor:pointer;transition:opacity .2s,transform .1s;font-family:inherit;}",
      ".ore-gate-btn:hover{opacity:.9;}.ore-gate-btn:active{transform:scale(.97);}",
      ".ore-gate-err{font-size:.78rem;color:#f87171;display:none;margin:0;}",
      ".ore-gate-timer{font-size:.72rem;color:rgba(250,204,21,.7);letter-spacing:.06em;margin:0;}",
      ".ore-visitor-pill{position:fixed;top:10px;right:12px;z-index:99994;",
        "background:rgba(15,18,32,.8);border:1px solid rgba(255,255,255,.12);border-radius:999px;",
        "padding:.28rem .85rem;font-size:.7rem;color:rgba(250,204,21,.8);cursor:pointer;",
        "backdrop-filter:blur(8px);transition:background .2s;font-family:inherit;letter-spacing:.04em;}",
      ".ore-visitor-pill:hover{background:rgba(250,204,21,.12);}"
    ].join("");
    document.head.appendChild(s);
  }

  var _gateEl = null;
  var _timerInterval = null;
  var _timerEl = null;

  function showGate() {
    if (_gateEl && document.body.contains(_gateEl)) return;
    injectAccessStyles();
    document.body.style.overflow = "hidden";
    _gateEl = document.createElement("div");
    _gateEl.className = "ore-gate";
    _gateEl.innerHTML =
      '<div class="ore-gate-card">' +
      '<div class="ore-gate-icon">🎀</div>' +
      '<p class="ore-gate-title">Birthday Site Access</p>' +
      '<p class="ore-gate-sub">Enter your passcode to explore Henrietta\'s birthday site.<br>' +
      '<em style="opacity:.5;font-style:normal;font-size:.72rem;">Don\'t have one? Ask the developer.</em></p>' +
      '<input id="ore-gate-inp" class="ore-gate-input" type="password" placeholder="Enter passcode…" autocomplete="off" />' +
      '<p id="ore-gate-err" class="ore-gate-err">Wrong passcode — try again.</p>' +
      '<button id="ore-gate-btn" class="ore-gate-btn">Let me in 🎉</button>' +
      '<p id="ore-gate-timer" class="ore-gate-timer" style="display:none;"></p>' +
      '</div>';
    document.body.appendChild(_gateEl);
    setTimeout(function() {
      var inp = document.getElementById("ore-gate-inp");
      if (inp) inp.focus();
    }, 80);
    function tryAccess() {
      var val = normPass(document.getElementById("ore-gate-inp").value);
      if (val === normPass(VISITOR_PASS)) {
        setAccess("visitor");
        hideGate(true);
      } else if (val === normPass(ADMIN_PASS)) {
        setAccess("admin");
        hideGate(false);
      } else {
        var err = document.getElementById("ore-gate-err");
        if (err) { err.style.display = "block"; }
        var inp = document.getElementById("ore-gate-inp");
        if (inp) { inp.style.borderColor = "rgba(248,113,113,.6)"; setTimeout(function(){ inp.style.borderColor=""; }, 600); }
      }
    }
    document.getElementById("ore-gate-btn").addEventListener("click", tryAccess);
    document.getElementById("ore-gate-inp").addEventListener("keydown", function(e) {
      if (e.key === "Enter") tryAccess();
    });
  }

  function hideGate(startTimer) {
    if (_gateEl && _gateEl.parentNode) _gateEl.parentNode.removeChild(_gateEl);
    _gateEl = null;
    document.body.style.overflow = "";
    injectVisitorPill(startTimer);
    if (startTimer) startVisitorTimer();
  }

  function injectVisitorPill(isVisitor) {
    var old = document.getElementById("ore-visitor-pill");
    if (old) old.parentNode.removeChild(old);
    injectAccessStyles();
    var pill = document.createElement("button");
    pill.id = "ore-visitor-pill";
    pill.className = "ore-visitor-pill";
    if (isVisitor) {
      _timerEl = pill;
      pill.textContent = "⏱ 5:00 remaining";
    } else {
      pill.textContent = "🔓 Admin access";
    }
    pill.addEventListener("click", function() {
      clearAccess();
      if (_timerInterval) clearInterval(_timerInterval);
      location.reload();
    });
    document.body.appendChild(pill);
  }

  function startVisitorTimer() {
    if (_timerInterval) clearInterval(_timerInterval);
    var access = getAccess();
    if (!access) return;
    _timerInterval = setInterval(function() {
      var elapsed = Date.now() - access.ts;
      var remaining = VISITOR_MS - elapsed;
      if (remaining <= 0) {
        clearInterval(_timerInterval);
        clearAccess();
        location.reload();
        return;
      }
      var mins = Math.floor(remaining / 60000);
      var secs = Math.floor((remaining % 60000) / 1000);
      var pill = document.getElementById("ore-visitor-pill");
      if (pill) pill.textContent = "⏱ " + mins + ":" + String(secs).padStart(2, "0") + " remaining";
    }, 1000);
  }

  function initClientAccessGate() {
    // Skip gate on admin pages
    if (location.pathname.indexOf("/admin") !== -1) return;
    // If lockdown target date has passed, no gate needed — site is open
    // We check this lazily; renderLockdownOverlay already returns false if date passed
    // If there's an active valid session, just show the pill
    if (hasValidAccess()) {
      var a = getAccess();
      injectVisitorPill(a && a.type === "visitor");
      if (a && a.type === "visitor") startVisitorTimer();
      return;
    }
    // Do NOT auto-show gate — user clicks the "Birthday countdown" link to open it
    // (showGate() is wired in renderLockdownOverlay)
  }

  document.addEventListener("DOMContentLoaded", initClientAccessGate);
  // ── End client access gate ─────────────────────────────────────────────────

  function isEnabled(features, key) {
    return features && features[key] !== false;
  }

  function applyNav(features) {
    document.querySelectorAll(FEATURE_ATTR).forEach(function (el) {
      var key = el.getAttribute("data-feature");
      if (!key || isEnabled(features, key)) return;
      el.remove();
    });
  }

  function setText(sel, text) {
    if (text == null) return;
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  function setAttr(sel, attr, val) {
    if (!val) return;
    document.querySelectorAll(sel).forEach(function (el) {
      el.setAttribute(attr, val);
    });
  }

  var SIDE_BASE =
    "py-3 px-6 flex items-center gap-3 font-sans uppercase tracking-widest text-xs rounded-xl transition-all hover:bg-white/5 hover:translate-x-1";
  var SIDE_ACTIVE = " bg-yellow-500/20 text-yellow-200 border-l-4 border-yellow-500";
  var SIDE_IDLE = " text-slate-400";

  var TOP_BASE = "transition-colors cursor-pointer font-sans tracking-tight";
  var TOP_ACTIVE = " text-yellow-400 border-b-2 border-yellow-400 pb-1";
  var TOP_IDLE = " text-slate-300 hover:text-white";

  function ensureLockdownMeta(meta, home) {
    meta.lockdown = meta.lockdown || {};
    if (meta.lockdown.enabled == null) meta.lockdown.enabled = false;
    if (!meta.lockdown.targetDate) meta.lockdown.targetDate = "2026-05-29T00:00:00";
    if (!Array.isArray(meta.lockdown.images) || !meta.lockdown.images.length) {
      var imgs = [];
      if (meta.profileImage) imgs.push(meta.profileImage);
      if (meta.heroImage) imgs.push(meta.heroImage);
      if (home && Array.isArray(home.memoryImages)) imgs = imgs.concat(home.memoryImages);
      meta.lockdown.images = imgs.filter(Boolean).slice(0, 20);
    }
  }

  function injectLockdownStyles() {
    if (document.getElementById("bday-lock-styles")) return;
    var style = document.createElement("style");
    style.id = "bday-lock-styles";
    style.textContent =
      "@keyframes bdayFall{0%{transform:translateY(-12vh) rotate(0deg)}100%{transform:translateY(112vh) rotate(720deg)}}\
      @keyframes bdayDrift{0%{transform:translate(-50%,-50%) rotate(var(--rot-start))}50%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--rot-mid))}100%{transform:translate(calc(-50% + var(--dx2)),calc(-50% + var(--dy2))) rotate(var(--rot-end))}}\
      @keyframes bdayFloat{0%,100%{margin-top:0}50%{margin-top:-3px}}\
      .bday-lock-screen{position:fixed;inset:0;z-index:9999;background:radial-gradient(circle at 20% 15%,rgba(250,204,21,.18),transparent 40%),#090b17;overflow:hidden}\
      .bday-lock-collage{position:absolute;inset:0;pointer-events:none;z-index:1}\
      .bday-lock-frame{position:absolute;padding:8px 8px 14px;border-radius:18px;background:linear-gradient(155deg,rgba(255,248,220,.9),rgba(255,239,186,.58));box-shadow:0 16px 34px rgba(0,0,0,.5),0 0 0 1px rgba(255,235,170,.35),inset 0 1px 0 rgba(255,255,255,.55);opacity:.94;animation:bdayDrift var(--drift,34s) cubic-bezier(.25,.46,.45,.94) infinite alternate,bdayFloat 6.2s ease-in-out infinite}\
      .bday-lock-frame::before{content:'';position:absolute;top:-4px;left:50%;transform:translateX(-50%) rotate(-2deg);width:34px;height:12px;border-radius:3px;background:linear-gradient(180deg,rgba(255,217,102,.95),rgba(255,179,71,.9));box-shadow:0 2px 6px rgba(0,0,0,.35)}\
      .bday-lock-frame-inner{width:100%;height:100%;overflow:hidden;border-radius:12px;border:2px solid rgba(94,60,5,.26);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}\
      .bday-lock-frame img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.08) contrast(1.02)}\
      .bday-lock-confetti{position:absolute;inset:0;pointer-events:none;z-index:2}\
      .bday-confetti-dot{position:absolute;top:-12vh;width:7px;height:13px;border-radius:999px;opacity:.8;animation:bdayFall linear infinite}\
      .bday-lock-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;z-index:5}\
      .bday-lock-card{max-width:42rem;width:min(94vw,42rem);background:rgba(7,10,22,.72);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(10px);border-radius:22px;padding:1.2rem 1.4rem;text-align:center;color:#f8fafc}\
      .bday-lock-count{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;margin-top:.8rem}\
      .bday-lock-box{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);border-radius:12px;padding:.5rem .3rem}\
      .bday-lock-num{font-weight:800;font-size:1.4rem;line-height:1.2;color:#facc15}\
      .bday-lock-lbl{text-transform:uppercase;font-size:.65rem;letter-spacing:.09em;opacity:.7}\
      .bday-lock-deco{position:absolute;inset:0;pointer-events:none;z-index:4}\
      .bday-lock-emoji{position:absolute;font-size:clamp(1.3rem,2vw,2rem);opacity:.92;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3));animation:bdayFloat 5s ease-in-out infinite}\
      @keyframes partySwing{0%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}100%{transform:rotate(-6deg)}}\
      @keyframes partyPop{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}\
      .party-room{position:fixed;inset:0;pointer-events:none;z-index:2147483647}\
      .party-string{position:absolute;top:0;width:2px;height:84px;background:linear-gradient(to bottom,rgba(255,255,255,.9),rgba(255,255,255,.08));}\
      .party-hang{position:absolute;top:70px;width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-top:34px solid var(--party-color,#f43f5e);filter:drop-shadow(0 4px 8px rgba(0,0,0,.35));transform-origin:50% -70px;animation:partySwing 4.8s ease-in-out infinite}\
      .party-hang::after{content:'';position:absolute;left:-5px;top:-36px;width:10px;height:10px;border-radius:999px;background:#fff8}\
      .party-side{position:absolute;width:30px;height:40px;border-radius:50% 50% 45% 45%;background:var(--party-color,#22d3ee);box-shadow:inset -4px -6px 0 rgba(255,255,255,.2),0 6px 12px rgba(0,0,0,.35);animation:partyPop 3.8s ease-in-out infinite}\
      .party-side::after{content:'';position:absolute;left:50%;bottom:-16px;width:2px;height:16px;background:rgba(255,255,255,.75)}";
    document.head.appendChild(style);
  }

  function renderLockdownOverlay(meta) {
    var target = new Date(meta.lockdown.targetDate || "2026-05-29T00:00:00");
    if (!(target instanceof Date) || isNaN(target.getTime())) target = new Date("2026-05-29T00:00:00");
    if (!meta.lockdown.enabled || Date.now() >= target.getTime()) return false;
    injectLockdownStyles();
    document.body.style.overflow = "hidden";
    var root = document.createElement("div");
    root.className = "bday-lock-screen";

    var collage = document.createElement("div");
    collage.className = "bday-lock-collage";
    var imgs = (meta.lockdown.images || []).filter(Boolean);
    if (!imgs.length && meta.profileImage) imgs = [meta.profileImage];
    var centerX = 50;
    var centerY = 50;
    var radiusX = 38;
    var radiusY = 31;
    var frameCount = Math.max(12, Math.min(18, imgs.length * 2));
    for (var i = 0; i < frameCount; i++) {
      var frame = document.createElement("div");
      frame.className = "bday-lock-frame";
      var w = 112 + Math.round(Math.random() * 34);
      var h = w + Math.round(Math.random() * 46);
      var angle = (Math.PI * 2 * i) / frameCount - Math.PI / 2;
      var jitter = (Math.random() - 0.5) * 2.2;
      var pos = {
        x: centerX + Math.cos(angle) * (radiusX + jitter),
        y: centerY + Math.sin(angle) * (radiusY + jitter),
      };
      frame.style.width = w + "px";
      frame.style.height = h + "px";
      frame.style.left = pos.x.toFixed(2) + "%";
      frame.style.top = pos.y.toFixed(2) + "%";
      frame.style.setProperty("--rot-start", ((-6 + Math.random() * 12) + (angle * 180) / Math.PI / 18).toFixed(1) + "deg");
      frame.style.setProperty("--rot-mid", (-8 + Math.random() * 16).toFixed(1) + "deg");
      frame.style.setProperty("--rot-end", (-6 + Math.random() * 12).toFixed(1) + "deg");
      frame.style.setProperty("--dx", (-8 + Math.random() * 16).toFixed(1) + "px");
      frame.style.setProperty("--dy", (-6 + Math.random() * 12).toFixed(1) + "px");
      frame.style.setProperty("--dx2", (-10 + Math.random() * 20).toFixed(1) + "px");
      frame.style.setProperty("--dy2", (-8 + Math.random() * 16).toFixed(1) + "px");
      frame.style.setProperty("--drift", (28 + Math.random() * 14).toFixed(2) + "s");
      frame.style.animationDelay = (Math.random() * 2.5).toFixed(2) + "s";
      frame.style.zIndex = String(1 + (i % 3));
      var inner = document.createElement("div");
      inner.className = "bday-lock-frame-inner";
      var img = document.createElement("img");
      img.alt = "";
      img.src = imgs[i % imgs.length];
      inner.appendChild(img);
      frame.appendChild(inner);
      collage.appendChild(frame);
    }

    var confetti = document.createElement("div");
    confetti.className = "bday-lock-confetti";
    var colors = ["#facc15", "#f9a8d4", "#22d3ee", "#a78bfa", "#fb7185", "#fef08a"];
    for (var c = 0; c < 120; c++) {
      var dot = document.createElement("span");
      dot.className = "bday-confetti-dot";
      dot.style.left = Math.round(Math.random() * 100) + "%";
      dot.style.background = colors[c % colors.length];
      dot.style.animationDuration = (5 + Math.random() * 5).toFixed(2) + "s";
      dot.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      confetti.appendChild(dot);
    }

    var center = document.createElement("div");
    center.className = "bday-lock-center";
    center.innerHTML =
      '<div class="bday-lock-card">' +
      '<p style="letter-spacing:.18em;font-size:.65rem;text-transform:uppercase;opacity:.72">' +
      '<a id="bday-access-link" href="#" style="color:inherit;text-decoration:none;cursor:pointer;" onclick="return false;">Birthday countdown</a>' +
      '</p>' +
      '<h1 style="margin:.2rem 0 0;font-size:clamp(1.4rem,3vw,2.3rem);font-weight:700;color:#fde68a;font-family:Caveat,cursive;letter-spacing:.02em">Henrietta turns ....(it\'s a secret!) <br> on May 29, 2026</h1>' +
      '<p style="margin:.55rem 0 0;opacity:.82;font-size:.92rem">The site opens soon. Until then, enjoy the celebration countdown.</p>' +
      '<div class="bday-lock-count">' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="d">0</div><div class="bday-lock-lbl">Days</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="h">0</div><div class="bday-lock-lbl">Hours</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="m">0</div><div class="bday-lock-lbl">Minutes</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="s">0</div><div class="bday-lock-lbl">Seconds</div></div>' +
      "</div></div>";
    // Wire the "Birthday countdown" text link to open access gate
    setTimeout(function() {
      var lnk = document.getElementById("bday-access-link");
      if (lnk) lnk.addEventListener("click", function(e) { e.preventDefault(); showGate(); });
    }, 200);
    var deco = document.createElement("div");
    deco.className = "bday-lock-deco";
    var decoItems = [
      { e: "🪅", x: 6, y: 8 }, { e: "🎂", x: 93, y: 8 }, { e: "🍦", x: 4, y: 50 },
      { e: "🎉", x: 94, y: 52 }, { e: "🍰", x: 8, y: 92 }, { e: "🍧", x: 92, y: 91 }
    ];
    decoItems.forEach(function (it, idx) {
      var span = document.createElement("span");
      span.className = "bday-lock-emoji";
      span.textContent = it.e;
      span.style.left = it.x + "%";
      span.style.top = it.y + "%";
      span.style.animationDelay = (idx * 0.35).toFixed(2) + "s";
      deco.appendChild(span);
    });
    root.appendChild(collage);
    root.appendChild(confetti);
    root.appendChild(deco);
    root.appendChild(center);
    document.body.appendChild(root);

    // Start constant low-intensity fireworks immediately
    startFireworks(root, "ambient");

    function tick() {
      var diff = Math.max(0, target.getTime() - Date.now());
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var q = root.querySelector.bind(root);
      q('[data-cd="d"]').textContent = String(d);
      q('[data-cd="h"]').textContent = String(h).padStart(2, "0");
      q('[data-cd="m"]').textContent = String(m).padStart(2, "0");
      q('[data-cd="s"]').textContent = String(s).padStart(2, "0");
      if (diff <= 0 && tick._wasPositive) {
        sessionStorage.setItem("oreCelebrations.postUnlock", "1");
        location.reload();
        return;
      }
      if (diff > 0) tick._wasPositive = true;
      // Intensify at 60 seconds remaining
      if (diff <= 60000 && !tick._intensified) {
        tick._intensified = true;
        startFireworks(root, "intense");
      }
    }
    tick();
    setInterval(tick, 1000);

    // --- Fireworks helpers ---
    function makeFireworksCanvas(parent) {
      var cv = document.createElement("canvas");
      cv.id = "bday-fireworks-canvas";
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;";
      parent.appendChild(cv);
      return cv;
    }

    function runFireworks(canvas, duration, onDone, burstEveryMs, burstCount) {
      var W = canvas.offsetWidth || window.innerWidth;
      var H = canvas.offsetHeight || window.innerHeight;
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext("2d");
      var particles = [];
      var colors = ["#facc15","#f9a8d4","#22d3ee","#a78bfa","#fb7185","#fef08a","#86efac","#f97316"];
      var start = Date.now();
      var lastBurst = 0;
      var everyMs = burstEveryMs || 400;
      var bCount = burstCount || 2;

      function burst() {
        var x = 80 + Math.random() * (W - 160);
        var y = 60 + Math.random() * (H * 0.55);
        var color = colors[Math.floor(Math.random() * colors.length)];
        var n = 40 + Math.floor(Math.random() * 20);
        for (var i = 0; i < n; i++) {
          var angle = (Math.PI * 2 * i) / n;
          var speed = 2 + Math.random() * 4;
          particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            alpha: 1, color: color,
            size: 2 + Math.random() * 2.5,
            life: 0.011 + Math.random() * 0.009
          });
        }
      }

      var raf;
      function frame() {
        var now = Date.now();
        var elapsed = now - start;
        ctx.clearRect(0, 0, W, H);
        if (now - lastBurst > everyMs) {
          for (var b = 0; b < bCount; b++) burst();
          lastBurst = now;
        }
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i];
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.06;
          p.alpha -= p.life;
          if (p.alpha <= 0) { particles.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (elapsed < duration) {
          raf = requestAnimationFrame(frame);
        } else {
          cancelAnimationFrame(raf);
          if (onDone) onDone();
        }
      }
      raf = requestAnimationFrame(frame);
      return { stop: function() { cancelAnimationFrame(raf); } };
    }

    var _fw = null;
    function startFireworks(parent, mode) {
      // mode: "ambient" (low, every 2.5s), "intense" (high, every 400ms)
      if (_fw) _fw.stop();
      var cv = document.getElementById("bday-fireworks-canvas") || makeFireworksCanvas(parent);
      var interval = (mode === "intense") ? 400 : 2400;
      var burstCount = (mode === "intense") ? 2 : 1;
      _fw = runFireworks(cv, 99999999, null, interval, burstCount);
    }
    // --- End fireworks ---
    return true;
  }

  function injectSubtleConfettiStyles() {
    if (document.getElementById("subtle-confetti-styles")) return;
    var style = document.createElement("style");
    style.id = "subtle-confetti-styles";
    style.textContent =
      "@keyframes subtleConfettiFall{0%{transform:translateY(-10vh)}100%{transform:translateY(110vh)}}" +
      ".subtle-confetti-layer{position:fixed;inset:0;pointer-events:none;z-index:5;mix-blend-mode:screen}" +
      ".subtle-confetti-dot{position:absolute;top:-10vh;width:6px;height:10px;border-radius:999px;opacity:.18}";
    document.head.appendChild(style);
  }

  function attachSubtleConfetti() {
    if (global.__oreSubtleConfettiAttached) return;
    global.__oreSubtleConfettiAttached = true;
    injectSubtleConfettiStyles();
    var layer = document.createElement("div");
    layer.className = "subtle-confetti-layer";
    var colors = ["#facc15", "#f9a8d4", "#22d3ee", "#a78bfa"];
    for (var i = 0; i < 22; i++) {
      var dot = document.createElement("span");
      dot.className = "subtle-confetti-dot";
      dot.style.left = Math.round(Math.random() * 100) + "%";
      dot.style.background = colors[i % colors.length];
      // Slightly faster fall so it feels more alive.
      dot.style.animation = "subtleConfettiFall " + (14 + Math.random() * 12).toFixed(1) + "s linear infinite";
      dot.style.animationDelay = (Math.random() * 20).toFixed(1) + "s";
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
  }

  function injectPartyDecorV2Styles() {
    if (document.getElementById("party-decor-v2-styles")) return;
    var style = document.createElement("style");
    style.id = "party-decor-v2-styles";
    style.textContent =
      "@keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}"+
      "@keyframes bdaySwing{0%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(8deg) translateY(-4px)}100%{transform:rotate(-8deg) translateY(0)}}"+
      "@keyframes bdayBob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.04)}}"+
      ".party-decor-v2{position:fixed;top:0;left:0;right:0;pointer-events:none;z-index:40;height:110px}"+
      ".party-garland{position:absolute;top:0;left:0;right:0;height:110px}"+
      ".party-garland svg{width:100%;height:100%;display:block}"+
      ".party-hang-item{position:absolute;top:0;transform-origin:50% -4px;animation:bdaySwing 4.2s ease-in-out infinite}"+
      ".party-hang-item svg,.party-hang-item span{display:block;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))}"+
      ".party-string-line{position:absolute;top:0;width:1.5px;background:linear-gradient(to bottom,rgba(255,255,255,.8),rgba(255,255,255,.05));}";
    document.head.appendChild(style);
  }

  function attachHangingDecorV2() {
    if (global.__orePartyDecorV2Attached) return;
    global.__orePartyDecorV2Attached = true;
    injectPartyDecorV2Styles();

    var layer = document.createElement("div");
    layer.className = "party-decor-v2";
    layer.id = "party-decor-v2";

    // String + wavy rope SVG
    var garland = document.createElement("div");
    garland.className = "party-garland";
    garland.innerHTML =
      '<svg viewBox="0 0 1200 110" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M0,18 C150,70 300,70 450,28 C600,-14 750,4 900,34 C1050,62 1150,44 1200,36" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 4"/>' +
      '<path d="M0,26 C160,82 320,80 500,38 C680,-8 860,10 1050,44 C1100,52 1160,48 1200,46" fill="none" stroke="rgba(250,204,21,.55)" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>';
    layer.appendChild(garland);

    // Birthday items to hang: triangles, stars, balloons, gifts, bunting letters
    var items = [
      // [xPercent, stringHeight, svgOrEmoji, color, delay, swingDur]
      { x: 5,  sh: 52, type: "triangle", color: "#ec4899", delay: "0s",    dur: "4.8s" },
      { x: 12, sh: 44, type: "star",     color: "#facc15", delay: "0.4s",  dur: "5.2s" },
      { x: 20, sh: 58, type: "balloon",  color: "#22d3ee", delay: "0.8s",  dur: "4.4s" },
      { x: 28, sh: 46, type: "triangle", color: "#a78bfa", delay: "0.2s",  dur: "5.6s" },
      { x: 36, sh: 54, type: "gift",     color: "#f97316", delay: "1.0s",  dur: "4.2s" },
      { x: 44, sh: 42, type: "star",     color: "#fb7185", delay: "0.6s",  dur: "5.0s" },
      { x: 52, sh: 60, type: "balloon",  color: "#34d399", delay: "1.2s",  dur: "4.6s" },
      { x: 60, sh: 48, type: "triangle", color: "#60a5fa", delay: "0.3s",  dur: "5.4s" },
      { x: 68, sh: 56, type: "gift",     color: "#f43f5e", delay: "0.9s",  dur: "4.0s" },
      { x: 76, sh: 44, type: "star",     color: "#c084fc", delay: "0.5s",  dur: "5.8s" },
      { x: 84, sh: 52, type: "balloon",  color: "#fbbf24", delay: "1.1s",  dur: "4.3s" },
      { x: 92, sh: 46, type: "triangle", color: "#2dd4bf", delay: "0.7s",  dur: "5.1s" },
    ];

    function makeSvg(type, color) {
      if (type === "triangle") {
        return '<svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg"><polygon points="14,2 27,30 1,30" fill="' + color + '" opacity=".93"/><circle cx="14" cy="2" r="3" fill="rgba(255,255,255,.5)"/></svg>';
      }
      if (type === "star") {
        return '<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><polygon points="15,2 18.5,11 28,11 20.5,17 23.5,26 15,21 6.5,26 9.5,17 2,11 11.5,11" fill="' + color + '" opacity=".95"/><circle cx="15" cy="1" r="2.5" fill="rgba(255,255,255,.5)"/></svg>';
      }
      if (type === "balloon") {
        return '<svg width="24" height="38" viewBox="0 0 24 38" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="14" rx="11" ry="13" fill="' + color + '" opacity=".92"/><ellipse cx="8" cy="9" rx="3" ry="4" fill="rgba(255,255,255,.3)"/><path d="M12,27 Q10,32 12,37" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="1" r="2" fill="rgba(255,255,255,.45)"/></svg>';
      }
      if (type === "gift") {
        return '<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="12" width="26" height="17" rx="2" fill="' + color + '" opacity=".92"/><rect x="1" y="8" width="28" height="6" rx="2" fill="' + color + '" opacity=".75"/><rect x="13" y="8" width="4" height="21" fill="rgba(255,255,255,.45)"/><path d="M15,8 Q10,2 6,5 Q2,8 8,10 Q12,9 15,8" fill="rgba(255,255,255,.55)"/><path d="M15,8 Q20,2 24,5 Q28,8 22,10 Q18,9 15,8" fill="rgba(255,255,255,.55)"/><circle cx="15" cy="1" r="2.5" fill="rgba(255,255,255,.45)"/></svg>';
      }
      return '';
    }

    items.forEach(function(it) {
      // String line
      var str = document.createElement("div");
      str.className = "party-string-line";
      str.style.left = it.x + "%";
      str.style.height = it.sh + "px";
      layer.appendChild(str);

      // Hanging item
      var hang = document.createElement("div");
      hang.className = "party-hang-item";
      hang.style.left = "calc(" + it.x + "% - 15px)";
      hang.style.top = it.sh + "px";
      hang.style.animationDelay = it.delay;
      hang.style.animationDuration = it.dur;
      hang.innerHTML = makeSvg(it.type, it.color);
      layer.appendChild(hang);
    });

    document.body.appendChild(layer);
  }

  function decorateClientSideNav() {
    // Emoji decoration removed per design update.
    // Add a large party popper as a background accent in the sidebar.
    if (global.__oreClientNavDecorated) return;
    global.__oreClientNavDecorated = true;
    var aside = document.querySelector("aside");
    if (!aside) return;
    // Make aside relatively positioned so the popper is contained
    if (getComputedStyle(aside).position === "static") aside.style.position = "relative";
    var popper = document.createElement("div");
    popper.setAttribute("aria-hidden", "true");
    popper.style.cssText = [
      "position:absolute",
      "bottom:-10px",
      "right:-10px",
      "font-size:9rem",
      "line-height:1",
      "opacity:0.08",
      "pointer-events:none",
      "user-select:none",
      "transform:rotate(-20deg)",
      "z-index:0",
      "filter:blur(1px) saturate(2)"
    ].join(";");
    popper.textContent = "\uD83C\uDF89"; // 🎉
    aside.appendChild(popper);
  }

  function attachMediaProtection() {
    if (global.__oreMediaProtectionAttached) return;
    global.__oreMediaProtectionAttached = true;
    document.addEventListener("contextmenu", function (e) {
      var t = e.target;
      if (t && (t.closest("img") || t.closest("video") || t.closest("iframe"))) e.preventDefault();
    });
    document.addEventListener("dragstart", function (e) {
      var t = e.target;
      if (t && (t.tagName === "IMG" || t.tagName === "VIDEO")) e.preventDefault();
    });
    document.addEventListener("keydown", function (e) {
      var k = String(e.key || "").toLowerCase();
      var ctrlOrMeta = e.ctrlKey || e.metaKey;
      if ((ctrlOrMeta && (k === "s" || k === "p")) || k === "printscreen") {
        e.preventDefault();
      }
    });
    function hardenVideos(root) {
      (root || document).querySelectorAll("video").forEach(function (v) {
        v.setAttribute("controlsList", "nodownload noplaybackrate");
        v.setAttribute("disablePictureInPicture", "");
        v.setAttribute("disableRemotePlayback", "");
      });
    }
    hardenVideos(document);
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (!n || n.nodeType !== 1) return;
          if (n.tagName === "VIDEO") hardenVideos(n.parentNode || document);
          else hardenVideos(n);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function attachPartyRoomDecor() {
    if (global.__orePartyRoomDecorAttached) return;
    global.__orePartyRoomDecorAttached = true;
    var layer = document.createElement("div");
    layer.className = "party-room";
    layer.style.zIndex = "2147483647";
    var topColors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
    [9, 21, 33, 45, 57, 69, 81, 93].forEach(function (x, idx) {
      var str = document.createElement("span");
      str.className = "party-string";
      str.style.left = x + "%";
      str.style.height = (44 + (idx % 3) * 8) + "px";
      layer.appendChild(str);
      var h = document.createElement("span");
      h.className = "party-hang";
      h.style.setProperty("--party-color", topColors[idx % topColors.length]);
      h.style.left = x + "%";
      h.style.top = "0px";
      h.style.animationDelay = (idx * 0.27).toFixed(2) + "s";
      layer.appendChild(h);
    });
    var left = document.createElement("span");
    left.className = "party-side";
    left.style.setProperty("--party-color", "#22d3ee");
    left.style.left = "0.4rem";
    left.style.top = "42%";
    var right = document.createElement("span");
    right.className = "party-side";
    right.style.setProperty("--party-color", "#f97316");
    right.style.right = "0.4rem";
    right.style.top = "57%";
    right.style.animationDelay = "0.6s";
    layer.appendChild(left);
    layer.appendChild(right);
    // Append at the top level so no parent can clip it.
    (document.documentElement || document.body).appendChild(layer);
  }

  function highlightNav(active) {
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      var page = el.getAttribute("data-nav");
      var on = page === active;
      el.className = SIDE_BASE + (on ? SIDE_ACTIVE : SIDE_IDLE);
    });
    document.querySelectorAll("[data-nav-top]").forEach(function (el) {
      var page = el.getAttribute("data-nav-top");
      var on = page === active;
      el.className = TOP_BASE + (on ? TOP_ACTIVE : TOP_IDLE);
    });
  }

  /**
   * @param {object} opts
   * @param {string} opts.active - nav id: home | gallery | messages | quiz | vault | scrapbook
   */
  global.applySiteShell = async function (opts) {
    var data = await global.SiteData.load();
    var m = data.meta || {};
    var features = data.features || {};
    ensureLockdownMeta(m, data.home || {});

    document.documentElement.classList.add("dark");

    setText('[data-bind="site-title"]', m.siteTitle);
    setText('[data-bind="celebrant"]', m.celebrantName);
    setText('[data-bind="hero-kicker"]', m.heroKicker);
    setText('[data-bind="hero-title"]', m.heroTitle);
    setAttr('[data-bind="profile-img"]', "src", m.profileImage);
    setAttr('[data-bind="hero-img"]', "src", m.heroImage);
    setText('[data-bind="footer-year"]', String(m.footerYear || new Date().getFullYear()));

    applyNav(features);
    if (opts && opts.active) highlightNav(opts.active);
    var isLocked = renderLockdownOverlay(m);
    if (!isLocked) {
      attachSubtleConfetti();
      decorateClientSideNav();
      attachHangingDecorV2();

      // Post-unlock fireworks: intense 5s after countdown reaches zero
      if (sessionStorage.getItem("oreCelebrations.postUnlock") === "1") {
        sessionStorage.removeItem("oreCelebrations.postUnlock");
        runPageFireworks(5000);
      } else if (opts && opts.active === "home") {
        // Brief welcome fireworks on every homepage visit
        runPageFireworks(4000);
      }
    }
    attachMediaProtection();

    return data;
  };

  // Full-page fireworks overlay (used for post-unlock celebration)
  function runPageFireworks(duration) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9990;pointer-events:none;";
    var cv = document.createElement("canvas");
    cv.style.cssText = "width:100%;height:100%;display:block;";
    overlay.appendChild(cv);
    document.body.appendChild(overlay);

    function resize() {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    var ctx = cv.getContext("2d");
    var particles = [];
    var colors = ["#facc15","#f9a8d4","#22d3ee","#a78bfa","#fb7185","#fef08a","#86efac","#f97316","#fff","#60a5fa"];
    var start = Date.now();
    var lastBurst = 0;

    function burst() {
      var x = 60 + Math.random() * (cv.width - 120);
      var y = 40 + Math.random() * (cv.height * 0.6);
      var color = colors[Math.floor(Math.random() * colors.length)];
      var count = 60 + Math.floor(Math.random() * 30);
      for (var i = 0; i < count; i++) {
        var angle = (Math.PI * 2 * i) / count;
        var speed = 3 + Math.random() * 5;
        particles.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          alpha: 1, color: color,
          size: 2.5 + Math.random() * 3,
          life: 0.01 + Math.random() * 0.007
        });
      }
    }

    var raf;
    function frame() {
      var now = Date.now();
      var elapsed = now - start;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (now - lastBurst > 300) {
        burst(); burst();
        if (Math.random() > 0.5) burst();
        lastBurst = now;
      }
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.08;
        p.alpha -= p.life;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (elapsed < duration) {
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    }
    raf = requestAnimationFrame(frame);
  }
})(window);
