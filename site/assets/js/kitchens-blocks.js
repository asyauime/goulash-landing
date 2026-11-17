/*
  kitchens-blocks.js: динамика блоков лендинга A. Классический скрипт, только интерфейс,
  подключать после led.js и main.js. Без чисел-утверждений: номера заказов и блюда в мини-интерфейсах
  вымышлены, как в демо (сноска в подвале).

  1. «Три боли» [data-pains]: карточка «было / стало». Переключатель «Без / С Goulash.tech»
     (две кнопки, aria-pressed) открывает вторую сторону: пояснение боли и ответ «С Goulash.tech».
     Когда блок появился на экране, карточки по очереди включаются сами и остаются открытыми.
  2. «Кому подходит» [data-manifest]: слова оборачиваются в span.mw и загораются по мере прокрутки
     (обычные слова до приглушённого --color-text-muted; ключевые фразы получают голубой маркер,
     который наливается слева направо, когда загорелись все слова фразы).
  3. «Что входит» [data-bento]: живые мини-интерфейсы в карточках (очередь, стоп-лист, курьер, кабинет).
  4. Лёгкий параллакс крупных заголовков секций.

  prefers-reduced-motion и без JS: всё сразу в итоговом состоянии, ничего не движется.
  Анимации идут, только пока блок на экране и вкладка видна.
*/
(function () {
  'use strict';

  if (typeof document === 'undefined' || !document.querySelector) return;

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var hasIO = 'IntersectionObserver' in window;
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(f, 16); };

  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function canHover() { return !!(hoverQuery && hoverQuery.matches); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  // Следит за видимостью элемента. Без IntersectionObserver считаем, что виден.
  function watch(el, cb, margin) {
    if (!hasIO) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      cb(entries[entries.length - 1].isIntersecting);
    }, { rootMargin: margin || '0px' }).observe(el);
  }

  var listeners = [];   // вызываются при смене reduced-motion и видимости вкладки
  function onEnvChange(fn) { listeners.push(fn); }
  function envChanged() { listeners.forEach(function (fn) { fn(); }); }
  document.addEventListener('visibilitychange', envChanged);
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', envChanged);
    else if (motionQuery.addListener) motionQuery.addListener(envChanged);
  }

  /* ---------- 1. «Было / стало» ---------- */
  var pains = document.querySelector('[data-pains]');
  if (pains) {
    var cards = Array.prototype.slice.call(pains.querySelectorAll('.pain__card'));
    var touched = [];

    var setPain = function (card, on) {
      var off = card.querySelector('.pain__seg--off');
      var onBtn = card.querySelector('.pain__seg--on');
      card.classList.toggle('is-then', on);
      if (off) off.setAttribute('aria-pressed', on ? 'false' : 'true');
      if (onBtn) onBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    cards.forEach(function (card, i) {
      var off = card.querySelector('.pain__seg--off');
      var onBtn = card.querySelector('.pain__seg--on');
      if (off) off.addEventListener('click', function () { touched[i] = true; setPain(card, false); });
      if (onBtn) onBtn.addEventListener('click', function () { touched[i] = true; setPain(card, true); });
    });

    // Карточки сами включаются по очереди, когда блок появился на экране; тронутые рукой не трогаем.
    if (hasIO && !reduced()) {
      var autoObs = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        autoObs.disconnect();
        cards.forEach(function (card, i) {
          setTimeout(function () { if (!touched[i] && !reduced()) setPain(card, true); }, 500 + i * 900);
        });
      }, { threshold: 0.35 });
      autoObs.observe(pains);
    }
  }

  /* ---------- Общий цикл прокрутки (манифест и параллакс) ---------- */
  var scrollJobs = [];
  var scrollQueued = false;
  function runScrollJobs() {
    scrollQueued = false;
    scrollJobs.forEach(function (job) { if (job.active) job.update(); });
  }
  function queueScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    raf(runScrollJobs);
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);

  /* ---------- 2. Манифест ---------- */
  var manifest = document.querySelector('[data-manifest]');
  if (manifest && hasIO && !reduced() && document.documentElement.classList.contains('motion')) {
    // Оборачиваем слова. Обычный пробел разделяет слова, неразрывный держит группу вместе
    // («до 30 минут» загорается целиком, предлоги не отрываются).
    var walker = document.createTreeWalker(manifest, 4, null);
    var textNodes = [];
    var tn;
    while ((tn = walker.nextNode())) {
      if (tn.parentNode.closest('.manifest__icon')) continue;
      if (/\S/.test(tn.nodeValue)) textNodes.push(tn);
    }
    textNodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/( +)/).forEach(function (part) {
        if (!part) return;
        if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'mw';
        w.textContent = part;
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
    each(manifest.querySelectorAll('.manifest__icon'), function (icon) { icon.classList.add('mw'); });

    var words = Array.prototype.slice.call(manifest.querySelectorAll('.mw'));
    var keys = Array.prototype.slice.call(manifest.querySelectorAll('.manifest__key'));
    var lit = -1;
    manifest.classList.add('is-ready');

    var manifestJob = {
      active: false,
      update: function () {
        if (reduced()) {
          manifest.classList.remove('is-ready');
          return;
        }
        manifest.classList.add('is-ready');
        var r = manifest.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var start = vh * 0.88;
        var p = (start - r.top) / (r.height + vh * 0.33);
        p = Math.max(0, Math.min(1, p));
        var n = Math.round(p * words.length);
        if (n === lit) return;
        lit = n;
        words.forEach(function (w, i) { w.classList.toggle('is-lit', i < n); });
        // Маркер ключевой фразы наливается, когда загорелись все её слова
        keys.forEach(function (k) {
          var kw = k.querySelectorAll('.mw');
          k.classList.toggle('is-lit', !!kw.length && kw[kw.length - 1].classList.contains('is-lit'));
        });
      }
    };
    scrollJobs.push(manifestJob);
    watch(manifest, function (v) { manifestJob.active = v; if (v) manifestJob.update(); }, '20% 0px 20% 0px');
    onEnvChange(function () { manifestJob.update(); });
  }

  /* ---------- 4. Параллакс крупных заголовков ---------- */
  if (hasIO && !reduced()) {
    each(document.querySelectorAll('main .section__title--xl'), function (title) {
      var job = {
        active: false,
        update: function () {
          if (reduced()) { title.style.removeProperty('--py'); return; }
          var r = title.getBoundingClientRect();
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var shift = ((r.top + r.height / 2) - vh / 2) * 0.05;
          shift = Math.max(-16, Math.min(16, shift));
          title.style.setProperty('--py', shift.toFixed(1) + 'px');
        }
      };
      scrollJobs.push(job);
      watch(title, function (v) { job.active = v; if (v) job.update(); });
    });
  }

  /* ---------- 3. Bento: живые мини-интерфейсы ----------
     Loop: шаг вызывается по таймеру, пока карточка на экране, вкладка видна и движение разрешено.
     step(hover) возвращает паузу до следующего шага. Наведение мышью сразу делает шаг и ускоряет цикл. */
  function Loop(card, step, opts) {
    opts = opts || {};
    var visible = false, hover = false, timer = 0, started = false;
    function active() { return visible && !document.hidden && !reduced(); }
    function schedule(ms) {
      clearTimeout(timer);
      if (!active()) return;
      timer = setTimeout(run, ms);
    }
    function run() {
      if (!active()) return;
      schedule(step(hover) || 1500);
    }
    function sync() {
      card.classList.toggle('is-offscreen', !visible || !!document.hidden);
      if (reduced()) { clearTimeout(timer); if (opts.final) opts.final(); return; }
      if (active()) {
        if (!started) { started = true; if (opts.start) opts.start(); }
        schedule(opts.first || 700);
      } else clearTimeout(timer);
    }
    watch(card, function (v) { visible = v; sync(); }, '0px 0px -10% 0px');
    onEnvChange(sync);
  }

  function pixel(name) {
    var span = document.createElement('span');
    var svg = window.GLPixel && window.GLPixel.svg(name);
    if (svg) span.appendChild(svg);
    return span;
  }

  // Плавный перенос элементов на новые места (FLIP) через Web Animations, если они есть.
  function flip(els, mutate, dur) {
    var before = els.map(function (el) { return el.getBoundingClientRect(); });
    mutate();
    els.forEach(function (el, i) {
      if (!el.isConnected || !el.animate) return;
      var a = before[i], b = el.getBoundingClientRect();
      var dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: dur, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
  }

  if (hasIO) {
    var BRANDS = {
      b1: { icon: 'pot' },
      b2: { icon: 'onion' },
      b3: { icon: 'pancakes' }
    };

    /* Единая очередь: заказ появляется в дорожке своего бренда и переезжает в общую очередь. */
    each(document.querySelectorAll('[data-bento="queue"]'), function (card) {
      var lanes = Array.prototype.slice.call(card.querySelectorAll('.mq__lane'));
      var queue = card.querySelector('.mq__queue');
      var num = 107;
      var order = [1, 0, 2, 0, 1, 2, 2, 0, 1];
      var k = 0;
      var MAX = 4;

      // Сколько строк помещается в колонку очереди (на широком экране она тянется по высоте карточки)
      function fit() {
        var h = queue.clientHeight;
        MAX = Math.max(3, Math.floor((h + 6) / 50));
        each(queue.querySelectorAll('.mq__row'), function (row, i) { row.hidden = i >= MAX; });
      }
      fit();
      window.addEventListener('resize', fit);

      Loop(card, function (hover) {
        var lane = lanes[order[k++ % order.length]];
        var brand = BRANDS[lane.getAttribute('data-brand')];
        var slot = lane.querySelector('.mq__slot');
        num += 1;
        var ticket = document.createElement('span');
        ticket.className = 'mq__ticket';
        ticket.textContent = String(num);
        slot.textContent = '';
        slot.appendChild(ticket);
        var thisNum = num;

        setTimeout(function () {
          if (!ticket.isConnected) return;
          var row = document.createElement('li');
          row.className = 'mq__row is-new';
          var icon = pixel(brand.icon);
          icon.className = 'mq__row-icon';
          var n = document.createElement('span');
          n.className = 'mq__num';
          n.textContent = String(thisNum);
          var bar = document.createElement('span');
          bar.className = 'mq__bar';
          row.appendChild(icon); row.appendChild(n); row.appendChild(bar);

          var from = ticket.getBoundingClientRect();
          var rows = Array.prototype.slice.call(queue.children);
          flip(rows, function () {
            queue.insertBefore(row, queue.firstChild);
            ticket.remove();
          }, 520);
          var to = row.getBoundingClientRect();
          if (row.animate) {
            row.animate([
              { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px)', opacity: 0.4 },
              { transform: 'none', opacity: 1 }
            ], { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
          }
          setTimeout(function () { row.classList.remove('is-new'); }, 900);
          while (queue.children.length > MAX + 1) queue.removeChild(queue.lastChild);
          var last = queue.children[MAX];
          if (last) {
            last.classList.add('is-leaving');
            setTimeout(function () { if (last.parentNode && queue.children.length > MAX) last.remove(); }, 500);
          }
        }, hover ? 260 : 620);

        return hover ? 1000 : 2100;
      }, { first: 500 });
    });

    /* Общий стоп-лист: тумблер на кухне сам переключается, у гостя позиция зачёркивается. */
    each(document.querySelectorAll('[data-bento="stop"]'), function (card) {
      var ms = card.querySelector('.ms');
      Loop(card, function (hover) {
        ms.classList.toggle('is-stopped');
        return hover ? 1300 : 2600;
      }, {
        first: 900,
        start: function () { ms.classList.remove('is-stopped'); },
        final: function () { ms.classList.add('is-stopped'); }
      });
    });

    /* Автораспределение курьеров: маршрут прорисовывается, точка курьера едет к дому. */
    each(document.querySelectorAll('[data-bento="courier"]'), function (card) {
      var map = card.querySelector('.mc');
      var route = card.querySelector('.mc__route');
      var courier = card.querySelector('.mc__courier--active');
      var houses = Array.prototype.slice.call(card.querySelectorAll('.mc__pin--house'));
      var ROUTES = [
        [[16, 78], [44, 78], [44, 24], [86, 24]],
        [[16, 78], [72, 78], [72, 92]],
        [[16, 78], [16, 50], [44, 50], [44, 8]]
      ];
      var svg = card.querySelector('.mc__streets');
      var streets = svg.querySelector('path');
      var k = 0;
      var running = false;
      var current = ROUTES[0];

      // Карта в пикселях: viewBox = размер карты, чтобы pathLength и штрих считались без искажений
      function px(pts) {
        var w = map.clientWidth, h = map.clientHeight;
        return pts.map(function (p) { return (p[0] * w / 100).toFixed(1) + ',' + (p[1] * h / 100).toFixed(1); }).join(' ');
      }
      function layout() {
        if (!map.classList.contains('is-live')) return;
        var w = map.clientWidth, h = map.clientHeight;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        var d = '';
        [24, 50, 78].forEach(function (y) { d += 'M0 ' + (y * h / 100) + 'H' + w; });
        [16, 44, 72].forEach(function (x) { d += 'M' + (x * w / 100) + ' 0V' + h; });
        streets.setAttribute('d', d);
        route.setAttribute('points', px(current));
      }
      window.addEventListener('resize', layout);

      function place(x, y) {
        courier.style.setProperty('--x', x.toFixed(2));
        courier.style.setProperty('--y', y.toFixed(2));
      }

      function pointAt(pts, t) {
        var lens = [], total = 0, i;
        for (i = 1; i < pts.length; i++) {
          var l = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
          lens.push(l); total += l;
        }
        var d = t * total;
        for (i = 0; i < lens.length; i++) {
          if (d <= lens[i] || i === lens.length - 1) {
            var f = lens[i] ? Math.min(1, d / lens[i]) : 1;
            return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
          }
          d -= lens[i];
        }
        return pts[pts.length - 1];
      }

      function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

      Loop(card, function (hover) {
        if (running) return 400;
        var idx = k++ % ROUTES.length;
        var pts = ROUTES[idx];
        var house = houses[idx];
        var dur = hover ? 1300 : 2400;
        houses.forEach(function (h) { h.classList.remove('is-done', 'is-target'); });
        house.classList.add('is-target');
        current = pts;
        route.setAttribute('points', px(pts));
        map.classList.remove('is-drawn', 'is-arrived');
        place(pts[0][0], pts[0][1]);
        void route.getBoundingClientRect();
        map.classList.add('is-drawn');
        running = true;
        var t0 = 0;
        var delay = hover ? 200 : 450;
        function frame(t) {
          if (!t0) t0 = t;
          var p = Math.max(0, Math.min(1, (t - t0 - delay) / dur));
          if (document.hidden || reduced() || card.classList.contains('is-offscreen')) p = 1;
          var xy = pointAt(pts, ease(p));
          place(xy[0], xy[1]);
          if (p < 1) { raf(frame); return; }
          running = false;
          map.classList.add('is-arrived');
          house.classList.add('is-done');
        }
        raf(frame);
        return delay + dur + (hover ? 700 : 1500);
      }, {
        first: 600,
        start: function () {
          map.classList.add('is-live');
          houses.forEach(function (h) { h.classList.remove('is-done'); });
          layout();
          place(16, 78);
        },
        final: function () {
          map.classList.remove('is-live', 'is-drawn', 'is-arrived');
          houses.forEach(function (h, i) { h.classList.toggle('is-done', i === 0); h.classList.remove('is-target'); });
          current = ROUTES[0];
          svg.setAttribute('viewBox', '0 0 100 100');
          streets.setAttribute('d', 'M0 24H100M0 50H100M0 78H100M16 0V100M44 0V100M72 0V100');
          route.setAttribute('points', ROUTES[0].map(function (p) { return p.join(','); }).join(' '));
          place(86, 24);
        }
      });
    });

    /* Один кабинет: строки загораются галочками по очереди, потом цикл заново. */
    each(document.querySelectorAll('[data-bento="cabinet"]'), function (card) {
      var rows = Array.prototype.slice.call(card.querySelectorAll('.md__row'));
      var k = 0;
      Loop(card, function (hover) {
        if (k < rows.length) {
          rows[k].classList.add('is-on');
          k += 1;
          // Пауза на полностью собранном кабинете перед новым кругом
          if (k === rows.length) return hover ? 1000 : 2600;
          return hover ? 160 : 420;
        }
        rows.forEach(function (r) { r.classList.remove('is-on'); });
        k = 0;
        return hover ? 300 : 700;
      }, {
        first: 400,
        start: function () { rows.forEach(function (r) { r.classList.remove('is-on'); }); },
        final: function () { rows.forEach(function (r) { r.classList.add('is-on'); }); k = rows.length; }
      });
    });
  }
})();
