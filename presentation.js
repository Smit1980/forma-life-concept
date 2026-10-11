'use strict';
(() => {
  const states = [
    ['Обращение принято', 'Контекст сохранён. Следующий шаг — назначить ответственного.'],
    ['Ответственный назначен', 'В примере менеджер Анна видит проект и пожелания. Задача первого контакта появилась в её очереди.'],
    ['Разговор запланирован', 'В карточке зафиксированы вечерний звонок и вопросы по участку. Покупатель не повторяет вводные с нуля.'],
    ['Продолжение под контролем', 'После отправки материалов назначено уточнение решения. Нет следующего действия — руководитель видит обращение в списке внимания.']
  ];
  let current = 0;
  const next = document.querySelector('#crmNext');
  function render() {
    const box = document.querySelector('#crmState');
    box.querySelector('h4').textContent = states[current][0];
    box.querySelector('p').textContent = states[current][1];
    document.querySelectorAll('#crmSteps li').forEach((item, i) => {
      if (i === current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    next.disabled = current === states.length - 1;
    next.firstChild.textContent = next.disabled ? 'Сценарий пройден ' : 'Следующий шаг ';
  }
  next.addEventListener('click', () => { current = Math.min(current + 1, states.length - 1); render(); });
  document.querySelector('#crmReset').addEventListener('click', () => { current = 0; render(); next.focus(); });
  document.querySelector('#copyDiscussion').addEventListener('click', async () => {
    const text = 'Здравствуйте! Посмотрели концепт FORMA LIFE. Хотим обсудить адаптацию сайта под наши проекты и порядок обработки обращений. Предложите удобное время для короткого разговора.';
    const status = document.querySelector('#copyStatus');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Запрос скопирован. Отправьте его в канал, где получили презентацию. Автоматической отправки нет.'; }
    catch { status.textContent = text; }
  });
})();
