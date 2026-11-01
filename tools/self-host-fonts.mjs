// Запускается на Netlify при каждой публикации (build command).
// Скачивает шрифты Google Fonts, кладёт их в site/fonts/ и переписывает ссылки в страницах,
// чтобы сайт не зависел от Google при открытии. Если скачать не вышло — страницы остаются как были.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const SITE = path.resolve('site');
const OUT = path.join(SITE, 'fonts');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const LINK = /<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)">/g;
const PRECONNECT = /<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"( crossorigin)?>\n?/g;
const KEEP_SUBSETS = new Set(['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext']);

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);
const decode = (s) => s.replace(/&amp;/g, '&');

async function listHtml(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'fonts') out.push(...(await listHtml(p))); }
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

async function localize(href) {
  const res = await fetch(decode(href), { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`css ${res.status}`);
  const css = await res.text();
  // Блоки @font-face идут с комментарием подмножества: /* cyrillic */ @font-face {...}
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]+})/g)];
  if (!blocks.length) throw new Error('no @font-face blocks');
  let outCss = '';
  for (const [, subset, block] of blocks) {
    if (!KEEP_SUBSETS.has(subset)) continue;
    const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;
    const name = `${hash(url)}.woff2`;
    const font = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!font.ok) throw new Error(`font ${font.status}`);
    await writeFile(path.join(OUT, name), Buffer.from(await font.arrayBuffer()));
    outCss += `/* ${subset} */\n${block.replace(url, `/fonts/${name}`)}\n`;
  }
  const cssName = `${hash(href)}.css`;
  await writeFile(path.join(OUT, cssName), outCss);
  return `/fonts/${cssName}`;
}

try {
  await mkdir(OUT, { recursive: true });
  const files = await listHtml(SITE);
  const map = new Map();
  for (const f of files) for (const m of (await readFile(f, 'utf8')).matchAll(LINK)) map.set(m[1], null);
  for (const href of map.keys()) map.set(href, await localize(href));
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    const next = html
      .replace(LINK, (all, href) => `<link rel="stylesheet" href="${map.get(href)}">`)
      .replace(PRECONNECT, '');
    if (next !== html) await writeFile(f, next);
  }
  console.log(`Fonts self-hosted: ${map.size} stylesheet(s), ${files.length} page(s)`);
} catch (e) {
  console.warn('Fonts left on Google Fonts:', e.message);
}
