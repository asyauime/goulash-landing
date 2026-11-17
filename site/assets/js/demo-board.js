/*
 * demo-board.js: интерфейс демо D1 «Доска заказов» (лендинг A).
 * Классический скрипт. Вся логика в demo-logic.js (window.GL), здесь только отрисовка состояния.
 * Подключать после demo-logic.js. Если контейнера нет или нет window.GL, ничего не делает.
 *
 * Ожидаемая разметка контейнера (всё внутри [data-board] скрипт рисует сам):
 *
 *   <div class="demo demo-board" data-demo="d1" role="tabpanel" id="panel-d1" aria-labelledby="tab-d1">
 *     <div class="demo__bar">
 *       <h3 class="demo__title visually-hidden" id="d1-title">Доска заказов</h3>
 *     </div>
 *     <div class="demo__body" data-board></div>
 *   </div>
 *
 * Можно и без вкладок (role="group"). Если [data-board] нет, скрипт создаст его в конце контейнера.
 *
 * Подсказка сценария (.demo-guide): ведёт один заказ по шагам «Примите» → «Готово» →
 * «Назначьте курьера» → «В пути». Кнопка следующего шага получает класс is-next
 * (светлая кнопка и рамка карточки, без мигания). Текст подсказки в aria-live=polite
 * и обновляется только когда меняется шаг.
 *
 * Анимации (только при prefers-reduced-motion: no-preference): карточка плавно перелетает
 * между колонками (FLIP через element.animate), новая карточка «въезжает», изменившийся
 * счётчик «прыгает», назначенный курьер подсвечивается.
 *
 * Что рисует скрипт:
 *   .demo-guide: шаги (aria-hidden), текст подсказки (aria-live), кнопка «Сбросить демо»
 *   .board__toolbar: чипы фильтра по бренду (button.chip[aria-pressed]). Кнопки «Новый заказ» нет (ТЗ D1):
 *     когда действовать больше не с чем, подсказка «Начните заново» подсвечивает «Сбросить демо»
 *   .board__message[aria-live=polite]: сообщение об ошибке (например, «Нет свободных курьеров»)
 *   .board__columns > section.board__col (h4 с названием и счётчиком) > ul.board__list > li > article.order
 *     (номер, бренд с пиксельной иконкой из led.js, одно действие; у заказа в пути курьер и время)
 *   .board__couriers: курьеры строкой (огонёк, пиксельный аватар, имя и «ждёт заказ» / «в пути»)
 *   .visually-hidden[aria-live=polite]: озвучка изменений счётчиков
 */
(function () {
  'use strict';

  var GL = window.GL;
  var root = document.querySelector('[data-demo="d1"]');
  if (!root || !GL || typeof GL.initialBoardState !== 'function') return;

  var RESET_HINT = 'Все курьеры заняты. Нажмите «Сбросить демо», чтобы вернуть курьеров';
  var BRAND_ICONS = { b1: 'pot', b2: 'onion', b3: 'pancakes' };
  // Пиксельные аватары курьеров (led.js): условные головы без лиц, у каждого свой верх
  var COURIER_AVATARS = { c1: 'avatar-helmet', c2: 'avatar-bun', c3: 'avatar-beanie' };
  // Подсказки по шагам сценария (индекс = шаг)
  var GUIDE = [
    'Примите новый заказ',
    'Отметьте, что заказ готов',
    'Назначьте курьера: система выберет ближайшего',
    'Готово: заказ в пути'
  ];
  var GUIDE_RESTART = 'Начните заново';
  var GUIDE_NO_COURIER = 'Все курьеры в пути: сбросьте демо';
  // Типограф из main.js: строки сравниваем в том же виде, в каком они стоят в DOM
  var typo = window.GLTypo && window.GLTypo.text ? window.GLTypo.text : function (s) { return s; };
  var STEP_BY_STATUS = { new: 0, cooking: 1, ready: 2, enroute: 3 };

  var state = GL.initialBoardState();
  var brandFilter = 'all';
  var prevCounts = null;
  var highlightCourier = null;
  var tracked = null; // заказ, который ведёт подсказка
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function canAnimate() {
    return !(motionQuery && motionQuery.matches) && typeof Element !== 'undefined' &&
      typeof Element.prototype.animate === 'function';
  }

  // ---------- Вспомогательные функции ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function brandName(id) {
    var list = GL.DEMO_BRANDS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id;
  }

  function courierById(id) {
    var list = state.couriers || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function orderById(id) {
    for (var i = 0; i < state.orders.length; i++) if (state.orders[i].id === id) return state.orders[i];
    return null;
  }

  function orderNumber(id) {
    return '№' + String(id).replace(/^o/, '');
  }

  function countsText() {
    var counts = GL.boardCounts(state, brandFilter);
    return GL.STATUSES.map(function (s) {
      return GL.STATUS_LABELS[s] + ': ' + counts[s];
    }).join(', ');
  }

  function pixelIcon(brand, className) {
    var box = el('span', className);
    box.setAttribute('aria-hidden', 'true');
    if (window.GLPixel && BRAND_ICONS[brand]) {
      var svg = window.GLPixel.svg(BRAND_ICONS[brand]);
      if (svg) box.appendChild(svg);
    }
    return box;
  }

  // Аватар курьера: только картинка (aria-hidden), имя рядом текстом
  function courierAvatar(id) {
    var box = el('span', 'courier-avatar');
    box.setAttribute('aria-hidden', 'true');
    if (window.GLPixel && COURIER_AVATARS[id]) {
      var svg = window.GLPixel.svg(COURIER_AVATARS[id], { off: true });
      if (svg) box.appendChild(svg);
    }
    return box;
  }

  // ---------- Каркас ----------

  var mount = root.querySelector('[data-board]');
  if (!mount) {
    mount = el('div');
    mount.setAttribute('data-board', '');
    root.appendChild(mount);
  }
  mount.classList.add('board');

  // Подсказка следующего шага
  var guide = el('div', 'demo-guide');
  var guideSteps = el('span', 'demo-guide__steps');
  guideSteps.setAttribute('aria-hidden', 'true');
  for (var gs = 0; gs < 3; gs++) guideSteps.appendChild(el('span', 'demo-guide__step'));
  var guideText = el('p', 'demo-guide__text');
  guideText.setAttribute('aria-live', 'polite');
  var resetBtn = el('button', 'btn btn--ghost btn--sm demo-guide__reset', 'Сбросить демо');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', onReset);
  guide.appendChild(guideSteps);
  guide.appendChild(guideText);
  guide.appendChild(resetBtn);

  var toolbar = el('div', 'board__toolbar');

  var chips = el('div', 'chips chips--quiet board__filter');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Фильтр по бренду');
  var filterOptions = [{ id: 'all', name: 'Все' }].concat(GL.DEMO_BRANDS || []);
  var chipButtons = filterOptions.map(function (opt) {
    var b = el('button', 'chip', opt.name);
    b.type = 'button';
    b.setAttribute('data-brand', opt.id);
    b.setAttribute('aria-pressed', opt.id === brandFilter ? 'true' : 'false');
    b.addEventListener('click', function () { setFilter(opt.id); });
    chips.appendChild(b);
    return b;
  });

  toolbar.appendChild(chips);

  var message = el('p', 'board__message');
  message.setAttribute('aria-live', 'polite');

  var columns = el('div', 'board__columns');

  var couriersBox = el('div', 'board__couriers');
  var couriersTitle = el('p', 'board__couriers-title', 'Курьеры');
  couriersTitle.id = 'd1-couriers-title';
  var couriersList = el('ul', 'board__courier-list');
  couriersList.setAttribute('aria-labelledby', couriersTitle.id);
  couriersBox.appendChild(couriersTitle);
  couriersBox.appendChild(couriersList);

  var announcer = el('p', 'visually-hidden');
  announcer.setAttribute('aria-live', 'polite');

  mount.appendChild(guide);
  mount.appendChild(toolbar);
  mount.appendChild(message);
  mount.appendChild(columns);
  mount.appendChild(couriersBox);
  mount.appendChild(announcer);

  // ---------- Подсказка ----------

  // Какой заказ ведёт подсказка: тот, с которым работали последним (если он виден),
  // иначе первый видимый новый, затем готовящийся, затем готовый.
  function guideOrder() {
    var visible = GL.filterOrders(state, brandFilter);
    var i;
    if (tracked) {
      for (i = 0; i < visible.length; i++) if (visible[i].id === tracked) return visible[i];
    }
    var order = ['new', 'cooking', 'ready'];
    for (var s = 0; s < order.length; s++) {
      for (i = 0; i < visible.length; i++) if (visible[i].status === order[s]) return visible[i];
    }
    return null;
  }

  function renderGuide() {
    var target = guideOrder();
    var step = target ? STEP_BY_STATUS[target.status] : -1;
    // Заказ доехал: следующий шаг — первый заказ, с которым ещё можно что-то сделать
    if (step === 3) {
      target = null;
      var vis = GL.filterOrders(state, brandFilter);
      var order = ['new', 'cooking', 'ready'];
      for (var s = 0; s < order.length && !target; s++) {
        for (var i = 0; i < vis.length; i++) if (vis[i].status === order[s]) { target = vis[i]; break; }
      }
    }
    // Заказ готов, но свободных курьеров нет: ведём к «Сбросить демо», а не в тупик
    var noCourier = !!target && target.status === 'ready' &&
      !(state.couriers || []).some(function (c) { return c.free; });
    // Действовать больше не с чем (кнопки «Новый заказ» нет): «Начните заново» и подсветка сброса
    var restart = !noCourier && !target;
    var text = typo(noCourier ? GUIDE_NO_COURIER : (restart ? GUIDE_RESTART : GUIDE[step]));
    // Текст меняем только при смене шага, чтобы диктор не повторял одно и то же
    if (guideText.textContent !== text) guideText.textContent = text;
    Array.prototype.forEach.call(guideSteps.children, function (dot, i) {
      dot.classList.toggle('is-done', step > i || step === 3);
      dot.classList.toggle('is-now', step === i);
    });
    guide.classList.toggle('is-complete', step === 3 && !restart);

    Array.prototype.forEach.call(columns.querySelectorAll('.is-next'), function (n) { n.classList.remove('is-next'); });
    resetBtn.classList.toggle('is-next', noCourier || restart);
    if (noCourier || restart) return;
    var card = columns.querySelector('[data-order="' + target.id + '"]');
    if (!card) return;
    card.classList.add('is-next');
    var btn = card.querySelector('.order__action');
    if (btn) {
      btn.classList.add('is-next');
      btn.classList.remove('btn--ghost');
      btn.classList.add('btn--primary');
    }
  }

  // ---------- Отрисовка ----------

  function renderCouriers() {
    couriersList.textContent = '';
    (state.couriers || []).forEach(function (c) {
      var li = el('li', 'board__courier' + (c.free ? ' is-free' : ' is-busy') +
        (c.id === highlightCourier ? ' is-assigned' : ''));
      var lamp = el('span', 'board__courier-lamp');
      lamp.setAttribute('aria-hidden', 'true');
      li.appendChild(lamp);
      li.appendChild(courierAvatar(c.id));
      li.appendChild(el('span', 'board__courier-name', c.name));
      li.appendChild(el('span', 'board__courier-status', c.free ? 'ждёт заказ' : 'в пути'));
      couriersList.appendChild(li);
    });
  }

  function actionFor(order) {
    if (order.status === 'new') return { label: 'Принять', kind: 'advance' };
    if (order.status === 'cooking') return { label: 'Готово', kind: 'advance' };
    if (order.status === 'ready') return { label: 'Назначить курьера', kind: 'assign' };
    return null;
  }

  function renderOrder(order) {
    var card = el('article', 'order');
    card.setAttribute('data-order', order.id);
    card.setAttribute('data-brand', order.brand);
    card.tabIndex = -1;
    var titleId = 'd1-order-' + order.id;
    card.setAttribute('aria-labelledby', titleId);

    var head = el('p', 'order__title');
    head.id = titleId;
    var num = el('span', 'order__num');
    num.appendChild(el('span', 'visually-hidden', 'Заказ '));
    num.appendChild(document.createTextNode(orderNumber(order.id)));
    head.appendChild(num);
    var brand = el('span', 'order__brand');
    brand.appendChild(pixelIcon(order.brand, 'order__icon'));
    brand.appendChild(document.createTextNode(brandName(order.brand)));
    head.appendChild(brand);
    card.appendChild(head);

    if (order.status === 'enroute') {
      var courier = courierById(order.courierId);
      var info = (courier ? courier.name : 'Курьер');
      if (order.eta !== null && order.eta !== undefined) info += ', ' + order.eta + ' мин';
      var who = el('p', 'order__courier');
      if (courier) who.appendChild(courierAvatar(courier.id));
      who.appendChild(document.createTextNode(info));
      card.appendChild(who);
      var track = el('span', 'order__track');
      track.setAttribute('aria-hidden', 'true');
      card.appendChild(track);
    }

    var action = actionFor(order);
    if (action) {
      var btn = el('button', 'btn btn--ghost btn--sm order__action', action.label);
      btn.type = 'button';
      btn.setAttribute('data-action', action.kind);
      btn.setAttribute('data-id', order.id);
      btn.setAttribute('aria-describedby', titleId);
      card.appendChild(btn);
    }
    return card;
  }

  function renderColumns() {
    var visible = GL.filterOrders(state, brandFilter);
    var counts = GL.boardCounts(state, brandFilter);
    columns.textContent = '';
    GL.STATUSES.forEach(function (status) {
      var col = el('section', 'board__col');
      col.setAttribute('data-status', status);
      var headId = 'd1-col-' + status;
      col.setAttribute('aria-labelledby', headId);
      var h = el('h4', 'board__col-title');
      h.id = headId;
      h.appendChild(el('span', null, GL.STATUS_LABELS[status]));
      var count = el('span', 'board__count', String(counts[status]));
      // Цифра счётчика LED-шрифтом (led.js); для диктора число остаётся текстом
      if (window.GLLed) {
        count.textContent = '';
        count.appendChild(el('span', 'visually-hidden', String(counts[status])));
        var countLed = el('span', 'led-text');
        countLed.setAttribute('aria-hidden', 'true');
        window.GLLed.set(countLed, String(counts[status]));
        count.appendChild(countLed);
      }
      if (prevCounts && prevCounts[status] !== counts[status]) {
        count.classList.add(counts[status] > prevCounts[status] ? 'is-up' : 'is-down');
      }
      h.appendChild(count);
      col.appendChild(h);

      var items = visible.filter(function (o) { return o.status === status; });
      if (!items.length) {
        col.appendChild(el('p', 'board__empty', 'Нет заказов'));
      } else {
        var ul = el('ul', 'board__list');
        items.forEach(function (o) {
          var li = el('li');
          li.appendChild(renderOrder(o));
          ul.appendChild(li);
        });
        col.appendChild(ul);
      }
      columns.appendChild(col);
    });
    prevCounts = counts;
  }

  // ---------- FLIP: карточки перелетают на новое место ----------

  function snapshot() {
    var rects = {};
    Array.prototype.forEach.call(columns.querySelectorAll('[data-order]'), function (card) {
      var r = card.getBoundingClientRect();
      rects[card.getAttribute('data-order')] = { left: r.left, top: r.top, status: card.closest('[data-status]').getAttribute('data-status') };
    });
    return rects;
  }

  function play(before, opts) {
    if (!before || !canAnimate() || root.hidden) return;
    opts = opts || {};
    var entering = 0;
    Array.prototype.forEach.call(columns.querySelectorAll('[data-order]'), function (card) {
      var id = card.getAttribute('data-order');
      var was = before[id];
      if (!was) {
        // Новая или снова показанная фильтром карточка «въезжает» сверху
        card.animate([
          { opacity: 0, transform: 'translateY(-18px) scale(0.96)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 420, delay: Math.min(entering++, 6) * 45, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'backwards' });
        if (opts.added === id) card.classList.add('is-new');
        return;
      }
      var r = card.getBoundingClientRect();
      var dx = was.left - r.left;
      var dy = was.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      var moved = was.status !== card.closest('[data-status]').getAttribute('data-status');
      card.classList.add('is-flying');
      var anim = card.animate([
        { transform: 'translate(' + dx + 'px, ' + dy + 'px)' + (moved ? ' scale(1.03)' : '') },
        { transform: 'none' }
      ], { duration: moved ? 560 : 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      anim.onfinish = anim.oncancel = function () {
        card.classList.remove('is-flying');
        if (moved) card.classList.add('is-landed');
      };
    });
  }

  function render(opts) {
    var before = opts && opts.initial ? null : snapshot();
    chipButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-brand') === brandFilter ? 'true' : 'false');
    });
    renderCouriers();
    renderColumns();
    renderGuide();
    play(before, opts);
    highlightCourier = null;
  }

  // После перерисовки ставим фокус на кнопку следующего действия карточки,
  // а если её нет (заказ «В пути»), на саму карточку.
  function focusOrder(id) {
    var card = columns.querySelector('[data-order="' + id + '"]');
    if (!card) return;
    var btn = card.querySelector('.order__action');
    (btn || card).focus();
  }

  var messageTimer = null;

  function setMessage(text, isError) {
    // Новое сообщение или сброс отменяет отложенный повтор предыдущего.
    if (messageTimer) {
      window.clearTimeout(messageTimer);
      messageTimer = null;
    }
    text = typo(text || '');
    message.classList.toggle('is-error', !!isError);
    // Повторное то же сообщение: очищаем и ставим заново, чтобы экранный диктор прочитал его ещё раз.
    if (text && message.textContent === text) {
      message.textContent = '';
      messageTimer = window.setTimeout(function () {
        messageTimer = null;
        message.textContent = text;
      }, 50);
      return;
    }
    message.textContent = text || '';
  }

  function announce(text) {
    announcer.textContent = text;
  }

  // ---------- Действия ----------

  function setFilter(id) {
    brandFilter = id;
    setMessage('');
    render();
    var label = id === 'all' ? 'все бренды' : brandName(id);
    announce('Показаны: ' + label + '. ' + countsText());
  }

  function onReset() {
    state = GL.initialBoardState();
    brandFilter = 'all';
    prevCounts = null;
    tracked = null;
    setMessage('');
    render();
    announce('Демо сброшено. ' + countsText());
  }

  columns.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button[data-action]') : null;
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var kind = btn.getAttribute('data-action');

    if (kind === 'advance') {
      var next = GL.advanceOrder(state, id);
      if (next === state) return;
      state = next;
      tracked = id;
      setMessage('');
      render();
      focusOrder(id);
      announce('Заказ ' + orderNumber(id) + ' перенесён. ' + countsText());
      return;
    }

    if (kind === 'assign') {
      var result = GL.assignCourier(state, id);
      if (result.error) {
        var text = GL.ERROR_MESSAGES[result.error] || GL.ERROR_MESSAGES.not_found;
        if (result.error === 'no_courier') text += '. ' + RESET_HINT;
        setMessage(text, true);
        btn.focus();
        return;
      }
      state = result.state;
      tracked = id;
      var order = orderById(id);
      highlightCourier = order ? order.courierId : null;
      setMessage('');
      render();
      focusOrder(id);
      var courier = order ? courierById(order.courierId) : null;
      announce('Заказ ' + orderNumber(id) + ' в пути' + (courier ? ', курьер ' + courier.name : '') +
        (order && order.eta !== null ? ', время доставки ' + order.eta + ' мин' : '') + '. ' + countsText());
    }
  });

  render({ initial: true });
})();
