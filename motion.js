/* Progressive enhancement: content stays readable if motion cannot run. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const active = new Set();
  let paused = false;
  try { paused = localStorage.getItem('forma-life-motion-paused') === 'true'; } catch {}
  let reduced = preference.matches;
  const tracks = [];
  function addRibbon(after, words, theme, reverse) {
    const ribbon = document.createElement('div');
    ribbon.className = `motion-ribbon ${theme}${reverse ? ' ribbon-reverse' : ''}`;
    ribbon.setAttribute('role', 'region');
    ribbon.setAttribute('aria-label', words.join('. '));
    const viewport = document.createElement('div'); viewport.className = 'ribbon-viewport'; viewport.setAttribute('aria-hidden', 'true');
    const belt = document.createElement('div'); belt.className = 'ribbon-belt';
    const group = document.createElement('div'); group.className = 'ribbon-group';
    for (const word of words) {
      const text = document.createElement('span'); text.textContent = word;
      const star = document.createElement('i'); star.textContent = '✳';
      group.append(text, star);
    }
    belt.append(group, group.cloneNode(true)); viewport.append(belt);
    const button = document.createElement('button'); button.className = 'motion-toggle'; button.type = 'button';
    button.addEventListener('click', () => { paused = !paused; try { localStorage.setItem('forma-life-motion-paused', String(paused)); } catch {} sync(); });
    ribbon.append(viewport, button); after.after(ribbon); tracks.push(ribbon);
  }
  addRibbon(document.querySelector('.hero'), ['ПРОСТРАНСТВО БЫТЬ СОБОЙ', 'БОЛЬШЕ СВЕТА', 'БЛИЖЕ К ПРИРОДЕ'], 'ribbon-copper', false);
  addRibbon(document.querySelector('#details'), ['АРХИТЕКТУРА ВАШЕЙ ЖИЗНИ', 'ДОМ С ВАШИМ ХАРАКТЕРОМ'], 'ribbon-editorial', true);
  function sync() {
    const off = paused || reduced;
    root.classList.toggle('motion-paused', off);
    root.classList.toggle('motion-reduced', reduced);
    for (const ribbon of tracks) {
      const button = ribbon.querySelector('button');
      button.disabled = reduced;
      button.setAttribute('aria-label', reduced ? 'Движение отключено в настройках устройства' : paused ? 'Включить анимации сайта' : 'Приостановить анимации сайта');
      button.setAttribute('aria-pressed', String(off));
      button.textContent = reduced ? 'Без анимации' : paused ? '▷ Движение' : 'Ⅱ Пауза';
    }
    if (off) { active.forEach(animation => animation.finish()); active.clear(); }
  }
  preference.addEventListener('change', () => { reduced = preference.matches; sync(); });
  sync();
  const seen = new WeakSet();
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target; reveal.unobserve(element);
      if (seen.has(element)) continue;
      seen.add(element);
      if (paused || reduced || typeof element.animate !== 'function') continue;
      const index = Array.from(element.parentElement.children).indexOf(element);
      const card = element.matches('.project-card, .values > div, .journey-grid article, .package-grid article');
      const animation = element.animate([
        { opacity: 0, transform: `translateY(${card ? 34 : 25}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: card ? 780 : 950, delay: card ? (index % 3) * 85 : 0, easing: 'cubic-bezier(.2,.65,.2,1)', fill: 'backwards' });
      active.add(animation);
      animation.onfinish = () => active.delete(animation);
      animation.oncancel = () => active.delete(animation);
    }
  }, { threshold: .12, rootMargin: '0px 0px -15px 0px' });
  document.querySelectorAll('.section-intro, .editorial h2, .editorial-copy, .section-heading, .values > div, .material-photo, .material-copy, .journey > h2, .journey-grid article, .package-grid article, .exchange-copy, .contact-layout > div, .footer-top').forEach(element => reveal.observe(element));
  function watchCards() { document.querySelectorAll('.project-card').forEach(element => reveal.observe(element)); }
  watchCards();
  new MutationObserver(watchCards).observe(document.querySelector('#projectGrid'), { childList: true });
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('motion-offscreen', !entry.isIntersecting);
  }, { rootMargin: '80px' });
  tracks.forEach(ribbon => visibility.observe(ribbon));
  visibility.observe(document.querySelector('.hero'));
  document.addEventListener('visibilitychange', () => root.classList.toggle('motion-hidden', document.hidden));
  document.addEventListener('focusin', () => { active.forEach(animation => { if (animation.effect?.target?.contains(document.activeElement)) animation.finish(); }); });
})();
