(() => {
  'use strict';

  const FORMS_API_URL = 'https://red-alert-forms-service-production.up.railway.app/contact';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ── i18n ─────────────────────────────────────────────────────────────────

  const SUPPORTED_LANGS = ['he', 'en', 'ar', 'ru', 'fr', 'th', 'zh-CN'];
  const RTL_LANGS = ['he', 'ar'];
  const LANG_FONTS = {
    'th': 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700;800&display=swap',
    'zh-CN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&display=swap',
  };
  const LANG_FONT_FAMILIES = {
    'th': '"Sarabun", system-ui, sans-serif',
    'zh-CN': '"Noto Sans SC", system-ui, sans-serif',
  };

  let currentT = {};
  const t = (key) => currentT[key] || key;

  function detectBrowserLang() {
    const nav = ((navigator.language || (navigator.languages && navigator.languages[0]) || 'he')).toLowerCase();
    if (nav.startsWith('zh')) return 'zh-CN';
    const code = nav.split('-')[0];
    return SUPPORTED_LANGS.includes(code) ? code : 'he';
  }

  function getCurrentLang() {
    return localStorage.getItem('ral-lang') || detectBrowserLang();
  }

  async function loadTranslations(lang) {
    const res = await fetch(`assets/i18n/${lang}.json`);
    if (!res.ok) throw new Error('i18n load failed: ' + lang);
    return res.json();
  }

  function applyTranslations(translations) {
    currentT = translations;

    // Text content
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[key] !== undefined) el.textContent = translations[key];
    });

    // HTML content
    $$('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      if (translations[key] !== undefined) el.innerHTML = translations[key];
    });

    // Placeholder
    $$('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (translations[key] !== undefined) el.placeholder = translations[key];
    });

    // aria-label
    $$('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      if (translations[key] !== undefined) el.setAttribute('aria-label', translations[key]);
    });

    // img alt
    $$('[data-i18n-alt]').forEach(el => {
      const key = el.dataset.i18nAlt;
      if (translations[key] !== undefined) el.alt = translations[key];
    });

    // Meta
    const metaDesc = $('meta[name="description"]');
    if (metaDesc && translations['meta.description']) metaDesc.content = translations['meta.description'];
    if (translations['meta.title']) document.title = translations['meta.title'];
  }

  function setLangDir(lang) {
    const isRTL = RTL_LANGS.includes(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    const metaLang = $('meta[http-equiv="Content-Language"]');
    if (metaLang) metaLang.setAttribute('content', lang);
  }

  function loadLangFont(lang) {
    if (!LANG_FONTS[lang] || $(`link[data-lang-font="${lang}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LANG_FONTS[lang];
    link.dataset.langFont = lang;
    document.head.appendChild(link);
  }

  function setLangFont(lang) {
    document.body.style.fontFamily = LANG_FONT_FAMILIES[lang] || '';
  }

  function updateLangUI(lang) {
    const displayCode = lang === 'zh-CN' ? '中文' : lang.toUpperCase();
    const codeEl = $('#lang-current-code');
    if (codeEl) codeEl.textContent = displayCode;
    const fabCode = $('#lang-fab-code');
    if (fabCode) fabCode.textContent = displayCode;
    $$('.lang-option').forEach(el => el.classList.toggle('active', el.dataset.lang === lang));
    $$('.drawer-lang-option').forEach(el => el.classList.toggle('active', el.dataset.lang === lang));
  }

  async function switchLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    loadLangFont(lang);
    try {
      const translations = await loadTranslations(lang);
      localStorage.setItem('ral-lang', lang);
      setLangDir(lang);
      setLangFont(lang);
      applyTranslations(translations);
      updateLangUI(lang);
      closeLangDropdown();
    } catch (err) {
      console.warn('Failed to load language:', lang, err);
    }
  }

  // Lang dropdown
  let langDropdownOpen = false;

  function closeLangDropdown() {
    const btn = $('#lang-btn');
    const dd = $('#lang-dropdown');
    if (!btn || !dd) return;
    dd.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    langDropdownOpen = false;
  }

  function openLangDropdown() {
    const btn = $('#lang-btn');
    const dd = $('#lang-dropdown');
    if (!btn || !dd) return;
    dd.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    langDropdownOpen = true;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function scrollToBetaForm() {
    const el = $('#beta-form');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function safeText(v, max = 8000) {
    if (typeof v !== 'string') return '';
    return v.replace(/\u0000/g, '').trim().slice(0, max);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── DOM Ready ─────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {

    // Init i18n
    const initLang = getCurrentLang();
    loadLangFont(initLang);
    loadTranslations(initLang).then(translations => {
      setLangDir(initLang);
      setLangFont(initLang);
      applyTranslations(translations);
      updateLangUI(initLang);
    }).catch(err => console.warn('i18n init failed:', err));

    // Header lang dropdown
    const langBtn = $('#lang-btn');
    const langDropdown = $('#lang-dropdown');

    if (langBtn && langDropdown) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdownOpen ? closeLangDropdown() : openLangDropdown();
      });
    }

    // Floating FAB dropdown
    let fabOpen = false;
    const fabBtn = $('#lang-fab-btn');
    const fabDropdown = $('#lang-fab-dropdown');

    function closeFab() {
      if (!fabBtn || !fabDropdown) return;
      fabDropdown.classList.remove('open');
      fabBtn.setAttribute('aria-expanded', 'false');
      fabOpen = false;
    }
    function openFab() {
      if (!fabBtn || !fabDropdown) return;
      fabDropdown.classList.add('open');
      fabBtn.setAttribute('aria-expanded', 'true');
      fabOpen = true;
    }

    if (fabBtn && fabDropdown) {
      fabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fabOpen ? closeFab() : openFab();
      });
    }

    // All lang-option buttons (header dropdown + FAB dropdown)
    $$('.lang-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchLang(btn.dataset.lang);
        closeFab();
      });
    });

    // Drawer flag buttons (mobile)
    $$('.drawer-lang-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchLang(btn.dataset.lang);
      });
    });

    // Timestamp for honeypot timing
    const ts = $('#ts');
    if (ts) ts.value = String(Date.now());

    // Header shadow on scroll
    const header = $('#site-header');
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile drawer
    const toggle = $('#menu-toggle');
    const drawer = $('#nav-drawer');

    const closeDrawer = () => {
      if (!drawer || !toggle) return;
      drawer.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    };
    const openDrawer = () => {
      if (!drawer || !toggle) return;
      drawer.style.display = 'block';
      toggle.setAttribute('aria-expanded', 'true');
    };

    if (toggle && drawer) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        isOpen ? closeDrawer() : openDrawer();
      });

      $$('a', drawer).forEach(a => a.addEventListener('click', closeDrawer));
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (toggle && drawer) {
        const drawerOpen = toggle.getAttribute('aria-expanded') === 'true';
        if (drawerOpen && !drawer.contains(e.target) && !toggle.contains(e.target)) closeDrawer();
      }
      if (langDropdownOpen && langBtn && langDropdown) {
        if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) closeLangDropdown();
      }
      if (fabOpen && fabBtn && fabDropdown) {
        if (!fabBtn.contains(e.target) && !fabDropdown.contains(e.target)) closeFab();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closeLangDropdown();
        closeFab();
      }
    });

    // Wire CTA scroll buttons
    $$('[data-scroll="beta"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToBetaForm();
      });
    });

    // Toast
    const toast = $('#toast');
    const toastIcon = $('#toast-icon');
    const toastTitle = $('#toast-title');
    const toastMessage = $('#toast-message');
    const toastClose = $('#toast-close');
    let toastTimer = null;

    function showToast(type, title, message) {
      if (!toast) return;
      toast.classList.remove('success', 'error', 'show');
      toast.classList.add(type);
      if (toastIcon) toastIcon.textContent = (type === 'success') ? '✓' : '!';
      if (toastTitle) toastTitle.textContent = title || (type === 'success' ? t('toast.success_title') : t('form.error_title'));
      if (toastMessage) toastMessage.textContent = message || '';
      if (toastTimer) clearTimeout(toastTimer);
      requestAnimationFrame(() => toast.classList.add('show'));
      toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
    }

    if (toastClose) toastClose.addEventListener('click', () => toast.classList.remove('show'));

    // Form handling
    const betaForm = $('#beta-form-form');
    const formErrors = $('#form-errors');

    const emailEl = $('#email');
    const platformEl = $('#platform');
    const nameEl = $('#name');
    const cityEl = $('#city');
    const roleEl = $('#role');
    const orgEl = $('#org');
    const phoneEl = $('#phone');
    const notesEl = $('#notes');

    const cityHelp = $('#city-help');
    const orgHelp = $('#org-help');

    const submitBtn = $('#submit-btn');
    const spinner = $('#submit-spinner');
    const submitText = $('#submit-text');

    function setLoading(isLoading) {
      if (!submitBtn) return;
      submitBtn.disabled = isLoading;
      if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
      if (submitText) submitText.textContent = isLoading ? t('beta.loading') : t('beta.submit_alt');
    }

    function clearInvalid() {
      [emailEl, platformEl, cityEl, roleEl, orgEl].forEach(el => el && el.classList.remove('invalid'));
    }

    function showFormError(msg) {
      if (!formErrors) return;
      formErrors.textContent = msg;
      formErrors.style.display = 'block';
    }

    function hideFormError() {
      if (!formErrors) return;
      formErrors.textContent = '';
      formErrors.style.display = 'none';
    }

    function updateConditionalRequirements() {
      const role = safeText(roleEl?.value || '', 64);
      const nonResident = role && role !== 'resident';
      if (cityEl) cityEl.required = !!nonResident;
      if (orgEl) orgEl.required = !!nonResident;
      if (cityHelp) cityHelp.hidden = !nonResident;
      if (orgHelp) orgHelp.hidden = !nonResident;
    }

    roleEl?.addEventListener('change', updateConditionalRequirements);
    updateConditionalRequirements();

    function validate() {
      hideFormError();
      clearInvalid();

      const email = safeText(emailEl?.value || '', 160);
      const platform = safeText(platformEl?.value || '', 32);
      const role = safeText(roleEl?.value || '', 64);
      const nonResident = role && role !== 'resident';

      if (!email) { emailEl?.classList.add('invalid'); showFormError(t('form.error_email_required')); emailEl?.focus(); return false; }
      if (!isValidEmail(email)) { emailEl?.classList.add('invalid'); showFormError(t('form.error_email_invalid')); emailEl?.focus(); return false; }
      if (!platform) { platformEl?.classList.add('invalid'); showFormError(t('form.error_platform_required')); platformEl?.focus(); return false; }
      if (!role) { roleEl?.classList.add('invalid'); showFormError(t('form.error_role_required')); roleEl?.focus(); return false; }

      if (nonResident) {
        const city = safeText(cityEl?.value || '', 120);
        const org = safeText(orgEl?.value || '', 160);
        if (!city) { cityEl?.classList.add('invalid'); showFormError(t('form.error_city_required')); cityEl?.focus(); return false; }
        if (!org) { orgEl?.classList.add('invalid'); showFormError(t('form.error_org_required')); orgEl?.focus(); return false; }
      }
      return true;
    }

    function isBotLikely() {
      const hp = $('#website');
      if (hp && safeText(hp.value || '', 20).length > 0) return true;
      const t0 = Number($('#ts')?.value || '0');
      if (t0 && Number.isFinite(t0)) {
        if (Date.now() - t0 < 900) return true;
      }
      return false;
    }

    betaForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isBotLikely()) {
        showToast('error', t('form.bot_title'), t('form.bot_msg'));
        return;
      }

      if (!validate()) return;

      setLoading(true);

      const payload = {
        name: safeText(nameEl?.value || '', 120),
        email: safeText(emailEl?.value || '', 160),
        source: 'beta_form',
        platform: safeText(platformEl?.value || '', 32),
        role: safeText(roleEl?.value || '', 64),
        city: safeText(cityEl?.value || '', 120),
        organization: safeText(orgEl?.value || '', 160),
        phone: safeText(phoneEl?.value || '', 40),
        notes: safeText(notesEl?.value || '', 2000),
      };

      const messageLines = [
        'Beta form signup from landing page',
        '',
        `Name: ${payload.name || 'N/A'}`,
        `Email: ${payload.email}`,
        `Platform: ${payload.platform || 'N/A'}`,
        `City: ${payload.city || 'N/A'}`,
        `Role: ${payload.role || 'N/A'}`,
        `Organization: ${payload.organization || 'N/A'}`,
        `Phone: ${payload.phone || 'N/A'}`,
        '',
        'Notes',
        payload.notes || 'N/A',
      ];

      payload.message = messageLines.join('\n');

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 12000);

      try {
        const res = await fetch(FORMS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });

        let json = null;
        try { json = await res.json(); } catch (_) {}

        if (res.ok && json && json.ok) {
          betaForm.reset();
          updateConditionalRequirements();
          hideFormError();
          showToast('success', t('toast.success_title'), t('toast.success_message'));
          scrollToBetaForm();
        } else {
          showToast('error', t('form.error_title'), t('form.error_msg'));
        }
      } catch (_) {
        showToast('error', t('form.network_title'), t('form.network_msg'));
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });
  });
})();
