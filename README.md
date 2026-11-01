# Dynasty Lounge

Сайт кальянной Dynasty Lounge (Москва). Публикуется на Netlify из ветки `main`.

- `site/` — страницы сайта (русская версия, `site/en/` — английская)
- `netlify/functions/booking.mjs` — принимает заявки на бронь и мероприятия и пересылает их в Telegram

## Заявки в Telegram

В Netlify → Project configuration → Environment variables:

- `TG_BOT_TOKEN` — токен бота от @BotFather
- `TG_CHAT_IDS` — id чатов, куда слать заявки, через запятую

Пока переменные не заданы, форма предлагает гостю отправить заявку самому (Telegram, SMS, почта).
