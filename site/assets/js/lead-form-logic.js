/* Логика формы заявки (ТЗ, раздел 6). Чистые функции без DOM.
   В браузере доступны через window.GL, в Node через module.exports. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else { root.GL = Object.assign(root.GL || {}, factory()); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_DELAY_MS = 1200;

  function str(v) {
    return v === undefined || v === null ? '' : String(v);
  }

  // Цифры номера без кода страны.
  // Ведущая 7 или 8 считается кодом страны, если номер начинается с «+7»
  // или цифр не ровно 10 (10 цифр — уже номер без кода, например 812…).
  function phoneDigits(raw) {
    var s = str(raw).trim();
    var d = s.replace(/\D/g, '');
    if (s.charAt(0) === '+' && d.charAt(0) === '7') d = d.slice(1);
    else if ((d.charAt(0) === '7' || d.charAt(0) === '8') && d.length !== 10) d = d.slice(1);
    return d;
  }

  function formatPhone(raw) {
    var d = phoneDigits(raw).slice(0, 10);
    if (!d) return '';
    var out = '+7 (' + d.slice(0, 3);
    if (d.length > 3) out += ') ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateLead(values) {
    var v = values || {};
    var errors = {};

    if (str(v.name).trim().length < 2) errors.name = 'Укажите имя, хотя бы 2 буквы';

    var phone = str(v.phone).trim();
    if (!phone) errors.phone = 'Укажите телефон';
    else if (phoneDigits(phone).length !== 10) errors.phone = 'Введите номер полностью: 10 цифр после +7';

    var email = str(v.email).trim();
    if (email && !EMAIL_RE.test(email)) errors.email = 'Проверьте почту, например name@mail.ru';

    if (str(v.city).trim().length < 2) errors.city = 'Укажите город';

    var points = str(v.points).trim();
    var n = /^\d+$/.test(points) ? parseInt(points, 10) : NaN;
    if (!(n >= 1 && n <= 999)) errors.points = 'Введите целое число от 1 до 999';

    if (v.consent_pd !== true) errors.consent_pd = 'Нужно согласие на обработку данных';

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  function makeId() {
    return 'demo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function submitLead(values, opts) {
    var o = opts || {};
    var simulate = o.simulate === 'error' ? 'error' : 'ok';
    var delay = typeof o.delayMs === 'number' && o.delayMs >= 0 ? o.delayMs : DEFAULT_DELAY_MS;

    if (!validateLead(values).valid) return Promise.resolve({ ok: false, error: 'validation' });

    return new Promise(function (resolve) {
      setTimeout(function () {
        if (simulate === 'error') resolve({ ok: false, error: 'network' });
        else resolve({ ok: true, id: makeId() });
      }, delay);
    });
  }

  return { formatPhone: formatPhone, validateLead: validateLead, submitLead: submitLead };
});
