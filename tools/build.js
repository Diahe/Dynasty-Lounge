// Converts the Design canvas pages (.dc.html) into plain static pages for free hosting.
const fs = require('fs'), path = require('path');
const SRC = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const runtime = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8');
const submitJs = fs.readFileSync(path.join(__dirname, 'submit.js'), 'utf8');

const PAGES = {
  'Main.dc.html': { out: 'index.html', title: 'Dynasty Lounge — кальянная в Москве', desc: 'Dynasty Lounge — кальянная в Москве: большой и малый залы, VIP-комнаты с PS5, Premium-комната с бильярдом. Японская кухня, чайная и барная карта, DJ-сеты, живая музыка, стендап и караоке. Скидка в день рождения.' },
  'Food.dc.html': { out: 'food.html', title: 'Кухня — Dynasty Lounge', desc: 'Меню кухни Dynasty Lounge: роллы, сашими, рамен, поке, пицца, бургеры, десерты, лимонады и кофе.' },
  'Tea.dc.html': { out: 'tea.html', title: 'Чайная карта — Dynasty Lounge', desc: 'Чайная карта Dynasty Lounge: пуэры, улуны, зелёные и красные чаи.' },
  'Bar.dc.html': { out: 'bar.html', title: 'Барная карта — Dynasty Lounge', desc: 'Барная карта Dynasty Lounge: коктейли и напитки.' },
};
const relink = s => s.replace(/(href=")(Main|Food|Tea|Bar)\.dc\.html/g, (_, a, n) => a + PAGES[n + '.dc.html'].out);

for (const [file, meta] of Object.entries(PAGES)) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8');
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  let body = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const script = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];

  body = relink(body)
    .replace(/<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="([^"]+)"[^>]*>/g, '<template data-for="$1" data-as="$2">')
    .replace(/<\/sc-for>/g, '</template>')
    .replace(/<sc-if\s+value="\{\{\s*([^}]+?)\s*\}\}"[^>]*>/g, '<template data-if="$1">')
    .replace(/<\/sc-if>/g, '</template>')
    .replace(/onClick="\{\{\s*([^}]+?)\s*\}\}"/g, 'data-on-click="$1"')
    .replace(/defaultValue=/g, 'defaultvalue=');
  let k = 0;
  body = body.replace(/<(input|select|textarea)\b/g, m => `${m} data-key="f${k++}"`);
  if (file === 'Main.dc.html') {
    body = body.replace(/<button type="button"( style="[^"]*")>Отправить заявку<\/button>\s*<p( style="[^"]*")>[^<]*<\/p>/,
      '<button type="button" data-submit$1>Отправить заявку</button>\n<p data-submit-msg$2>Откроется почта с готовой заявкой — нажмите «Отправить», и менеджер свяжется с вами для подтверждения.</p>');
    if (!body.includes('data-submit')) throw new Error('submit button not found');
    const before = body;
    body = body.replace(/заявка сразу придёт менеджеру, и он/, 'заявка придёт менеджеру на почту, и он');
    if (body === before) console.warn('booking intro text not found');
  }

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.desc}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#08060C">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${helmet.trim()}
<style>html{scroll-behavior:smooth}input,select,textarea,button{font:inherit}</style>
</head>
<body>
<div id="app"><!--PRERENDER--></div>
<template id="tpl">${body}</template>
<script>${runtime}</script>
<script>${script}
${file === 'Main.dc.html' ? submitJs : ''}
DCMount(Component);</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, meta.out), html);
  console.log(meta.out, html.length);
}
fs.writeFileSync(path.join(OUT, 'favicon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#08060C"/><text x="32" y="44" text-anchor="middle" font-family="Georgia,serif" font-size="38" font-weight="600" fill="#B394FF">D</text></svg>');
