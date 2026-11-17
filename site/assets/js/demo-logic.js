/*
 * demo-logic.js: чистая логика интерактивных демо (D1, D2, D3, D5).
 * Без обращения к DOM. Входные данные не мутируются: функции возвращают новые объекты.
 * Все данные ниже вымышленные (Демо-данные): бренды, курьеры, заказы, позиции меню.
 * Формат UMD: module.exports в Node, window.GL (дополняется, не затирается) в браузере.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else { root.GL = Object.assign(root.GL || {}, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- D3. Маршрут и ETA ----------

  // Скорости в км/ч (ТЗ, раздел 7, D3).
  var SPEEDS = { walk: 5, bike: 15, car: 30 };
  var MODE_LABELS = { walk: 'Пеший', bike: 'Вело', car: 'Авто' };

  // ETA = подготовка + расстояние / скорость * 60, округление до целых минут.
  // Неизвестный способ доставки или нечисловое расстояние: null.
  function etaMinutes(distanceKm, mode, prepMin) {
    if (prepMin === undefined) prepMin = 12;
    var speed = SPEEDS[mode];
    var d = Number(distanceKm);
    var p = Number(prepMin);
    if (!speed || !isFinite(d) || !isFinite(p)) return null;
    if (d < 0) d = 0;
    return Math.round(p + (d / speed) * 60);
  }

  // ---------- D5. Калькулятор комиссий ----------

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function commissionSavings(input) {
    var o = input || {};
    var base = num(o.ordersPerMonth) * num(o.avgCheck) * num(o.aggregatorSharePct) / 100;
    var commission = num(o.commissionPct) / 100;
    var shift = num(o.shiftPct) / 100;
    var currentCommission = base * commission;
    var afterCommission = base * (1 - shift) * commission;
    return {
      currentCommission: currentCommission,
      afterCommission: afterCommission,
      savings: currentCommission - afterCommission
    };
  }

  // ---------- D1. Доска заказов ----------

  var STATUSES = ['new', 'cooking', 'ready', 'enroute'];
  var STATUS_LABELS = { new: 'Новые', cooking: 'Готовятся', ready: 'Готовы', enroute: 'В пути' };
  // Ручные переходы по кнопкам «Принять» и «Готово». Из ready дальше только через assignCourier.
  var NEXT_STATUS = { new: 'cooking', cooking: 'ready' };

  var ERROR_MESSAGES = {
    no_courier: 'Нет свободных курьеров',
    not_ready: 'Заказ ещё не готов',
    not_found: 'Заказ не найден'
  };

  // Демо-данные: вымышленные бренды.
  var DEMO_BRANDS = [
    { id: 'b1', name: 'Медный котелок' },
    { id: 'b2', name: 'Луковый сад' },
    { id: 'b3', name: 'Сытая полка' }
  ];

  function initialBoardState() {
    return {
      orders: [
        { id: 'o1', brand: 'b1', status: 'new', distanceKm: 3, courierId: null, eta: null },
        { id: 'o2', brand: 'b2', status: 'new', distanceKm: 5, courierId: null, eta: null },
        { id: 'o3', brand: 'b3', status: 'new', distanceKm: 2, courierId: null, eta: null },
        { id: 'o4', brand: 'b1', status: 'cooking', distanceKm: 4, courierId: null, eta: null },
        { id: 'o5', brand: 'b2', status: 'cooking', distanceKm: 1.5, courierId: null, eta: null },
        { id: 'o6', brand: 'b3', status: 'ready', distanceKm: 6, courierId: null, eta: null },
        { id: 'o7', brand: 'b1', status: 'ready', distanceKm: 2.5, courierId: null, eta: null },
        { id: 'o8', brand: 'b2', status: 'enroute', distanceKm: 1, courierId: 'c3', eta: 24 }
      ],
      couriers: [
        { id: 'c1', name: 'Илья', free: true, mode: 'bike', distanceToKitchenKm: 1.2 },
        { id: 'c2', name: 'Мария', free: true, mode: 'car', distanceToKitchenKm: 2.8 },
        { id: 'c3', name: 'Олег', free: false, mode: 'walk', distanceToKitchenKm: 0.4 }
      ],
      nextId: 9
    };
  }

  function findOrder(state, id) {
    var list = (state && state.orders) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function withOrder(state, id, patch) {
    var copy = Object.assign({}, state);
    copy.orders = state.orders.map(function (o) {
      return o.id === id ? Object.assign({}, o, patch) : o;
    });
    return copy;
  }

  // «Принять» (new -> cooking) и «Готово» (cooking -> ready). Иначе состояние без изменений.
  function advanceOrder(state, id) {
    var order = findOrder(state, id);
    if (!order) return state;
    var next = NEXT_STATUS[order.status];
    if (!next) return state;
    return withOrder(state, id, { status: next });
  }

  // Назначает свободного курьера с минимальным расстоянием до кухни.
  // Возвращает { state, error }, error: null | 'no_courier' | 'not_ready' | 'not_found'.
  // При ошибке state равен исходному, карточка остаётся на месте.
  function assignCourier(state, id) {
    var order = findOrder(state, id);
    if (!order) return { state: state, error: 'not_found' };
    if (order.status !== 'ready') return { state: state, error: 'not_ready' };
    var best = null;
    var couriers = state.couriers || [];
    for (var i = 0; i < couriers.length; i++) {
      var c = couriers[i];
      if (c.free && (best === null || c.distanceToKitchenKm < best.distanceToKitchenKm)) best = c;
    }
    if (!best) return { state: state, error: 'no_courier' };
    var next = withOrder(state, id, {
      status: 'enroute',
      courierId: best.id,
      eta: etaMinutes(order.distanceKm, best.mode)
    });
    next.couriers = couriers.map(function (c) {
      return c.id === best.id ? Object.assign({}, c, { free: false }) : c;
    });
    return { state: next, error: null };
  }

  function isAll(brand) {
    return brand === undefined || brand === null || brand === '' || brand === 'all';
  }

  function filterOrders(state, brand) {
    var list = (state && state.orders) || [];
    if (isAll(brand)) return list.slice();
    return list.filter(function (o) { return o.brand === brand; });
  }

  function boardCounts(state, brand) {
    var counts = { new: 0, cooking: 0, ready: 0, enroute: 0 };
    filterOrders(state, brand).forEach(function (o) {
      if (Object.prototype.hasOwnProperty.call(counts, o.status)) counts[o.status] += 1;
    });
    return counts;
  }

  // «Новый заказ»: добавляет случайный заказ в «Новые».
  // rnd: функция, возвращающая число [0, 1), по умолчанию Math.random (передайте свою для тестов).
  function addRandomOrder(state, rnd) {
    var r = typeof rnd === 'function' ? rnd : Math.random;
    var brands = DEMO_BRANDS;
    var brand = brands[Math.min(brands.length - 1, Math.floor(r() * brands.length))].id;
    var distanceKm = Math.round((1 + r() * 7) * 2) / 2; // 1–8 км с шагом 0,5
    var n = state.nextId || (state.orders.length + 1);
    var id = 'o' + n;
    while (findOrder(state, id)) { n += 1; id = 'o' + n; }
    var copy = Object.assign({}, state);
    copy.orders = state.orders.concat([
      { id: id, brand: brand, status: 'new', distanceKm: distanceKm, courierId: null, eta: null }
    ]);
    copy.nextId = n + 1;
    return copy;
  }

  // ---------- D2. Стоп-лист ----------

  // Демо-данные: 6 позиций, по 2 на каждый вымышленный бренд.
  function initialMenu() {
    return [
      { id: 'm1', brand: 'b1', name: 'Гуляш с картофелем', stop: false },
      { id: 'm2', brand: 'b1', name: 'Борщ с пампушкой', stop: false },
      { id: 'm3', brand: 'b2', name: 'Салат с печёной тыквой', stop: false },
      { id: 'm4', brand: 'b2', name: 'Боул с киноа', stop: true },
      { id: 'm5', brand: 'b3', name: 'Сырники со сметаной', stop: false },
      { id: 'm6', brand: 'b3', name: 'Блины с ягодами', stop: false }
    ];
  }

  function toggleStop(menu, itemId) {
    return (menu || []).map(function (item) {
      return item.id === itemId ? Object.assign({}, item, { stop: !item.stop }) : item;
    });
  }

  // Меню гостя: позиции бренда (или все) с полем available = !stop.
  function guestMenu(menu, brand) {
    return (menu || [])
      .filter(function (item) { return isAll(brand) || item.brand === brand; })
      .map(function (item) { return Object.assign({}, item, { available: !item.stop }); });
  }

  return {
    // D3
    SPEEDS: SPEEDS,
    MODE_LABELS: MODE_LABELS,
    etaMinutes: etaMinutes,
    // D5
    commissionSavings: commissionSavings,
    // D1
    STATUSES: STATUSES,
    STATUS_LABELS: STATUS_LABELS,
    ERROR_MESSAGES: ERROR_MESSAGES,
    DEMO_BRANDS: DEMO_BRANDS,
    initialBoardState: initialBoardState,
    advanceOrder: advanceOrder,
    assignCourier: assignCourier,
    boardCounts: boardCounts,
    filterOrders: filterOrders,
    addRandomOrder: addRandomOrder,
    // D2
    initialMenu: initialMenu,
    toggleStop: toggleStop,
    guestMenu: guestMenu
  };
});
