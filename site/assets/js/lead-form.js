/*
  lead-form.js: интерфейс формы заявки (ТЗ, раздел 6). Классический скрипт.
  Подключать после lead-form-logic.js: вся логика берётся из window.GL
  (formatPhone, validateLead, submitLead), здесь только работа с DOM.

  Ищет все form[data-lead-form]. Если формы на странице нет, ничего не делает.
  Разметка и хуки описаны в начале docs/snippets/lead-form.html:
    [data-lead-form-root] > form[data-lead-form] (поля по name),
    [data-error-for], [data-lead-submit], [data-lead-error], [data-lead-retry],
    [data-lead-success], [data-lead-again], [data-lead-simulate], [data-lead-hint].

  Ошибка отправки для проверки: адрес с ?simulate=error (ошибка при каждой отправке)
  или ссылка [data-lead-simulate], если она есть в разметке (ошибка только при следующей отправке).
  На лендинге ссылки нет: пояснений «демо» под формой не показываем, режим ?simulate=error работает.
*/
(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  var GL = window.GL || {};
  if (typeof GL.formatPhone !== 'function' || typeof GL.validateLead !== 'function' || typeof GL.submitLead !== 'function') return;

  var FIELDS = ['name', 'phone', 'email', 'city', 'points', 'consent_pd', 'consent_ads'];
  var TEXT_SUBMIT_LOADING = 'Отправляем…';
  var TEXT_SIMULATE_HINT = 'Следующая отправка завершится ошибкой';
  var TEXT_SIMULATE_URL_HINT = 'Режим ?simulate=error: каждая отправка завершится ошибкой';

  function urlSimulateError() {
    try {
      return new URLSearchParams(window.location.search).get('simulate') === 'error';
    } catch (e) {
      return /[?&]simulate=error(&|$)/.test(window.location.search);
    }
  }

  /* ---------- Маска телефона с сохранением позиции курсора ---------- */
  // Сколько цифр номера (без кода страны +7) стоит слева от позиции pos.
  function nationalDigitsBefore(value, pos) {
    var n = (value.slice(0, pos).match(/\d/g) || []).length;
    if (/^\+7/.test(value) && pos >= 2) n -= 1;
    return n;
  }

  // Позиция в отформатированной строке сразу после n-й цифры номера.
  function caretAfterDigits(formatted, n) {
    if (n <= 0) return formatted ? Math.min(4, formatted.length) : 0; // после «+7 (»
    var seen = 0;
    for (var i = 4; i < formatted.length; i++) {
      if (/\d/.test(formatted.charAt(i))) {
        seen++;
        if (seen === n) return i + 1;
      }
    }
    return formatted.length;
  }

  function applyPhoneMask(input) {
    var raw = input.value;
    var pos = typeof input.selectionStart === 'number' ? input.selectionStart : raw.length;
    var atEnd = pos >= raw.length;
    var formatted = GL.formatPhone(raw);
    if (formatted === raw) return;
    var digits = nationalDigitsBefore(raw, pos);
    input.value = formatted;
    if (document.activeElement !== input) return;
    var next = atEnd ? formatted.length : caretAfterDigits(formatted, digits);
    try { input.setSelectionRange(next, next); } catch (e) { /* тип поля без выделения */ }
  }

  // Backspace/Delete рядом со скобкой, пробелом или дефисом стирают ближайшую цифру,
  // иначе маска вернула бы символ обратно и курсор «застрял» бы.
  function onPhoneKeydown(e) {
    var input = e.target;
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (input.selectionStart !== input.selectionEnd) return;
    var v = input.value;
    var pos = input.selectionStart;
    if (e.key === 'Backspace') {
      var p = pos;
      while (p > 4 && !/\d/.test(v.charAt(p - 1))) p--;
      if (p !== pos && p > 4) input.setSelectionRange(p, p);
    } else {
      var q = pos;
      while (q < v.length && !/\d/.test(v.charAt(q))) q++;
      if (q !== pos && q < v.length) input.setSelectionRange(q, q);
    }
  }

  /* ---------- Одна форма ---------- */
  function initForm(form) {
    var root = form.closest('[data-lead-form-root]') || form.parentNode;
    var submitBtn = form.querySelector('[data-lead-submit]') || form.querySelector('[type="submit"]');
    var submitLabel = submitBtn ? submitBtn.querySelector('[data-lead-submit-label]') : null;
    var submitText = submitLabel ? submitLabel.textContent : '';
    var errorBox = root.querySelector('[data-lead-error]');
    var retryBtn = root.querySelector('[data-lead-retry]');
    var successBox = root.querySelector('[data-lead-success]');
    var againBtn = root.querySelector('[data-lead-again]');
    var simulateLink = root.querySelector('[data-lead-simulate]');
    var hint = root.querySelector('[data-lead-hint]');
    var touched = {};
    var forceErrorOnce = false;

    // Скрытая polite-область: объявляет «Отправляем…» для экранного диктора.
    // Успех и ошибку объявляют свои регионы (role=status и role=alert).
    var busyLive = root.querySelector('[data-lead-busy-live]');
    if (!busyLive) {
      busyLive = document.createElement('p');
      busyLive.className = 'visually-hidden';
      busyLive.setAttribute('aria-live', 'polite');
      busyLive.setAttribute('data-lead-busy-live', '');
      root.appendChild(busyLive);
    }
    var busy = false;

    form.noValidate = true; // проверяем сами, с понятными текстами
    if (submitBtn) submitBtn.disabled = false; // без JS кнопка выключена

    function field(name) {
      return form.elements.namedItem(name);
    }

    function errorEl(name) {
      return root.querySelector('[data-error-for="' + name + '"]');
    }

    function getValues() {
      var v = {};
      FIELDS.forEach(function (name) {
        var el = field(name);
        if (!el) return;
        v[name] = el.type === 'checkbox' ? el.checked : el.value; // согласия как boolean
      });
      return v;
    }

    function setDescribedBy(el, id, on) {
      var ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      var i = ids.indexOf(id);
      if (on && i === -1) ids.push(id);
      if (!on && i !== -1) ids.splice(i, 1);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    }

    function showError(name, message) {
      var el = field(name);
      var err = errorEl(name);
      if (!el) return;
      var wrap = el.closest('.field, .check');
      if (message) {
        el.setAttribute('aria-invalid', 'true');
        if (err) {
          if (!err.id) err.id = 'lead-' + name + '-error';
          err.textContent = message;
          err.hidden = false;
          setDescribedBy(el, err.id, true);
        }
        if (wrap) wrap.classList.add('is-invalid');
      } else {
        el.removeAttribute('aria-invalid');
        if (err) {
          err.textContent = '';
          err.hidden = true;
          if (err.id) setDescribedBy(el, err.id, false);
        }
        if (wrap) wrap.classList.remove('is-invalid');
      }
    }

    function validateField(name) {
      var res = GL.validateLead(getValues());
      showError(name, res.errors[name] || '');
      return !res.errors[name];
    }

    function validateAll() {
      var res = GL.validateLead(getValues());
      FIELDS.forEach(function (name) { showError(name, res.errors[name] || ''); });
      return res;
    }

    function focusFirstInvalid(errors) {
      for (var i = 0; i < FIELDS.length; i++) {
        if (errors[FIELDS[i]]) {
          var el = field(FIELDS[i]);
          if (el && el.focus) el.focus();
          return;
        }
      }
    }

    function setBusy(on) {
      busy = on;
      // Фокус в поле, которое сейчас заблокируем, потерялся бы. Переводим его на кнопку отправки:
      // она не получает disabled (только aria-disabled), поэтому фокус остаётся на ней.
      if (on && submitBtn && submitBtn.focus) {
        var active = document.activeElement;
        if (active && active !== submitBtn && form.contains(active)) submitBtn.focus();
      }
      form.setAttribute('aria-busy', on ? 'true' : 'false');
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el === submitBtn) return;
        if (el.tagName === 'FIELDSET') return;
        el.disabled = on;
      });
      if (submitBtn) {
        // Повторную отправку во время загрузки не даёт флаг busy в send().
        if (on) submitBtn.setAttribute('aria-disabled', 'true');
        else submitBtn.removeAttribute('aria-disabled');
        submitBtn.classList.toggle('is-loading', on);
      }
      if (submitLabel) submitLabel.textContent = on ? TEXT_SUBMIT_LOADING : submitText;
      busyLive.textContent = on ? TEXT_SUBMIT_LOADING : '';
    }

    function showSubmitError(on) {
      if (errorBox) errorBox.hidden = !on;
    }

    function setHint(text) {
      if (!text && urlSimulateError()) text = TEXT_SIMULATE_URL_HINT;
      if (hint) hint.textContent = text || '';
    }

    function send() {
      if (busy) return;
      var res = validateAll();
      if (!res.valid) {
        showSubmitError(false);
        focusFirstInvalid(res.errors);
        return;
      }
      var values = getValues(); // читаем до блокировки полей
      var simulate = urlSimulateError() || forceErrorOnce ? 'error' : 'ok';
      forceErrorOnce = false;
      setHint('');
      showSubmitError(false);
      setBusy(true);

      GL.submitLead(values, { simulate: simulate }).then(function (result) {
        setBusy(false);
        if (result && result.ok) {
          form.hidden = true;
          if (successBox) {
            successBox.hidden = false;
            var title = successBox.querySelector('[tabindex="-1"]') || successBox;
            if (title.focus) title.focus();
          }
          return;
        }
        if (result && result.error === 'validation') {
          focusFirstInvalid(validateAll().errors);
          return;
        }
        // Любая другая ошибка: код на экран не выводим, показываем текст из ТЗ. Данные в полях остаются.
        showSubmitError(true);
        if (retryBtn) retryBtn.focus();
      }, function () {
        setBusy(false);
        showSubmitError(true);
        if (retryBtn) retryBtn.focus();
      });
    }

    function resetForm() {
      form.reset();
      touched = {};
      FIELDS.forEach(function (name) { showError(name, ''); });
      showSubmitError(false);
      setHint('');
      if (successBox) successBox.hidden = true;
      form.hidden = false;
      var first = field(FIELDS[0]);
      if (first && first.focus) first.focus();
    }

    /* События полей */
    FIELDS.forEach(function (name) {
      var el = field(name);
      if (!el || !el.addEventListener) return;

      if (el.type === 'checkbox') {
        el.addEventListener('change', function () {
          touched[name] = true;
          validateField(name);
        });
        return;
      }

      el.addEventListener('blur', function () {
        // Пустое поле, которое пользователь просто пролистал табом, не ругаем.
        if (!touched[name] && !el.value) return;
        touched[name] = true;
        validateField(name);
      });

      el.addEventListener('input', function () {
        if (name === 'phone') applyPhoneMask(el);
        if (el.value) touched[name] = true;
        // Если ошибка уже показана, убираем её сразу после исправления.
        if (el.getAttribute('aria-invalid') === 'true') validateField(name);
      });

      if (name === 'phone') el.addEventListener('keydown', onPhoneKeydown);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send();
    });

    if (retryBtn) retryBtn.addEventListener('click', send);
    if (againBtn) againBtn.addEventListener('click', resetForm);

    if (simulateLink) {
      simulateLink.addEventListener('click', function (e) {
        e.preventDefault();
        if (form.hidden) resetForm();
        forceErrorOnce = true;
        setHint(TEXT_SIMULATE_HINT);
        // Форма заполнена: сразу отправляем. Иначе ведём к первому незаполненному полю.
        var res = GL.validateLead(getValues());
        if (res.valid) send();
        else focusFirstInvalid(res.errors);
      });
    }

    setHint('');
  }

  function init() {
    var forms = document.querySelectorAll('form[data-lead-form]');
    Array.prototype.forEach.call(forms, initForm);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
