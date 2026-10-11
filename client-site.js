'use strict';
(() => {
  const film = document.querySelector('#houseFilm');
  if (!film) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = () => { if (document.hidden || preference.matches || document.documentElement.classList.contains('motion-paused')) film.pause(); };
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) film.pause(); }, {threshold: .1}).observe(film);
  document.addEventListener('visibilitychange', pause);
  preference.addEventListener('change', pause);
  new MutationObserver(pause).observe(document.documentElement, {attributes:true, attributeFilter:['class']});
  film.addEventListener('error', () => {
    if (document.querySelector('#filmError')) return;
    const message = document.createElement('p');
    message.id = 'filmError'; message.setAttribute('role','status');
    message.textContent = 'Видео сейчас недоступно. Посмотрите дом в обзоре 360° выше.';
    film.after(message);
  });
})();
