/*
 * demo-route.js: интерфейс демо D3 «Маршрут и время доставки» (общий для лендингов A и B).
 * Классический скрипт. Расчёт ETA в demo-logic.js (window.GL.etaMinutes, SPEEDS, MODE_LABELS),
 * здесь только отрисовка. Подключать после demo-logic.js.
 * Если на странице нет [data-demo="d3"] или нет window.GL, ничего не делает.
 *
 * Ожидаемая разметка контейнера (всё внутри [data-route] скрипт рисует сам):
 *
 *   <div class="demo demo-route" data-demo="d3" role="tabpanel" id="panel-d3" aria-labelledby="tab-d3">
 *     <div class="demo__bar">
 *       <h3 class="demo__title visually-hidden" id="d3-title">Маршрут и время доставки</h3>
 *     </div>
 *     <div class="demo__body" data-route></div>
 *   </div>
 *
 * Можно и без вкладок (role="group"). Если [data-route] нет, скрипт создаст его в конце контейнера.
 *
 * Подсказка сценария (.demo-guide, перед .route): «Выберите способ доставки» (подсвечен
 * переключатель) → «Подвигайте расстояние» (подсвечен ползунок) → итог. Текст в aria-live=polite,
 * меняется только при смене шага; кнопка «Сбросить демо» стоит в той же строке.
 *
 * Что рисует скрипт внутри .route:
 *   .route__controls:
 *     fieldset.route__modes > legend «Способ доставки» + .route__seg (сегментный переключатель,
 *       внутри label.route__mode > input[type=radio] Пеший, Вело, Авто; бегунок двигается CSS)
 *     .route__distance > label[for] «Расстояние до гостя» + output («N км»)
 *       + input[type=range min=1 max=10 step=1] + .route__scale («1 км» … «10 км»)
 *   .route__map > svg[aria-hidden]: сетка улиц, бледная подложка маршрута, линия маршрута
 *     path.route__line--walk|bike|car (прорисовывается через маску), точка курьера,
 *     точки и подписи «Кухня», «Гость»
 *   div.route__eta: видимое табло времени (aria-hidden, цифры меняются с анимацией)
 *     + p.visually-hidden[aria-live=polite] «Примерное время доставки: N мин» (только итог)
 *     + p.route__eta-detail (расшифровка мелко, вторично)
 *
 * Стили линии: пеший — точки, вело — штрихи, авто — сплошная толстая. Отличаются не только цветом.
 * Движение: точка курьера едет по линии (пеший медленнее, авто быстрее), линия прорисовывается
 * при смене способа. При prefers-reduced-motion всё мгновенно и статично. Вне экрана и на
 * скрытой вкладке анимация на паузе.
 */
(function () {
  'use strict';

  // Типограф из main.js: строки сравниваем в том же виде, в каком они стоят в DOM
  var typo = window.GLTypo && window.GLTypo.text ? window.GLTypo.text : function (s) { return s; };

  var GL = window.GL;
  if (!GL || typeof GL.etaMinutes !== 'function' || !GL.SPEEDS || !GL.MODE_LABELS) return;
  var roots = document.querySelectorAll('[data-demo="d3"]');
  if (!roots.length) return;

  var MODES = ['walk', 'bike', 'car'];
  var DEFAULTS = { mode: 'bike', distance: 3 };
  var MIN_KM = 1;
  var MAX_KM = 10;
  var PREP_MIN = 12;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  // Длительность одной поездки точки курьера по схеме, секунды (только визуально).
  var RIDE_SEC = { walk: 5.4, bike: 3.2, car: 1.9 };
  var PAUSE_SEC = 0.9;
  var GUIDE = [
    'Выберите способ доставки',
    'Подвигайте расстояние',
    'Время доставки пересчитывается сразу'
  ];

  // Геометрия схемы (единицы viewBox).
  var VIEW_W = 320;
  var VIEW_H = 170;
  var KITCHEN = { x: 36, y: 128 };
  var GUEST_Y = 44;
  var TRACK_START = 60;
  var TRACK_END = 290;

  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function clampKm(v) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = DEFAULTS.distance;
    return Math.min(MAX_KM, Math.max(MIN_KM, n));
  }

  function guestX(km) {
    return TRACK_START + (km - MIN_KM) / (MAX_KM - MIN_KM) * (TRACK_END - TRACK_START);
  }

  // Маршрут «по улицам»: вправо, вверх, вправо до гостя.
  function routePath(km) {
    var gx = guestX(km);
    var mid = Math.round((KITCHEN.x + gx) / 2);
    return 'M' + KITCHEN.x + ' ' + KITCHEN.y +
      ' H' + mid + ' V' + GUEST_Y + ' H' + Math.round(gx);
  }

  function buildMap(uid) {
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + VIEW_W + ' ' + VIEW_H,
      'class': 'route__svg',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    var maskId = uid + '-draw';
    var defs = svgEl('defs', {});
    var mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: VIEW_W, height: VIEW_H });
    var maskPath = svgEl('path', { 'class': 'route__mask-path', fill: 'none', d: routePath(DEFAULTS.distance) });
    mask.appendChild(maskPath);
    defs.appendChild(mask);
    svg.appendChild(defs);

    var streets = svgEl('g', { 'class': 'route__streets' });
    var y, x;
    for (y = 24; y < VIEW_H; y += 40) {
      streets.appendChild(svgEl('line', { x1: 0, y1: y, x2: VIEW_W, y2: y }));
    }
    for (x = 20; x < VIEW_W; x += 40) {
      streets.appendChild(svgEl('line', { x1: x, y1: 0, x2: x, y2: VIEW_H }));
    }
    svg.appendChild(streets);

    var ghost = svgEl('path', { 'class': 'route__ghost', fill: 'none', d: routePath(DEFAULTS.distance) });
    svg.appendChild(ghost);

    var line = svgEl('path', { 'class': 'route__line', fill: 'none', d: routePath(DEFAULTS.distance), mask: 'url(#' + maskId + ')' });
    svg.appendChild(line);

    var kitchen = svgEl('g', { 'class': 'route__point route__point--kitchen' });
    kitchen.appendChild(svgEl('rect', {
      x: KITCHEN.x - 9, y: KITCHEN.y - 9, width: 18, height: 18, rx: 3
    }));
    var kLabel = svgEl('text', { x: KITCHEN.x, y: KITCHEN.y + 28, 'text-anchor': 'middle' });
    kLabel.textContent = 'Кухня';
    kitchen.appendChild(kLabel);
    svg.appendChild(kitchen);

    var guest = svgEl('g', { 'class': 'route__point route__point--guest' });
    var gDot = svgEl('circle', { cx: guestX(DEFAULTS.distance), cy: GUEST_Y, r: 9 });
    var gLabel = svgEl('text', { x: guestX(DEFAULTS.distance), y: GUEST_Y - 18, 'text-anchor': 'middle' });
    gLabel.textContent = 'Гость';
    guest.appendChild(gDot);
    guest.appendChild(gLabel);
    svg.appendChild(guest);

    var courier = svgEl('g', { 'class': 'route__courier' });
    courier.appendChild(svgEl('circle', { 'class': 'route__courier-glow', cx: 0, cy: 0, r: 12 }));
    courier.appendChild(svgEl('circle', { 'class': 'route__courier-dot', cx: 0, cy: 0, r: 5.5 }));
    svg.appendChild(courier);

    return {
      svg: svg, line: line, ghost: ghost, maskPath: maskPath,
      gDot: gDot, gLabel: gLabel, courier: courier
    };
  }

  function setup(root, index) {
    var uid = 'd3-' + (index + 1);
    var state = { mode: DEFAULTS.mode, distance: DEFAULTS.distance };

    var mount = root.querySelector('[data-route]');
    if (!mount) {
      mount = el('div');
      mount.setAttribute('data-route', '');
      root.appendChild(mount);
    }
    mount.textContent = '';

    // ----- Подсказка следующего шага -----
    var guideDone = { mode: false, distance: false };
    var guide = el('div', 'demo-guide');
    var guideSteps = el('span', 'demo-guide__steps');
    guideSteps.setAttribute('aria-hidden', 'true');
    guideSteps.appendChild(el('span', 'demo-guide__step'));
    guideSteps.appendChild(el('span', 'demo-guide__step'));
    var guideText = el('p', 'demo-guide__text');
    guideText.setAttribute('aria-live', 'polite');
    var resetBtn = el('button', 'btn btn--ghost btn--sm demo-guide__reset', 'Сбросить демо');
    resetBtn.type = 'button';
    guide.appendChild(guideSteps);
    guide.appendChild(guideText);
    guide.appendChild(resetBtn);
    mount.appendChild(guide);

    var routeBox = el('div', 'route');
    mount.appendChild(routeBox);

    // ----- Управление -----
    var controls = el('div', 'route__controls');

    var fieldset = el('fieldset', 'route__modes');
    fieldset.appendChild(el('legend', 'route__legend', 'Способ доставки'));
    var seg = el('div', 'route__seg');
    var radios = {};
    MODES.forEach(function (mode) {
      var label = el('label', 'route__mode');
      label.setAttribute('data-mode', mode);
      var input = el('input', 'route__radio');
      input.type = 'radio';
      input.name = uid + '-mode';
      input.value = mode;
      input.checked = mode === state.mode;
      input.addEventListener('change', function () {
        if (input.checked) {
          state.mode = mode;
          guideDone.mode = true;
          render({ draw: true });
        }
      });
      radios[mode] = input;
      label.appendChild(input);
      label.appendChild(el('span', 'route__mode-text', GL.MODE_LABELS[mode]));
      seg.appendChild(label);
    });
    fieldset.appendChild(seg);
    // Шаг подсказки засчитывается и при выборе уже выбранного способа (щелчок или пробел)
    function markMode(e) {
      if (!e.target || e.target.type !== 'radio') return;
      if (e.type === 'keydown' && e.key !== ' ') return;
      if (guideDone.mode) return;
      guideDone.mode = true;
      renderGuide();
    }
    fieldset.addEventListener('click', markMode);
    fieldset.addEventListener('keydown', markMode);
    controls.appendChild(fieldset);

    var distWrap = el('div', 'route__distance');
    var distHead = el('div', 'route__distance-head');
    var rangeId = uid + '-distance';
    var distLabel = el('label', 'route__legend', 'Расстояние до гостя');
    distLabel.setAttribute('for', rangeId);
    var distValue = el('output', 'route__distance-value');
    distValue.setAttribute('for', rangeId);
    distHead.appendChild(distLabel);
    distHead.appendChild(distValue);

    var range = el('input', 'route__range');
    range.type = 'range';
    range.id = rangeId;
    range.min = String(MIN_KM);
    range.max = String(MAX_KM);
    range.step = '1';
    range.value = String(state.distance);
    range.addEventListener('input', function () {
      state.distance = clampKm(range.value);
      guideDone.distance = true;
      render({});
    });

    var scale = el('div', 'route__scale');
    scale.setAttribute('aria-hidden', 'true');
    scale.appendChild(el('span', null, MIN_KM + ' км'));
    scale.appendChild(el('span', null, MAX_KM + ' км'));

    distWrap.appendChild(distHead);
    distWrap.appendChild(range);
    distWrap.appendChild(scale);
    controls.appendChild(distWrap);

    // ----- Карта -----
    var mapWrap = el('div', 'route__map');
    var map = buildMap(uid);
    mapWrap.appendChild(map.svg);

    // ----- Результат -----
    // Видимое табло меняет цифры плавно, поэтому скрыто от диктора.
    // В live-области только итоговый текст, расшифровка рядом и не объявляется.
    var eta = el('div', 'route__eta');
    var etaBoard = el('p', 'route__eta-main');
    etaBoard.setAttribute('aria-hidden', 'true');
    var etaLabel = el('span', 'route__eta-label', 'Примерное время доставки');
    var etaValue = el('span', 'route__eta-value');
    var etaNum = el('span', 'route__eta-num', '0');
    // Цифры табло LED-шрифтом (led.js, window.GLLed); без него обычный текст
    function setEtaNum(t) {
      if (window.GLLed) window.GLLed.set(etaNum, t);
      else etaNum.textContent = t;
    }
    etaValue.appendChild(etaNum);
    etaValue.appendChild(el('span', 'route__eta-unit', 'мин'));
    etaBoard.appendChild(etaLabel);
    etaBoard.appendChild(etaValue);
    var etaLive = el('p', 'visually-hidden route__eta-live');
    etaLive.setAttribute('aria-live', 'polite');
    etaLive.setAttribute('aria-atomic', 'true');
    var etaDetail = el('p', 'route__eta-detail');
    eta.appendChild(etaBoard);
    eta.appendChild(etaLive);
    eta.appendChild(etaDetail);

    resetBtn.addEventListener('click', function () {
      state.mode = DEFAULTS.mode;
      state.distance = DEFAULTS.distance;
      guideDone.mode = false;
      guideDone.distance = false;
      radios[state.mode].checked = true;
      range.value = String(state.distance);
      render({ draw: true });
    });

    function renderGuide() {
      // Шаги засчитываются независимо: ползунок можно двигать, не выбирая способ.
      // Подсказка ведёт к первому несделанному шагу.
      var done = [guideDone.mode, guideDone.distance];
      var step = !done[0] ? 0 : (!done[1] ? 1 : 2);
      var text = typo(GUIDE[step]);
      if (guideText.textContent !== text) guideText.textContent = text;
      Array.prototype.forEach.call(guideSteps.children, function (dot, i) {
        dot.classList.toggle('is-done', !!done[i]);
        dot.classList.toggle('is-now', step === i);
      });
      fieldset.classList.toggle('is-next', step === 0);
      distWrap.classList.toggle('is-next', step === 1);
    }

    routeBox.appendChild(controls);
    routeBox.appendChild(mapWrap);
    routeBox.appendChild(eta);

    // ----- Анимация: прорисовка линии -----
    var pathLen = 0;

    function drawLine(animate) {
      var mp = map.maskPath;
      pathLen = map.line.getTotalLength ? map.line.getTotalLength() : 0;
      if (!pathLen) return;
      mp.style.transition = 'none';
      mp.style.strokeDasharray = pathLen + ' ' + pathLen;
      if (!animate || reduced()) {
        mp.style.strokeDashoffset = '0';
        return;
      }
      mp.style.strokeDashoffset = String(pathLen);
      void mp.getBoundingClientRect();
      mp.style.transition = 'stroke-dashoffset 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)';
      mp.style.strokeDashoffset = '0';
      ride.t = -0.55; // курьер выезжает, когда линия почти прорисована
    }

    // ----- Анимация: точка курьера -----
    var ride = { t: 0, running: false, raf: 0, last: 0, onScreen: true };

    function placeCourier(p) {
      if (!pathLen) pathLen = map.line.getTotalLength ? map.line.getTotalLength() : 0;
      if (!pathLen || !map.line.getPointAtLength) return;
      var pt = map.line.getPointAtLength(pathLen * Math.max(0, Math.min(1, p)));
      map.courier.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
    }

    function rideFrame(t) {
      ride.raf = 0;
      if (!ride.running) return;
      var dt = ride.last ? Math.min(0.05, (t - ride.last) / 1000) : 0;
      ride.last = t;
      var dur = RIDE_SEC[state.mode] || 3;
      ride.t += dt;
      if (ride.t > dur + PAUSE_SEC) ride.t = 0;
      var p = ride.t <= 0 ? 0 : Math.min(1, ride.t / dur);
      // Мягкий старт и торможение у гостя
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      placeCourier(eased);
      map.courier.classList.toggle('is-arrived', p >= 1);
      ride.raf = window.requestAnimationFrame(rideFrame);
    }

    function syncRide() {
      var run = ride.onScreen && !document.hidden && !reduced();
      if (run && !ride.running) {
        ride.running = true;
        ride.last = 0;
        if (!ride.raf) ride.raf = window.requestAnimationFrame(rideFrame);
      } else if (!run && ride.running) {
        ride.running = false;
        if (ride.raf) window.cancelAnimationFrame(ride.raf);
        ride.raf = 0;
      }
      if (!run) {
        // Статичный кадр: курьер на середине маршрута
        placeCourier(0.5);
        map.courier.classList.remove('is-arrived');
      }
    }

    // ----- Анимация: цифры ETA -----
    var shown = null;
    var tween = 0;

    function showEta(minutes) {
      if (tween) window.cancelAnimationFrame(tween);
      tween = 0;
      if (shown === null || reduced() || !window.requestAnimationFrame) {
        shown = minutes;
        setEtaNum(String(minutes));
        return;
      }
      var from = shown;
      var t0 = 0;
      etaValue.classList.remove('is-tick');
      void etaValue.offsetWidth;
      etaValue.classList.add('is-tick');
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 420);
        var eased = 1 - Math.pow(1 - p, 3);
        shown = Math.round(from + (minutes - from) * eased);
        setEtaNum(String(shown));
        tween = p < 1 ? window.requestAnimationFrame(step) : 0;
      }
      tween = window.requestAnimationFrame(step);
    }

    var lastMode = null;

    function render(opts) {
      opts = opts || {};
      var km = state.distance;
      var minutes = GL.etaMinutes(km, state.mode, PREP_MIN);
      var kmText = km + ' км';

      distValue.textContent = kmText;
      range.setAttribute('aria-valuetext', kmText);
      range.style.setProperty('--p', ((km - MIN_KM) / (MAX_KM - MIN_KM) * 100) + '%');
      seg.style.setProperty('--seg-i', MODES.indexOf(state.mode));
      routeBox.setAttribute('data-mode', state.mode);
      renderGuide();

      var gx = guestX(km);
      var d = routePath(km);
      map.line.setAttribute('d', d);
      map.ghost.setAttribute('d', d);
      map.maskPath.setAttribute('d', d);
      map.line.setAttribute('class', 'route__line route__line--' + state.mode);
      map.gDot.setAttribute('cx', gx);
      map.gLabel.setAttribute('x', gx);

      drawLine(!!opts.draw && lastMode !== null);
      lastMode = state.mode;
      if (!ride.running) placeCourier(0.5);

      if (minutes === null) {
        setEtaNum('—');
        shown = null;
        etaLive.textContent = 'Не удалось рассчитать время';
        etaDetail.textContent = '';
        return;
      }
      var travel = minutes - PREP_MIN;
      showEta(minutes);
      etaLive.textContent = 'Примерное время доставки: ' + minutes + ' мин';
      etaDetail.textContent = 'Подготовка ' + PREP_MIN + ' мин + в пути ' + travel + ' мин (' +
        GL.MODE_LABELS[state.mode].toLowerCase() + ', ' + GL.SPEEDS[state.mode] + ' км/ч)';
    }

    render({});

    if ('IntersectionObserver' in window) {
      var firstView = true;
      new IntersectionObserver(function (entries) {
        ride.onScreen = entries[0].isIntersecting;
        if (ride.onScreen && firstView) {
          firstView = false;
          drawLine(true);
        }
        syncRide();
      }).observe(mapWrap);
    }
    document.addEventListener('visibilitychange', syncRide);
    if (motionQuery) {
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncRide);
      else if (motionQuery.addListener) motionQuery.addListener(syncRide);
    }
    syncRide();
  }

  for (var i = 0; i < roots.length; i++) setup(roots[i], i);
})();
