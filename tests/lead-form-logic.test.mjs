// Тесты логики формы (AC-13, AC-14, AC-15, AC-25).
// Запуск: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../site/assets/js/lead-form-logic.js');
const require = createRequire(import.meta.url);

let L = null;
let loadError = null;
try { L = require(file); } catch (e) { loadError = e; }
const need = () => {
  if (!L) assert.fail('Не удалось загрузить site/assets/js/lead-form-logic.js: ' + (loadError && loadError.message));
  return L;
};

const valid = { name: 'Анна', phone: '+7 (999) 123-45-67', email: '', city: 'Екатеринбург', points: '3', consent_pd: true };

test('AC-25: lead-form-logic.js экспортирует функции и доступен в браузере через GL', () => {
  const l = need();
  for (const fn of ['formatPhone', 'validateLead', 'submitLead']) assert.equal(typeof l[fn], 'function', fn);
  const ctx = {}; ctx.window = ctx; ctx.self = ctx;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx);
  assert.equal(typeof ctx.GL?.formatPhone, 'function', 'window.GL.formatPhone должен существовать');
});

test('AC-14: formatPhone даёт маску полностью', () => {
  const { formatPhone } = need();
  assert.equal(formatPhone('9991234567'), '+7 (999) 123-45-67');
  assert.equal(formatPhone('89991234567'), '+7 (999) 123-45-67');
  assert.equal(formatPhone('+79991234567'), '+7 (999) 123-45-67');
  assert.equal(formatPhone('+7 (999) 123-45-67'), '+7 (999) 123-45-67', 'должна быть идемпотентной');
});

test('AC-14: formatPhone работает при вводе по одному символу', () => {
  const { formatPhone } = need();
  assert.equal(formatPhone(''), '');
  assert.equal(formatPhone('8'), '');
  assert.equal(formatPhone('9'), '+7 (9');
  assert.equal(formatPhone('99'), '+7 (99');
  assert.equal(formatPhone('999'), '+7 (999');
  assert.equal(formatPhone('9991'), '+7 (999) 1');
  assert.equal(formatPhone('999123'), '+7 (999) 123');
  assert.equal(formatPhone('9991234'), '+7 (999) 123-4');
  assert.equal(formatPhone('99912345'), '+7 (999) 123-45');
  assert.equal(formatPhone('999123456'), '+7 (999) 123-45-6');
});

test('AC-14: formatPhone обрезает лишние цифры и игнорирует буквы', () => {
  const { formatPhone } = need();
  assert.equal(formatPhone('99912345678999'), '+7 (999) 123-45-67');
  assert.equal(formatPhone('9a9b9'), '+7 (999');
});

test('AC-13: validateLead принимает корректную заявку', () => {
  const { validateLead } = need();
  const r = validateLead(valid);
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, {});
});

test('AC-13: validateLead проверяет имя', () => {
  const { validateLead } = need();
  assert.ok(validateLead({ ...valid, name: 'А' }).errors.name);
  assert.ok(validateLead({ ...valid, name: '   ' }).errors.name);
  assert.equal(validateLead({ ...valid, name: ' Ян ' }).errors.name, undefined);
});

test('AC-13: validateLead проверяет телефон', () => {
  const { validateLead } = need();
  assert.ok(validateLead({ ...valid, phone: '' }).errors.phone);
  assert.ok(validateLead({ ...valid, phone: '123' }).errors.phone);
  assert.ok(validateLead({ ...valid, phone: '+7 (999) 123-45-6' }).errors.phone, '9 цифр это ошибка');
  assert.equal(validateLead({ ...valid, phone: '89991234567' }).errors.phone, undefined);
  assert.equal(validateLead({ ...valid, phone: '9991234567' }).errors.phone, undefined);
});

test('AC-13: validateLead проверяет почту (необязательная)', () => {
  const { validateLead } = need();
  assert.equal(validateLead({ ...valid, email: '' }).errors.email, undefined);
  assert.equal(validateLead({ ...valid, email: 'a@b.co' }).errors.email, undefined);
  assert.ok(validateLead({ ...valid, email: 'abc' }).errors.email);
  assert.ok(validateLead({ ...valid, email: 'a@b' }).errors.email);
  assert.ok(validateLead({ ...valid, email: 'a b@c.ru' }).errors.email);
});

test('AC-13: validateLead проверяет город', () => {
  const { validateLead } = need();
  assert.ok(validateLead({ ...valid, city: '' }).errors.city);
  assert.ok(validateLead({ ...valid, city: 'К' }).errors.city);
  assert.equal(validateLead({ ...valid, city: 'Омск' }).errors.city, undefined);
});

test('AC-13: validateLead проверяет число точек', () => {
  const { validateLead } = need();
  for (const bad of ['', '0', '-1', '1000', '2.5', 'abc', ' ']) {
    assert.ok(validateLead({ ...valid, points: bad }).errors.points, `points="${bad}" должно быть ошибкой`);
  }
  for (const good of ['1', '999', 5, ' 12 ']) {
    assert.equal(validateLead({ ...valid, points: good }).errors.points, undefined, `points=${JSON.stringify(good)} должно быть допустимо`);
  }
});

test('AC-13: validateLead требует согласие на обработку данных', () => {
  const { validateLead } = need();
  assert.ok(validateLead({ ...valid, consent_pd: false }).errors.consent_pd);
  assert.ok(validateLead({ ...valid, consent_pd: undefined }).errors.consent_pd);
});

test('AC-13: validateLead собирает все ошибки сразу и пишет понятный текст', () => {
  const { validateLead } = need();
  const r = validateLead({});
  assert.equal(r.valid, false);
  for (const f of ['name', 'phone', 'city', 'points', 'consent_pd']) {
    assert.equal(typeof r.errors[f], 'string', f);
    assert.ok(r.errors[f].length > 3, f);
  }
  assert.equal(r.errors.email, undefined);
});

test('AC-15: submitLead возвращает успех', async () => {
  const { submitLead } = need();
  const p = submitLead(valid, { simulate: 'ok', delayMs: 0 });
  assert.ok(p && typeof p.then === 'function', 'должен вернуть Promise');
  const r = await p;
  assert.equal(r.ok, true);
  assert.equal(typeof r.id, 'string');
  assert.ok(r.id.length > 0);
  const r2 = await submitLead(valid, { delayMs: 0 });
  assert.equal(r2.ok, true, 'по умолчанию simulate = ok');
});

test('AC-15: submitLead возвращает ошибку при simulate:error', async () => {
  const { submitLead } = need();
  const r = await submitLead(valid, { simulate: 'error', delayMs: 0 });
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, 'string');
  assert.notEqual(r.error, 'validation');
});

test('AC-15: submitLead не ждёт и сообщает validation при неверных данных', async () => {
  const { submitLead } = need();
  const t0 = Date.now();
  const r = await submitLead({ ...valid, phone: '1' }, { simulate: 'ok', delayMs: 500 });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'validation');
  assert.ok(Date.now() - t0 < 250, 'без задержки при ошибке валидации');
});

test('AC-15: submitLead соблюдает задержку', async () => {
  const { submitLead } = need();
  const t0 = Date.now();
  await submitLead(valid, { simulate: 'ok', delayMs: 150 });
  assert.ok(Date.now() - t0 >= 130, 'задержка должна быть около 150 мс');
});
