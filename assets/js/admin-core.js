(function () {
  var ADM = "oreCelebrations.adminSession.v1";
  var data;
  var persistTimer;
  var FEATURE_KEYS = [
    ["gallery", "Gallery"],
    ["messages", "Messages"],
    ["quiz", "Truth drill"],
    ["vault", "Vault"],
    ["scrapbook", "Scrapbook"],
  ];

  var MEDIA_HINT =
    "Paste a direct image link, or choose a file to embed in this browser (stored in your site backup JSON). Google Drive: use “Get link” then a direct file / hosting URL; share links often will not load as images.";

  function $(id) {
    return document.getElementById(id);
  }

  // normalizeAdminPath: disabled — static servers like `npx serve` canonicalize
  // /admin/index.html → /admin/ which would loop forever.
  // All admin links now use explicit filenames so no redirect is needed.
  function normalizeAdminPath() {
    return false;
  }

  function toast() {
    var t = $("toast");
    if (!t) return;
    t.classList.remove("hidden");
    clearTimeout(toast._x);
    toast._x = setTimeout(function () {
      t.classList.add("hidden");
    }, 1600);
  }

  function persist() {
    try {
      SiteData.save(data);
      toast();
      return true;
    } catch (e) {
      alert(
        "Save failed. Browser storage is full (large embedded media). Use smaller uploads or media URLs (YouTube/hosted links), then try again."
      );
      return false;
    }
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      persist();
    }, 450);
  }

  function ensureArrays() {
    data.meta = data.meta || {};
    data.features = data.features || {};
    data.messages = data.messages || [];
    data.questions = data.questions || [];
    data.gallery = data.gallery || [];
    data.home = data.home || {};
    data.home.memoryMedia = Array.isArray(data.home.memoryMedia) ? data.home.memoryMedia : [];
    if (!data.home.memoryMedia.length && Array.isArray(data.home.memoryImages)) {
      data.home.memoryMedia = data.home.memoryImages
        .filter(Boolean)
        .map(function (u) {
          return { id: SiteData.uid(), type: "image", src: String(u) };
        });
    }
    data.messagesPage = data.messagesPage || {};
    data.quizPage = data.quizPage || {};
    data.galleryPage = data.galleryPage || {};
    data.vault = data.vault || { letterParagraphs: [], timeline: [] };
    data.vault.timeline = data.vault.timeline || [];
    data.vault.letterParagraphs = data.vault.letterParagraphs || [];
    data.vault.letters = Array.isArray(data.vault.letters) ? data.vault.letters : [];
    if (!data.vault.letters.length) {
      var paras = data.vault.letterParagraphs || [];
      if (data.vault.letterTitle || data.vault.letterSubtitle || paras.length) {
        data.vault.letters.push({
          id: SiteData.uid(),
          title: data.vault.letterTitle || "",
          subtitle: data.vault.letterSubtitle || "",
          paragraphs: paras.slice(),
        });
      }
    }
    data.scrapbook = data.scrapbook || { pages: [] };
    data.scrapbook.pages = data.scrapbook.pages || [];
    if (!data.scrapbook.itemsPerSpread) data.scrapbook.itemsPerSpread = 4;
    if (!data.scrapbook.layoutStyle) data.scrapbook.layoutStyle = "album";
    data.meta.lockdown = data.meta.lockdown || {};
    if (data.meta.lockdown.enabled == null) data.meta.lockdown.enabled = false;
    if (!data.meta.lockdown.targetDate) data.meta.lockdown.targetDate = "2026-05-29T00:00:00";
    data.meta.lockdown.images = Array.isArray(data.meta.lockdown.images) ? data.meta.lockdown.images : [];
    (data.gallery || []).forEach(function (g) {
      if (g.video == null) g.video = "";
    });
    (data.messages || []).forEach(function (m) {
      if (m.textColor == null) m.textColor = "";
    });
    (data.scrapbook.pages || []).forEach(function (p) {
      if (p.video == null) p.video = "";
      p.media = Array.isArray(p.media) ? p.media : [];
      if (!p.media.length) {
        if (p.image) p.media.push({ type: "image", src: p.image, size: "landscape" });
        if (p.video) p.media.push({ type: "video", src: p.video, size: "landscape" });
      }
      p.media.forEach(function (m) {
        if (!m) return;
        if (!m.type) m.type = inferMediaType(m.src);
        if (!m.size) m.size = "landscape"; // landscape | square | portrait
      });
      if (!p.showCount) p.showCount = Math.max(1, p.media.length || 1);
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function readImageFileToUrl(file, cb) {
    if (!file || !/^image\//.test(file.type)) {
      alert("Please choose an image file (PNG, JPG, WebP, GIF).");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var s = String(reader.result || "");
      if (s.length > 2.8 * 1024 * 1024) {
        if (!confirm("This image is large when embedded. Continue?")) return;
      }
      cb(s);
    };
    reader.onerror = function () {
      alert("Could not read that file.");
    };
    reader.readAsDataURL(file);
  }

  function readMediaFileToUrl(file, acceptPrefixRegex, tooLargeMsg, cb) {
    if (!file || (acceptPrefixRegex && !acceptPrefixRegex.test(file.type))) {
      alert("Unsupported file type.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var s = String(reader.result || "");
      if (s.length > 3.8 * 1024 * 1024) {
        alert(
          tooLargeMsg ||
            "This file is too large to embed in browser storage. Use a hosted video URL (YouTube/direct link) or a smaller compressed file."
        );
        return;
      }
      if (s.length > 2.2 * 1024 * 1024) {
        if (!confirm("This embedded media is quite large and might fail to save later. Continue?")) return;
      }
      cb(s);
    };
    reader.onerror = function () {
      alert("Could not read that file.");
    };
    reader.readAsDataURL(file);
  }

  function bindImageFileToUrlInput(fileInput, urlInput) {
    if (!fileInput || !urlInput) return;
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      readImageFileToUrl(f, function (url) {
        urlInput.value = url;
        urlInput.dispatchEvent(new Event("input", { bubbles: true }));
        fileInput.value = "";
      });
    });
  }

  // ---- Media manifest: pick from project images/videos ----
  var _mediaManifest = null;
  function loadMediaManifest(cb) {
    if (_mediaManifest) { cb(_mediaManifest); return; }
    var prefix = typeof window.__SITE_DATA_PREFIX__ !== "undefined" ? window.__SITE_DATA_PREFIX__ : "";
    fetch(prefix + "data/media-manifest.json", { cache: "no-store" })
      .then(function(r) { return r.json(); })
      .then(function(m) { _mediaManifest = m; cb(m); })
      .catch(function() { cb({ images: [], videos: [] }); });
  }

  /**
   * Inserts a "Pick from project ▾" dropdown before targetInput.
   * mode: "image" | "video" | "any"
   */
  function injectProjectPicker(targetInput, mode) {
    if (!targetInput || targetInput._pickerInjected) return;
    targetInput._pickerInjected = true;
    loadMediaManifest(function(manifest) {
      var files = [];
      if (mode === "image" || mode === "any") files = files.concat(manifest.images || []);
      if (mode === "video" || mode === "any") files = files.concat(manifest.videos || []);
      if (!files.length) return;

      var wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;gap:4px;align-items:center;margin-bottom:4px;";

      var sel = document.createElement("select");
      sel.style.cssText = "flex:1;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:4px 8px;font-size:11px;color:#e2e8f0;cursor:pointer;";
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "📁 Pick from project…";
      sel.appendChild(placeholder);

      // Group images and videos
      if ((mode === "image" || mode === "any") && manifest.images && manifest.images.length) {
        var imgGrp = document.createElement("optgroup");
        imgGrp.label = "── Images ──";
        (manifest.images || []).forEach(function(f) {
          var o = document.createElement("option");
          o.value = f;
          o.textContent = f.split("/").pop();
          imgGrp.appendChild(o);
        });
        sel.appendChild(imgGrp);
      }
      if ((mode === "video" || mode === "any") && manifest.videos && manifest.videos.length) {
        var vidGrp = document.createElement("optgroup");
        vidGrp.label = "── Videos ──";
        (manifest.videos || []).forEach(function(f) {
          var o = document.createElement("option");
          o.value = f;
          o.textContent = f.split("/").pop();
          vidGrp.appendChild(o);
        });
        sel.appendChild(vidGrp);
      }

      sel.addEventListener("change", function() {
        if (!sel.value) return;
        targetInput.value = sel.value;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        sel.value = "";
      });

      wrap.appendChild(sel);
      targetInput.parentNode.insertBefore(wrap, targetInput);
    });
  }
  // ---- End media manifest ----

  function checkAdminLock() {
    var pass = (data.meta && data.meta.adminPassphrase) || "";
    var gate = $("admin-lock");
    if (!gate) return;
    if (!pass) {
      gate.classList.add("hidden");
      sessionStorage.setItem(ADM, "1");
      return;
    }
    if (sessionStorage.getItem(ADM) === "1") {
      gate.classList.add("hidden");
      return;
    }
    gate.classList.remove("hidden");
  }

  function bindLock() {
    var btn = $("admin-lock-submit");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var inp = $("admin-lock-input");
      if (!inp) return;
      if (inp.value === (data.meta.adminPassphrase || "")) {
        sessionStorage.setItem(ADM, "1");
        var err = $("admin-lock-err");
        if (err) err.classList.add("hidden");
        $("admin-lock").classList.add("hidden");
      } else {
        var e = $("admin-lock-err");
        if (e) e.classList.remove("hidden");
      }
    });
  }

  function setVal(id, v) {
    var el = $(id);
    if (el) el.value = v != null ? v : "";
  }
  function getVal(id) {
    var el = $(id);
    return el ? el.value : undefined;
  }

  function fillFormsFromData() {
    setVal("fld-msg-title", data.messagesPage.title || "");
    setVal("fld-msg-sub", data.messagesPage.subtitle || "");
    setVal("fld-quiz-kicker", data.quizPage.kicker || "");
    setVal("fld-quiz-title", data.quizPage.title || "");
    setVal("fld-quiz-sub", data.quizPage.subtitle || "");
    setVal("fld-gal-title", data.galleryPage.title || "");
    setVal("fld-gal-sub", data.galleryPage.subtitle || "");
    setVal("fld-vault-pass", data.vault.passphrase || "");
    setVal("fld-meta-site", data.meta.siteTitle || "");
    setVal("fld-meta-name", data.meta.celebrantName || "");
    setVal("fld-meta-kicker", data.meta.heroKicker || "");
    setVal("fld-meta-hero", data.meta.heroTitle || "");
    setVal("fld-meta-prof", data.meta.profileImage || "");
    setVal("fld-meta-heroimg", data.meta.heroImage || "");
    setVal("fld-meta-year", data.meta.footerYear || 2026);
    setVal("fld-meta-adminpass", data.meta.adminPassphrase || "");
    setVal("fld-home-prog", data.home.surpriseProgress ?? 85);
    setVal("fld-home-quote", data.home.quote || "");
    setVal("fld-home-by", data.home.quoteAttribution || "");
    setVal("fld-home-imgs", (data.home.memoryMedia || []).map(function (m) { return m.src; }).join("\n"));
    setVal("fld-home-n", data.home.messagesTeaserCount ?? 0);
    renderHomeMediaList();
    if ($("fld-lock-enabled")) $("fld-lock-enabled").checked = !!data.meta.lockdown.enabled;
    if ($("fld-lock-target")) {
      var iso = data.meta.lockdown.targetDate || "2026-05-29T00:00:00";
      setVal("fld-lock-target", String(iso).slice(0, 16));
    }
    setVal("fld-lock-images", (data.meta.lockdown.images || []).join("\n"));
    renderLockdownImagesList();
    setVal("fld-scrap-per-spread", data.scrapbook.itemsPerSpread || 4);
    setVal("fld-scrap-layout", data.scrapbook.layoutStyle || "album");
  }

  function readSiteFieldsIntoData() {
    var v;
    if ((v = getVal("fld-msg-title")) !== undefined) data.messagesPage.title = v.trim();
    if ((v = getVal("fld-msg-sub")) !== undefined) data.messagesPage.subtitle = v.trim();
    if ((v = getVal("fld-quiz-kicker")) !== undefined) data.quizPage.kicker = v.trim();
    if ((v = getVal("fld-quiz-title")) !== undefined) data.quizPage.title = v.trim();
    if ((v = getVal("fld-quiz-sub")) !== undefined) data.quizPage.subtitle = v.trim();
    if ((v = getVal("fld-gal-title")) !== undefined) data.galleryPage.title = v.trim();
    if ((v = getVal("fld-gal-sub")) !== undefined) data.galleryPage.subtitle = v.trim();
    if ((v = getVal("fld-vault-pass")) !== undefined) data.vault.passphrase = v.trim();
    if ((v = getVal("fld-meta-site")) !== undefined) data.meta.siteTitle = v.trim();
    if ((v = getVal("fld-meta-name")) !== undefined) data.meta.celebrantName = v.trim();
    if ((v = getVal("fld-meta-kicker")) !== undefined) data.meta.heroKicker = v.trim();
    if ((v = getVal("fld-meta-hero")) !== undefined) data.meta.heroTitle = v.trim();
    if ((v = getVal("fld-meta-prof")) !== undefined) data.meta.profileImage = v.trim();
    if ((v = getVal("fld-meta-heroimg")) !== undefined) data.meta.heroImage = v.trim();
    if ($("fld-meta-year")) data.meta.footerYear = Number(getVal("fld-meta-year")) || 2026;
    if ($("fld-meta-adminpass")) data.meta.adminPassphrase = getVal("fld-meta-adminpass");
    if ($("fld-home-prog")) data.home.surpriseProgress = Math.max(0, Math.min(100, Number(getVal("fld-home-prog")) || 0));
    if ((v = getVal("fld-home-quote")) !== undefined) data.home.quote = v.trim();
    if ((v = getVal("fld-home-by")) !== undefined) data.home.quoteAttribution = v.trim();
    if ($("fld-home-imgs")) {
      var list = getVal("fld-home-imgs")
        .split("\n")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      data.home.memoryMedia = list.map(function (src) {
        return { id: SiteData.uid(), type: inferMediaType(src), src: src };
      });
      data.home.memoryImages = data.home.memoryMedia
        .filter(function (m) {
          return m.type === "image";
        })
        .map(function (m) {
          return m.src;
        });
    }
    if ($("fld-home-n")) data.home.messagesTeaserCount = Number(getVal("fld-home-n")) || 0;
    if ($("fld-lock-enabled")) data.meta.lockdown.enabled = $("fld-lock-enabled").checked;
    if ($("fld-lock-target")) {
      var raw = getVal("fld-lock-target");
      data.meta.lockdown.targetDate = raw ? new Date(raw).toISOString() : "2026-05-29T00:00:00";
    }
    if ($("fld-lock-images")) {
      data.meta.lockdown.images = getVal("fld-lock-images")
        .split("\n")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
    }
    if ($("fld-scrap-per-spread")) {
      data.scrapbook.itemsPerSpread = Math.max(2, Number(getVal("fld-scrap-per-spread")) || 4);
    }
    if ($("fld-scrap-layout")) data.scrapbook.layoutStyle = getVal("fld-scrap-layout") || "album";
  }

  function syncLockdownTextarea() {
    if ($("fld-lock-images")) setVal("fld-lock-images", (data.meta.lockdown.images || []).join("\n"));
  }

  function renderLockdownImagesList() {
    var root = $("list-lock-images");
    if (!root) return;
    root.innerHTML = "";
    (data.meta.lockdown.images || []).forEach(function (url, idx) {
      var card = document.createElement("div");
      card.className = "rounded-xl border border-white/15 bg-black/25 p-2 space-y-2";
      card.innerHTML =
        '<div class="aspect-[4/5] rounded-lg overflow-hidden border border-white/20 bg-black/20 shadow-[0_8px_24px_rgba(0,0,0,.35)]">' +
        '<img alt="" class="w-full h-full object-cover" src="' +
        escapeAttr(url) +
        '" /></div>' +
        '<input type="text" class="lock-img-url w-full bg-surface-container-high/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono" data-i="' +
        idx +
        '" value="' +
        escapeAttr(url) +
        '" />' +
        '<button type="button" class="lock-img-del text-[11px] uppercase text-error underline" data-i="' +
        idx +
        '">Remove</button>';
      root.appendChild(card);
    });
    root.querySelectorAll(".lock-img-url").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = Number(inp.getAttribute("data-i"));
        data.meta.lockdown.images[i] = inp.value.trim();
        syncLockdownTextarea();
        schedulePersist();
      });
    });
    root.querySelectorAll(".lock-img-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-i"));
        data.meta.lockdown.images.splice(i, 1);
        syncLockdownTextarea();
        persist();
        renderLockdownImagesList();
      });
    });
  }

  function inferMediaType(src) {
    var s = String(src || "").toLowerCase();
    if (s.indexOf("youtube.com") >= 0 || s.indexOf("youtu.be") >= 0) return "video";
    if (/^data:video\//.test(s)) return "video";
    if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(s)) return "video";
    return "image";
  }

  function mediaThumbHtml(item) {
    if (!item || !item.src) return '<div class="aspect-video bg-black/20 rounded-lg"></div>';
    if (item.type === "video") {
      return (
        '<div class="aspect-video rounded-lg overflow-hidden border border-white/20 bg-black/20">' +
        '<video class="w-full h-full object-cover" autoplay muted loop playsinline preload="metadata" src="' +
        escapeAttr(item.src) +
        '"></video></div>'
      );
    }
    return (
      '<div class="aspect-video rounded-lg overflow-hidden border border-white/20 bg-black/20">' +
      '<img alt="" class="w-full h-full object-cover" src="' +
      escapeAttr(item.src) +
      '" /></div>'
    );
  }

  function syncHomeMediaTextarea() {
    if ($("fld-home-imgs")) setVal("fld-home-imgs", (data.home.memoryMedia || []).map(function (m) { return m.src; }).join("\n"));
    data.home.memoryImages = (data.home.memoryMedia || [])
      .filter(function (m) {
        return m.type === "image";
      })
      .map(function (m) {
        return m.src;
      });
  }

  function renderHomeMediaList() {
    var root = $("list-home-media");
    if (!root) return;
    root.innerHTML = "";
    (data.home.memoryMedia || []).forEach(function (m, idx) {
      var card = document.createElement("div");
      card.className = "rounded-xl border border-white/15 bg-black/25 p-2 space-y-2";
      card.innerHTML =
        mediaThumbHtml(m) +
        '<select class="home-media-type w-full bg-surface-container-high/40 border border-white/10 rounded-lg px-2 py-1 text-xs" data-i="' +
        idx +
        '">' +
        '<option value="image"' +
        (m.type === "image" ? " selected" : "") +
        ">Image</option>" +
        '<option value="video"' +
        (m.type === "video" ? " selected" : "") +
        ">Video</option></select>" +
        '<input type="text" class="home-media-url w-full bg-surface-container-high/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono" data-i="' +
        idx +
        '" value="' +
        escapeAttr(m.src) +
        '" />' +
        '<button type="button" class="home-media-del text-[11px] uppercase text-error underline" data-i="' +
        idx +
        '">Remove</button>';
      root.appendChild(card);
    });
    root.querySelectorAll(".home-media-type").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var i = Number(sel.getAttribute("data-i"));
        if (!data.home.memoryMedia[i]) return;
        data.home.memoryMedia[i].type = sel.value;
        syncHomeMediaTextarea();
        schedulePersist();
        renderHomeMediaList();
      });
    });
    root.querySelectorAll(".home-media-url").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = Number(inp.getAttribute("data-i"));
        if (!data.home.memoryMedia[i]) return;
        data.home.memoryMedia[i].src = inp.value.trim();
        if (data.home.memoryMedia[i].type !== "video") data.home.memoryMedia[i].type = inferMediaType(inp.value);
        syncHomeMediaTextarea();
        schedulePersist();
      });
    });
    root.querySelectorAll(".home-media-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-i"));
        data.home.memoryMedia.splice(i, 1);
        syncHomeMediaTextarea();
        persist();
        renderHomeMediaList();
      });
    });
    // Project pickers for home memory media
    root.querySelectorAll(".home-media-url").forEach(function(inp) { injectProjectPicker(inp, "any"); });
  }


  function renderFeatureToggles() {
    var root = $("feature-toggles");
    if (!root) return;
    root.innerHTML = "";
    FEATURE_KEYS.forEach(function (pair) {
      var key = pair[0],
        label = pair[1];
      var id = "feat-" + key;
      var wrap = document.createElement("label");
      wrap.className = "flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10 cursor-pointer";
      wrap.innerHTML =
        '<input type="checkbox" class="feat-cb rounded border-white/20" data-feat="' +
        key +
        '" id="' +
        id +
        '" />' +
        '<span class="text-sm">' +
        label +
        "</span>";
      root.appendChild(wrap);
    });
    root.querySelectorAll(".feat-cb").forEach(function (cb) {
      cb.checked = data.features[cb.getAttribute("data-feat")] !== false;
      cb.addEventListener("change", function () {
        data.features[cb.getAttribute("data-feat")] = cb.checked;
        persist();
        renderOverviewStats();
      });
    });
  }

  function renderOverviewStats() {
    var el = $("overview-stats");
    if (!el) return;
    el.textContent =
      (data.messages || []).length +
      " messages · " +
      (data.questions || []).length +
      " questions · " +
      (data.gallery || []).length +
      " gallery items · " +
      (data.vault.timeline || []).length +
      " vault milestones · " +
      (data.scrapbook.pages || []).length +
      " scrapbook pages";
  }

  function shapeOpts(val) {
    return (
      '<option value="square"' +
      (val === "square" ? " selected" : "") +
      ">Square</option>" +
      '<option value="gem"' +
      (val === "gem" ? " selected" : "") +
      ">Gem</option>" +
      '<option value="crane"' +
      (val === "crane" ? " selected" : "") +
      ">Crane</option>" +
      '<option value="excavator"' +
      (val === "excavator" ? " selected" : "") +
      ">Excavator</option>" +
      '<option value="caterpillar"' +
      (val === "caterpillar" ? " selected" : "") +
      ">Caterpillar</option>"
    );
  }
  function tintOpts(val) {
    return (
      '<option value="rose"' +
      (val === "rose" ? " selected" : "") +
      ">Rose</option>" +
      '<option value="teal"' +
      (val === "teal" ? " selected" : "") +
      ">Teal</option>" +
      '<option value="gold"' +
      (val === "gold" ? " selected" : "") +
      ">Gold</option>" +
      '<option value="slate"' +
      (val === "slate" ? " selected" : "") +
      ">Slate</option>" +
      '<option value="violet"' +
      (val === "violet" ? " selected" : "") +
      ">Violet</option>" +
      '<option value="mint"' +
      (val === "mint" ? " selected" : "") +
      ">Mint</option>" +
      '<option value="sunset"' +
      (val === "sunset" ? " selected" : "") +
      ">Sunset</option>" +
      '<option value="sky"' +
      (val === "sky" ? " selected" : "") +
      ">Sky</option>"
    );
  }

  function renderMessagesList() {
    var root = $("list-messages");
    if (!root) return;
    root.innerHTML = "";
    root.className = "grid gap-4 sm:grid-cols-1 lg:grid-cols-2";
    (data.messages || []).forEach(function (m) {
      var id = escapeAttr(m.id);
      var box = document.createElement("div");
      box.className =
        "rounded-2xl border border-amber-700/25 bg-gradient-to-br from-amber-950/50 to-stone-950/80 p-4 shadow-lg space-y-3 ring-1 ring-amber-500/10";
      box.innerHTML =
        '<div class="flex justify-between items-center gap-2 border-b border-amber-800/30 pb-2">' +
        '<span class="text-[10px] uppercase tracking-widest text-amber-200/70 font-bold">Sticky note</span>' +
        '<button type="button" class="text-xs text-red-300 hover:text-red-200 btn-del-msg" data-id="' +
        id +
        '">Remove</button></div>' +
        '<div class="grid sm:grid-cols-2 gap-2">' +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Author</label>' +
        '<input type="text" class="msg-fld w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" data-k="author" value="' +
        escapeAttr(m.author) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Tag</label>' +
        '<input type="text" class="msg-fld w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" data-k="tag" value="' +
        escapeAttr(m.tag) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Shape</label>' +
        '<select class="msg-sel w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" data-k="shape">' +
        shapeOpts(m.shape) +
        "</select></div>" +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Tint</label>' +
        '<select class="msg-sel w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" data-k="tint">' +
        tintOpts(m.tint) +
        "</select></div>" +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Text color</label>' +
        '<input type="text" class="msg-fld w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-xs font-mono" data-id="' +
        id +
        '" data-k="textColor" value="' +
        escapeAttr(m.textColor || "") +
        '" placeholder="#ffffff or auto" /></div></div>' +
        '<div><label class="text-[10px] uppercase text-amber-100/60">Message</label>' +
        '<textarea rows="4" class="msg-fld w-full mt-0.5 bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1.5 text-sm font-handwritten-note text-lg leading-snug" data-id="' +
        id +
        '" data-k="body">' +
        escapeHtml(m.body) +
        "</textarea></div>" +
        '<div class="space-y-1">' +
        '<label class="text-[10px] uppercase text-amber-100/60">Photo (URL or file)</label>' +
        '<input type="text" class="msg-img w-full bg-black/25 border border-amber-900/40 rounded-lg px-2 py-1 text-xs font-mono" data-id="' +
        id +
        '" value="' +
        escapeAttr(m.image) +
        '" placeholder="https://… or embedded image" />' +
        '<div class="flex flex-wrap items-center gap-2">' +
        '<label class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-200/80 cursor-pointer rounded-lg border border-amber-700/40 px-2 py-1 hover:bg-amber-900/30">' +
        '<span class="material-symbols-outlined text-sm">upload</span> File' +
        '<input type="file" accept="image/*" class="hidden msg-img-file" data-id="' +
        id +
        '" /></label>' +
        '<p class="text-[10px] text-amber-100/40 flex-1 min-w-[12rem]">' +
        escapeHtml(MEDIA_HINT.slice(0, 120)) +
        "…</p></div>" +
        (m.image
          ? '<div class="h-24 rounded-lg overflow-hidden border border-amber-800/40 mt-1"><img alt="" class="w-full h-full object-cover" src="' +
            escapeAttr(m.image) +
            '" /></div>'
          : "") +
        "</div>";
      root.appendChild(box);
    });
    root.querySelectorAll(".msg-fld").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var k = inp.getAttribute("data-k");
        var msg = data.messages.find(function (x) {
          return x.id === id;
        });
        if (msg) msg[k] = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".msg-sel").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        var k = sel.getAttribute("data-k");
        var msg = data.messages.find(function (x) {
          return x.id === id;
        });
        if (msg) msg[k] = sel.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".msg-img").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var msg = data.messages.find(function (x) {
          return x.id === id;
        });
        if (msg) msg.image = inp.value.trim();
        schedulePersist();
      });
    });
    root.querySelectorAll(".msg-img-file").forEach(function (fi) {
      var id = fi.getAttribute("data-id");
      var urlInp = root.querySelector('.msg-img[data-id="' + id + '"]');
      bindImageFileToUrlInput(fi, urlInp);
    });
    root.querySelectorAll(".btn-del-msg").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.messages = data.messages.filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderMessagesList();
        renderOverviewStats();
      });
    });
    // Inject project pickers for message photo inputs
    root.querySelectorAll(".msg-img").forEach(function(inp) { injectProjectPicker(inp, "image"); });
  }

  function renderQuestionsList() {
    var root = $("list-questions");
    if (!root) return;
    root.innerHTML = "";
    root.className = "space-y-4";
    (data.questions || []).forEach(function (q, idx) {
      var id = escapeAttr(q.id);
      var box = document.createElement("div");
      box.className =
        "rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-950/90 via-slate-900/95 to-cyan-950/30 p-4 sm:p-5 space-y-3 shadow-xl ring-1 ring-cyan-400/10";
      box.innerHTML =
        '<div class="flex flex-wrap justify-between items-center gap-2 border-b border-cyan-800/30 pb-2">' +
        '<span class="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-mono">Station ' +
        (idx + 1) +
        "</span>" +
        '<button type="button" class="text-xs text-red-300 btn-del-q" data-id="' +
        id +
        '">Remove</button></div>' +
        '<div class="grid sm:grid-cols-2 gap-3">' +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Mood emoji</label>' +
        '<input type="text" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-2xl" data-id="' +
        id +
        '" data-k="moodEmoji" value="' +
        escapeAttr(q.moodEmoji) +
        '" maxlength="8" /></div>' +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Asked by</label>' +
        '<input type="text" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-sm" data-id="' +
        id +
        '" data-k="askedBy" value="' +
        escapeAttr(q.askedBy) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Short label</label>' +
        '<input type="text" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-sm" data-id="' +
        id +
        '" data-k="title" value="' +
        escapeAttr(q.title) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Legacy icon key</label>' +
        '<input type="text" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-xs font-mono" data-id="' +
        id +
        '" data-k="icon" value="' +
        escapeAttr(q.icon) +
        '" /></div></div>' +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Prompt (shown on site)</label>' +
        '<textarea rows="3" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-sm" data-id="' +
        id +
        '" data-k="prompt">' +
        escapeHtml(q.prompt) +
        "</textarea></div>" +
        '<label class="flex items-center gap-2 text-xs text-cyan-100/70 cursor-pointer">' +
        '<input type="checkbox" class="q-lock rounded border-cyan-700" data-id="' +
        id +
        '"' +
        (q.locked ? " checked" : "") +
        " /> Locked station (no answer box on site)</label>" +
        '<div><label class="text-[10px] uppercase text-cyan-200/50">Locked note</label>' +
        '<input type="text" class="q-fld w-full mt-1 bg-black/30 border border-cyan-900/40 rounded-xl px-3 py-2 text-sm" data-id="' +
        id +
        '" data-k="lockedNote" value="' +
        escapeAttr(q.lockedNote) +
        '" /></div>';
      root.appendChild(box);
    });
    root.querySelectorAll(".q-fld").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var k = inp.getAttribute("data-k");
        var item = data.questions.find(function (x) {
          return x.id === id;
        });
        if (item) item[k] = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".q-lock").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-id");
        var item = data.questions.find(function (x) {
          return x.id === id;
        });
        if (item) item.locked = cb.checked;
        schedulePersist();
      });
    });
    root.querySelectorAll(".btn-del-q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.questions = data.questions.filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderQuestionsList();
        renderOverviewStats();
      });
    });
  }

  function renderGalleryList() {
    var root = $("list-gallery");
    if (!root) return;
    root.innerHTML = "";
    root.className = "grid gap-5 sm:grid-cols-1 xl:grid-cols-2";
    (data.gallery || []).forEach(function (g) {
      var id = escapeAttr(g.id);
      var box = document.createElement("div");
      box.className =
        "rounded-2xl overflow-hidden border border-fuchsia-500/20 bg-slate-950/80 shadow-2xl ring-1 ring-fuchsia-400/10 flex flex-col sm:flex-row";
      var vid = g.video || "";
      box.innerHTML =
        '<div class="sm:w-44 shrink-0 bg-black/40 aspect-square sm:aspect-auto sm:min-h-[11rem] flex items-center justify-center border-b sm:border-b-0 sm:border-r border-fuchsia-900/30">' +
        (g.image
          ? '<img alt="" class="max-h-44 w-full h-full object-cover" src="' + escapeAttr(g.image) + '" />'
          : '<span class="text-[10px] text-fuchsia-200/40 p-4 text-center">No still</span>') +
        "</div>" +
        '<div class="flex-1 p-4 space-y-2 min-w-0">' +
        '<div class="flex justify-between items-center gap-2">' +
        '<span class="text-[10px] uppercase tracking-widest text-fuchsia-300/70">Gallery item</span>' +
        '<button type="button" class="text-xs text-red-300 btn-del-gal" data-id="' +
        id +
        '">Remove</button></div>' +
        '<label class="text-[10px] uppercase text-fuchsia-200/50">Caption</label>' +
        '<input type="text" class="gal-cap w-full bg-black/30 border border-fuchsia-900/35 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" value="' +
        escapeAttr(g.caption) +
        '" />' +
        '<label class="text-[10px] uppercase text-fuchsia-200/50">Date</label>' +
        '<input type="text" class="gal-date w-full bg-black/30 border border-fuchsia-900/35 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        id +
        '" value="' +
        escapeAttr(g.date) +
        '" />' +
        '<label class="text-[10px] uppercase text-fuchsia-200/50">Still image (URL or file)</label>' +
        '<input type="text" class="gal-img w-full bg-black/30 border border-fuchsia-900/35 rounded-lg px-2 py-1 text-xs font-mono" data-id="' +
        id +
        '" value="' +
        escapeAttr(g.image) +
        '" />' +
        '<div class="flex flex-wrap gap-2 items-center">' +
        '<label class="inline-flex items-center gap-1 text-[10px] uppercase text-fuchsia-200/80 cursor-pointer rounded-lg border border-fuchsia-700/40 px-2 py-1 hover:bg-fuchsia-950/50">' +
        '<span class="material-symbols-outlined text-sm">upload</span> Image file' +
        '<input type="file" accept="image/*" class="hidden gal-img-file" data-id="' +
        id +
        '" /></label></div>' +
        '<label class="text-[10px] uppercase text-fuchsia-200/50">Video (optional)</label>' +
        '<input type="text" class="gal-vid w-full bg-black/30 border border-fuchsia-900/35 rounded-lg px-2 py-1 text-xs font-mono" data-id="' +
        id +
        '" value="' +
        escapeAttr(vid) +
        '" placeholder="YouTube link or direct .mp4 / .webm URL" />' +
        '<label class="inline-flex items-center gap-1 text-[10px] uppercase text-fuchsia-200/80 cursor-pointer rounded-lg border border-fuchsia-700/40 px-2 py-1 w-fit hover:bg-fuchsia-950/50">' +
        '<span class="material-symbols-outlined text-sm">movie</span> Video file' +
        '<input type="file" accept="video/*" class="hidden gal-vid-file" data-id="' +
        id +
        '" /></label>' +
        '<p class="text-[10px] text-fuchsia-100/40 leading-snug">' +
        escapeHtml("If set, visitors see this video (or YouTube) instead of only the still. Use a direct video file URL or a normal YouTube watch link.") +
        "</p></div>";
      root.appendChild(box);
    });
    root.querySelectorAll(".gal-cap, .gal-date, .gal-img, .gal-vid").forEach(function (inp) {
      var cls = inp.className.split(" ")[0];
      var field =
        cls === "gal-cap" ? "caption" : cls === "gal-date" ? "date" : cls === "gal-img" ? "image" : "video";
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var item = data.gallery.find(function (x) {
          return x.id === id;
        });
        if (item) item[field] = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".gal-img-file").forEach(function (fi) {
      var id = fi.getAttribute("data-id");
      var urlInp = root.querySelector('.gal-img[data-id="' + id + '"]');
      bindImageFileToUrlInput(fi, urlInp);
    });
    root.querySelectorAll(".gal-vid-file").forEach(function (fi) {
      fi.addEventListener("change", function () {
        var f = fi.files && fi.files[0];
        if (!f) return;
        var id = fi.getAttribute("data-id");
        var urlInp = root.querySelector('.gal-vid[data-id="' + id + '"]');
        if (!urlInp) return;
        readMediaFileToUrl(f, /^video\//, "This embedded video is large. Continue?", function (url) {
          urlInp.value = url;
          urlInp.dispatchEvent(new Event("input", { bubbles: true }));
          fi.value = "";
        });
      });
    });
    root.querySelectorAll(".btn-del-gal").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.gallery = data.gallery.filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderGalleryList();
        renderOverviewStats();
      });
    });
    // Inject project pickers for gallery image and video inputs
    root.querySelectorAll(".gal-img").forEach(function(inp) { injectProjectPicker(inp, "image"); });
    root.querySelectorAll(".gal-vid").forEach(function(inp) { injectProjectPicker(inp, "video"); });
  }

  function renderVaultTimeline() {
    var root = $("list-vault-tl");
    if (!root) return;
    root.innerHTML = "";
    root.className = "space-y-4";
    (data.vault.timeline || []).forEach(function (t, idx) {
      var box = document.createElement("div");
      box.className =
        "space-y-2 rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-4 shadow-inner ring-1 ring-emerald-500/10";
      box.innerHTML =
        '<div class="flex justify-between items-center border-b border-emerald-900/40 pb-2">' +
        '<span class="text-[10px] uppercase tracking-widest text-emerald-300/70">Milestone ' +
        (idx + 1) +
        '</span><button type="button" class="text-xs text-red-300 btn-del-tl" data-id="' +
        escapeAttr(t.id) +
        '">Remove</button></div>' +
        '<input type="text" class="tl-badge w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(t.id) +
        '" value="' +
        escapeAttr(t.badge) +
        '" placeholder="Badge" />' +
        '<input type="text" class="tl-title w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(t.id) +
        '" value="' +
        escapeAttr(t.title) +
        '" placeholder="Title" />' +
        '<textarea rows="3" class="tl-body w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(t.id) +
        '">' +
        escapeHtml(t.body) +
        "</textarea>" +
        '<label class="text-[10px] uppercase text-emerald-200/50">Image (URL or file)</label>' +
        '<input type="text" class="tl-img w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1 text-xs font-mono" data-id="' +
        escapeAttr(t.id) +
        '" value="' +
        escapeAttr(t.image || "") +
        '" placeholder="Image URL" />' +
        '<label class="inline-flex items-center gap-1 text-[10px] uppercase text-emerald-200/80 cursor-pointer rounded-lg border border-emerald-700/40 px-2 py-1 w-fit hover:bg-emerald-950/40">' +
        '<span class="material-symbols-outlined text-sm">upload</span> File' +
        '<input type="file" accept="image/*" class="hidden tl-img-file" data-id="' +
        escapeAttr(t.id) +
        '" /></label>' +
        '<select class="tl-accent w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(t.id) +
        '">' +
        '<option value="gold"' +
        (t.accent === "gold" ? " selected" : "") +
        ">Gold</option>" +
        '<option value="rose"' +
        (t.accent === "rose" ? " selected" : "") +
        ">Rose</option>" +
        '<option value="teal"' +
        (t.accent === "teal" ? " selected" : "") +
        ">Teal</option></select>";
      root.appendChild(box);
    });
    root.querySelectorAll(".btn-del-tl").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.vault.timeline = data.vault.timeline.filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderVaultTimeline();
        renderOverviewStats();
      });
    });
    function bind(cls, field) {
      root.querySelectorAll(cls).forEach(function (inp) {
        inp.addEventListener("input", function () {
          var id = inp.getAttribute("data-id");
          var item = data.vault.timeline.find(function (x) {
            return x.id === id;
          });
          if (item) item[field] = inp.value;
          schedulePersist();
        });
      });
    }
    bind(".tl-badge", "badge");
    bind(".tl-title", "title");
    bind(".tl-body", "body");
    bind(".tl-img", "image");
    root.querySelectorAll(".tl-img-file").forEach(function (fi) {
      var id = fi.getAttribute("data-id");
      var urlInp = root.querySelector('.tl-img[data-id="' + id + '"]');
      bindImageFileToUrlInput(fi, urlInp);
    });
    root.querySelectorAll(".tl-accent").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        var item = data.vault.timeline.find(function (x) {
          return x.id === id;
        });
        if (item) item.accent = sel.value;
        schedulePersist();
      });
    });
    // Inject project pickers for timeline image inputs
    root.querySelectorAll(".tl-img").forEach(function(inp) { injectProjectPicker(inp, "image"); });
  }

  function renderVaultLetters() {
    var root = $("list-vault-letters");
    if (!root) return;
    root.innerHTML = "";
    (data.vault.letters || []).forEach(function (lt, idx) {
      if (!lt.id) lt.id = SiteData.uid();
      var box = document.createElement("div");
      box.className =
        "space-y-2 rounded-2xl border border-emerald-800/40 bg-emerald-950/25 p-4 shadow-inner ring-1 ring-emerald-500/10";
      box.innerHTML =
        '<div class="flex justify-between items-center border-b border-emerald-900/40 pb-2 mb-1">' +
        '<span class="text-[10px] uppercase tracking-widest text-emerald-300/70">Letter ' +
        (idx + 1) +
        '</span><button type="button" class="text-xs text-red-300 btn-del-vlt" data-id="' +
        escapeAttr(lt.id) +
        '">Remove</button></div>' +
        '<label class="text-[10px] uppercase text-emerald-200/60">Title</label>' +
        '<input type="text" class="vlt-title w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(lt.id) +
        '" value="' +
        escapeAttr(lt.title || "") +
        '" />' +
        '<label class="text-[10px] uppercase text-emerald-200/60">Subtitle</label>' +
        '<input type="text" class="vlt-sub w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(lt.id) +
        '" value="' +
        escapeAttr(lt.subtitle || "") +
        '" />' +
        '<label class="text-[10px] uppercase text-emerald-200/60">Paragraphs (separate with blank lines)</label>' +
        '<textarea rows="5" class="vlt-paras w-full bg-black/30 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-sm" data-id="' +
        escapeAttr(lt.id) +
        '">' +
        escapeHtml((lt.paragraphs || []).join("\n\n")) +
        "</textarea>";
      root.appendChild(box);
    });
    root.querySelectorAll(".btn-del-vlt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.vault.letters = (data.vault.letters || []).filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderVaultLetters();
        renderOverviewStats();
      });
    });
    root.querySelectorAll(".vlt-title").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var lt = (data.vault.letters || []).find(function (x) {
          return x.id === id;
        });
        if (lt) lt.title = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".vlt-sub").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var lt = (data.vault.letters || []).find(function (x) {
          return x.id === id;
        });
        if (lt) lt.subtitle = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".vlt-paras").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var lt = (data.vault.letters || []).find(function (x) {
          return x.id === id;
        });
        if (lt) {
          var raw = inp.value || "";
          lt.paragraphs = raw
            .split(/\n{2,}/)
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
        }
        schedulePersist();
      });
    });
  }

  function renderScrapbookPages() {
    var root = $("list-scrap-pages");
    if (!root) return;
    root.innerHTML = "";
    root.className = "space-y-4";

    var perSpread = Math.max(2, Number((data.scrapbook && data.scrapbook.itemsPerSpread) || 4) || 4);
    (data.scrapbook.pages || []).forEach(function (p, idx) {
      if (!p.id) p.id = SiteData.uid();
      if (!p.spread) p.spread = Math.floor(idx / perSpread) + 1;
      if (!p.slot) p.slot = (idx % perSpread) + 1;

      var box = document.createElement("div");
      box.className = "space-y-3 rounded-2xl border border-violet-700/25 bg-black/15 p-4 ring-1 ring-violet-400/10";
      box.innerHTML =
        '<div class="flex justify-between items-center border-b border-violet-900/40 pb-2">' +
        '<span class="text-[10px] uppercase text-violet-300/70">Page ' +
        (idx + 1) +
        '</span><button type="button" class="text-xs text-red-300 btn-del-scrap" data-id="' +
        escapeAttr(p.id) +
        '">Remove</button></div>' +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-[10px] uppercase text-violet-200/50">Spread #</label>' +
        '<input type="number" min="1" class="sp-spread w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1.5 text-xs font-mono" data-id="' +
        escapeAttr(p.id) +
        '" value="' +
        escapeAttr(p.spread || 1) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-violet-200/50">Slot (1–' +
        perSpread +
        ')</label>' +
        '<input type="number" min="1" max="' +
        perSpread +
        '" class="sp-slot w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1.5 text-xs font-mono" data-id="' +
        escapeAttr(p.id) +
        '" value="' +
        escapeAttr(p.slot || 1) +
        '" /></div></div>' +
        '<button type="button" class="text-xs text-red-300 btn-del-scrap" data-id="' +
        escapeAttr(p.id) +
        '">Remove</button>' +
        '<div><label class="text-[10px] uppercase text-violet-200/50">Title (only shows in big view)</label>' +
        '<input class="sp-title w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1.5" data-id="' +
        escapeAttr(p.id) +
        '" value="' +
        escapeAttr(p.title) +
        '" /></div>' +
        '<div><label class="text-[10px] uppercase text-violet-200/50">Note (only shows in big view)</label>' +
        '<textarea rows="2" class="sp-note w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1.5" data-id="' +
        escapeAttr(p.id) +
        '">' +
        escapeHtml(p.note) +
        "</textarea></div>" +
        '<div class="rounded-xl border border-violet-900/40 bg-black/20 p-3 space-y-2">' +
        '<div class="flex items-center justify-between gap-2">' +
        '<p class="text-[10px] uppercase tracking-widest text-violet-200/60">Media</p>' +
        '<button type="button" class="text-[10px] uppercase text-violet-200/80 underline btn-add-media" data-id="' +
        escapeAttr(p.id) +
        '">+ Add media</button></div>' +
        '<div class="media-list space-y-2" data-id="' +
        escapeAttr(p.id) +
        '">' +
        (p.media || [])
          .map(function (m, mi) {
            var size = (m && m.size) || "landscape";
            return (
              '<div class="grid grid-cols-[1fr_9rem_4rem] gap-2 items-center" data-mi="' +
              mi +
              '">' +
              '<input class="media-url w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1 text-[11px] font-mono" data-id="' +
              escapeAttr(p.id) +
              '" data-mi="' +
              mi +
              '" value="' +
              escapeAttr(m && m.src) +
              '" placeholder="https://… (YouTube or image)" />' +
              '<select class="media-size w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1 text-[11px]" data-id="' +
              escapeAttr(p.id) +
              '" data-mi="' +
              mi +
              '">' +
              '<option value="landscape"' +
              (size === "landscape" ? " selected" : "") +
              ">Landscape</option>" +
              '<option value="square"' +
              (size === "square" ? " selected" : "") +
              ">Square</option>" +
              '<option value="portrait"' +
              (size === "portrait" ? " selected" : "") +
              ">Portrait</option></select>" +
              '<button type="button" class="text-[10px] uppercase text-red-300 btn-del-media" data-id="' +
              escapeAttr(p.id) +
              '" data-mi="' +
              mi +
              '">Del</button></div>'
            );
          })
          .join("") +
        "</div>" +
        '<div class="grid grid-cols-2 gap-2">' +
        '<div><label class="text-[10px] uppercase text-violet-200/50">Media to show (1…)</label>' +
        '<input type="number" min="1" class="sp-show w-full bg-black/30 border border-violet-900/40 rounded-lg px-2 py-1 text-xs font-mono" data-id="' +
        escapeAttr(p.id) +
        '" value="' +
        escapeAttr(p.showCount || 1) +
        '" /></div>' +
        '<div class="flex items-end"><button type="button" class="w-full px-3 py-2 rounded-lg border border-violet-500/30 text-[10px] uppercase text-violet-200/70 btn-sort-pages">Sort into spreads</button></div></div>' +
        "</div>";
      root.appendChild(box);
    });

    // Reuse the same event wiring/classes as the spreads list.
    root.querySelectorAll(".btn-del-scrap").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.scrapbook.pages = data.scrapbook.pages.filter(function (x) {
          return x.id !== id;
        });
        persist();
        renderScrapbookPages();
        renderOverviewStats();
      });
    });
    root.querySelectorAll(".sp-spread").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (p) p.spread = Math.max(1, Number(inp.value) || 1);
        schedulePersist();
      });
    });
    root.querySelectorAll(".sp-slot").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (p) p.slot = Math.max(1, Math.min(perSpread, Number(inp.value) || 1));
        schedulePersist();
      });
    });
    root.querySelectorAll(".sp-title").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (p) p.title = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".sp-note").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (p) p.note = inp.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".sp-show").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (p) p.showCount = Math.max(1, Number(inp.value) || 1);
        schedulePersist();
      });
    });

    root.querySelectorAll(".btn-add-media").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (!p) return;
        if (!Array.isArray(p.media)) p.media = [];
        p.media.push({ type: "image", src: "", size: "landscape" });
        persist();
        renderScrapbookPages();
      });
    });
    root.querySelectorAll(".btn-del-media").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var mi = Number(btn.getAttribute("data-mi"));
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (!p || !Array.isArray(p.media)) return;
        p.media.splice(mi, 1);
        persist();
        renderScrapbookPages();
      });
    });
    root.querySelectorAll(".media-url").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-id");
        var mi = Number(inp.getAttribute("data-mi"));
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (!p || !Array.isArray(p.media) || !p.media[mi]) return;
        p.media[mi].src = inp.value.trim();
        p.media[mi].type = inferMediaType(inp.value);
        p.image = p.media[0] && p.media[0].type === "image" ? p.media[0].src : "";
        p.video = p.media[0] && p.media[0].type === "video" ? p.media[0].src : "";
        schedulePersist();
      });
    });
    root.querySelectorAll(".media-size").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-id");
        var mi = Number(sel.getAttribute("data-mi"));
        var p = data.scrapbook.pages.find(function (x) {
          return x.id === id;
        });
        if (!p || !Array.isArray(p.media) || !p.media[mi]) return;
        p.media[mi].size = sel.value;
        schedulePersist();
      });
    });
    root.querySelectorAll(".btn-sort-pages").forEach(function (btn) {
      btn.addEventListener("click", function () {
        // Canonical order: by spread, then slot, then title.
        data.scrapbook.pages.sort(function (a, b) {
          var sa = Number(a.spread || 1),
            sb = Number(b.spread || 1);
          if (sa !== sb) return sa - sb;
          var pa = Number(a.slot || 1),
            pb = Number(b.slot || 1);
          if (pa !== pb) return pa - pb;
          return String(a.title || "").localeCompare(String(b.title || ""));
        });
        persist();
        renderScrapbookPages();
      });
    });
    // Inject project pickers for scrapbook media URL inputs
    root.querySelectorAll(".media-url").forEach(function(inp) { injectProjectPicker(inp, "any"); });
  }

  function wireGlobalImagePickers() {
    document.querySelectorAll("input.js-admin-img-file").forEach(function (fi) {
      fi.addEventListener("change", function () {
        var tid = fi.getAttribute("data-target");
        var inp = $(tid);
        if (!inp) return;
        var f = fi.files && fi.files[0];
        if (!f) return;
        readImageFileToUrl(f, function (url) {
          inp.value = url;
          fi.value = "";
          schedulePersist();
        });
      });
    });
    // Project pickers for overview branding images
    ["fld-meta-prof", "fld-meta-heroimg"].forEach(function(id) {
      var inp = $(id); if (inp) injectProjectPicker(inp, "image");
    });

    var homeImgInp = $("inp-home-img-files");
    if (homeImgInp) {
      homeImgInp.addEventListener("change", function () {
        var files = homeImgInp.files;
        if (!files || !files.length) return;
        var imgs = [];
        Array.prototype.forEach.call(files, function (f) {
          if (/^image\//.test(f.type)) imgs.push(f);
        });
        if (!imgs.length) return;
        var done = 0;
        imgs.forEach(function (f) {
          readImageFileToUrl(f, function (url) {
            data.home.memoryMedia.push({ id: SiteData.uid(), type: "image", src: url });
            done++;
            if (done === imgs.length) {
              syncHomeMediaTextarea();
              renderHomeMediaList();
              schedulePersist();
            }
          });
        });
        homeImgInp.value = "";
      });
    }
    var homeVidInp = $("inp-home-video-files");
    if (homeVidInp) {
      homeVidInp.addEventListener("change", function () {
        var files = homeVidInp.files;
        if (!files || !files.length) return;
        var vids = [];
        Array.prototype.forEach.call(files, function (f) {
          if (/^video\//.test(f.type)) vids.push(f);
        });
        if (!vids.length) return;
        var done = 0;
        vids.forEach(function (f) {
          readMediaFileToUrl(f, /^video\//, "This embedded video is large. Continue?", function (url) {
            data.home.memoryMedia.push({ id: SiteData.uid(), type: "video", src: url });
            done++;
            if (done === vids.length) {
              syncHomeMediaTextarea();
              renderHomeMediaList();
              schedulePersist();
            }
          });
        });
        homeVidInp.value = "";
      });
    }

    var lockInp = $("inp-lock-img-files");
    var lockArea = $("fld-lock-images");
    if (lockInp && lockArea) {
      lockInp.addEventListener("change", function () {
        var files = lockInp.files;
        if (!files || !files.length) return;
        var imgs = [];
        Array.prototype.forEach.call(files, function (f) {
          if (/^image\//.test(f.type)) imgs.push(f);
        });
        if (!imgs.length) return;
        var done = 0;
        var urls = [];
        imgs.forEach(function (f) {
          readImageFileToUrl(f, function (url) {
            urls.push(url);
            done++;
            if (done === imgs.length) {
              data.meta.lockdown.images = (data.meta.lockdown.images || []).concat(urls);
              syncLockdownTextarea();
              renderLockdownImagesList();
              schedulePersist();
            }
          });
        });
        lockInp.value = "";
      });
    }
  }

  function wireAll() {
    var save = $("btn-save-all");
    if (save) {
      save.addEventListener("click", function () {
        readSiteFieldsIntoData();
        persist();
      });
    }

    var bmsg = $("btn-add-msg");
    if (bmsg) {
      bmsg.addEventListener("click", function () {
        readSiteFieldsIntoData();
        var body = $("new-msg-body");
        if (!body || !body.value.trim()) return;
        data.messages.push({
          id: SiteData.uid(),
          author: (getVal("new-msg-author") || "").trim() || "Anonymous",
          body: body.value.trim(),
          shape: getVal("new-msg-shape") || "square",
          tint: getVal("new-msg-tint") || "rose",
          textColor: (getVal("new-msg-text-color") || "").trim(),
          tag: (getVal("new-msg-tag") || "").trim(),
          image: (getVal("new-msg-img") || "").trim(),
        });
        body.value = "";
        persist();
        renderMessagesList();
        renderOverviewStats();
      });
    }

    var bq = $("btn-add-q");
    if (bq) {
      bq.addEventListener("click", function () {
        readSiteFieldsIntoData();
        var promptEl = $("new-q-prompt");
        if (!promptEl || !promptEl.value.trim()) return;
        data.questions.push({
          id: SiteData.uid(),
          moodEmoji: (getVal("new-q-emoji") || "").trim() || "😊",
          askedBy: (getVal("new-q-askedby") || "").trim() || "Friend",
          icon: (getVal("new-q-icon") || "").trim() || "help",
          title: (getVal("new-q-title") || "").trim() || "Question",
          prompt: promptEl.value.trim(),
          locked: $("new-q-locked") ? $("new-q-locked").checked : false,
          lockedNote: (getVal("new-q-locked-note") || "").trim(),
        });
        promptEl.value = "";
        setVal("new-q-emoji", "");
        setVal("new-q-askedby", "");
        persist();
        renderQuestionsList();
        renderOverviewStats();
      });
    }

    var bg = $("btn-add-gal");
    if (bg) {
      bg.addEventListener("click", function () {
        readSiteFieldsIntoData();
        var img = (getVal("new-gal-img") || "").trim();
        var nv = (getVal("new-gal-video") || "").trim();
        if (!img && !nv) {
          alert("Add a still image and/or a video link (YouTube or direct .mp4 / .webm).");
          return;
        }
        data.gallery.push({
          id: SiteData.uid(),
          image: img,
          video: nv,
          caption: (getVal("new-gal-cap") || "").trim() || "Untitled",
          date: (getVal("new-gal-date") || "").trim(),
        });
        setVal("new-gal-img", "");
        setVal("new-gal-video", "");
        setVal("new-gal-cap", "");
        setVal("new-gal-date", "");
        persist();
        renderGalleryList();
        renderOverviewStats();
      });
    }

    var newGalFile = $("new-gal-img-file");
    var newGalUrl = $("new-gal-img");
    if (newGalFile && newGalUrl) bindImageFileToUrlInput(newGalFile, newGalUrl);
    var newGalVideoFile = $("new-gal-video-file");
    var newGalVideo = $("new-gal-video");
    if (newGalVideoFile && newGalVideo) {
      newGalVideoFile.addEventListener("change", function () {
        var f = newGalVideoFile.files && newGalVideoFile.files[0];
        if (!f) return;
        readMediaFileToUrl(f, /^video\//, "This embedded video is large. Continue?", function (url) {
          newGalVideo.value = url;
          newGalVideoFile.value = "";
        });
      });
    }

    var newMsgFile = $("new-msg-img-file");
    var newMsgUrl = $("new-msg-img");
    if (newMsgFile && newMsgUrl) bindImageFileToUrlInput(newMsgFile, newMsgUrl);

    var btl = $("btn-add-vault-tl");
    if (btl) {
      btl.addEventListener("click", function () {
        readSiteFieldsIntoData();
        data.vault.timeline.push({
          id: SiteData.uid(),
          badge: "MILESTONE",
          title: "New layer",
          body: "Describe the moment.",
          image: "",
          accent: "gold",
        });
        persist();
        renderVaultTimeline();
        renderOverviewStats();
      });
    }

    var addLetter = $("btn-add-vault-letter");
    if (addLetter) {
      addLetter.addEventListener("click", function () {
        readSiteFieldsIntoData();
        if (!data.vault.letters) data.vault.letters = [];
        data.vault.letters.push({
          id: SiteData.uid(),
          title: "New letter",
          subtitle: "Subtitle",
          paragraphs: ["Write your letter here."],
        });
        persist();
        renderVaultLetters();
        renderOverviewStats();
      });
    }

    var bs = $("btn-add-scrap-page");
    if (bs) {
      bs.addEventListener("click", function () {
        readSiteFieldsIntoData();
        var perSpread = Math.max(2, Number((data.scrapbook && data.scrapbook.itemsPerSpread) || 4) || 4);
        var idx = (data.scrapbook.pages || []).length;
        data.scrapbook.pages.push({
          id: SiteData.uid(),
          spread: Math.floor(idx / perSpread) + 1,
          slot: (idx % perSpread) + 1,
          title: "New page",
          note: "Handwritten note",
          media: [{ type: "image", src: data.meta.heroImage || "", size: "landscape" }],
          showCount: 1,
          image: data.meta.heroImage || "",
          video: "",
        });
        persist();
        renderScrapbookPages();
        renderOverviewStats();
      });
    }

    var clr = $("btn-clear-vault-unlock");
    if (clr) {
      clr.addEventListener("click", function () {
        localStorage.removeItem("oreCelebrations.vaultUnlocked.v1");
        alert("Vault unlock flag cleared for this browser.");
      });
    }

    var lockNow = $("btn-lock-now");
    if (lockNow) {
      lockNow.addEventListener("click", function () {
        if (!data.meta.lockdown) data.meta.lockdown = {};
        data.meta.lockdown.enabled = true;
        if ($("fld-lock-enabled")) $("fld-lock-enabled").checked = true;
        readSiteFieldsIntoData();
        persist();
      });
    }
    var unlockNow = $("btn-unlock-now");
    if (unlockNow) {
      unlockNow.addEventListener("click", function () {
        if (!data.meta.lockdown) data.meta.lockdown = {};
        data.meta.lockdown.enabled = false;
        if ($("fld-lock-enabled")) $("fld-lock-enabled").checked = false;
        readSiteFieldsIntoData();
        persist();
      });
    }

    var addLockImg = $("btn-add-lock-img");
    if (addLockImg) {
      addLockImg.addEventListener("click", function () {
        var inp = $("new-lock-img");
        if (!inp) return;
        var v = String(inp.value || "").trim();
        if (!v) return;
        data.meta.lockdown.images.push(v);
        inp.value = "";
        syncLockdownTextarea();
        persist();
        renderLockdownImagesList();
      });
    }
    var addHomeMedia = $("btn-add-home-media");
    if (addHomeMedia) {
      addHomeMedia.addEventListener("click", function () {
        var inp = $("new-home-media");
        if (!inp) return;
        var v = String(inp.value || "").trim();
        if (!v) return;
        data.home.memoryMedia.push({ id: SiteData.uid(), type: inferMediaType(v), src: v });
        inp.value = "";
        syncHomeMediaTextarea();
        persist();
        renderHomeMediaList();
      });
    }

    var exp = $("btn-export");
    if (exp) {
      exp.addEventListener("click", function () {
        readSiteFieldsIntoData();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ore-celebrations-backup.json";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    var imp = $("inp-import");
    if (imp) {
      imp.addEventListener("change", function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var imported = JSON.parse(reader.result);
            data = imported;
            ensureArrays();
            fillFormsFromData();
            renderFeatureToggles();
            renderMessagesList();
            renderQuestionsList();
            renderGalleryList();
            renderVaultTimeline();
            renderScrapbookPages();
            renderOverviewStats();
            checkAdminLock();
            persist();
          } catch (e) {
            alert("Invalid JSON file.");
          }
        };
        reader.readAsText(f);
        ev.target.value = "";
      });
    }

    var rst = $("btn-reset");
    if (rst) {
      rst.addEventListener("click", function () {
        if (!confirm("Clear saved site data in this browser and reload defaults?")) return;
        SiteData.clearStorage();
        sessionStorage.removeItem(ADM);
        location.reload();
      });
    }

    wireGlobalImagePickers();
    ["fld-scrap-per-spread", "fld-scrap-layout"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", function () {
        readSiteFieldsIntoData();
        renderScrapbookPages();
        schedulePersist();
      });
    });
  }

  function boot() {
    document.addEventListener("DOMContentLoaded", async function () {
      if (normalizeAdminPath()) return;
      data = await SiteData.load();
      ensureArrays();
      checkAdminLock();
      bindLock();
      fillFormsFromData();
      renderFeatureToggles();
      renderOverviewStats();
      renderMessagesList();
      renderQuestionsList();
      renderGalleryList();
      renderVaultTimeline();
      renderScrapbookPages();
      renderVaultLetters();
      wireAll();
    });
  }

  function injectAdminPartyPopper() {
    var aside = document.querySelector("aside");
    if (!aside) return;
    // Remove overflow-hidden to allow the popper to be visible in the bottom corner
    aside.style.overflow = "visible";
    // Set position:relative so popper is contained
    aside.style.position = "relative";
    var popper = document.createElement("div");
    popper.setAttribute("aria-hidden", "true");
    popper.style.cssText = [
      "position:absolute",
      "bottom:8px",
      "right:8px",
      "font-size:7rem",
      "line-height:1",
      "opacity:0.07",
      "pointer-events:none",
      "user-select:none",
      "transform:rotate(-18deg)",
      "z-index:0",
      "filter:blur(1px) saturate(2)"
    ].join(";");
    popper.textContent = "\uD83C\uDF89"; // 🎉
    aside.appendChild(popper);
  }

  boot();
  document.addEventListener("DOMContentLoaded", injectAdminPartyPopper);
})();
