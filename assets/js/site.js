/* Native enhancements. The document and all reports remain readable without JavaScript. */
(() => {
  "use strict";
  const root = document.documentElement;
  const q = (selector, scope = document) => scope.querySelector(selector);
  const qa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const phone = matchMedia("(max-width: 1100px)");
  const theme = q(".theme-toggle");
  const dark = () => root.dataset.theme === "dark";
  const syncTheme = () => {
    if (!theme) return;
    theme.textContent = dark() ? "Light" : "Dark";
    theme.setAttribute("aria-label", `Switch to ${dark() ? "light" : "dark"} theme`);
    q('meta[name="theme-color"]')?.setAttribute("content", dark() ? "#111116" : "#ffffff");
  };
  if (theme) {
    theme.hidden = false;
    theme.addEventListener("click", () => {
      root.dataset.theme = dark() ? "light" : "dark";
      try { localStorage.setItem("portfolio-appearance-v2", root.dataset.theme); } catch (_) { /* Theme still works for this visit. */ }
      syncTheme();
    });
    syncTheme();
  }

  // Only the hero's translucent shapes drift. They stop off screen, on pause, and in reduced motion.
  const hero = q(".hero");
  const heroPause = q(".hero-pause");
  let heroVisible = false, heroPaused = false;
  const syncHero = () => {
    if (!hero) return;
    hero.classList.toggle("is-moving", heroVisible && !heroPaused && !preference.matches && !document.hidden);
    if (heroPause) {
      heroPause.hidden = preference.matches;
      heroPause.textContent = heroPaused ? "Play background motion" : "Pause background motion";
      heroPause.setAttribute("aria-pressed", String(heroPaused));
    }
  };
  if (hero && "IntersectionObserver" in window) {
    const initialHero = hero.getBoundingClientRect();
    heroVisible = initialHero.bottom > 0 && initialHero.top < innerHeight;
    const heroObserver = new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncHero(); });
    heroObserver.observe(hero);
    heroPause?.addEventListener("click", () => { heroPaused = !heroPaused; syncHero(); });
    preference.addEventListener("change", syncHero);
    document.addEventListener("visibilitychange", syncHero);
    syncHero();
  }
  const glassCards = ".s-card a,.case-row,.product-teaser,.product-card>article,.biz-card,.work-card,.app-feature,.button";
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  // Promote glass only during an actual hover transition, then release its layer.
  qa(glassCards).forEach(element => {
    let promotionTimer;
    const promote = () => {
      if (preference.matches || !matchMedia("(hover: hover)").matches) return;
      element.classList.add("is-lifting");
      clearTimeout(promotionTimer);
      promotionTimer = setTimeout(() => element.classList.remove("is-lifting"), 350);
    };
    element.addEventListener("pointerenter", promote);
    element.addEventListener("pointerleave", promote);
    element.addEventListener("transitionend", () => { clearTimeout(promotionTimer); element.classList.remove("is-lifting"); });
  });

  // Move one static highlight layer. No changing gradient, blur, layout animation or idle frame loop.
  let pointed = null, pointerBounds = null, pointerFrame = 0, pointerTimer, pointerX = 0, pointerY = 0;
  const clearPointer = () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0; clearTimeout(pointerTimer);
    pointed?.classList.remove("is-pointed", "is-pointer-moving");
    pointed = null; pointerBounds = null;
  };
  document.addEventListener("pointermove", event => {
    if (preference.matches || !finePointer.matches || event.pointerType !== "mouse") { clearPointer(); return; }
    const card = event.target.closest(glassCards);
    if (!card) { clearPointer(); return; }
    if (pointed !== card) { clearPointer(); pointed = card; }
    pointerX = event.clientX; pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointed) return;
      pointerBounds ||= pointed.getBoundingClientRect();
      pointed.style.setProperty("--pointer-x", `${(pointerX - pointerBounds.left).toFixed(1)}px`);
      pointed.style.setProperty("--pointer-y", `${(pointerY - pointerBounds.top).toFixed(1)}px`);
      pointed.classList.add("is-pointed", "is-pointer-moving");
      clearTimeout(pointerTimer);
      pointerTimer = setTimeout(() => pointed?.classList.remove("is-pointer-moving"), 120);
    });
  }, { passive: true });
  document.addEventListener("pointerout", event => { if (!event.relatedTarget) clearPointer(); });
  window.addEventListener("scroll", clearPointer, { passive: true });
  window.addEventListener("resize", clearPointer);
  window.addEventListener("pagehide", clearPointer);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearPointer(); });
  finePointer.addEventListener("change", clearPointer);
  preference.addEventListener("change", clearPointer);

  // A modal sheet on phones. Focus stays in the sheet; Escape returns it to Menu.
  const toggle = q(".menu-toggle");
  const panel = q("#menu-panel");
  const close = q(".menu-close");
  const outside = [q("main"), q(".foot"), q(".brand"), toggle].filter(Boolean);
  let menuOpen = false;
  const closeMenu = (restore = true) => {
    if (!panel || !menuOpen) return;
    menuOpen = false;
    panel.classList.remove("is-open");
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
    panel.setAttribute("aria-label", "Main");
    toggle.setAttribute("aria-expanded", "false");
    outside.forEach(element => { element.inert = false; });
    document.body.classList.remove("menu-open");
    if (restore) toggle.focus({ preventScroll: true });
  };
  toggle?.addEventListener("click", () => {
    if (!phone.matches) return;
    menuOpen = true;
    panel.classList.add("is-open");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Site navigation");
    toggle.setAttribute("aria-expanded", "true");
    outside.forEach(element => { element.inert = true; });
    document.body.classList.add("menu-open");
    close.focus({ preventScroll: true });
  });
  close?.addEventListener("click", () => closeMenu());
  panel?.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });
  panel?.addEventListener("keydown", event => {
    if (!menuOpen) return;
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
    if (event.key !== "Tab") return;
    const focusable = qa("a[href],button:not([disabled])", panel).filter(element => element.getClientRects().length && !element.hidden);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  // Hover menus remain dismissible for keyboard and magnification users.
  qa(".has-sub").forEach(item => {
    item.addEventListener("keydown", event => {
      if (event.key === "Escape" && !phone.matches) {
        event.preventDefault();
        q("a", item).focus();
        item.classList.add("submenu-dismissed");
      }
    });
    item.addEventListener("pointerleave", () => item.classList.remove("submenu-dismissed"));
    item.addEventListener("focusout", event => { if (!item.contains(event.relatedTarget)) item.classList.remove("submenu-dismissed"); });
  });
  phone.addEventListener("change", () => { if (!phone.matches) closeMenu(false); });
  window.addEventListener("pagehide", () => closeMenu(false));

  // Tables are keyboard scrollable only when their contents actually overflow.
  const tableHints = () => qa(".fin-wrap").forEach(wrap => {
    const overflow = wrap.scrollWidth > wrap.clientWidth + 1 && wrap.getClientRects().length;
    let hint = wrap.nextElementSibling;
    if (!hint?.classList.contains("table-hint")) hint = null;
    if (overflow) {
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", `${q("caption", wrap)?.textContent || "Table"}, scrolls sideways`);
      if (!hint) {
        hint = document.createElement("p"); hint.className = "table-hint";
        hint.textContent = "Scroll sideways to see every column.";
        wrap.insertAdjacentElement("afterend", hint);
      }
    } else {
      ["tabindex", "role", "aria-label"].forEach(name => wrap.removeAttribute(name));
      hint?.remove();
    }
  });
  let tableTimer;
  window.addEventListener("resize", () => { clearTimeout(tableTimer); tableTimer = setTimeout(tableHints, 150); });
  tableHints();

  // Title parts reveal separately; every registered target runs once, including the first screen.
  qa(".section-heading,.shead,.cover>div,.contact").forEach(group => {
    group.removeAttribute("data-reveal");
    qa(":scope > .kicker,:scope > h1,:scope > h2,:scope > p,:scope > .contact__list,:scope > .contact__mail", group).forEach(element => element.setAttribute("data-reveal", ""));
  });
  qa("section>h2,section>h3,section>.kicker,.pipe>li,.phone-gallery figure,.shot,.bottle-showcase").forEach(element => element.setAttribute("data-reveal", ""));
  const seen = new WeakSet();
  const pendingReveals = new Set(), onScreenSince = new Map(), revealTimers = new Map(), revealEnds = new WeakMap();
  let revealObserver, safetyTimer = 0, safetyDeadline = Infinity;
  const insideViewport = element => {
    if (!element.getClientRects().length) return false;
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return false;
    const gallery = element.closest(".phone-gallery");
    if (gallery) {
      const clip = gallery.getBoundingClientRect();
      return rect.right > clip.left && rect.left < clip.right && rect.bottom > clip.top && rect.top < clip.bottom;
    }
    return true;
  };
  const stopRevealSafety = () => {
    clearTimeout(safetyTimer); safetyTimer = 0; safetyDeadline = Infinity;
    onScreenSince.clear();
  };
  const finishReveal = element => {
    revealObserver?.unobserve(element);
    pendingReveals.delete(element); onScreenSince.delete(element);
    clearTimeout(revealTimers.get(element)); revealTimers.delete(element);
    if (revealEnds.has(element)) element.removeEventListener("animationend", revealEnds.get(element));
    revealEnds.delete(element);
    element.classList.remove("reveal-pending", "reveal-visible");
    element.classList.add("reveal-seen");
    element.style.removeProperty("--reveal-delay");
    if (!pendingReveals.size) stopRevealSafety();
  };
  const startReveal = element => {
    if (element.classList.contains("reveal-seen") || element.classList.contains("reveal-visible")) return;
    if (preference.matches) { finishReveal(element); return; }
    if (document.hidden) return;
    revealObserver?.unobserve(element);
    pendingReveals.delete(element); onScreenSince.delete(element);
    element.classList.remove("reveal-pending");
    element.classList.add("reveal-visible");
    const finish = event => { if (event.target === element) finishReveal(element); };
    revealEnds.set(element, finish); element.addEventListener("animationend", finish);
    // Release the layer even if animationend is lost, e.g. a stylesheet or tab changes mid entrance.
    const delay = parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;
    revealTimers.set(element, setTimeout(() => finishReveal(element), delay + 1000));
    if (!pendingReveals.size) stopRevealSafety();
  };
  const checkRevealSafety = () => {
    safetyTimer = 0; safetyDeadline = Infinity;
    if (document.hidden || preference.matches) { stopRevealSafety(); return; }
    const now = performance.now();
    // Read all geometry together, then change classes. No layout read/write loop during scrolling.
    const visible = [...pendingReveals].map(element => [element, insideViewport(element)]);
    let next = Infinity;
    visible.forEach(([element, inView]) => {
      if (!inView) { onScreenSince.delete(element); return; }
      if (!onScreenSince.has(element)) onScreenSince.set(element, now);
      const remaining = 600 - (now - onScreenSince.get(element));
      if (remaining <= 0) finishReveal(element);
      else next = Math.min(next, remaining);
    });
    if (Number.isFinite(next)) queueRevealSafety(next);
  };
  const queueRevealSafety = (delay = 80) => {
    if (!pendingReveals.size || document.hidden || preference.matches) return;
    const deadline = performance.now() + delay;
    if (safetyTimer && safetyDeadline <= deadline) return;
    clearTimeout(safetyTimer); safetyDeadline = deadline;
    safetyTimer = setTimeout(checkRevealSafety, delay);
  };
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) startReveal(entry.target); });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
  }
  const prepareReveals = (scope = document) => {
    qa("[data-reveal]", scope).forEach(element => {
      if (seen.has(element) || element.classList.contains("reveal-seen") || !element.getClientRects().length) return;
      seen.add(element);
      if (!revealObserver || preference.matches || element.parentElement.closest("[data-reveal]")) { finishReveal(element); return; }
      if (element.matches(".s-card,.cases>li,.product-card,.product-teaser,.pipe>li,.biz-card,.app-feature")) element.classList.add("reveal-card");
      if (element.matches(".shot,.phone-gallery figure,.bottle-showcase")) element.classList.add("reveal-media");
      const siblings = [...element.parentElement.children].filter(sibling => sibling.matches("[data-reveal]"));
      element.style.setProperty("--reveal-delay", `${Math.min(siblings.indexOf(element), 6) * 90}ms`);
      // Only registered, measurable targets are hidden. Everything else stays readable by default.
      element.classList.add("reveal-pending"); pendingReveals.add(element);
      if (insideViewport(element)) startReveal(element);
      else revealObserver.observe(element);
    });
    queueRevealSafety(0);
  };
  const revealCurrentView = () => {
    if (document.hidden) return;
    [...pendingReveals].filter(insideViewport).forEach(startReveal);
    queueRevealSafety(0);
  };
  window.addEventListener("load", revealCurrentView);
  window.addEventListener("pageshow", revealCurrentView);
  window.addEventListener("resize", () => queueRevealSafety(0));
  // Capture also sees sideways gallery scrolling; timers run only after events or an on screen candidate.
  window.addEventListener("scroll", () => queueRevealSafety(), { passive: true, capture: true });
  window.addEventListener("pagehide", stopRevealSafety);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopRevealSafety(); else revealCurrentView(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => queueRevealSafety(0)).observe(document.body);
  const entranceTimers = new Map();
  const finishEntrance = element => {
    clearTimeout(entranceTimers.get(element)); entranceTimers.delete(element);
    element.classList.remove("hero-entering"); element.classList.add("hero-entered");
  };
  qa("[data-hero-enter]").forEach(element => {
    if (preference.matches) { finishEntrance(element); return; }
    element.classList.add("hero-entering");
    const finish = event => {
      if (event.target !== element) return;
      finishEntrance(element); element.removeEventListener("animationend", finish);
    };
    element.addEventListener("animationend", finish);
    const delay = parseFloat(element.style.getPropertyValue("--enter-delay")) || 0;
    entranceTimers.set(element, setTimeout(() => finishEntrance(element), delay + 1000));
  });

  // Reports use roving tab focus. Every panel is present in the static document.
  qa("[data-tabs]").forEach(group => {
    const tabs = qa('[role="tab"]', group);
    const select = (button, focus = false) => {
      let selectedPanel;
      tabs.forEach(tab => {
        const selected = tab === button;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const content = document.getElementById(tab.getAttribute("aria-controls"));
        if (content) {
          content.hidden = !selected;
          content.tabIndex = 0;
          if (selected) selectedPanel = content;
        }
      });
      if (focus) button.focus();
      if (selectedPanel) prepareReveals(selectedPanel);
      tableHints();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", event => {
        const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1
          : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
        if (next === null) return;
        event.preventDefault(); select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
    if (tabs.length) select(tabs[0]);
  });
  prepareReveals();
  qa("details").forEach(details => details.addEventListener("toggle", () => { if (details.open) { prepareReveals(details); tableHints(); } }));
  document.addEventListener("focusin", event => {
    const pending = event.target.closest(".reveal-pending,.reveal-visible");
    if (pending) { revealObserver?.unobserve(pending); finishReveal(pending); }
  });

  // Native observers update active sections in both directions, with no scroll listener.
  const observeNavigation = (sections, links, key, current) => {
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const visible = new Set();
    const last = sections[sections.length - 1];
    let lastShown = false, clicked = null, clickTimer;
    const mark = target => links.forEach(link => {
      if (current(link) === target) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    // The last section (the footer) is too short to ever reach the top band, so once most of it is on screen it
    // wins. A click marks its own link at once and holds it while the page glides there.
    const update = () => {
      if (clicked) return mark(clicked);
      if (lastShown) return mark(key(last));
      // The newest section to reach the top band wins, so the one you just arrived at lights up.
      const latest = sections.filter(section => visible.has(section)).pop();
      if (latest) mark(key(latest));
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
      update();
    }, { rootMargin: "-80px 0px -55% 0px", threshold: 0 });
    sections.forEach(section => observer.observe(section));
    new IntersectionObserver(entries => { lastShown = entries[0].intersectionRatio >= .6 || entries[0].intersectionRect.bottom >= innerHeight - 2 && entries[0].isIntersecting && entries[0].boundingClientRect.bottom <= innerHeight + 2; update(); },
      { threshold: [0, .3, .6, 1] }).observe(last);
    links.forEach(link => link.addEventListener("click", () => {
      clicked = current(link); clearTimeout(clickTimer); update();
      clickTimer = setTimeout(() => { clicked = null; update(); }, 1200);
    }));
  };
  if (document.body.classList.contains("page-home")) {
    observeNavigation(qa("[data-nav-section]"), qa("[data-section]"), section => section.dataset.navSection, link => link.dataset.section);
  }
  const localLinks = qa('.toc a[href^="#"],.local-nav a[href^="#"]');
  const chapters = [...new Set(localLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean))];
  observeNavigation(chapters, localLinks, section => section.id, link => link.hash.slice(1));

  // Scroll only schedules a single frame. Geometry is cached on layout changes, never read each scroll frame.
  const progressBar = q(".scroll-progress");
  const parallax = qa("[data-parallax]").map(element => ({ element, section: element.parentElement, center: 0, visible: false }));
  let scrollFrame = 0, scrollIdleTimer, scrollRange = 1;
  const paintScroll = () => {
    scrollFrame = 0;
    if (preference.matches || document.hidden) return;
    const position = scrollY;
    if (progressBar) progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, position / scrollRange))})`;
    parallax.forEach(record => {
      if (record.visible) {
        const shift = Math.max(-96, Math.min(96, (position + innerHeight / 2 - record.center) * .14));
        record.element.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      }
    });
  };
  const scheduleScroll = () => {
    if (preference.matches || document.hidden) return;
    if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll);
  };
  const measureScroll = () => {
    scrollRange = Math.max(1, root.scrollHeight - innerHeight);
    parallax.forEach(record => {
      const rect = record.section.getBoundingClientRect();
      record.center = rect.top + scrollY + rect.height / 2;
    });
    scheduleScroll();
  };
  const stopScrollMotion = () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0; clearTimeout(scrollIdleTimer); root.classList.remove("is-scrolling");
  };
  window.addEventListener("scroll", () => {
    if (preference.matches || document.hidden) return;
    root.classList.add("is-scrolling"); scheduleScroll(); clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => root.classList.remove("is-scrolling"), 140);
  }, { passive: true });
  window.addEventListener("resize", measureScroll);
  window.addEventListener("load", measureScroll);
  window.addEventListener("pagehide", stopScrollMotion);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopScrollMotion(); else measureScroll(); });
  if ("ResizeObserver" in window) new ResizeObserver(measureScroll).observe(document.body);
  if ("IntersectionObserver" in window && parallax.length) {
    const parallaxObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const record = parallax.find(item => item.element === entry.target);
        if (record) {
          record.visible = entry.isIntersecting;
          record.element.classList.toggle("is-in-view", entry.isIntersecting);
        }
      });
      scheduleScroll();
    }, { rootMargin: "160px 0px" });
    parallax.forEach(record => parallaxObserver.observe(record.element));
  }
  preference.addEventListener("change", () => {
    if (preference.matches) { stopScrollMotion(); parallax.forEach(record => record.element.style.removeProperty("transform")); }
    else measureScroll();
  });
  measureScroll();

  // A duration-based tween stays the same speed at 30fps. Frames exist only during a requested glide.
  let glide = 0;
  const cancelGlide = () => { if (glide) cancelAnimationFrame(glide); glide = 0; };
  const focusTarget = target => {
    const temporary = !target.hasAttribute("tabindex");
    if (temporary) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (temporary) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  };
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute("download") || link.target === "_blank") return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault(); closeMenu(false); cancelGlide();
    const start = scrollY;
    const offset = q(".top")?.getBoundingClientRect().height || 72;
    const end = Math.max(0, Math.min(target.getBoundingClientRect().top + start - offset - 24, document.documentElement.scrollHeight - innerHeight));
    try { if (location.hash !== url.hash) history.pushState(null, "", url.hash); } catch (_) { /* A file preview may restrict History. */ }
    if (preference.matches || Math.abs(end - start) < 2) { scrollTo(0, end); focusTarget(target); return; }
    const began = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - began) / 720);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      scrollTo(0, start + (end - start) * eased);
      if (progress < 1) glide = requestAnimationFrame(step);
      else { glide = 0; focusTarget(target); }
    };
    glide = requestAnimationFrame(step);
  });
  ["wheel", "touchstart", "pointerdown"].forEach(type => window.addEventListener(type, cancelGlide, { passive: true }));
  window.addEventListener("keydown", event => { if (["Tab", "Escape", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelGlide(); });
  window.addEventListener("popstate", cancelGlide);
  window.addEventListener("pagehide", cancelGlide);

  preference.addEventListener("change", () => {
    if (!preference.matches) return;
    cancelGlide(); revealObserver?.disconnect();
    qa("[data-reveal]").forEach(finishReveal);
    qa("[data-hero-enter]").forEach(finishEntrance);
    qa("video").forEach(video => video.pause());
  });
  // The showcase is user initiated and pauses off screen or when the tab is hidden.
  const videos = qa("video");
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) entry.target.pause(); }));
    videos.forEach(video => videoObserver.observe(video));
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelGlide(); videos.forEach(video => video.pause()); } });

  qa("[data-copy]").forEach(button => {
    button.setAttribute("aria-live", "polite");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Copied";
      } catch (_) {
        const code = button.previousElementSibling;
        if (code) { const range = document.createRange(); range.selectNodeContents(code); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }
        button.textContent = "Select and copy";
      }
      setTimeout(() => { button.textContent = "Copy"; }, 2000);
    });
  });
  qa("[data-year]").forEach(element => { element.textContent = new Date().getFullYear(); });
  // Menus become modal only after their handlers have been attached successfully.
  window.__portfolioReady = true;
  root.classList.add("js");
})();
