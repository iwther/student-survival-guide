/* ============ i18n runtime (ru / kk / en) ============ */
(function () {
  "use strict";

  var DICTS = { kk: window.SSG_DICT_KK || {}, en: window.SSG_DICT_EN || {} };
  var SUPPORTED = ["ru", "kk", "en"];
  var STORAGE_KEY = "ssg-lang";
  var ATTRS = ["title", "aria-label", "placeholder", "alt"];

  var units = [];
  var listeners = [];
  var current = "ru";

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function collect() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      units.push({ node: node, attr: null, key: node.nodeValue });
    }

    var els = document.body.querySelectorAll("*");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      for (var j = 0; j < ATTRS.length; j++) {
        var a = ATTRS[j];
        if (el.hasAttribute && el.hasAttribute(a)) {
          units.push({ node: el, attr: a, key: el.getAttribute(a) });
        }
      }
    }

    units.push({ node: null, attr: "__title__", key: document.title });
    var meta = document.querySelector('meta[name="description"]');
    if (meta) units.push({ node: meta, attr: "content", key: meta.getAttribute("content") });
  }

  function valueFor(lang, key) {
    if (lang === "ru") return key;
    var dict = DICTS[lang];
    if (dict && has(dict, key)) return dict[key];
    return key;
  }

  function paint(lang) {
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var val = valueFor(lang, u.key);
      if (u.attr === "__title__") document.title = val;
      else if (u.attr) u.node.setAttribute(u.attr, val);
      else u.node.nodeValue = val;
    }
  }

  function syncButtons(lang) {
    var btns = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("is-active", btns[i].getAttribute("data-lang") === lang);
      btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-lang") === lang ? "true" : "false");
    }
  }

  function apply(lang) {
    current = lang;
    paint(lang);
    document.documentElement.lang = lang;
    syncButtons(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](lang); } catch (e) {}
    }
  }

  window.SSG = {
    get lang() { return current; },
    t: function (key) { return valueFor(current, key); },
    fmt: function (key, vars) {
      var s = valueFor(current, key);
      if (vars) {
        for (var k in vars) {
          if (has(vars, k)) s = s.split("{" + k + "}").join(vars[k]);
        }
      }
      return s;
    },
    onLangChange: function (cb) { if (typeof cb === "function") listeners.push(cb); },
    setLang: function (lang) {
      if (SUPPORTED.indexOf(lang) === -1) return;
      apply(lang);
    }
  };

  collect();

  var btns = document.querySelectorAll("[data-lang]");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      apply(this.getAttribute("data-lang"));
    });
  }

  var saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (!saved || SUPPORTED.indexOf(saved) === -1) {
    var nav = (navigator.language || "ru").slice(0, 2).toLowerCase();
    saved = SUPPORTED.indexOf(nav) !== -1 ? nav : "ru";
  }
  current = saved;
  paint(saved);
  document.documentElement.lang = saved;
  syncButtons(saved);
})();
