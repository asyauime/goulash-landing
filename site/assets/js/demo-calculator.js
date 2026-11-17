/*
 * demo-calculator.js: интерфейс демо D5 «Комиссии агрегаторов» (блок «Своя доставка»).
 * Классический скрипт. Формулы в demo-logic.js (window.GL.commissionSavings), здесь только отрисовка.
 * Подключать после demo-logic.js. Если контейнера нет или нет window.GL, ничего не делает.
 *
 * Разметка: div[data-demo="d5"] > div.demo__body[data-calculator]. Всё внутри скрипт рисует сам:
 *   .demo-guide (подсказка, «Сбросить демо»), пять ползунков (.calc__field) и итог (.calc__result):
 *   «Комиссии сейчас», «После перевода», «Разница в месяц», оговорка.
 * Числа с %, ₽ рисует скрипт (в статичном HTML их нет, AC-08).
 * Изменение объявляется через aria-live=polite один раз, когда ползунок отпущен (событие change).
 */
(function () {
  'use strict';

  var GL = window.GL;
  var root = document.querySelector('[data-demo="d5"]');
  if (!root || !GL || typeof GL.commissionSavings !== 'function') return;

  var NBSP = ' ';

  var FIELDS = [
    { id: 'orders', label: 'Заказов в месяц', min: 300, max: 5000, step: 100, def: 1500, unit: '' },
    { id: 'check', label: 'Средний чек', min: 400, max: 2500, step: 50, def: 900, unit: 'rub' },
    { id: 'share', label: 'Доля заказов через агрегаторы', min: 0, max: 100, step: 5, def: 60, unit: 'pct' },
    { id: 'commission', label: 'Комиссия агрегатора', min: 10, max: 40, step: 1, def: 25, unit: 'pct' },
    { id: 'shift', label: 'Доля, которую удаётся перевести в свой канал', min: 0, max: 100, step: 5, def: 30, unit: 'pct' }
  ];

  var DISCLAIMER = 'Иллюстрация по вашим допущениям. Не учитывает стоимость собственного канала и не является обещанием результата';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fmtNumber(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }

  function fmt(unit, v) {
    if (unit === 'rub') return fmtNumber(v) + NBSP + '₽';
    if (unit === 'pct') return v + NBSP + '%';
    return fmtNumber(v);
  }

  var mount = root.querySelector('[data-calculator]');
  if (!mount) {
    mount = el('div');
    mount.setAttribute('data-calculator', '');
    root.appendChild(mount);
  }
  mount.classList.add('calc');

  // Подсказка и сброс
  var guide = el('div', 'demo-guide');
  var guideText = el('p', 'demo-guide__text', 'Подвигайте ползунки: разница пересчитается сразу');
  var resetBtn = el('button', 'btn btn--ghost btn--sm demo-guide__reset', 'Сбросить демо');
  resetBtn.type = 'button';
  guide.appendChild(guideText);
  guide.appendChild(resetBtn);

  var body = el('div', 'calc__body');
  var fieldsBox = el('div', 'calc__fields');
  var inputs = {};
  var outs = {};

  FIELDS.forEach(function (f) {
    var wrap = el('div', 'calc__field');
    var head = el('div', 'calc__field-head');
    var label = el('label', 'calc__label', f.label);
    var inputId = 'calc-' + f.id;
    label.setAttribute('for', inputId);
    var out = el('output', 'calc__value');
    out.setAttribute('for', inputId);
    head.appendChild(label);
    head.appendChild(out);

    var input = el('input', 'route__range calc__range');
    input.type = 'range';
    input.id = inputId;
    input.min = String(f.min);
    input.max = String(f.max);
    input.step = String(f.step);
    input.value = String(f.def);

    var scale = el('div', 'route__scale');
    scale.setAttribute('aria-hidden', 'true');
    scale.appendChild(el('span', null, fmt(f.unit, f.min)));
    scale.appendChild(el('span', null, fmt(f.unit, f.max)));

    wrap.appendChild(head);
    wrap.appendChild(input);
    wrap.appendChild(scale);
    fieldsBox.appendChild(wrap);
    inputs[f.id] = input;
    outs[f.id] = out;
  });

  var result = el('div', 'calc__result');
  var rows = {};
  [
    { id: 'current', label: 'Комиссии сейчас', big: false },
    { id: 'after', label: 'После перевода', big: false },
    { id: 'savings', label: 'Разница в месяц', big: true }
  ].forEach(function (r) {
    var row = el('div', 'calc__row' + (r.big ? ' calc__row--big' : ''));
    row.appendChild(el('span', 'calc__row-label', r.label));
    var val = el('span', 'calc__row-value');
    row.appendChild(val);
    result.appendChild(row);
    rows[r.id] = val;
  });
  result.appendChild(el('p', 'calc__note', DISCLAIMER));

  var live = el('p', 'visually-hidden');
  live.setAttribute('aria-live', 'polite');

  body.appendChild(fieldsBox);
  body.appendChild(result);
  mount.appendChild(guide);
  mount.appendChild(body);
  mount.appendChild(live);

  function value(id) { return Number(inputs[id].value); }

  function update() {
    FIELDS.forEach(function (f) {
      var v = value(f.id);
      var text = fmt(f.unit, v);
      outs[f.id].textContent = text;
      inputs[f.id].setAttribute('aria-valuetext', text);
      inputs[f.id].style.setProperty('--p', ((v - f.min) / (f.max - f.min) * 100) + '%');
    });
    var r = GL.commissionSavings({
      ordersPerMonth: value('orders'),
      avgCheck: value('check'),
      aggregatorSharePct: value('share'),
      commissionPct: value('commission'),
      shiftPct: value('shift')
    });
    rows.current.textContent = fmt('rub', r.currentCommission);
    rows.after.textContent = fmt('rub', r.afterCommission);
    rows.savings.textContent = fmt('rub', r.savings);
    return r;
  }

  FIELDS.forEach(function (f) {
    inputs[f.id].addEventListener('input', update);
    inputs[f.id].addEventListener('change', function () {
      var r = update();
      live.textContent = 'Разница в месяц: ' + fmt('rub', r.savings);
    });
  });

  resetBtn.addEventListener('click', function () {
    FIELDS.forEach(function (f) { inputs[f.id].value = String(f.def); });
    update();
    live.textContent = 'Демо сброшено';
  });

  update();
})();
