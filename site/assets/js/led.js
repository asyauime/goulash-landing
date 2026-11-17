/*
 * led.js: фирменный приём «LED-табло» (общий для лендингов A и B). Классический скрипт.
 * Только графика и интерактив табло, весь текст страницы остаётся обычным HTML.
 *
 * 1. Пиксельные иконки: любой элемент с [data-pixel="имя"] получает SVG из точек-«светодиодов».
 *    Имена: pot, onion, pancakes (бренды демо), courier, kitchen, arrow, tablets, stoplist, phone,
 *    n1, n2, n3, check, queue, cabinet, site, app, headset, basket, timer, house,
 *    avatar-helmet, avatar-bun, avatar-beanie (аватары курьеров D1). Атрибут data-pixel-off добавляет погашенные точки фона. SVG всегда aria-hidden.
 *    Для демо-скриптов доступно window.GLPixel.svg(имя, { off: true }).
 * 1a. LED-шрифт 5×7 для цифр (window.GLLed, [data-led]): см. код ниже иконок.
 * 2. LED-стена hero: section[data-led-wall] > canvas. Светодиоды вокруг курсора (или пальца)
 *    загораются, заказы из этой точки стекаются по сетке к кнопке [data-led-target]. Под текстом
 *    [data-led-avoid] стена приглушена. Без курсора живёт сама. Подробности у кода стены ниже.
 *    Цвета из CSS-переменных (--color-accent, --color-text).
 *    prefers-reduced-motion: статичный кадр. Вне экрана и на скрытой вкладке анимация на паузе.
 */
(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // «#» горит, «.» погашено. Все строки одной длины.
  var ICONS = {
    pot: [
      '..#...#..',
      '...#.#...',
      '..#...#..',
      '.........',
      '#########',
      '.#######.',
      '.#######.',
      '.#######.',
      '..#####..'
    ],
    onion: [
      '....#....',
      '...#.#...',
      '....#....',
      '...###...',
      '..#####..',
      '.##.####.',
      '.#.#####.',
      '..#####..',
      '...###...'
    ],
    pancakes: [
      '...#.#...',
      '....#....',
      '.........',
      '.#######.',
      '#########',
      '.#######.',
      '#########',
      '.#######.',
      '..#####..'
    ],
    courier: [
      '........###..',
      '.........#...',
      '.####....#...',
      '######...#...',
      '############.',
      '############.',
      '..##....##...',
      '.#..#..#..#..',
      '..##....##...'
    ],
    tablets: [
      '###.###.###',
      '#.#.#.#.#.#',
      '#.#.#.#.#.#',
      '###.###.###',
      '...........',
      '###.###.###',
      '#.#.#.#.#.#',
      '#.#.#.#.#.#',
      '###.###.###'
    ],
    stoplist: [
      '#########..',
      '#.......#..',
      '#.##.##.#..',
      '#.......#..',
      '#.##.##.#..',
      '#......#.#.',
      '#.##..#...#',
      '#......#.#.',
      '#########..'
    ],
    phone: [
      '##.......##',
      '###.....###',
      '###.....###',
      '.##.....##.',
      '..##...##..',
      '...#####...',
      '...........',
      '..#.#.#.#..',
      '...........'
    ],
    n1: [
      '..#..',
      '.##..',
      '..#..',
      '..#..',
      '..#..',
      '..#..',
      '.###.'
    ],
    n2: [
      '.###.',
      '#...#',
      '....#',
      '...#.',
      '..#..',
      '.#...',
      '#####'
    ],
    n3: [
      '#####',
      '...#.',
      '..#..',
      '...#.',
      '....#',
      '#...#',
      '.###.'
    ],
    kitchen: [
      '..##.##..',
      '.#######.',
      '#########',
      '#########',
      '.#######.',
      '..#####..',
      '..#...#..',
      '..#####..',
      '..#####..'
    ],
    arrow: [
      '.....#..',
      '......#.',
      '########',
      '......#.',
      '.....#..'
    ],
    // Галочка «Кому подходит»: точки загораются по диагонали, как росчерк
    check: [
      '.........',
      '.......##',
      '......##.',
      '#....##..',
      '##..##...',
      '.####....',
      '..##.....',
      '.........'
    ],
    // «Что входит»: три потока сходятся в одну очередь
    queue: [
      '#.#.#.#.#',
      '.........',
      '#.#.#.#.#',
      '.........',
      '#########',
      '.........',
      '....#....',
      '...###...',
      '..#####..'
    ],
    // «Что входит»: кабинет, боковое меню и строки настроек
    cabinet: [
      '#########',
      '#.......#',
      '#########',
      '#.#.....#',
      '#.#.###.#',
      '#.#.....#',
      '#.#.###.#',
      '#.#.....#',
      '#########'
    ],
    site: [
      '#########',
      '#.......#',
      '#########',
      '#.......#',
      '#.##.##.#',
      '#.......#',
      '#.#####.#',
      '#.......#',
      '#########'
    ],
    app: [
      '.#####.',
      '#.....#',
      '#.###.#',
      '#.....#',
      '#.###.#',
      '#.....#',
      '#.###.#',
      '#.....#',
      '.##.##.'
    ],
    headset: [
      '..#####..',
      '.#.....#.',
      '#.......#',
      '#.......#',
      '##.....##',
      '##.....##',
      '#.......#',
      '.......#.',
      '.....##..'
    ],
    basket: [
      '...###...',
      '..#...#..',
      '.#.....#.',
      '#########',
      '#.#.#.#.#',
      '#########',
      '.#.#.#.#.',
      '.#######.',
      '..#####..'
    ],
    timer: [
      '..#####..',
      '.#.....#.',
      '#...#...#',
      '#...#...#',
      '#...###.#',
      '#.......#',
      '#.......#',
      '.#.....#.',
      '..#####..'
    ],
    // Аватары курьеров демо (D1): условные пиксельные головы без лиц, у каждого свой верх
    'avatar-helmet': [
      '..####..',
      '.######.',
      '.#######',
      '..####..',
      '..####..',
      '...##...',
      '.######.',
      '########'
    ],
    'avatar-bun': [
      '...##...',
      '..####..',
      '.##..##.',
      '.#.##.#.',
      '.#.##.#.',
      '...##...',
      '.######.',
      '########'
    ],
    'avatar-beanie': [
      '...##...',
      '..####..',
      '.######.',
      '..#..#..',
      '..####..',
      '...##...',
      '.######.',
      '########'
    ],
    house: [
      '....#....',
      '...###...',
      '..#####..',
      '.#######.',
      '#########',
      '.#.....#.',
      '.#.###.#.',
      '.#.#.#.#.',
      '.###.###.'
    ]
  };

  function pixelSvg(name, opts) {
    var map = ICONS[name];
    if (!map) return null;
    opts = opts || {};
    var h = map.length;
    var w = map[0].length;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('class', 'pixel pixel--' + name);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var on = map[y].charAt(x) === '#';
        if (!on && !opts.off) continue;
        var c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', x + 0.5);
        c.setAttribute('cy', y + 0.5);
        c.setAttribute('r', on ? 0.4 : 0.22);
        c.setAttribute('class', on ? 'pixel__on' : 'pixel__off');
        if (on) c.style.setProperty('--d', ((x + y) * 0.03).toFixed(2) + 's');
        svg.appendChild(c);
      }
    }
    return svg;
  }

  window.GLPixel = { icons: ICONS, svg: pixelSvg };

  Array.prototype.forEach.call(document.querySelectorAll('[data-pixel]'), function (el) {
    if (el.querySelector('svg')) return;
    var svg = pixelSvg(el.getAttribute('data-pixel'), { off: el.hasAttribute('data-pixel-off') });
    if (svg) el.appendChild(svg);
  });

  /* ---------- LED-шрифт 5×7 ----------
     Цифры, «+», «,», «—» и пробел рисуются матрицей 5×7 круглых светодиодов на равной сетке
     (погашенные точки едва видны). Буквы рядом с цифрами («млн+», «день») остаются шрифтом Onest.
     window.GLLed.set(span, текст): рисует текст в span (только картинка: span должен быть aria-hidden
     или рядом должна быть текстовая версия). [data-led]: при загрузке исходный текст уходит
     в .visually-hidden для диктора, рисунок в span.led-text[aria-hidden]. */
  var FONT = {
    '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '—': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    // Запятая: восьмая строка — хвостик ниже базовой линии
    ',': ['..', '..', '..', '..', '..', '.#', '.#', '#.'],
    ' ': ['..', '..', '..', '..', '..', '..', '..']
  };
  // Знаки без погашенной сетки и без зазора перед собой: запятая стоит вплотную, «1,3» читается слитно
  var BARE = { ',': true, ' ': true };
  var LED_RUN = /^[0-9+,— ]*[0-9+—]/;

  function ledSvg(text) {
    var cols = 0;
    var glyphs = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var g = FONT[ch];
      if (!g) continue;
      if (ch === ',' && cols) cols -= 1;
      glyphs.push({ g: g, x: cols, bare: !!BARE[ch] });
      cols += g[0].length + 1;
    }
    cols = Math.max(1, cols - 1);
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + cols + ' 7');
    svg.setAttribute('class', 'led-text__svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.width = (cols / 7 * 0.72).toFixed(3) + 'em';
    var on = '', off = '';
    glyphs.forEach(function (it) {
      for (var y = 0; y < it.g.length; y++) {
        for (var x = 0; x < it.g[y].length; x++) {
          var d = 'M' + (it.x + x + 0.5) + ' ' + (y + 0.5) + 'm-0.4 0a0.4 0.4 0 1 0 0.8 0a0.4 0.4 0 1 0 -0.8 0';
          if (it.g[y].charAt(x) === '#') on += d; else if (!it.bare) off += d;
        }
      }
    });
    var pOff = document.createElementNS(SVG_NS, 'path');
    pOff.setAttribute('class', 'led-text__off');
    pOff.setAttribute('d', off);
    var pOn = document.createElementNS(SVG_NS, 'path');
    pOn.setAttribute('class', 'led-text__on');
    pOn.setAttribute('d', on);
    svg.appendChild(pOff);
    svg.appendChild(pOn);
    return svg;
  }

  function ledSet(span, text) {
    text = String(text).replace(/\u00a0/g, ' ');
    if (span.getAttribute('data-led-shown') === text) return;
    span.setAttribute('data-led-shown', text);
    var m = text.match(LED_RUN);
    var led = m ? m[0] : '';
    var rest = text.slice(led.length);
    span.textContent = '';
    if (led) span.appendChild(ledSvg(led));
    if (rest) {
      var r = document.createElement('span');
      r.className = 'led-text__rest';
      r.textContent = rest.replace(/^ +/, '');
      if (/^ /.test(rest)) r.classList.add('led-text__rest--gap');
      span.appendChild(r);
    }
  }

  function ledMount(el) {
    if (el.querySelector('.led-text')) return el.querySelector('.led-text');
    var src = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('data-led-src', src);
    el.textContent = '';
    if (el.getAttribute('aria-hidden') !== 'true') {
      var sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = src;
      el.appendChild(sr);
    }
    var vis = document.createElement('span');
    vis.className = 'led-text';
    vis.setAttribute('aria-hidden', 'true');
    el.appendChild(vis);
    ledSet(vis, src);
    return vis;
  }

  window.GLLed = { svg: ledSvg, set: ledSet, mount: ledMount };
  Array.prototype.forEach.call(document.querySelectorAll('[data-led]'), ledMount);


  /* ---------- LED-стена hero ----------
     Разметка: section[data-led-wall] > canvas (aria-hidden) + текст. Текст с [data-led-avoid]
     стена обходит: под ним и рядом светодиоды приглушены (маска яркости), поэтому текст читается
     без плашки. [data-led-target] — куда стекаются заказы (первый: главная кнопка).
     Курсор: светодиоды вокруг него «прожигаются» и медленно остывают, из точки под курсором
     заказы идут по сетке: в сторону от текста, вниз (или вверх) до ряда кнопки и в кнопку.
     Тач: касание и протягивание пальцем дают то же; прокрутка страницы не блокируется.
     Клавиатура: пока фокус на кнопке или ссылке hero, поток идёт от центра к ней.
     Без курсора: редкие одиночные вспышки, изредка короткий поток к кнопке.
     prefers-reduced-motion: статичный кадр без реакции. Вне экрана и на скрытой вкладке пауза.
     Цвета из CSS-переменных (--color-text, --color-accent). Ни чисел, ни названий: только графика. */

  var wall = document.querySelector('[data-led-wall]');
  var canvas = wall ? wall.querySelector('canvas') : null;
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  var MAX_PACKETS = 80;
  var MASK_FLOOR = 0.06;   // яркость стены прямо под текстом (доля от обычной): почти погашено
  var MASK_RAMP = 18;      // за сколько клеток от текста стена набирает полную яркость (плавный спад)
  var HEAT_FLOOR = 0.05;   // подсветка курсора под текстом почти не видна
  var GRID_ALPHA = 0.091;   // погашенные светодиоды

  var colors = { text: '', accent: '' };
  var W = 0, H = 0, cols = 0, rows = 0, cell = 14, dpr = 1, ox = 0, oy = 0;
  var mask = null, heatMask = null, heat = null;
  var avoid = [];          // прямоугольники текста в клетках: [x0, y0, x1, y1]
  var targets = [];        // кнопки в клетках: { x0, y0, x1, y1, row, el }
  var gridLayer = null;
  var packets = [];
  var flashes = [];        // вход заказа в кнопку
  var haloR = 5;

  var pointer = { on: false, x: 0, y: 0, hx: 0, hy: 0, emitIn: 0, lastMove: -1 };
  var focusTarget = null, focusEmitIn = 0;
  var sparkIn = 1.2;       // до следующей одиночной вспышки
  var streamIn = 2.5;      // до следующего короткого потока
  var stream = null;       // { x, y, left, next }
  var running = false, onScreen = true, rafId = 0, lastT = 0, now = 0;

  function readColors() {
    var cs = window.getComputedStyle(document.documentElement);
    var fallback = window.getComputedStyle(wall).color;
    function v(name) { return cs.getPropertyValue(name).trim() || fallback; }
    colors.text = v('--color-text');
    colors.accent = v('--color-accent');
  }

  function cx(x) { return ox + x * cell + cell / 2; }
  function cy(y) { return oy + y * cell + cell / 2; }
  function dot(c, x, y, r) {
    c.moveTo(cx(x) + r, cy(y));
    c.arc(cx(x), cy(y), r, 0, Math.PI * 2);
  }
  function clampX(x) { return Math.max(0, Math.min(cols - 1, x)); }
  function clampY(y) { return Math.max(0, Math.min(rows - 1, y)); }

  // Прямоугольники строк текста (по текстовым узлам, а не по блокам) относительно canvas
  function textRects(el, base) {
    var out = [];
    var walker = document.createTreeWalker(el, 4);
    var range = document.createRange();
    var n;
    while ((n = walker.nextNode())) {
      if (!n.data.trim()) continue;
      range.selectNodeContents(n);
      Array.prototype.forEach.call(range.getClientRects(), function (r) {
        if (r.width < 1 || r.height < 1) return;
        out.push([r.left - base.left, r.top - base.top, r.right - base.left, r.bottom - base.top]);
      });
    }
    return out;
  }

  function toCells(r) {
    return [
      Math.floor((r[0] - ox) / cell), Math.floor((r[1] - oy) / cell),
      Math.floor((r[2] - 1 - ox) / cell), Math.floor((r[3] - 1 - oy) / cell)
    ];
  }

  function measure() {
    var base = canvas.getBoundingClientRect();
    var px = [];
    Array.prototype.forEach.call(wall.querySelectorAll('[data-led-avoid]'), function (el) {
      px = px.concat(textRects(el, base));
    });
    avoid = px.map(toCells);
    targets = Array.prototype.map.call(wall.querySelectorAll('[data-led-target]'), function (el) {
      var r = el.getBoundingClientRect();
      var c = toCells([r.left - base.left, r.top - base.top, r.right - base.left, r.bottom - base.top]);
      return { x0: c[0], y0: c[1], x1: c[2], y1: c[3], row: clampY(Math.floor((r.top - base.top + r.height / 2 - oy) / cell)), el: el };
    });

    // Маска: чем ближе клетка к тексту, тем тусклее. Внутри текста почти погашено.
    mask = new Float32Array(cols * rows);
    heatMask = new Float32Array(cols * rows);
    var ramp = MASK_RAMP * cell;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var px0 = cx(x), py0 = cy(y), d = Infinity;
        for (var i = 0; i < px.length; i++) {
          var r = px[i];
          var dx = Math.max(r[0] - px0, 0, px0 - r[2]);
          var dy = Math.max(r[1] - py0, 0, py0 - r[3]);
          var dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < d) d = dd;
        }
        // Первую клетку у букв держим погашенной, дальше мягкий рост (квадратичный, без «ореола»)
        var t = Math.max(0, Math.min(1, (d - cell) / ramp));
        t = t * t * (3 - 2 * t); // плавный переход без заметной границы
        mask[y * cols + x] = MASK_FLOOR + (1 - MASK_FLOOR) * t;
        heatMask[y * cols + x] = HEAT_FLOOR + (1 - HEAT_FLOOR) * t;
      }
    }
    buildGrid();
  }

  // Погашенная стена: точки чуть разной яркости, как у настоящей матрицы. Рисуется один раз.
  function buildGrid() {
    gridLayer = document.createElement('canvas');
    gridLayer.width = canvas.width;
    gridLayer.height = canvas.height;
    var g = gridLayer.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = colors.text;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        g.globalAlpha = GRID_ALPHA * mask[y * cols + x] * (0.7 + 0.6 * rnd());
        g.beginPath();
        dot(g, x, y, cell * 0.17);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function layout() {
    W = canvas.clientWidth || 400;
    H = canvas.clientHeight || 600;
    cell = W < 480 ? 10 : (W < 1024 ? 12 : 14);
    haloR = W < 480 ? 5 : 7;
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);
    ox = (W - cols * cell) / 2;
    oy = (H - rows * cell) / 2;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    readColors();
    heat = new Float32Array(cols * rows);
    packets = [];
    flashes = [];
    stream = null;
    measure();
    if (reduced()) seedStill();
  }

  /* Путь заказа к кнопке по сетке: из точки в сторону от текста, по свободной колонке
     вниз (или вверх) до ряда кнопки и в кнопку сбоку. Если колонка над самой кнопкой,
     заказ входит сверху (или снизу). */
  function pathTo(x0, y0, t) {
    x0 = clampX(Math.round(x0));
    y0 = clampY(Math.round(y0));
    var lo = Math.min(y0, t.row), hi = Math.max(y0, t.row);
    var bl = Infinity, br = -Infinity;
    avoid.forEach(function (r) {
      if (r[3] < lo || r[1] > hi) return;
      bl = Math.min(bl, r[0] - 1);
      br = Math.max(br, r[2] + 1);
    });
    var lane = x0;
    if (bl <= br && x0 >= bl && x0 <= br) lane = clampX(x0 - bl < br - x0 ? bl - 2 : br + 2);
    var endX, endY;
    if (lane < t.x0) { endX = t.x0 - 1; endY = t.row; }
    else if (lane > t.x1) { endX = t.x1 + 1; endY = t.row; }
    else { endX = lane; endY = y0 <= t.row ? t.y0 - 1 : t.y1 + 1; }
    endX = clampX(endX);
    endY = clampY(endY);
    var cells = [];
    function push(x, y) {
      var last = cells[cells.length - 1];
      if (!last || last[0] !== x || last[1] !== y) cells.push([x, y]);
    }
    var x, y, step;
    step = lane >= x0 ? 1 : -1;
    for (x = x0; x !== lane; x += step) push(x, y0);
    step = endY >= y0 ? 1 : -1;
    for (y = y0; y !== endY; y += step) push(lane, y);
    step = endX >= lane ? 1 : -1;
    for (x = lane; x !== endX; x += step) push(x, endY);
    push(endX, endY);
    return cells;
  }

  function emit(x, y, t, opts) {
    if (!t || packets.length >= MAX_PACKETS) return;
    var cells = pathTo(x, y, t);
    if (cells.length < 3) return;
    opts = opts || {};
    packets.push({ cells: cells, pos: opts.pos || 0, len: opts.len || 4, done: false, speed: opts.speed || 1 });
  }

  // Статичный кадр (reduced-motion): один короткий поток уже идёт к кнопке
  function seedStill() {
    if (!targets[0]) return;
    var sx = Math.round(cols * 0.12), sy = Math.max(1, Math.round(rows * 0.2));
    var cells = pathTo(sx, sy, targets[0]);
    [0.5, 0.7, 0.9].forEach(function (f) {
      packets.push({ cells: cells, pos: Math.floor(cells.length * f), len: 4, done: true, speed: 0 });
    });
  }

  function addHeat(x, y, v) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    var i = y * cols + x;
    heat[i] = Math.min(1, heat[i] + v);
  }

  // Подсветка вокруг курсора копится, пока он рядом, и остывает после
  function burn(px, py, amount) {
    var x0 = Math.round(px), y0 = Math.round(py);
    for (var y = y0 - haloR; y <= y0 + haloR; y++) {
      for (var x = x0 - haloR; x <= x0 + haloR; x++) {
        var d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)) / haloR;
        if (d < 1) addHeat(x, y, Math.pow(1 - d, 1.4) * amount);
      }
    }
  }

  function spark(x, y) {
    addHeat(x, y, 0.9);
    addHeat(x - 1, y, 0.3); addHeat(x + 1, y, 0.3);
    addHeat(x, y - 1, 0.3); addHeat(x, y + 1, 0.3);
  }

  // Случайная клетка вне текста (для вспышек и потоков без курсора)
  function freeCell(maxY) {
    for (var k = 0; k < 20; k++) {
      var x = Math.floor(Math.random() * cols);
      var y = 1 + Math.floor(Math.random() * Math.max(1, maxY - 1));
      if (mask[y * cols + x] > 0.9) return [x, y];
    }
    return [0, 1];
  }

  function update(dt) {
    now += dt;
    var main = targets[0];

    if (pointer.on) {
      var k = Math.min(1, dt * 14);
      pointer.hx += (pointer.x - pointer.hx) * k;
      pointer.hy += (pointer.y - pointer.hy) * k;
      burn(pointer.hx, pointer.hy, dt * 6);
      pointer.emitIn -= dt;
      if (pointer.emitIn <= 0) {
        emit(pointer.hx, pointer.hy, main, { len: 5, speed: 1.15 });
        // Пока курсор движется, заказы идут чаще
        pointer.emitIn = now - pointer.lastMove < 0.25 ? 0.15 : 0.45;
      }
    } else {
      sparkIn -= dt;
      if (sparkIn <= 0) {
        var c = freeCell(rows - 1);
        spark(c[0], c[1]);
        sparkIn = 1.4 + Math.random() * 2.2;
      }
      streamIn -= dt;
      if (streamIn <= 0 && !stream && main) {
        var s = freeCell(Math.max(2, main.row - 3));
        stream = { x: s[0], y: s[1], left: 3, next: 0 };
        spark(s[0], s[1]);
        streamIn = 7 + Math.random() * 5;
      }
    }

    if (focusTarget) {
      focusEmitIn -= dt;
      if (focusEmitIn <= 0) {
        var h1 = avoid.length ? avoid[Math.min(1, avoid.length - 1)] : [cols / 2, rows / 3];
        emit(Math.round(cols / 2), Math.round((h1[1] + (h1[3] || h1[1])) / 2), focusTarget, { len: 5 });
        focusEmitIn = 0.4;
      }
    }

    if (stream) {
      stream.next -= dt;
      if (stream.next <= 0) {
        emit(stream.x, stream.y, main);
        stream.left--;
        stream.next = 0.2;
        if (stream.left <= 0) stream = null;
      }
    }

    // Остывание
    var cool = Math.exp(-dt * 2);
    for (var i = 0; i < heat.length; i++) if (heat[i]) heat[i] = heat[i] < 0.01 ? 0 : heat[i] * cool;

    var v = Math.max(18, cols * 0.3);
    for (var p = packets.length - 1; p >= 0; p--) {
      var pk = packets[p];
      pk.pos += v * dt * pk.speed;
      if (!pk.done && pk.pos >= pk.cells.length - 1) {
        pk.done = true;
        var end = pk.cells[pk.cells.length - 1];
        flashes.push({ x: end[0], y: end[1], life: 1 });
      }
      if (pk.pos - pk.len >= pk.cells.length) packets.splice(p, 1);
    }
    for (var f = flashes.length - 1; f >= 0; f--) {
      flashes[f].life -= dt * 2.2;
      if (flashes[f].life <= 0) flashes.splice(f, 1);
    }
  }

  function m(x, y) { return mask[y * cols + x]; }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gridLayer) ctx.drawImage(gridLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Прожжённые светодиоды: белые, под текстом приглушены маской
    ctx.fillStyle = colors.text;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var h = heat[y * cols + x];
        if (h < 0.03) continue;
        ctx.globalAlpha = Math.min(1, h) * 0.9 * heatMask[y * cols + x];
        ctx.beginPath();
        dot(ctx, x, y, cell * (0.17 + 0.25 * Math.min(1, h)));
        ctx.fill();
      }
    }

    // Заказы: акцентные, голова яркая со свечением самого светодиода, хвост гаснет
    ctx.fillStyle = colors.accent;
    packets.forEach(function (p) {
      var head = Math.floor(p.pos);
      for (var k = 0; k < p.len; k++) {
        var idx = head - k;
        if (idx < 0 || idx >= p.cells.length) continue;
        var c = p.cells[idx];
        var mm = m(c[0], c[1]);
        ctx.globalAlpha = (1 - k / p.len) * 0.95 * mm;
        ctx.beginPath();
        dot(ctx, c[0], c[1], cell * 0.38);
        ctx.fill();
        if (k === 0) {
          ctx.globalAlpha = 0.12 * mm;
          ctx.beginPath();
          dot(ctx, c[0], c[1], cell * 0.8);
          ctx.fill();
        }
      }
    });

    // Заказ дошёл до кнопки: короткая вспышка светодиода у её края
    flashes.forEach(function (f) {
      ctx.globalAlpha = f.life * m(f.x, f.y);
      ctx.beginPath();
      dot(ctx, f.x, f.y, cell * (0.38 + 0.2 * f.life));
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    rafId = 0;
    if (!running) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    update(dt);
    draw();
    rafId = window.requestAnimationFrame(frame);
  }

  function shouldRun() {
    return onScreen && !document.hidden && !reduced();
  }

  function sync() {
    var run = shouldRun();
    if (run && !running) {
      running = true;
      lastT = 0;
      if (!rafId) rafId = window.requestAnimationFrame(frame);
    } else if (!run && running) {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (!running) pointer.on = false;
    if (reduced()) draw(); // статичный кадр
  }

  /* ----- Курсор, палец, клавиатура ----- */
  function point(clientX, clientY) {
    if (!running) return;
    var r = canvas.getBoundingClientRect();
    var x = (clientX - r.left - ox) / cell - 0.5;
    var y = (clientY - r.top - oy) / cell - 0.5;
    if (!pointer.on) {
      pointer.hx = x;
      pointer.hy = y;
      pointer.emitIn = 0;
    }
    pointer.on = true;
    pointer.x = x;
    pointer.y = y;
    pointer.lastMove = now;
  }
  function release() { pointer.on = false; }

  // Мышь и перо через pointer-события, палец через touch-события: они продолжают приходить
  // и во время прокрутки, а pointer-события браузер на прокрутке отменяет
  function onPointer(e) { if (e.pointerType !== 'touch') point(e.clientX, e.clientY); }
  wall.addEventListener('pointermove', onPointer);
  wall.addEventListener('pointerdown', onPointer);
  wall.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') release(); });
  function onTouch(e) {
    var t = e.touches[0];
    if (t) point(t.clientX, t.clientY);
  }
  wall.addEventListener('touchstart', onTouch, { passive: true });
  wall.addEventListener('touchmove', onTouch, { passive: true });
  wall.addEventListener('touchend', function (e) { if (!e.touches.length) release(); }, { passive: true });
  wall.addEventListener('touchcancel', release, { passive: true });

  wall.addEventListener('focusin', function (e) {
    focusTarget = null;
    targets.forEach(function (t) { if (t.el === e.target) focusTarget = t; });
    focusEmitIn = 0;
  });
  wall.addEventListener('focusout', function () { focusTarget = null; });

  layout();
  draw();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      sync();
    }).observe(wall);
  }
  document.addEventListener('visibilitychange', sync);
  if (motionQuery) {
    var onMotion = function () { layout(); sync(); draw(); };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);
    else if (motionQuery.addListener) motionQuery.addListener(onMotion);
  }

  // Перестройка при смене размера стены; маска заново, когда текст встал на место
  // (после появления строк и загрузки шрифта)
  var lastSize = canvas.clientWidth + 'x' + canvas.clientHeight;
  var relayoutTimer = 0, remeasureTimer = 0;
  function relayout() {
    window.clearTimeout(relayoutTimer);
    relayoutTimer = window.setTimeout(function () {
      var size = canvas.clientWidth + 'x' + canvas.clientHeight;
      if (size === lastSize) return;
      lastSize = size;
      layout();
      draw();
    }, 120);
  }
  function remeasure() {
    window.clearTimeout(remeasureTimer);
    remeasureTimer = window.setTimeout(function () { measure(); draw(); }, 60);
  }
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(wall);
  else window.addEventListener('resize', relayout);
  wall.addEventListener('animationend', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  sync();
})();
