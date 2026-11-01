// Принимает заявки с сайта (бронь и мероприятия) и пересылает их менеджеру в Telegram.
// Токен бота и чаты задаются в Netlify: Project configuration → Environment variables
//   TG_BOT_TOKEN — токен от @BotFather
//   TG_CHAT_IDS  — id чатов через запятую (менеджер, группа и т. п.)

const MAX = { name: 80, phone: 40, telegram: 64, comment: 1000, field: 80 };
const esc = (v) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const cut = (v, n) => String(v ?? '').trim().slice(0, n);
const ruDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('.') : d);
const DEP = { 'VIP room': '15 000 ₽', 'Premium room': '30 000 ₽' };

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false });

  const token = process.env.TG_BOT_TOKEN;
  const chats = (process.env.TG_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) return json(503, { ok: false, error: 'not_configured' });

  let p;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return json(413, { ok: false });
    p = JSON.parse(raw);
  } catch {
    return json(400, { ok: false });
  }

  // Ловушка для ботов: скрытое поле заполнено или форму отправили слишком быстро — делаем вид, что всё ок
  if (p.website || Number(p.t) < 3000) return json(200, { ok: true });

  const name = cut(p.name, MAX.name);
  const phone = cut(p.phone, MAX.phone);
  if (!name || phone.replace(/\D/g, '').length < 10) return json(400, { ok: false, error: 'invalid' });

  const comment = cut(p.comment, MAX.comment);
  const en = p.lang === 'en' ? ' 🇬🇧' : '';
  let lines;

  if (p.type === 'party') {
    lines = [
      `<b>Заявка на мероприятие — Dynasty Lounge</b>${en}`, '',
      `<b>Формат:</b> ${esc(cut(p.format, MAX.field))}`,
      `<b>Дата:</b> ${esc(ruDate(cut(p.date, 20)))}`,
      `<b>Гостей:</b> ${esc(cut(p.guests, 5))}`, '',
      `<b>Имя:</b> ${esc(name)}`,
      `<b>Телефон:</b> ${esc(phone)}`,
    ];
  } else {
    const hall = cut(p.hall, MAX.field);
    const tg = cut(p.telegram, MAX.telegram).replace(/^@?/, '@');
    const via = cut(p.contact_via, MAX.field);
    const call = /звон|call/i.test(via);
    lines = [
      `<b>Новая бронь — Dynasty Lounge</b>${en}`, '',
      `<b>Дата:</b> ${esc(ruDate(cut(p.date, 20)))}`,
      `<b>Время:</b> ${esc(cut(p.time, 10))}`,
      `<b>Гостей:</b> ${esc(cut(p.guests, 5))}`,
      `<b>Зал:</b> ${esc(hall)}${DEP[hall] ? ` — депозит ${DEP[hall]}, без учёта алкоголя` : ''}`, '',
      `<b>Имя:</b> ${esc(name)}`,
      `<b>Телефон:</b> ${esc(phone)}`,
    ];
    if (tg.length > 1) lines.push(`<b>Telegram:</b> ${esc(tg)}`);
    lines.push(`<b>Связаться:</b> ${call ? 'позвонить по телефону' : 'написать в Telegram'}`);
  }
  if (comment) lines.push('', `<b>${p.type === 'party' ? 'Пожелания' : 'Комментарий'}:</b> ${esc(comment)}`);

  const results = await Promise.all(
    chats.map((chat_id) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
      })
        .then((r) => r.json())
        .then((j) => j.ok === true)
        .catch(() => false)
    )
  );

  return results.some(Boolean) ? json(200, { ok: true }) : json(502, { ok: false, error: 'telegram' });
};
