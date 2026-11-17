// Тесты логики демо (AC-17, AC-18, AC-19, AC-20, AC-25).
// Запуск: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../site/assets/js/demo-logic.js');
const require = createRequire(import.meta.url);

let D = null;
let loadError = null;
try { D = require(file); } catch (e) { loadError = e; }
const need = () => {
  if (!D) assert.fail('Не удалось загрузить site/assets/js/demo-logic.js: ' + (loadError && loadError.message));
  return D;
};
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg || ''} ожидалось ${b}, получено ${a}`);

const makeState = () => ({
  orders: [
    { id: 'o1', brand: 'A', status: 'new', distanceKm: 3, courierId: null, eta: null },
    { id: 'o2', brand: 'A', status: 'ready', distanceKm: 4, courierId: null, eta: null },
    { id: 'o3', brand: 'B', status: 'ready', distanceKm: 6, courierId: null, eta: null },
    { id: 'o4', brand: 'B', status: 'cooking', distanceKm: 2, courierId: null, eta: null },
  ],
  couriers: [
    { id: 'c1', name: 'Илья', free: true, mode: 'bike', distanceToKitchenKm: 2 },
    { id: 'c2', name: 'Мария', free: true, mode: 'car', distanceToKitchenKm: 0.5 },
    { id: 'c3', name: 'Олег', free: false, mode: 'walk', distanceToKitchenKm: 0.1 },
  ],
});
const byId = (state, id) => state.orders.find((o) => o.id === id);

test('AC-25: demo-logic.js экспортирует функции и доступен в браузере через GL', () => {
  const d = need();
  for (const fn of ['etaMinutes', 'commissionSavings', 'advanceOrder', 'assignCourier', 'boardCounts', 'filterOrders', 'toggleStop', 'guestMenu']) {
    assert.equal(typeof d[fn], 'function', fn);
  }
  const ctx = {}; ctx.window = ctx; ctx.self = ctx;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx);
  assert.equal(typeof ctx.GL?.etaMinutes, 'function', 'window.GL.etaMinutes должен существовать');
});

test('AC-19: etaMinutes считает по формуле 12 + расстояние / скорость * 60', () => {
  const { etaMinutes } = need();
  assert.equal(etaMinutes(0, 'walk'), 12);
  assert.equal(etaMinutes(5, 'walk'), 72);
  assert.equal(etaMinutes(5, 'bike'), 32);
  assert.equal(etaMinutes(5, 'car'), 22);
  assert.equal(etaMinutes(10, 'bike'), 52);
  assert.equal(etaMinutes(5, 'car', 0), 10);
  assert.equal(etaMinutes(1.3, 'bike'), 17, 'округление до целых');
});

test('AC-19: etaMinutes растёт с расстоянием и зависит от способа', () => {
  const { etaMinutes } = need();
  assert.ok(etaMinutes(8, 'bike') > etaMinutes(2, 'bike'));
  assert.ok(etaMinutes(6, 'walk') > etaMinutes(6, 'bike'));
  assert.ok(etaMinutes(6, 'bike') > etaMinutes(6, 'car'));
});

test('AC-20: commissionSavings считает комиссии и экономию', () => {
  const { commissionSavings } = need();
  const r = commissionSavings({ ordersPerMonth: 1000, avgCheck: 1000, aggregatorSharePct: 50, commissionPct: 20, shiftPct: 30 });
  close(r.currentCommission, 100000, 'currentCommission');
  close(r.afterCommission, 70000, 'afterCommission');
  close(r.savings, 30000, 'savings');
});

test('AC-20: commissionSavings на краях', () => {
  const { commissionSavings } = need();
  const base = { ordersPerMonth: 2000, avgCheck: 800, aggregatorSharePct: 60, commissionPct: 25 };
  const none = commissionSavings({ ...base, shiftPct: 0 });
  close(none.savings, 0, 'shift 0');
  close(none.afterCommission, none.currentCommission, 'shift 0 after = current');
  const all = commissionSavings({ ...base, shiftPct: 100 });
  close(all.afterCommission, 0, 'shift 100');
  close(all.savings, all.currentCommission, 'shift 100 savings');
  const zero = commissionSavings({ ...base, aggregatorSharePct: 0, shiftPct: 50 });
  close(zero.currentCommission, 0, 'share 0');
  close(zero.savings, 0, 'share 0 savings');
});

test('AC-17: advanceOrder двигает new, cooking, ready и не мутирует исходное состояние', () => {
  const { advanceOrder } = need();
  const s0 = makeState();
  const snapshot = JSON.stringify(s0);
  const s1 = advanceOrder(s0, 'o1');
  assert.equal(byId(s1, 'o1').status, 'cooking');
  assert.equal(JSON.stringify(s0), snapshot, 'исходное состояние не должно меняться');
  const s2 = advanceOrder(s1, 'o1');
  assert.equal(byId(s2, 'o1').status, 'ready');
  const s3 = advanceOrder(s2, 'o1');
  assert.equal(byId(s3, 'o1').status, 'ready', 'из ready кнопка «Назначить курьера», а не advance');
  const s4 = advanceOrder(s0, 'нет-такого');
  assert.deepEqual(s4, s0);
});

test('AC-17: assignCourier выбирает ближайшего свободного курьера и считает ETA', () => {
  const { assignCourier } = need();
  const s0 = makeState();
  const snapshot = JSON.stringify(s0);
  const r1 = assignCourier(s0, 'o2');
  assert.equal(r1.error ?? null, null);
  const o2 = byId(r1.state, 'o2');
  assert.equal(o2.status, 'enroute');
  assert.equal(o2.courierId, 'c2', 'ближайший свободный: Мария (0.5 км)');
  assert.equal(o2.eta, 20, 'авто, 4 км: 12 + 8');
  assert.equal(r1.state.couriers.find((c) => c.id === 'c2').free, false);
  assert.equal(JSON.stringify(s0), snapshot, 'исходное состояние не должно меняться');

  const r2 = assignCourier(r1.state, 'o3');
  assert.equal(byId(r2.state, 'o3').courierId, 'c1', 'c2 занят, c3 занят, остаётся c1');
  assert.equal(byId(r2.state, 'o3').eta, 36, 'вело, 6 км: 12 + 24');
});

test('AC-17: assignCourier сообщает, если нет свободных или заказ не готов', () => {
  const { assignCourier, advanceOrder } = need();
  let s = makeState();
  s = assignCourier(s, 'o2').state;
  s = assignCourier(s, 'o3').state;
  s = advanceOrder(advanceOrder(s, 'o1'), 'o1');
  const r = assignCourier(s, 'o1');
  assert.equal(r.error, 'no_courier');
  assert.equal(byId(r.state, 'o1').status, 'ready', 'заказ остаётся готовым');
  const notReady = assignCourier(makeState(), 'o1');
  assert.equal(notReady.error, 'not_ready');
});

test('AC-17: boardCounts и filterOrders учитывают бренд', () => {
  const { boardCounts, filterOrders } = need();
  const s = makeState();
  assert.deepEqual(boardCounts(s), { new: 1, cooking: 1, ready: 2, enroute: 0 });
  assert.deepEqual(boardCounts(s, 'all'), { new: 1, cooking: 1, ready: 2, enroute: 0 });
  assert.deepEqual(boardCounts(s, 'A'), { new: 1, cooking: 0, ready: 1, enroute: 0 });
  assert.deepEqual(boardCounts(s, 'B'), { new: 0, cooking: 1, ready: 1, enroute: 0 });
  assert.equal(filterOrders(s, 'all').length, 4);
  assert.equal(filterOrders(s, 'B').length, 2);
  assert.ok(filterOrders(s, 'B').every((o) => o.brand === 'B'));
});

const menu = () => [
  { id: 'm1', brand: 'A', name: 'Пицца', stop: false },
  { id: 'm2', brand: 'A', name: 'Паста', stop: false },
  { id: 'm3', brand: 'B', name: 'Ролл', stop: true },
];

test('AC-18: toggleStop переключает позицию и не мутирует меню', () => {
  const { toggleStop } = need();
  const m0 = menu();
  const snapshot = JSON.stringify(m0);
  const m1 = toggleStop(m0, 'm1');
  assert.equal(m1.find((i) => i.id === 'm1').stop, true);
  assert.equal(m1.find((i) => i.id === 'm2').stop, false);
  assert.equal(JSON.stringify(m0), snapshot);
  const m2 = toggleStop(m1, 'm1');
  assert.equal(m2.find((i) => i.id === 'm1').stop, false);
  assert.equal(toggleStop(m0, 'нет-такого').length, 3);
});

test('AC-18: guestMenu показывает доступность позиций по бренду', () => {
  const { guestMenu, toggleStop } = need();
  const g = guestMenu(menu(), 'A');
  assert.equal(g.length, 2);
  assert.ok(g.every((i) => i.available === true));
  const g2 = guestMenu(toggleStop(menu(), 'm1'), 'A');
  assert.equal(g2.find((i) => i.id === 'm1').available, false);
  assert.equal(guestMenu(menu(), 'B')[0].available, false);
  assert.equal(guestMenu(menu(), 'all').length, 3);
});
