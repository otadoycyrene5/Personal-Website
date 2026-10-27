(() => {
  'use strict';

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = Array.from(document.querySelectorAll('nav a'));
  const navigation = document.querySelector('.topbar');
  const root = document.documentElement;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateScrollLayout() {
    // Measure the navigation independently of visual transforms.
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

  // Native anchors also work without JavaScript.
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
        scheduleNavigation();
      }
    });
    [navigation, document.querySelector('.contact'), document.querySelector('footer')]
      .forEach(element => layoutObserver.observe(element));
  }
  updateNavigation();

  setupProjectGallery();
  setupScrollReveals();

  function setupScrollReveals() {
    if (motionPreference.matches || typeof window.IntersectionObserver !== 'function') return;
    const elements = document.querySelectorAll(
      '.hero-copy > .eyebrow, .hero-greeting, .hero-copy h1, .hero-sub, .hero-actions, .hero-art, '
      + '.section-heading, .about-photo, .about-copy, .skill-card, .project-card, '
      + '.contact h2, .contact-intro, .contact-panel > .button, .email-link'
    );
    // Only JavaScript-enhanced elements are hidden; observe each entrance once.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0 });
    elements.forEach((element) => {
      element.classList.add('scroll-reveal');
      observer.observe(element);
    });
    // Commit the starting state before the observer reveals initial viewport content.
    if (elements.length) getComputedStyle(elements[0]).opacity;
    motionPreference.addEventListener('change', () => {
      if (motionPreference.matches) {
        observer.disconnect();
        elements.forEach(element => element.classList.add('is-visible'));
      }
    });
  }

  function setupProjectGallery() {
    const gallery = document.querySelector('.projects');
    const dialog = gallery.querySelector('.project-dialog');
    // Without dialog support or JavaScript, all original card information stays visible.
    if (typeof dialog.showModal !== 'function') return;
    const panel = dialog.querySelector('.project-dialog-panel');
    const visual = dialog.querySelector('.project-dialog-visual');
    const closeButton = dialog.querySelector('.project-close');
    const githubRepositories = {
      'Classence': 'https://github.com/otadoycyrene5/Student-Monitoring-System',
      'Student CRUD System': 'https://github.com/otadoycyrene5/Student-Records-Management-System',
      'Student Records Management System': 'https://github.com/otadoycyrene5/Student-Records-Management-System',
      'PhilHealth Membership Registration System': 'https://github.com/otadoycyrene5/PhilHealth-Membership-Registration-System',
    };
    let opener;
    let closeTimer;
    let closing = false;
    let savedOverflow;
    let savedBodyOverflow;
    let savedGutter;
    let scrollPosition;

    function finishClose() {
      window.clearTimeout(closeTimer);
      panel.removeEventListener('animationend', finishCloseAnimation);
      dialog.classList.remove('is-closing');
      dialog.close();
      root.style.overflow = savedOverflow;
      document.body.style.overflow = savedBodyOverflow;
      root.style.scrollbarGutter = savedGutter;
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
      opener?.focus({ preventScroll: true });
      closing = false;
    }

    function finishCloseAnimation(event) {
      if (event.target === panel && event.animationName === 'project-close') finishClose();
    }

    function closeProject() {
      if (!dialog.open || closing) return;
      closing = true;
      if (motionPreference.matches) {
        finishClose();
        return;
      }
      dialog.classList.add('is-closing');
      if (getComputedStyle(panel).animationName === 'none') {
        finishClose();
        return;
      }
      panel.addEventListener('animationend', finishCloseAnimation);
      closeTimer = window.setTimeout(finishClose, 350);
    }

    function openProject(card, button) {
      if (dialog.open) return;
      opener = button;
      const source = card.querySelector('.project-visual');
      const preview = source.cloneNode(true);
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
    });
  }

  if (document.fonts) document.fonts.ready.then(() => { updateScrollLayout(); scheduleNavigation(); });
  window.addEventListener('load', () => { updateScrollLayout(); scheduleNavigation(); }, { once: true });
})();
