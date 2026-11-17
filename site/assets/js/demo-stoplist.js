/*
 * demo-stoplist.js: интерфейс демо D2 «Стоп-лист и меню гостя» (лендинг A).
 * Классический скрипт. Вся логика в demo-logic.js (window.GL: initialMenu, toggleStop,
 * guestMenu, DEMO_BRANDS), здесь только отрисовка состояния.
 * Подключать после demo-logic.js. Если контейнера нет или нет window.GL, ничего не делает.
 *
 * Ожидаемая разметка контейнера (всё внутри [data-stoplist] скрипт рисует сам):
 *
 *   <div class="demo demo-stoplist" data-demo="d2" role="tabpanel" id="panel-d2" aria-labelledby="tab-d2">
 *     <div class="demo__bar">
 *       <h3 class="demo__title visually-hidden" id="d2-title">Стоп-лист и меню гостя</h3>
 *     </div>
 *     <div class="demo__body" data-stoplist></div>
 *   </div>
 *
 * Можно и без вкладок (role="group"). Если [data-stoplist] нет, скрипт создаст его в конце контейнера.
 *
 * Пара «кухня → гость»: слева переключатели кухни, справа телефон гостя, между ними стрелка.
 * Меню гостя при переключении не перерисовывается: строка меняет классы, и CSS плавно гасит
 * позицию в «Нет в наличии» и обратно.
 *
 * Подсказка сценария (.demo-guide): «Поставьте позицию в стоп» (подсвечена строка с тумблером) →
 * «Посмотрите: у гостя она исчезла из продажи» (подсвечена та же позиция в телефоне).
 * Текст в aria-live=polite и меняется только при смене шага.
 *
 * Что рисует скрипт:
 *   .demo-guide: шаги (aria-hidden), текст подсказки (aria-live), кнопка «Сбросить демо»
 *   .stoplist__panes > section.stoplist__pane--admin: «Стоп-лист кухни», группы по брендам,
 *       в каждой ul > li > label.stop-toggle с input[type=checkbox][role=switch]
 *   span.stoplist__arrow (aria-hidden)
 *   .stoplist__panes > section.stoplist__pane--guest (.phone): «Меню гостя», ul.guest-menu >
 *       li.guest-item (.is-stop, если в стопе): иконка бренда, название, кнопка «В корзину».
 *       У позиции в стопе кнопка неактивна (disabled) и с надписью «Нет в наличии»; ширина
 *       кнопки всегда под длинную надпись (скрытый образец в той же ячейке), строка не прыгает
 *   .visually-hidden[aria-live=polite]: озвучка изменений («Позиция X: нет в наличии»)
 */
(function () {
  'use strict';

  // Типограф из main.js: строки сравниваем в том же виде, в каком они стоят в DOM
  var typo = window.GLTypo && window.GLTypo.text ? window.GLTypo.text : function (s) { return s; };

  var GL = window.GL;
  var root = document.querySelector('[data-demo="d2"]');
  if (!root || !GL || typeof GL.initialMenu !== 'function' ||
      typeof GL.toggleStop !== 'function' || typeof GL.guestMenu !== 'function') return;

  var BRAND_ICONS = { b1: 'pot', b2: 'onion', b3: 'pancakes' };
  var GUIDE = [
    'Поставьте позицию в стоп',
    'Посмотрите: у гостя она исчезла из продажи'
  ];

  var menu = GL.initialMenu();
  var brands = GL.DEMO_BRANDS || [];
  var tracked = null; // позиция, которую ведёт подсказка

  // ---------- Вспомогательные функции ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function findItem(id) {
    for (var i = 0; i < menu.length; i++) if (menu[i].id === id) return menu[i];
    return null;
  }

  function stopCount() {
    return menu.filter(function (m) { return m.stop; }).length;
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

  // ---------- Каркас ----------

  var mount = root.querySelector('[data-stoplist]');
  if (!mount) {
    mount = el('div');
    mount.setAttribute('data-stoplist', '');
    root.appendChild(mount);
  }
  mount.classList.add('stoplist');

  // Подсказка следующего шага
  var guide = el('div', 'demo-guide');
  var guideSteps = el('span', 'demo-guide__steps');
  guideSteps.setAttribute('aria-hidden', 'true');
  for (var gs = 0; gs < GUIDE.length; gs++) guideSteps.appendChild(el('span', 'demo-guide__step'));
  var guideText = el('p', 'demo-guide__text');
  guideText.setAttribute('aria-live', 'polite');
  var resetBtn = el('button', 'btn btn--ghost btn--sm demo-guide__reset', 'Сбросить демо');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', onReset);
  guide.appendChild(guideSteps);
  guide.appendChild(guideText);
  guide.appendChild(resetBtn);

  var panes = el('div', 'stoplist__panes');

  // Левая часть: стоп-лист кухни (строится один раз, дальше меняется только состояние)
  var admin = el('section', 'stoplist__pane stoplist__pane--admin');
  admin.setAttribute('aria-labelledby', 'd2-admin-title');
  var adminTitle = el('h4', 'stoplist__pane-title', 'Стоп-лист кухни');
  adminTitle.id = 'd2-admin-title';
  admin.appendChild(adminTitle);

  var switches = {};
  brands.forEach(function (b) {
    var items = menu.filter(function (m) { return m.brand === b.id; });
    if (!items.length) return;
    var group = el('div', 'stop-group');
    var groupTitleId = 'd2-brand-' + b.id;
    var groupTitle = el('p', 'stop-group__title');
    groupTitle.id = groupTitleId;
    groupTitle.setAttribute('data-brand', b.id);
    groupTitle.appendChild(pixelIcon(b.id, 'stop-group__icon'));
    groupTitle.appendChild(document.createTextNode(b.name));
    var ul = el('ul', 'stop-group__list');
    ul.setAttribute('aria-labelledby', groupTitleId);
    items.forEach(function (item) {
      var li = el('li');
      var label = el('label', 'stop-toggle');
      var name = el('span', 'stop-toggle__name', item.name);
      // «в стопе» входит в название тумблера всегда, а видно его, только когда тумблер включён
      var stateText = el('span', 'stop-toggle__state', 'в стопе');
      var input = el('input', 'stop-toggle__switch');
      input.type = 'checkbox';
      input.setAttribute('role', 'switch');
      input.setAttribute('data-id', item.id);
      label.appendChild(name);
      label.appendChild(stateText);
      label.appendChild(input);
      li.appendChild(label);
      ul.appendChild(li);
      switches[item.id] = input;
      input.addEventListener('change', function () { onToggle(item.id); });
    });
    group.appendChild(groupTitle);
    group.appendChild(ul);
    admin.appendChild(group);
  });

  var arrow = el('span', 'stoplist__arrow');
  arrow.setAttribute('aria-hidden', 'true');
  if (window.GLPixel) {
    var arrowSvg = window.GLPixel.svg('arrow');
    if (arrowSvg) arrow.appendChild(arrowSvg);
  }

  // Правая часть: превью меню гостя
  var guest = el('section', 'stoplist__pane stoplist__pane--guest phone');
  guest.setAttribute('aria-labelledby', 'd2-guest-title');
  var guestTitle = el('h4', 'stoplist__pane-title', 'Меню гостя');
  guestTitle.id = 'd2-guest-title';

  var guestList = el('ul', 'guest-menu');
  guestList.setAttribute('aria-labelledby', guestTitle.id);

  var phoneTop = el('span', 'phone__notch');
  phoneTop.setAttribute('aria-hidden', 'true');
  guest.appendChild(phoneTop);
  guest.appendChild(guestTitle);
  guest.appendChild(guestList);

  panes.appendChild(admin);
  panes.appendChild(arrow);
  panes.appendChild(guest);

  var announcer = el('p', 'visually-hidden');
  announcer.setAttribute('aria-live', 'polite');

  mount.appendChild(guide);
  mount.appendChild(panes);
  mount.appendChild(announcer);

  // ---------- Меню гостя ----------

  var guestRows = {};
  var built = false;

  function updateGuestRow(row, item) {
    var stop = !item.available;
    var was = row.li.classList.contains('is-stop');
    row.li.classList.toggle('is-stop', stop);
    var label = stop ? 'Нет в наличии' : 'В корзину';
    if (row.label.textContent !== label) row.label.textContent = label;
    row.btn.disabled = stop;
    if (was !== stop && built) {
      // Перезапуск короткого перехода строки, если переключили несколько раз подряд
      row.li.classList.remove('is-changed');
      void row.li.offsetWidth;
      row.li.classList.add('is-changed');
    }
  }

  function buildGuestRow(item, index) {
    var li = el('li', 'guest-item');
    li.setAttribute('data-id', item.id);
    li.style.setProperty('--i', index);
    var nameId = 'd2-guest-' + item.id;
    li.appendChild(pixelIcon(item.brand, 'guest-item__icon'));
    var info = el('div', 'guest-item__info');
    var name = el('p', 'guest-item__name', item.name);
    name.id = nameId;
    info.appendChild(name);
    var btn = el('button', 'btn btn--ghost btn--sm guest-item__add');
    var label = el('span', 'guest-item__add-text', 'В корзину');
    // Образец длинной надписи: держит ширину кнопки, невидим и не читается диктором
    var sizer = el('span', 'guest-item__add-size', 'Нет в наличии');
    sizer.setAttribute('aria-hidden', 'true');
    btn.appendChild(label);
    btn.appendChild(sizer);
    btn.type = 'button';
    btn.setAttribute('aria-describedby', nameId);
    btn.addEventListener('click', function () {
      announce('«' + item.name + '» в корзине');
      li.classList.remove('is-added');
      void li.offsetWidth;
      li.classList.add('is-added');
    });
    li.appendChild(info);
    li.appendChild(btn);
    return { li: li, label: label, btn: btn };
  }

  function renderGuest() {
    var items = GL.guestMenu(menu, 'all');
    if (!built) {
      items.forEach(function (item, i) {
        var row = buildGuestRow(item, i);
        guestRows[item.id] = row;
        guestList.appendChild(row.li);
      });
    }
    items.forEach(function (item) {
      if (guestRows[item.id]) updateGuestRow(guestRows[item.id], item);
    });
    built = true;
  }

  // ---------- Отрисовка ----------

  function renderSwitches() {
    menu.forEach(function (item) {
      var input = switches[item.id];
      if (!input) return;
      input.checked = !!item.stop;
      input.setAttribute('aria-checked', item.stop ? 'true' : 'false');
      var label = input.parentNode;
      if (label) label.classList.toggle('is-stop', !!item.stop);
    });
  }

  function renderGuide() {
    var item = tracked ? findItem(tracked) : null;
    var step = item && item.stop ? 1 : 0;
    // Шаг 1: подсветить тумблер последней тронутой позиции (если она снова в продаже)
    // или первой позиции, которая сейчас в продаже.
    if (step === 0 && !(item && !item.stop)) {
      item = null;
      for (var i = 0; i < menu.length; i++) if (!menu[i].stop) { item = menu[i]; break; }
    }
    var text = typo(GUIDE[step]);
    if (guideText.textContent !== text) guideText.textContent = text;
    Array.prototype.forEach.call(guideSteps.children, function (dot, i) {
      dot.classList.toggle('is-done', step > i);
      dot.classList.toggle('is-now', step === i);
    });

    Array.prototype.forEach.call(mount.querySelectorAll('.is-next'), function (n) { n.classList.remove('is-next'); });
    if (!item) return;
    if (step === 0 && switches[item.id] && switches[item.id].parentNode) {
      switches[item.id].parentNode.classList.add('is-next');
    } else if (step === 1 && guestRows[item.id]) {
      guestRows[item.id].li.classList.add('is-next');
    }
  }

  function render() {
    renderSwitches();
    renderGuest();
    renderGuide();
  }

  var announceTimer = null;

  function clearAnnounceTimer() {
    if (announceTimer) {
      window.clearTimeout(announceTimer);
      announceTimer = null;
    }
  }

  function announce(text) {
    // Новое сообщение отменяет отложенный повтор предыдущего.
    clearAnnounceTimer();
    text = typo(text);
    // Повтор того же текста: очищаем и ставим заново, чтобы экранный диктор прочитал его ещё раз.
    if (announcer.textContent === text) {
      announcer.textContent = '';
      announceTimer = window.setTimeout(function () {
        announceTimer = null;
        announcer.textContent = text;
      }, 50);
      return;
    }
    announcer.textContent = text;
  }

  // ---------- Действия ----------

  function onToggle(id) {
    menu = GL.toggleStop(menu, id);
    tracked = id;
    render();
    var item = findItem(id);
    if (!item) return;
    announce('Позиция «' + item.name + '»: ' + (item.stop ? 'нет в наличии' : 'снова в наличии'));
  }

  function onReset() {
    clearAnnounceTimer();
    menu = GL.initialMenu();
    tracked = null;
    render();
    announce('Демо сброшено. В стопе: ' + stopCount() + ' из ' + menu.length);
  }

  render();
})();
