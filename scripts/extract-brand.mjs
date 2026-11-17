#!/usr/bin/env node
// Достаёт цвета, шрифты и скругления с сайта и пишет docs/brand.extracted.md.
// Использование: node scripts/extract-brand.mjs https://goulash.tech
// Нужен Node.js 18+ и доступ в интернет. Результат автоматический: проверьте глазами.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] || 'https://goulash.tech';
const OUT = path.join(ROOT, 'docs/brand.extracted.md');
const MAX_CSS_FILES = 12;
const MAX_BYTES = 2_000_000;

async function get(u) {
  const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (brand-extract)' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${u}: HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new Error(`${u}: файл больше ${MAX_BYTES} байт`);
  return new TextDecoder('utf-8').decode(buf);
}

const count = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const top = (arr, n) => count(arr).slice(0, n);

function toHex(c) {
  c = c.trim().toLowerCase();
  let m = c.match(/^#([0-9a-f]{3})$/);
  if (m) return '#' + [...m[1]].map((x) => x + x).join('');
  m = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) return '#' + m[1] + (m[2] && m[2] !== 'ff' ? ' (с прозрачностью ' + m[2] + ')' : '');
  m = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const h = [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
    return '#' + h + (m[4] && m[4] !== '1' ? ' (прозрачность ' + m[4] + ')' : '');
  }
  return c;
}

try {
  const html = await get(url);
  const base = new URL(url);
  const hrefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((t) => /rel\s*=\s*["']?stylesheet/i.test(t))
    .map((t) => (t.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1])
    .filter(Boolean)
    .map((h) => new URL(h, base).href)
    .slice(0, MAX_CSS_FILES);
  const fontLinks = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
    .filter((t) => /fonts\.(googleapis|gstatic)|\.woff2?/i.test(t))
    .map((t) => (t.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]).filter(Boolean);
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);

  const cssParts = [...inline];
  const loaded = [];
  for (const h of hrefs) {
    try { cssParts.push(await get(h)); loaded.push(h); }
    catch (e) { console.warn('Не удалось скачать CSS:', e.message); }
  }
  const css = cssParts.join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  if (!css.trim()) throw new Error('CSS не найден. Возможно, стили подгружаются скриптом. Используйте ручной способ из docs/brand.md.');

  const vars = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)[;}]/g)].map((m) => [m[1], m[2].trim()]);
  const uniqueVars = [...new Map(vars).entries()].slice(0, 80);
  const colors = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g)].map((m) => toHex(m[0]));
  const fonts = [...css.matchAll(/font-family\s*:\s*([^;}{]+)[;}]/gi)].map((m) => m[1].trim().replace(/\s+/g, ' '));
  const faces = [...css.matchAll(/@font-face\s*{[^}]*}/gi)].map((m) => {
    const fam = (m[0].match(/font-family\s*:\s*([^;}]+)/i) || [])[1];
    const src = (m[0].match(/url\(["']?([^)"']+)["']?\)/i) || [])[1];
    return `${(fam || '?').trim()} (${src ? src.split('/').pop().split('?')[0] : 'без файла'})`;
  });
  const radii = [...css.matchAll(/border-radius\s*:\s*([^;}{]+)[;}]/gi)].map((m) => m[1].trim());
  const rootRules = [...css.matchAll(/(?:^|[}\s,])(html|body)\s*(?:,\s*(?:html|body)\s*)?\{([^}]*)\}/gi)]
    .map((m) => `${m[1]} { ${m[2].trim().replace(/\s+/g, ' ')} }`).slice(0, 6);

  const lines = [];
  lines.push('# Автоматически извлечённые стили', '');
  lines.push(`Источник: ${url}. Получено: ${new Date().toISOString().slice(0, 10)}.`);
  lines.push('Это подсказка, а не истина. Сверьте значения с видом сайта и перенесите нужные в `docs/brand.md`.', '');
  lines.push('## Правила для html и body', '', ...(rootRules.length ? rootRules.map((r) => '- `' + r + '`') : ['- не найдено']), '');
  lines.push('## Переменные CSS (custom properties)', '', ...(uniqueVars.length ? uniqueVars.map(([k, v]) => `- \`${k}\`: ${v}`) : ['- не найдены']), '');
  lines.push('## Самые частые цвета', '', ...top(colors, 24).map(([c, n]) => `- ${c} (${n})`), '');
  lines.push('## Самые частые шрифты (font-family)', '', ...top(fonts, 8).map(([f, n]) => `- ${f} (${n})`), '');
  lines.push('## Подключённые шрифты (@font-face и ссылки)', '', ...(faces.length || fontLinks.length ? [...new Set(faces), ...fontLinks.map((l) => l)].map((x) => `- ${x}`) : ['- не найдены']), '');
  lines.push('## Скругления (border-radius)', '', ...top(radii, 8).map(([r, n]) => `- ${r} (${n})`), '');
  lines.push('## Какие CSS-файлы разобраны', '', ...(loaded.length ? loaded.map((l) => `- ${l}`) : ['- только встроенные стили']), '');
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log('Готово: ' + path.relative(ROOT, OUT));
  console.log(`Найдено: цветов ${colors.length}, шрифтовых правил ${fonts.length}, скруглений ${radii.length}, переменных ${uniqueVars.length}.`);
} catch (e) {
  console.error('Не получилось: ' + e.message);
  console.error('Сделайте вручную по инструкции в конце docs/brand.md (DevTools, вкладка Styles).');
  process.exit(1);
}
