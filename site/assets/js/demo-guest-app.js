/*
 * demo-guest-app.js: интерфейс демо D4 «Приложение гостя» (блок «Своя доставка»).
 * Классический скрипт. Позиции и цены вымышлены, это только интерфейс: у кнопок «+» и «−»,
 * корзины и статусов нет серверной части. Подключать после main.js.
 * Если контейнера [data-demo="d4"] нет, ничего не делает.
 *
 * Разметка: div[data-demo="d4"] > div.demo__body[data-guest-app]. Всё внутри скрипт рисует сам:
 *   .demo-guide (подсказка шага в aria-live, «Сбросить демо»), рамка телефона .phone с меню из 6 позиций
 *   (кнопки «−» и «+»), строка итога, кнопка «Оформить» (неактивна при пустой корзине) и шаги
 *   «Принят → Готовится → Курьер в пути → Доставлен» по 2 секунды. После «Доставлен»
 *   показывается начисление бонусов в демо-размере 5% от суммы заказа.
 * Сброс в любой момент гасит таймеры и возвращает пустую корзину.
 * reduced-motion: статусы идут тем же темпом, но без анимации (она только в CSS).
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-demo="d4"]');
  if (!root) return;

  var NBSP = ' ';
  var STEP_MS = 2000;
  var BONUS_PCT = 5;

  // Демо-данные: вымышленное меню заведения со своей доставкой
  var ITEMS = [
    { id: 'g1', name: 'Пицца «Маргарита»', price: 590 },
    { id: 'g2', name: 'Паста карбонара', price: 520 },
    { id: 'g3', name: 'Ролл с лососем', price: 480 },
    { id: 'g4', name: 'Суп том-ям', price: 450 },
    { id: 'g5', name: 'Салат «Цезарь»', price: 390 },
    { id: 'g6', name: 'Тирамису', price: 320 }
  ];
  var STEPS = ['Принят', 'Готовится', 'Курьер в пути', 'Доставлен'];

  var qty = {};
  var stage = -1;      // -1: заказ не оформлен, 0..3: текущий статус
  var delivered = false;
  var timers = [];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function rub(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + NBSP + '₽';
  }

  function count() {
    return ITEMS.reduce(function (s, i) { return s + (qty[i.id] || 0); }, 0);
  }

  function total() {
    return ITEMS.reduce(function (s, i) { return s + (qty[i.id] || 0) * i.price; }, 0);
  }

  function locked() { return stage >= 0; }

  var mount = root.querySelector('[data-guest-app]');
  if (!mount) {
    mount = el('div');
    mount.setAttribute('data-guest-app', '');
    root.appendChild(mount);
  }
  mount.classList.add('guestapp');

  // Подсказка и сброс
  var guide = el('div', 'demo-guide');
  var guideText = el('p', 'demo-guide__text');
  guideText.setAttribute('aria-live', 'polite');
  var resetBtn = el('button', 'btn btn--ghost btn--sm demo-guide__reset', 'Сбросить демо');
  resetBtn.type = 'button';
  guide.appendChild(guideText);
  guide.appendChild(resetBtn);

  // Телефон
  var phone = el('div', 'phone guestapp__phone');
  phone.appendChild(el('span', 'phone__notch'));
  phone.querySelector('.phone__notch').setAttribute('aria-hidden', 'true');
  var title = el('h4', 'guestapp__title', 'Меню');
  title.id = 'd4-menu-title';
  phone.appendChild(title);

  var menuList = el('ul', 'guest-menu guestapp__menu');
  menuList.setAttribute('aria-labelledby', 'd4-menu-title');
  var minusBtns = {};
  var plusBtns = {};
  var outs = {};

  ITEMS.forEach(function (item) {
    var li = el('li', 'guest-item guestapp__item');
    var info = el('span', 'guest-item__info');
    info.appendChild(el('span', 'guest-item__name', item.name));
    info.appendChild(el('span', 'guestapp__price', rub(item.price)));

    var ctl = el('span', 'guestapp__qty');
    var minus = el('button', 'guestapp__step', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Убрать: ' + item.name);
    var out = el('output', 'guestapp__count', '0');
    out.setAttribute('aria-label', 'Количество: ' + item.name);
    var plus = el('button', 'guestapp__step', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Добавить: ' + item.name);

    minus.addEventListener('click', function () {
      qty[item.id] = Math.max(0, (qty[item.id] || 0) - 1);
      update();
    });
    plus.addEventListener('click', function () {
      qty[item.id] = (qty[item.id] || 0) + 1;
      update();
    });

    ctl.appendChild(minus);
    ctl.appendChild(out);
    ctl.appendChild(plus);
    li.appendChild(info);
    li.appendChild(ctl);
    menuList.appendChild(li);
    minusBtns[item.id] = minus;
    plusBtns[item.id] = plus;
    outs[item.id] = out;
  });
  phone.appendChild(menuList);

  // Корзина и кнопка
  var cart = el('div', 'guestapp__cart');
  var cartLine = el('p', 'guestapp__total');
  cartLine.appendChild(el('span', null, 'Итого'));
  var totalOut = el('output', 'guestapp__sum', rub(0));
  totalOut.setAttribute('aria-label', 'Итого');
  cartLine.appendChild(totalOut);
  var orderBtn = el('button', 'btn btn--primary guestapp__order', 'Оформить');
  orderBtn.type = 'button';
  cart.appendChild(cartLine);
  cart.appendChild(orderBtn);
  phone.appendChild(cart);

  // Статусы заказа
  var progress = el('ol', 'guestapp__progress');
  progress.setAttribute('aria-label', 'Статус заказа');
  progress.hidden = true;
  STEPS.forEach(function (s) {
    var li = el('li', 'guestapp__status');
    var mark = el('span', 'guestapp__mark');
    mark.setAttribute('aria-hidden', 'true');
    li.appendChild(mark);
    li.appendChild(el('span', 'guestapp__status-text', s));
    progress.appendChild(li);
  });
  var summary = el('p', 'guestapp__summary');
  summary.hidden = true;
  var bonus = el('p', 'guestapp__bonus');
  bonus.hidden = true;
  phone.appendChild(summary);
  phone.appendChild(progress);
  phone.appendChild(bonus);

  mount.appendChild(guide);
  mount.appendChild(phone);

  function guideMessage() {
    if (stage >= 0) {
      return delivered ? 'Заказ доставлен. Можно собрать новый или сбросить демо' : 'Статус заказа: ' + STEPS[stage];
    }
    return count() === 0 ? 'Добавьте блюда в корзину' : 'Нажмите «Оформить»';
  }

  var lastGuide = '';
  function setGuide() {
    var text = guideMessage();
    if (text !== lastGuide) {
      guideText.textContent = text;
      lastGuide = text;
    }
    guide.classList.toggle('is-complete', delivered);
  }

  function update() {
    var lock = locked();
    title.hidden = lock;
    menuList.hidden = lock;
    cart.hidden = lock;
    ITEMS.forEach(function (item) {
      var q = qty[item.id] || 0;
      outs[item.id].textContent = String(q);
      minusBtns[item.id].disabled = lock || q === 0;
      plusBtns[item.id].disabled = lock;
    });
    totalOut.textContent = rub(total());
    orderBtn.disabled = lock || count() === 0;
    orderBtn.classList.toggle('is-next', !lock && count() > 0);
    setGuide();
  }

  function renderProgress() {
    progress.hidden = stage < 0;
    var items = progress.children;
    for (var i = 0; i < items.length; i++) {
      var done = i < stage || (delivered && i === stage);
      items[i].classList.toggle('is-done', done);
      items[i].classList.toggle('is-now', !delivered && i === stage);
      if (i === stage && !delivered) items[i].setAttribute('aria-current', 'step');
      else items[i].removeAttribute('aria-current');
    }
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  orderBtn.addEventListener('click', function () {
    if (orderBtn.disabled) return;
    stage = 0;
    delivered = false;
    bonus.hidden = true;
    summary.textContent = 'Ваш заказ на ' + rub(total());
    summary.hidden = false;
    renderProgress();
    update();
    STEPS.forEach(function (name, idx) {
      if (idx === 0) return;
      timers.push(setTimeout(function () {
        stage = idx;
        delivered = idx === STEPS.length - 1;
        renderProgress();
        if (delivered) {
          bonus.textContent = 'Начислено бонусов: ' + Math.round(total() * BONUS_PCT / 100) + ' (демо)';
          bonus.hidden = false;
        }
        update();
      }, idx * STEP_MS));
    });
  });

  resetBtn.addEventListener('click', function () {
    clearTimers();
    qty = {};
    stage = -1;
    delivered = false;
    bonus.hidden = true;
    summary.hidden = true;
    renderProgress();
    update();
  });

  renderProgress();
  update();
})();
