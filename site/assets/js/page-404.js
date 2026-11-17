/*
 * page-404.js: страница «не найдено». Классический скрипт, нужен led.js (window.GLDots, window.GLLed).
 * Голубые точки снова и снова пытаются собраться в LED-цифры «404»: почти собираются,
 * дрожат и рассыпаются; каждая третья попытка удаётся, цифры держатся и снова рассыпаются.
 * Только графика (canvas aria-hidden), смысл передают h1 и текст.
 * prefers-reduced-motion: цифры собраны и неподвижны. Скрытая вкладка: rAF сам на паузе.
 */
(function () {
  'use strict';
  var canvas = document.querySelector('[data-404-dots]');
  if (!canvas || !canvas.getContext || !window.GLDots || !window.GLLed || !window.GLLed.font) return;
  var clamp = window.GLDots.clamp;
  var F = window.GLLed.font;

  // «4 0 4» из LED-шрифта 5×7 с колонкой зазора между цифрами
  var rows = F['4'].map(function (r, i) { return r + '.' + F['0'][i] + '.' + F['4'][i]; });
  var fx = window.GLDots.create(canvas, { rows: rows, size: 2, fitW: 0.86, fitH: 0.42, dy: -0.14 });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // фазы одной попытки, мс
  var GATHER = 1400, HOLD_TRY = 700, HOLD_OK = 1600, FALL = 900, REST = 300;
  var attempt = 0, phase = 'gather', phaseStart = 0, gFrom = 0, g = 0;

  function success() { return attempt % 3 === 2; }

  function tick(now) {
    if (!phaseStart) phaseStart = now;
    var f = now - phaseStart, target = success() ? 1 : 0.85, jitter = 0, alpha = 1;
    if (phase === 'gather') {
      g = target * clamp(f / GATHER);
      if (f >= GATHER) { phase = 'hold'; phaseStart = now; }
    } else if (phase === 'hold') {
      if (success()) g = 1;
      else { g = target + Math.sin(f / 60) * 0.03; jitter = 1.6; }  // почти получилось: дрожат
      if (f >= (success() ? HOLD_OK : HOLD_TRY)) { phase = 'fall'; phaseStart = now; gFrom = g; }
    } else if (phase === 'fall') {
      g = gFrom * (1 - clamp(f / FALL));
      if (f >= FALL) { phase = 'rest'; phaseStart = now; }
    } else {
      g = 0;
      if (f >= REST) { attempt++; fx.scatter(); phase = 'gather'; phaseStart = now; }
    }
    alpha = clamp(g / 0.12);   // в начале и в конце попытки точки погашены: перестановка не видна
    fx.draw(g, 0, alpha, jitter);
    window.requestAnimationFrame(tick);
  }

  function still() { fx.build(); fx.draw(1, 0, 1); }

  function start() {
    fx.build();
    if (reduce.matches) { still(); return; }
    window.requestAnimationFrame(tick);
  }
  window.addEventListener('resize', function () { if (reduce.matches) still(); else fx.build(); });
  start();
})();
