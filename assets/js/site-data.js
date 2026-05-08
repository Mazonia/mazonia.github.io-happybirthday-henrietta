(function (global) {
  var STORAGE_KEY = "oreCelebrations.site.v1";

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function dataJsonUrl() {
    var prefix = typeof window.__SITE_DATA_PREFIX__ !== "undefined" && window.__SITE_DATA_PREFIX__ ? window.__SITE_DATA_PREFIX__ : "";
    return prefix + "data/default-site.json";
  }

  async function fetchDefault() {
    var res = await fetch(dataJsonUrl(), { cache: "no-store" });
    if (!res.ok) throw new Error("Missing data/default-site.json");
    return res.json();
  }

  async function load() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = safeParse(raw);
      if (parsed) {
        // Version-guard: fetch the JSON to compare dataVersion.
        // If the JSON has a newer version, wipe localStorage and return fresh data.
        try {
          var fresh = await fetchDefault();
          var storedVersion = parsed.dataVersion || 0;
          var freshVersion  = fresh.dataVersion  || 0;
          if (freshVersion > storedVersion) {
            localStorage.removeItem(STORAGE_KEY);
            return fresh;
          }
        } catch (e) {
          // Offline or fetch failed — use localStorage fallback
        }
        return parsed;
      }
    }
    return fetchDefault();
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function uid() {
    return "id_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
  }

  global.SiteData = {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    save: save,
    clearStorage: clearStorage,
    uid: uid,
  };
})(window);
