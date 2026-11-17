#!/usr/bin/env node
// Автопроверки сайта по docs/spec.md. Без зависимостей, нужен только Node.js 18+.
//
//   node scripts/check.mjs            мягкая проверка (для разработки: проверяет то, что уже есть)
//   node scripts/check.mjs --strict   полная проверка (для финала: всё должно быть на месте)
//   node scripts/check.mjs --hook     режим хука Stop в Claude Code (не зацикливается)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const HOOK = args.includes('--hook');

const errors = [];
const warnings = [];
const rel = (p) => path.relative(ROOT, p) || '.';
const fail = (ac, file, msg) => errors.push(`[${ac}] ${file ? rel(file) + ': ' : ''}${msg}`);
const warn = (ac, file, msg) => warnings.push(`[${ac}] ${file ? rel(file) + ': ' : ''}${msg}`);

// --- режим хука: не мешать, если рано или если уже просили исправить ---
if (HOOK) {
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { /* нет stdin */ }
  try {
    const payload = JSON.parse(stdin || '{}');
    if (payload.stop_hook_active) process.exit(0);
  } catch { /* не JSON, продолжаем */ }
  if (!fs.existsSync(SITE) || !listFiles(SITE).length) process.exit(0);
}

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

// --- данные проекта ---
let facts = { allowed_numeric_claims: [], forbidden_words: [] };
try { facts = JSON.parse(read(path.join(ROOT, 'docs/facts.json'))); }
catch { warn('AC-08', path.join(ROOT, 'docs/facts.json'), 'не удалось прочитать facts.json'); }
const allowedClaims = (facts.allowed_numeric_claims || []).map((s) => norm(s));
const forbiddenWords = (facts.forbidden_words || []).map((s) => s.toLowerCase());

const PAGES = [
  { id: 'kitchens', file: 'site/kitchens/index.html', copy: 'docs/copy-kitchens.md', demos: ['d1', 'd2', 'd3', 'd5', 'd4'] },
  // Вход в корне сайта: сразу переводит на kitchens/ (ТЗ 2.0, раздел 2)
  { id: 'root', file: 'site/index.html', demos: [], redirectTo: 'kitchens/index.html' },
  // Страница «не найдено»: хостинг отдаёт её по любому неверному адресу
  { id: '404', file: 'site/404.html', demos: [] },
];
const FORM_FIELDS = ['name', 'phone', 'email', 'city', 'points', 'consent_pd', 'consent_ads'];

// --- вспомогательные функции для HTML ---
function norm(s) { return String(s).toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}
function hasAttr(tag, name) { return new RegExp('[\\s"\']' + name + '(?=[\\s=/>])', 'i').test(tag); }
const tagName = (tag) => (tag.match(/^<\s*([a-zA-Z0-9-]+)/) || [])[1]?.toLowerCase();
const isExternal = (u) => /^(https?:)?\/\//i.test(u);
const isSkippable = (u) => !u || /^(mailto:|tel:|#|data:|javascript:)/i.test(u);

function resolveRef(pageFile, ref) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  let target = clean.startsWith('/') ? path.join(SITE, clean) : path.resolve(path.dirname(pageFile), clean);
  if (clean.endsWith('/')) target = path.join(target, 'index.html');
  return target;
}

// --- проверки страницы ---
function checkPage(page) {
  const file = path.join(ROOT, page.file);
  if (!exists(file)) {
    if (STRICT) fail('AC-01', file, 'страница не найдена');
    return;
  }
  const html = read(file);
  const text = visibleText(html);
  const tags = html.match(/<[a-zA-Z][^>]*>/g) || [];

  // AC-02 основы страницы
  if (!/<html[^>]*\blang\s*=\s*["']?ru/i.test(html)) fail('AC-02', file, 'у <html> нет lang="ru"');
  if (!tags.some((t) => tagName(t) === 'meta' && /name\s*=\s*["']viewport["']/i.test(t))) fail('AC-02', file, 'нет meta viewport');
  if (!/<title>\s*\S[\s\S]*?<\/title>/i.test(html)) fail('AC-02', file, 'пустой или отсутствующий <title>');
  if (!tags.some((t) => tagName(t) === 'meta' && /name\s*=\s*["']description["']/i.test(t) && (attr(t, 'content') || '').trim())) fail('AC-02', file, 'нет meta description');
  const h1s = html.match(/<h1\b[\s\S]*?<\/h1>/gi) || [];
  if (h1s.length !== 1) fail('AC-02', file, `должен быть ровно один h1, найдено ${h1s.length}`);

  // AC-03 внешние зависимости и ES-модули
  for (const t of tags) {
    const n = tagName(t);
    if (n === 'a') continue;
    for (const a of ['src', 'href', 'poster']) {
      const v = attr(t, a);
      if (v && isExternal(v)) {
        if (n === 'link' && /rel\s*=\s*["']?(canonical|alternate)/i.test(t)) continue;
        fail('AC-03', file, `внешний ресурс <${n} ${a}="${v}">`);
      }
    }
    if (n === 'script' && /type\s*=\s*["']module["']/i.test(t)) fail('AC-03', file, 'скрипт type="module", нужны классические скрипты');
    if (n === 'iframe') fail('AC-03', file, 'iframe не используем');
  }

  // AC-04 внутренние ссылки и ресурсы
  for (const t of tags) {
    for (const a of ['src', 'href', 'poster']) {
      const v = attr(t, a);
      if (!v || isSkippable(v) || isExternal(v)) continue;
      const target = resolveRef(file, v);
      if (target && !exists(target)) {
        (STRICT ? fail : warn)('AC-04', file, `ссылка на несуществующий файл: ${v}`);
      }
    }
  }

  // AC-05 заглушки и запрещённые слова
  const lowText = text.toLowerCase();
  for (const w of forbiddenWords) {
    const isLatin = /^[a-z0-9№ ]+$/i.test(w);
    const hit = isLatin ? new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i').test(lowText) : lowText.includes(w);
    if (hit) fail('AC-05', file, `запрещённое слово или заглушка: «${w}»`);
  }

  // AC-06 сноска
  if (!/Тестовое задание/i.test(text)) fail('AC-06', file, 'нет сноски «Тестовое задание…» в подвале');

  // AC-01 вход в корне переводит на страницу
  if (page.redirectTo) {
    const refresh = tags.find((t) => tagName(t) === 'meta' && /http-equiv\s*=\s*["']refresh["']/i.test(t));
    if (!refresh || !(attr(refresh, 'content') || '').includes(page.redirectTo)) fail('AC-01', file, `нет meta refresh на ${page.redirectTo}`);
    if (!tags.some((t) => tagName(t) === 'a' && attr(t, 'href') === page.redirectTo)) fail('AC-01', file, `нет обычной ссылки на ${page.redirectTo}`);
  }

  // AC-07 h1 совпадает с copy-файлом
  if (page.copy) {
    const copyFile = path.join(ROOT, page.copy);
    if (exists(copyFile)) {
      const m = read(copyFile).match(/^H1:\s*(.+)$/m);
      const h1Text = h1s[0] ? visibleText(h1s[0]) : '';
      if (m && norm(h1Text) !== norm(m[1])) fail('AC-07', file, `h1 «${h1Text}» не совпадает с copy-файлом «${m[1].trim()}»`);
      if (!m) warn('AC-07', copyFile, 'в copy-файле нет строки «H1: …»');
    }
  }

  // AC-08 числовые утверждения
  const claimRe = /[+−\-–]?\s?\d[\d\s.,]*\s*(?:%|млн|тыс\.?|₽|руб\.?)/gi;
  for (const m of text.match(claimRe) || []) {
    const n = norm(m).replace(/^[+−\-–]\s?/, '').replace(/[.,\s]+$/, '');
    if (!allowedClaims.some((a) => n.includes(a))) fail('AC-08', file, `числовое утверждение «${m.trim()}» не из docs/facts.json`);
  }

  // AC-24 alt и подписи полей
  for (const t of tags) {
    if (tagName(t) === 'img' && attr(t, 'alt') === null) fail('AC-24', file, `у картинки нет alt: ${t.slice(0, 80)}`);
  }
  const labelFor = new Set((html.match(/<label\b[^>]*>/gi) || []).map((l) => attr(l, 'for')).filter(Boolean));
  const wrapped = (html.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) || []).join(' ');
  for (const t of tags) {
    const n = tagName(t);
    if (!['input', 'select', 'textarea'].includes(n)) continue;
    const type = (attr(t, 'type') || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;
    const id = attr(t, 'id');
    const ok = (id && labelFor.has(id)) || attr(t, 'aria-label') || attr(t, 'aria-labelledby') || wrapped.includes(t);
    if (!ok) fail('AC-24', file, `у поля нет подписи (label): ${t.slice(0, 80)}`);
  }

  // --- проверки полноты: только в --strict ---
  if (!STRICT || !page.demos.length) return;
  const jsAll = listFiles(path.join(SITE, 'assets')).filter((f) => f.endsWith('.js')).map(read).join('\n');
  const cssAll = listFiles(path.join(SITE, 'assets')).filter((f) => f.endsWith('.css')).map(read).join('\n');
  const both = html + '\n' + jsAll;

  // AC-21 и AC-10 демо
  for (const d of page.demos) {
    if (!new RegExp('data-demo\\s*=\\s*["\']' + d + '["\']', 'i').test(html)) fail('AC-21', file, `нет контейнера демо data-demo="${d}"`);
  }
  const resetBtns = (both.match(/Сбросить демо/gi) || []).length;
  if (page.demos.length && !/демо-данные вымышлены/i.test(text)) fail('AC-10', file, 'нет сноски «демо-данные вымышлены» в футере');
  if (resetBtns < page.demos.length) fail('AC-10', file, `кнопок «Сбросить демо» меньше, чем демо (${resetBtns} из ${page.demos.length})`);
  if (page.demos.includes('d5') && !/Не учитывает стоимость собственного канала/i.test(both)) fail('AC-10', file, 'у калькулятора нет оговорки про допущения и стоимость канала');

  // AC-11 и AC-12 форма
  for (const f of FORM_FIELDS) {
    if (!new RegExp('name\\s*=\\s*["\']' + f + '["\']', 'i').test(html)) fail('AC-11', file, `в форме нет поля name="${f}"`);
  }
  const pd = tags.find((t) => tagName(t) === 'input' && attr(t, 'name') === 'consent_pd');
  const ads = tags.find((t) => tagName(t) === 'input' && attr(t, 'name') === 'consent_ads');
  if (pd && !hasAttr(pd, 'required')) fail('AC-12', file, 'consent_pd должен быть required');
  if (ads && hasAttr(ads, 'required')) fail('AC-12', file, 'consent_ads не должен быть required');
  for (const t of [pd, ads]) if (t && hasAttr(t, 'checked')) fail('AC-12', file, 'чекбоксы согласий не должны быть включены по умолчанию');

  // AC-16 состояния формы
  if (!/aria-live/i.test(both)) fail('AC-16', file, 'нет aria-live для результата формы');
  if (!/role\s*=\s*["']alert["']/i.test(both)) fail('AC-16', file, 'нет role="alert" для ошибки отправки');
  if (!/role\s*=\s*["']status["']/i.test(both)) fail('AC-16', file, 'нет role="status" для успеха');
  if (!/Отправляем/i.test(both)) fail('AC-16', file, 'нет текста состояния загрузки «Отправляем…»');
  if (!/simulate/i.test(jsAll)) fail('AC-16', file, 'нет режима simulate=error для проверки ошибки');

  // AC-22 видео (возвращено решением Аси 2026-11-17): muted, loop, playsinline, poster
  const videos = tags.filter((t) => tagName(t) === 'video');
  if (!videos.length) fail('AC-22', file, 'на странице нет видео');
  for (const v of videos) for (const a of ['muted', 'loop', 'playsinline', 'poster']) if (!hasAttr(v, a)) fail('AC-22', file, `у <video> нет атрибута ${a}`);
}

// --- общие проверки файлов ---
function checkAssets() {
  const files = listFiles(SITE);
  if (!files.length) return;
  let total = 0;
  for (const f of files) {
    const size = fs.statSync(f).size;
    total += size;
    const ext = path.extname(f).toLowerCase();
    // лимит видео 4,5 МБ (решение Аси 2026-11-17)
    if (['.mp4', '.webm', '.mov'].includes(ext) && size > 4.5 * 1024 * 1024) fail('AC-22', f, `видео ${(size / 1048576).toFixed(1)} МБ, максимум 4,5 МБ`);
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext) && size > 300 * 1024) fail('AC-23', f, `картинка ${(size / 1024).toFixed(0)} КБ, максимум 300 КБ`);
    if (ext === '.css') {
      const css = read(f);
      if (/url\(\s*["']?(https?:)?\/\//i.test(css) || /@import\s+(url\()?\s*["']?(https?:)?\/\//i.test(css)) fail('AC-03', f, 'внешний ресурс в CSS');
    }
    if (ext === '.js') {
      const js = read(f);
      if (/^\s*(import\s.+from|export\s)/m.test(js)) fail('AC-03', f, 'ES-модуль (import/export), нужны классические скрипты');
      if (/-logic\.js$/.test(f) && !/module\.exports/.test(js)) fail('AC-25', f, 'нет UMD-экспорта (module.exports) для тестов');
      if (/\bconsole\.log\(/.test(js)) warn('AC-24', f, 'остался console.log');
    }
  }
  if (total > 5 * 1024 * 1024) fail('AC-23', SITE, `сайт весит ${(total / 1048576).toFixed(1)} МБ, максимум 5 МБ`);
}

// --- запуск ---
if (!fs.existsSync(SITE) || !listFiles(SITE).length) {
  if (STRICT) fail('AC-01', SITE, 'папка site/ пуста');
  else console.log('site/ пока пуста, проверять нечего.');
} else {
  for (const p of PAGES) checkPage(p);
  checkAssets();
}

const mode = STRICT ? 'строгий' : 'мягкий';
const out = [];
for (const w of warnings) out.push('ПРЕДУПРЕЖДЕНИЕ ' + w);
for (const e of errors) out.push('ОШИБКА ' + e);
out.push(`ИТОГ (${mode} режим): ошибок ${errors.length}, предупреждений ${warnings.length}`);
const text = out.join('\n');
if (errors.length) {
  if (HOOK) { process.stderr.write('Автопроверка нашла ошибки. Исправь их перед завершением:\n' + text + '\n'); process.exit(2); }
  console.log(text);
  process.exit(1);
}
console.log(text);
