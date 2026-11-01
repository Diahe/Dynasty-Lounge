window.DCAfterRender = function (root, comp) {
  var btn = root.querySelector('[data-submit]'), msg = root.querySelector('[data-submit-msg]');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var f = function (k) { var el = root.querySelector('[data-key="' + k + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
    var name = f('f2'), phone = f('f3');
    var warn = function (t) { msg.textContent = t; msg.style.color = '#FF9E9E'; };
    if (!name) return warn('Укажите, как к вам обращаться.');
    if (phone.replace(/\D/g, '').length < 10) return warn('Укажите телефон, чтобы менеджер мог подтвердить бронь.');
    if (!f('f6')) return warn('Отметьте согласие на обработку персональных данных.');
    var halls = { any: 'Любой', big: 'Большой зал', small: 'Малый зал', vip: 'VIP room', premium: 'Premium room' };
    var s = comp.state;
    var d = f('f0').split('-');
    var lines = [
      'Заявка на бронь — Dynasty Lounge', '',
      'Дата: ' + (d.length === 3 ? d[2] + '.' + d[1] + '.' + d[0] : f('f0')),
      'Время: ' + f('f1'),
      'Гостей: ' + s.guests,
      'Зал: ' + (halls[s.hall] || s.hall),
      'Имя: ' + name,
      'Телефон: ' + phone,
      'Telegram: ' + (f('f4') || '—'),
      'Связаться: ' + (s.via === 'call' ? 'звонком' : 'в Telegram'),
      'Комментарий: ' + (f('f5') || '—')
    ];
    location.href = 'mailto:dynastylounge@bk.ru?subject=' + encodeURIComponent('Бронь: ' + f('f0') + ' ' + f('f1') + ', ' + s.guests + ' гост.') + '&body=' + encodeURIComponent(lines.join('\n'));
    msg.style.color = '';
    msg.textContent = 'Почта открыта с готовой заявкой — нажмите «Отправить». Если не открылась, напишите нам в Telegram @dynastylounge.';
  });
};
