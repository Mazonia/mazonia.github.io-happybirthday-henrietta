(function (global) {
  var FEATURE_ATTR = "[data-feature]";

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
      @keyframes bdayFloat{0%,100%{margin-top:0}50%{margin-top:-6px}}\
      .bday-lock-screen{position:fixed;inset:0;z-index:9999;background:radial-gradient(circle at 20% 15%,rgba(250,204,21,.18),transparent 40%),#090b17;overflow:hidden}\
      .bday-lock-collage{position:absolute;inset:0;pointer-events:none;z-index:1}\
      .bday-lock-frame{position:absolute;padding:8px 8px 14px;border-radius:18px;background:linear-gradient(155deg,rgba(255,248,220,.9),rgba(255,239,186,.58));box-shadow:0 16px 34px rgba(0,0,0,.5),0 0 0 1px rgba(255,235,170,.35),inset 0 1px 0 rgba(255,255,255,.55);opacity:.94;animation:bdayDrift var(--drift,26s) ease-in-out infinite alternate,bdayFloat 4.6s ease-in-out infinite}\
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
      .party-room{position:fixed;inset:0;pointer-events:none;z-index:6}\
      .party-hang{position:absolute;top:0;font-size:24px;transform-origin:top center;animation:partySwing 4.8s ease-in-out infinite;color:#fff}\
      .party-string{position:absolute;top:0;width:2px;height:58px;background:linear-gradient(to bottom,rgba(255,255,255,.7),rgba(255,255,255,.1));}\
      .party-side{position:absolute;font-size:26px;animation:partyPop 3.8s ease-in-out infinite}";
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
      frame.style.setProperty("--dx", (-16 + Math.random() * 32).toFixed(1) + "px");
      frame.style.setProperty("--dy", (-12 + Math.random() * 24).toFixed(1) + "px");
      frame.style.setProperty("--dx2", (-20 + Math.random() * 40).toFixed(1) + "px");
      frame.style.setProperty("--dy2", (-16 + Math.random() * 32).toFixed(1) + "px");
      frame.style.setProperty("--drift", (18 + Math.random() * 17).toFixed(2) + "s");
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
      '<p style="letter-spacing:.18em;font-size:.65rem;text-transform:uppercase;opacity:.72">Birthday countdown</p>' +
      '<h1 style="margin:.2rem 0 0;font-size:clamp(1.4rem,3vw,2.3rem);font-weight:700;color:#fde68a;font-family:Caveat,cursive;letter-spacing:.02em">Henrietta turns ....(it\'s a secret!) <br> on May 29, 2026</h1>' +
      '<p style="margin:.55rem 0 0;opacity:.82;font-size:.92rem">The site opens soon. Until then, enjoy the celebration countdown.</p>' +
      '<div class="bday-lock-count">' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="d">0</div><div class="bday-lock-lbl">Days</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="h">0</div><div class="bday-lock-lbl">Hours</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="m">0</div><div class="bday-lock-lbl">Minutes</div></div>' +
      '<div class="bday-lock-box"><div class="bday-lock-num" data-cd="s">0</div><div class="bday-lock-lbl">Seconds</div></div>' +
      "</div></div>";
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
      if (diff <= 0) location.reload();
    }
    tick();
    setInterval(tick, 1000);
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
      dot.style.animation = "subtleConfettiFall " + (18 + Math.random() * 16).toFixed(1) + "s linear infinite";
      dot.style.animationDelay = (Math.random() * 20).toFixed(1) + "s";
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
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

  function decorateSideNavBirthday() {
    if (global.__oreSideNavDecorated) return;
    global.__oreSideNavDecorated = true;
    var aside = document.querySelector("aside");
    if (!aside) return;
    var header = aside.querySelector("div p");
    if (header && !header.getAttribute("data-bday")) {
      header.setAttribute("data-bday", "1");
      header.textContent = "The Dig Site  🎂 🎉";
    }
    aside.querySelectorAll("[data-nav]").forEach(function (a, idx) {
      if (a.querySelector(".bday-nav-emoji")) return;
      var deco = document.createElement("span");
      deco.className = "bday-nav-emoji";
      deco.textContent = ["🎈", "🎂", "🎊", "🍰", "🎉", "🪅"][idx % 6];
      deco.style.marginLeft = "auto";
      deco.style.fontSize = "13px";
      deco.style.opacity = "0.9";
      a.appendChild(deco);
    });
  }

  function attachPartyRoomDecor() {
    if (global.__orePartyRoomDecorAttached) return;
    global.__orePartyRoomDecorAttached = true;
    var layer = document.createElement("div");
    layer.className = "party-room";
    var topItems = ["🪅", "🎈", "🎉", "🎂", "🍰", "🍦", "🎊", "🧁"];
    [9, 21, 33, 45, 57, 69, 81, 93].forEach(function (x, idx) {
      var str = document.createElement("span");
      str.className = "party-string";
      str.style.left = x + "%";
      str.style.height = (44 + (idx % 3) * 8) + "px";
      layer.appendChild(str);
      var h = document.createElement("span");
      h.className = "party-hang";
      h.textContent = topItems[idx % topItems.length];
      h.style.left = x + "%";
      h.style.top = (42 + (idx % 3) * 8) + "px";
      h.style.animationDelay = (idx * 0.27).toFixed(2) + "s";
      layer.appendChild(h);
    });
    var left = document.createElement("span");
    left.className = "party-side";
    left.textContent = "🎈";
    left.style.left = "0.4rem";
    left.style.top = "42%";
    var right = document.createElement("span");
    right.className = "party-side";
    right.textContent = "🎉";
    right.style.right = "0.4rem";
    right.style.top = "57%";
    right.style.animationDelay = "0.6s";
    layer.appendChild(left);
    layer.appendChild(right);
    document.body.appendChild(layer);
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
      attachPartyRoomDecor();
    }
    attachMediaProtection();
    decorateSideNavBirthday();

    return data;
  };
})(window);
