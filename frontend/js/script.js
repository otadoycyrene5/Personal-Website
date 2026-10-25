(() => {
  'use strict';

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = Array.from(document.querySelectorAll('nav a'));
  const navigation = document.querySelector('.topbar');
  const root = document.documentElement;

  function updateScrollLayout() {
    // offsetHeight ignores the navigation's entrance transform.
    const offset = Math.ceil(parseFloat(getComputedStyle(navigation).top) + navigation.offsetHeight + 24);
    const contact = document.querySelector('.contact');
    const footer = document.querySelector('footer');
    // A short final section still needs enough document space to reach its anchor.
    const tail = Math.max(0, window.innerHeight - offset - contact.offsetHeight - footer.offsetHeight);
    const changed = root.style.getPropertyValue('--nav-scroll-offset') !== `${offset}px`
      || root.style.getPropertyValue('--navigation-tail-space') !== `${tail}px`;
    if (changed) {
      root.style.setProperty('--nav-scroll-offset', `${offset}px`);
      root.style.setProperty('--navigation-tail-space', `${tail}px`);
    }
    return changed;
  }
  updateScrollLayout();

  // Native anchors remain usable with no JavaScript or unavailable animation scripts.
  function updateNavigation() {
    // Highlight the section at the navigation edge, not one farther down the viewport.
    const marker = parseFloat(root.style.getPropertyValue('--nav-scroll-offset')) + 8;
    let active = sections[0]?.id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) active = section.id;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = sections.at(-1)?.id;
    }
    navLinks.forEach((link) => {
      if (link.hash === `#${active}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let navigationPending = false;
  function scheduleNavigation() {
    if (navigationPending) return;
    navigationPending = true;
    requestAnimationFrame(() => {
      updateNavigation();
      navigationPending = false;
    });
  }
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', () => {
    updateScrollLayout();
    scheduleNavigation();
  });
  if ('ResizeObserver' in window) {
    const layoutObserver = new ResizeObserver(() => {
      if (updateScrollLayout()) {
        window.ScrollTrigger?.refresh();
        scheduleNavigation();
      }
    });
    [navigation, document.querySelector('.contact'), document.querySelector('footer')]
      .forEach(element => layoutObserver.observe(element));
  }
  updateNavigation();

  setupProjectGallery();

  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const entrance = {
    duration: 0.75,
    ease: 'power2.out',
    clearProps: 'transform,opacity,visibility',
  };
  let hasIntroduced = false;

  try {
    media.add({
      motion: '(prefers-reduced-motion: no-preference)',
      mobile: '(max-width: 760px)',
      compact: '(max-width: 520px)',
      tablet: '(max-width: 1000px)',
      reduced: '(prefers-reduced-motion: reduce)',
    }, ({ conditions }) => {
      if (conditions.reduced) return;
      const distance = conditions.mobile ? 16 : 28;
      const cards = gsap.utils.toArray('.project-card');

      // Responsive changes should never replay the page-load introduction.
      if (!hasIntroduced) {
        hasIntroduced = true;
        const intro = gsap.timeline({ defaults: entrance });
        intro.addLabel('hello')
          .from('.topbar', { autoAlpha: 0, y: -10 }, 'hello')
          .from('.hero-copy > .eyebrow, .hero-greeting', {
            autoAlpha: 0, y: 12, stagger: 0.08,
          }, 'hello+=0.08')
          .from('h1', { autoAlpha: 0, y: distance, duration: 0.95 }, 'hello+=0.16')
          .from('.hero-sub, .hero-actions', {
            autoAlpha: 0, y: 16, stagger: 0.1,
          }, 'hello+=0.28')
          .from('.hero-art', { autoAlpha: 0, y: 22, duration: 1.1 }, 'hello+=0.2')
          .from('.hero-bottom > *', { autoAlpha: 0, y: 8, stagger: 0.08 }, 'hello+=0.5');
      }

      // Waiting content is never hidden; start states apply only on viewport entry.
      document.querySelectorAll('.section-heading').forEach((heading) => {
        const timeline = gsap.timeline({
          defaults: { ...entrance, immediateRender: false },
          scrollTrigger: { trigger: heading, start: 'clamp(top 87%)', once: true },
        }).from(heading.querySelector('.eyebrow'), { autoAlpha: 0, y: 8 }, 0)
          .from(heading.querySelector('.title-line'), { autoAlpha: 0, yPercent: 105, duration: 0.9 }, 0.08);
        const descriptions = heading.querySelectorAll('p');
        if (descriptions.length) timeline.from(descriptions, { autoAlpha: 0, y: 12 }, 0.18);
      });

      function reveal(targets, trigger, stagger = 0.08) {
        gsap.from(targets, {
          ...entrance,
          autoAlpha: 0,
          y: distance,
          stagger,
          immediateRender: false,
          scrollTrigger: { trigger, start: 'clamp(top 90%)', once: true },
        });
      }
      reveal('.about-photo', '.about-photo');
      reveal('.about-copy > *', '.about-copy');
      const columns = conditions.compact ? 1 : conditions.tablet ? 2 : cards.length;
      for (let index = 0; index < cards.length; index += columns) {
        reveal(cards.slice(index, index + columns), cards[index], 0.08);
      }
      const skills = gsap.utils.toArray('.skill-card');
      const skillColumns = conditions.tablet ? 2 : 4;
      for (let index = 0; index < skills.length; index += skillColumns) {
        reveal(skills.slice(index, index + skillColumns), skills[index], 0.07);
      }
      gsap.timeline({
        defaults: { ...entrance, immediateRender: false },
        scrollTrigger: { trigger: '.contact-panel', start: 'clamp(top 85%)', once: true },
      }).from('.contact-panel', { autoAlpha: 0, y: distance }, 0)
        .from('.contact h2', { autoAlpha: 0, y: 18 }, 0.12)
        .from('.contact-panel > .button, .email-link', { autoAlpha: 0, y: 10, stagger: 0.1 }, 0.24);

      gsap.fromTo('.portrait-frame img', { scale: 1.14, yPercent: -3 }, {
        scale: 1.07, yPercent: 3, ease: 'none',
        scrollTrigger: { trigger: '.about-photo', start: 'clamp(top bottom)', end: 'clamp(bottom top)', scrub: 0.7 },
      });
      // Depth changes track scroll, independently of the page-load reveal.
      gsap.to('.intro-card', {
        y: conditions.mobile ? 20 : 55, rotation: 1, scale: 0.96, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
      });
      gsap.fromTo('.contact h2 em', { y: 16 }, {
        y: -6, ease: 'none',
        scrollTrigger: { trigger: '.contact-panel', start: 'clamp(top bottom)', end: 'clamp(bottom center)', scrub: 0.8 },
      });
      gsap.to('.orb-pink', {
        y: 65, x: 25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.to('.orb-rose', {
        y: -50, x: -25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
      gsap.from('.contact-star', {
        ...entrance, rotation: -40, immediateRender: false, duration: 1.2,
        scrollTrigger: { trigger: '.contact-panel', start: 'clamp(top 85%)', once: true },
      });

      const floating = gsap.to('.floating-tag, .star-hero', {
        y: (index) => index % 2 ? -7 : 7,
        duration: 3.4, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.35, paused: true,
      });
      const heroVisibility = ScrollTrigger.create({
        trigger: '.hero', start: 'top bottom', end: 'bottom top',
        onToggle: (self) => self.isActive && !document.hidden ? floating.play() : floating.pause(),
      });
      function syncFloating() {
        if (heroVisibility.isActive && !document.hidden) floating.play();
        else floating.pause();
      }
      document.addEventListener('visibilitychange', syncFloating);
      syncFloating();
      return () => {
        document.removeEventListener('visibilitychange', syncFloating);
      };
    });

    media.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
      const cleanup = [];
      function hover(element, target, values) {
        const animation = gsap.to(target, {
          ...values, paused: true, duration: 0.3, ease: 'power2.out',
        });
        const enter = () => animation.play();
        const leave = () => animation.reverse();
        element.addEventListener('pointerenter', enter);
        element.addEventListener('pointerleave', leave);
        element.addEventListener('focusin', enter);
        element.addEventListener('focusout', leave);
        cleanup.push(() => {
          element.removeEventListener('pointerenter', enter);
          element.removeEventListener('pointerleave', leave);
          element.removeEventListener('focusin', enter);
          element.removeEventListener('focusout', leave);
        });
      }
      gsap.utils.toArray('.project-card').forEach((card) => {
        hover(card, card.querySelector('.mock-window, .type-art'), { scale: 1.035 });
      });
      gsap.utils.toArray('.skill-card').forEach((card) => hover(card, card.querySelector('.skill-icon'), { y: -4, rotation: -4 }));
      gsap.utils.toArray('.button, .text-link, .nav-cta').forEach((button) => {
        hover(button, button.querySelector('.icon:last-child, span'), { x: 2, y: -2 });
      });
      return () => cleanup.forEach(remove => remove());
    });
  } catch (error) {
    media.revert();
    console.warn('Portfolio animations unavailable:', error);
  }

  function setupProjectGallery() {
    const gallery = document.querySelector('.projects');
    const dialog = gallery.querySelector('.project-dialog');
    // Without dialog support or JavaScript, all original card information stays visible.
    if (typeof dialog.showModal !== 'function') return;
    const panel = dialog.querySelector('.project-dialog-panel');
    const visual = dialog.querySelector('.project-dialog-visual');
    const closeButton = dialog.querySelector('.project-close');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const githubRepositories = {
      'Student CRUD System': 'https://github.com/otadoycyrene5/Student-Records-Management-System',
      'Student Records Management System': 'https://github.com/otadoycyrene5/Student-Records-Management-System',
      'PhilHealth Membership Registration System': 'https://github.com/otadoycyrene5/PhilHealth-Membership-Registration-System',
    };
    let opener;
    let transition;
    let closing = false;
    let savedOverflow;
    let savedBodyOverflow;
    let savedGutter;
    let scrollPosition;

    function finishClose() {
      transition?.kill();
      transition = null;
      dialog.close();
      root.style.overflow = savedOverflow;
      document.body.style.overflow = savedBodyOverflow;
      root.style.scrollbarGutter = savedGutter;
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
      opener?.focus({ preventScroll: true });
      closing = false;
    }

    function closeProject() {
      if (!dialog.open || closing) return;
      closing = true;
      if (!transition || motionPreference.matches || transition.progress() === 0) finishClose();
      else transition.eventCallback('onReverseComplete', finishClose).reverse();
    }

    function openProject(card, button) {
      if (dialog.open) return;
      transition?.kill();
      transition = null;
      [panel, visual, ...dialog.querySelectorAll('.project-dialog-copy > *')]
        .forEach(element => element.removeAttribute('style'));
      opener = button;
      const source = card.querySelector('.project-visual');
      const sourceBounds = source.getBoundingClientRect();
      const preview = source.cloneNode(true);
      preview.removeAttribute('style');
      preview.querySelectorAll('[style]').forEach(element => element.removeAttribute('style'));
      visual.replaceChildren(preview);
      dialog.querySelector('#project-dialog-number').textContent = card.querySelector('.project-topline > span').textContent;
      dialog.querySelector('#project-dialog-title').textContent = card.querySelector('h3').textContent;
      dialog.querySelector('#project-dialog-description').textContent = card.querySelector('.project-meta > p').textContent;
      const tags = dialog.querySelector('.project-dialog-tags');
      tags.replaceChildren(...Array.from(card.querySelectorAll('.project-feature-tags > li'), tag => tag.cloneNode(true)));
      tags.hidden = !tags.children.length;


      // Optional fields appear only when the source card supplies real information.
      const technologies = dialog.querySelector('.project-technologies');
      technologies.querySelector('p').textContent = card.dataset.technologies || '';
      technologies.hidden = !card.dataset.technologies;
      const links = dialog.querySelector('.project-links');
      links.replaceChildren();
      card.querySelectorAll('a[data-project-link]').forEach((link) => links.append(link.cloneNode(true)));
      const repository = githubRepositories[card.querySelector('h3').textContent.trim()];
      if (repository) {
        const url = new URL(repository);
        if (url.protocol === 'https:' && url.hostname === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(url.pathname)) {
          const githubLink = document.createElement('a');
          githubLink.className = 'project-github';
          githubLink.href = repository;
          githubLink.target = '_blank';
          githubLink.rel = 'noopener noreferrer';
          githubLink.setAttribute('aria-label', `View ${card.querySelector('h3').textContent} on GitHub (opens in a new tab)`);
          githubLink.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-github"/></svg><span>View on GitHub</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>';
          links.append(githubLink);
        }
      }
      links.hidden = !links.children.length;

      savedOverflow = root.style.overflow;
      savedBodyOverflow = document.body.style.overflow;
      savedGutter = root.style.scrollbarGutter;
      scrollPosition = window.scrollY;
      root.style.scrollbarGutter = 'stable';
      root.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      closeButton.focus({ preventScroll: true });

      const engine = window.gsap;
      if (!engine || motionPreference.matches) return;
      // Grow the existing preview into the detail view using transforms only.
      const destination = visual.getBoundingClientRect();
      try {
        transition?.kill();
        engine.set([panel, visual, ...dialog.querySelectorAll('.project-dialog-copy > *')], { clearProps: 'transform,opacity,visibility' });
        transition = engine.timeline({ defaults: { ease: 'power2.out', duration: 0.45 } })
          .fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
          .fromTo(visual, {
            x: sourceBounds.left - destination.left,
            y: sourceBounds.top - destination.top,
            scaleX: sourceBounds.width / destination.width,
            scaleY: sourceBounds.height / destination.height,
            transformOrigin: 'top left',
          }, { x: 0, y: 0, scaleX: 1, scaleY: 1 }, 0)
          .fromTo(dialog.querySelectorAll('.project-dialog-copy > :not([hidden])'), {
            autoAlpha: 0, y: 12,
          }, { autoAlpha: 1, y: 0, stagger: 0.055, duration: 0.3 }, 0.12);
      } catch (error) {
        transition?.kill();
        transition = null;
        engine.set([panel, visual, ...dialog.querySelectorAll('.project-dialog-copy > *')], { clearProps: 'transform,opacity,visibility' });
        console.warn('Project transition unavailable:', error);
      }
    }

    gallery.querySelectorAll('.project-card').forEach((card) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-open';
      button.setAttribute('aria-label', `Explore ${card.querySelector('h3').textContent}`);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', dialog.id);
      button.innerHTML = '<span class="project-open-label">Explore project <span aria-hidden="true">↗</span></span>';
      button.addEventListener('click', () => openProject(card, button));
      card.append(button);
    });
    gallery.classList.add('gallery-enhanced');
    closeButton.addEventListener('click', closeProject);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeProject(); });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeProject(); });
    motionPreference.addEventListener('change', () => {
      if (!dialog.open || !motionPreference.matches) return;
      if (closing) finishClose();
      else transition?.progress(1);
    });
  }

  if (document.fonts) document.fonts.ready.then(() => { updateScrollLayout(); ScrollTrigger.refresh(); scheduleNavigation(); });
  window.addEventListener('load', () => { updateScrollLayout(); ScrollTrigger.refresh(); scheduleNavigation(); }, { once: true });
})();
