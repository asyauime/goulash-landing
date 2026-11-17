/*
  main.js: общее поведение страниц. Классический скрипт (не ES-модуль),
  подключать в конце <body> или с defer.
  - плавные якоря (с учётом prefers-reduced-motion), фокус переносится на цель;
  - FAQ: раскрытие по клику и с клавиатуры, aria-expanded;
  - мобильное меню: кнопка .nav-toggle, закрытие по Esc, по ссылке и при расширении экрана.
  Разметка описана в начале components.css.
*/
(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- Типограф: без висячих предлогов ----------
     typograph(text) — чистая функция: ставит неразрывный пробел (U+00A0)
     после коротких предлогов, союзов и частиц, перед «же», «ли», «бы»,
     между числом и словом («15 минут», «3 км») и перед тире.
     В HTML неразрывные пробелы уже стоят (&nbsp;). Для текстов, которые рисуют скрипты,
     MutationObserver ниже прогоняет через typograph каждый новый или изменённый
     текстовый узел и атрибут aria-label (только если текст реально меняется, без зацикливания).
     Не трогает: script, style, textarea, значения полей и placeholder, атрибуты name и id.
     Скрипты, которые сравнивают textContent с новой строкой, сравнивают window.GLTypo.text(строка). */
  var NBSP = '\u00a0';
  var RE_SHORT = /(^|[\s\u00a0(«„"—–])(в|во|к|ко|с|со|о|об|обо|у|и|а|но|на|за|по|до|от|из|не|ни|для|без|при|про|над|под|или|из-за|из-под|через|что|как|чем)[ \t\r\n]+/gi;
  var RE_PARTICLE = /\s+(же|ли|бы)(?=$|[\s\u00a0.,!?:;»)])/gi;
  var RE_NUMBER = /(\d)[ \t\r\n]+(?=[А-Яа-яЁёA-Za-z%₽])/g;
  var RE_SIGN = /(№)\s+(?=\d)/g;
  var RE_DASH = /\s+([—–])(?=\s)/g;

  function typograph(text) {
    if (!text || typeof text !== 'string' || !/\s/.test(text)) return text;
    var out = text;
    // Два прохода: «и в доме» — второй предлог стоит сразу за первым
    for (var i = 0; i < 2; i++) out = out.replace(RE_SHORT, '$1$2' + NBSP);
    return out
      .replace(RE_PARTICLE, NBSP + '$1')
      .replace(RE_NUMBER, '$1' + NBSP)
      .replace(RE_SIGN, '$1' + NBSP)
      .replace(RE_DASH, NBSP + '$1');
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };

  function typoText(node) {
    var p = node.parentNode;
    if (!p || SKIP_TAGS[p.nodeName]) return;
    var v = node.nodeValue;
    var t = typograph(v);
    if (t !== v) node.nodeValue = t;
  }

  function typoLabel(el) {
    var v = el.getAttribute('aria-label');
    if (!v) return;
    var t = typograph(v);
    if (t !== v) el.setAttribute('aria-label', t);
  }

  function typoTree(node) {
    if (!node) return;
    if (node.nodeType === 3) { typoText(node); return; }
    if (node.nodeType !== 1 || SKIP_TAGS[node.nodeName]) return;
    if (node.hasAttribute('aria-label')) typoLabel(node);
    Array.prototype.forEach.call(node.querySelectorAll('[aria-label]'), typoLabel);
    var walker = document.createTreeWalker(node, 4, null);
    var n;
    while ((n = walker.nextNode())) typoText(n);
  }

  window.GLTypo = { text: typograph };

  if (document.body) {
    typoTree(document.body);
    if ('MutationObserver' in window) {
      new MutationObserver(function (records) {
        records.forEach(function (r) {
          if (r.type === 'characterData') typoText(r.target);
          else if (r.type === 'attributes') typoLabel(r.target);
          else Array.prototype.forEach.call(r.addedNodes, typoTree);
        });
      }).observe(document.body, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['aria-label']
      });
    }
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- Мобильное меню ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;
  var desktopQuery = window.matchMedia ? window.matchMedia('(min-width: 880px)') : null;

  function setMenu(open, returnFocus) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    if (!open && returnFocus) toggle.focus();
  }

  if (toggle && nav) {
    setMenu(false);

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      setMenu(open);
      if (open) {
        var first = nav.querySelector('a, button');
        if (first) first.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false, true);
      }
    });

    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setMenu(false);
    });

    if (desktopQuery) {
      var onChange = function (q) { if (q.matches) setMenu(false); };
      if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onChange);
      else if (desktopQuery.addListener) desktopQuery.addListener(onChange);
    }
  }

  /* ---------- Плавные якоря ---------- */
  function scrollToTarget(target) {
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    // Переносим фокус, чтобы клавиатура и скринридер оказались в нужном месте.
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (err) { id = hash.slice(1); }
    var target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    if (nav && nav.contains(link)) setMenu(false);
    scrollToTarget(target);
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', hash);
    } else {
      window.location.hash = hash;
    }
  });

  /* ---------- FAQ ---------- */
  // Без JS ответы видны сразу. С JS скрываем их и управляем кнопками.
  var faqs = document.querySelectorAll('[data-faq]');
  Array.prototype.forEach.call(faqs, function (faq) {
    var buttons = Array.prototype.slice.call(faq.querySelectorAll('.faq__question'));

    function panelFor(btn) {
      var id = btn.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    }

    function setOpen(btn, open) {
      var panel = panelFor(btn);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) panel.hidden = !open;
    }

    buttons.forEach(function (btn) {
      if (btn.tagName !== 'BUTTON') btn.setAttribute('role', 'button');
      if (!btn.hasAttribute('type') && btn.tagName === 'BUTTON') btn.setAttribute('type', 'button');
      setOpen(btn, btn.getAttribute('aria-expanded') === 'true');

      btn.addEventListener('click', function () {
        setOpen(btn, btn.getAttribute('aria-expanded') !== 'true');
      });

      btn.addEventListener('keydown', function (e) {
        var i = buttons.indexOf(btn);
        var next = null;
        if (e.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
        else if (e.key === 'ArrowUp') next = buttons[(i - 1 + buttons.length) % buttons.length];
        else if (e.key === 'Home') next = buttons[0];
        else if (e.key === 'End') next = buttons[buttons.length - 1];
        else if (btn.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setOpen(btn, btn.getAttribute('aria-expanded') !== 'true');
          return;
        }
        if (next) {
          e.preventDefault();
          next.focus();
        }
      });
    });
  });

  /* ---------- Вкладки [data-tabs] (демо: одно за раз) ----------
     Разметка: div[role=tablist][data-tabs] > button[role=tab][aria-controls][aria-selected],
     панели div[role=tabpanel][id][aria-labelledby], неактивные с атрибутом hidden.
     Стрелки влево/вправо, Home, End переключают
     и переносят фокус. Активная вкладка в порядке Tab, остальные tabindex=-1. */
  Array.prototype.forEach.call(document.querySelectorAll('[role="tablist"][data-tabs]'), function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelOf(tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    }

    function select(tab, moveFocus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = panelOf(t);
        if (panel) panel.hidden = !on;
      });
      if (moveFocus) tab.focus();
      list.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: tab, panel: panelOf(tab) } }));
    }

    var current = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(current, false);

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next, true);
      });
    });
  });

  /* ---------- Появление при прокрутке ---------- */
  // [data-reveal] получает класс is-in, когда попадает на экран. Скрытое начальное состояние
  // есть только при классе motion на <html>: без JS, без IntersectionObserver и при
  // prefers-reduced-motion всё видно сразу. Дети [data-reveal-stagger] получают --i для задержки.
  var revealItems = document.querySelectorAll('[data-reveal]');
  Array.prototype.forEach.call(document.querySelectorAll('[data-reveal-stagger]'), function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  function showAll() {
    Array.prototype.forEach.call(revealItems, function (el) { el.classList.add('is-in'); });
  }

  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(revealItems, function (el) { revealObserver.observe(el); });
    // Переход по якорю или печать: всё должно быть видно.
    window.addEventListener('beforeprint', showAll);
  } else {
    showAll();
  }

  /* ---------- Пауза бесконечных анимаций вне экрана ---------- */
  // Демо-панели получают класс is-offscreen, пока их не видно: CSS ставит анимации на паузу.
  if ('IntersectionObserver' in window) {
    var pauseObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-demo]'), function (el) {
      pauseObserver.observe(el);
    });
  }

  /* ---------- Отсчёт чисел в фактах ---------- */
  // [data-count]: текст вида «900+», «1,3 млн+», «21 день». Число растёт от нуля до значения,
  // в конце возвращается исходный текст без изменений. Для экранного диктора текст не меняется:
  // он лежит в скрытом span, анимируется видимая копия с aria-hidden.
  function countUp(el) {
    // LED-шрифт (led.js, [data-led]): исходный текст в data-led-src, рисунок в span.led-text
    var ledVis = window.GLLed && el.querySelector('.led-text');
    var original = ledVis ? el.getAttribute('data-led-src') : el.textContent.trim();
    var m = original.match(/^(\d+)(?:,(\d+))?([\s\S]*)$/);
    if (!m) return;
    var whole = parseInt(m[1], 10);
    var decimals = m[2] ? m[2].length : 0;
    var target = whole + (decimals ? parseInt(m[2], 10) / Math.pow(10, decimals) : 0);
    var suffix = m[3];

    var vis = ledVis;
    var show = function (t) { window.GLLed.set(vis, t); };
    if (!vis) {
      el.textContent = '';
      var sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = original;
      vis = document.createElement('span');
      vis.className = 'fact__digits';
      vis.setAttribute('aria-hidden', 'true');
      vis.textContent = original;
      el.appendChild(sr);
      el.appendChild(vis);
      show = function (t) { vis.textContent = t; };
    }

    function format(v) {
      return (decimals ? v.toFixed(decimals).replace('.', ',') : String(Math.round(v))) + suffix;
    }

    var started = false;
    function run() {
      if (started) return;
      started = true;
      var duration = 1600;
      var t0 = 0;
      el.classList.add('is-counting');
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / duration);
        var eased = 1 - Math.pow(1 - p, 4);
        show(p < 1 ? format(target * eased) : original);
        if (p < 1) window.requestAnimationFrame(step);
        else el.classList.remove('is-counting');
      }
      show(format(0));
      window.requestAnimationFrame(step);
    }

    var obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      run();
    }, { threshold: 0.6 });
    obs.observe(el);
  }

  if (!prefersReducedMotion() && 'IntersectionObserver' in window && window.requestAnimationFrame) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), countUp);
  }
})();
