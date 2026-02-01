(() => {
  'use strict';

  const FORMS_API_URL = 'https://red-alert-forms-service-production.up.railway.app/contact';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

  document.addEventListener('DOMContentLoaded', () => {
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

      document.addEventListener('click', (e) => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        if (!isOpen) return;
        if (drawer.contains(e.target) || toggle.contains(e.target)) return;
        closeDrawer();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
      });

      $$('a', drawer).forEach(a => a.addEventListener('click', closeDrawer));
    }

    // Wire CTA scroll buttons (no inline onclick)
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
      if (toastTitle) toastTitle.textContent = title || (type === 'success' ? 'נשלח בהצלחה' : 'שגיאה');
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
      if (submitText) submitText.textContent = isLoading ? 'שולח…' : 'שלחו לי עדכון כשגרסת הבטא מוכנה';
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

      if (!email) { emailEl?.classList.add('invalid'); showFormError('נא למלא כתובת אימייל'); emailEl?.focus(); return false; }
      if (!isValidEmail(email)) { emailEl?.classList.add('invalid'); showFormError('האימייל לא נראה תקין – בדקו ונסו שוב'); emailEl?.focus(); return false; }
      if (!platform) { platformEl?.classList.add('invalid'); showFormError('נא לבחור סוג מכשיר'); platformEl?.focus(); return false; }
      if (!role) { roleEl?.classList.add('invalid'); showFormError('נא לבחור מי אתם'); roleEl?.focus(); return false; }

      if (nonResident) {
        const city = safeText(cityEl?.value || '', 120);
        const org = safeText(orgEl?.value || '', 160);
        if (!city) { cityEl?.classList.add('invalid'); showFormError('נא למלא עיר/יישוב (חובה לרשויות ולגורמים מקצועיים)'); cityEl?.focus(); return false; }
        if (!org) { orgEl?.classList.add('invalid'); showFormError('נא למלא שם ארגון (חובה לרשויות ולגורמים מקצועיים)'); orgEl?.focus(); return false; }
      }
      return true;
    }

    // Anti-bot: honeypot + minimum time to submit
    function isBotLikely() {
      const hp = $('#website');
      if (hp && safeText(hp.value || '', 20).length > 0) return true;

      const t0 = Number($('#ts')?.value || '0');
      if (t0 && Number.isFinite(t0)) {
        const delta = Date.now() - t0;
        // פחות מ-900ms מרגע טעינת הדף עד submit = כמעט בטוח בוט
        if (delta < 900) return true;
      }
      return false;
    }

    betaForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      // If scripts are running, prevent default navigation always
      if (isBotLikely()) {
        showToast('error', 'נחסם', 'נראה שזה ניסיון אוטומטי. נסו שוב.');
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
          showToast('success', 'נשלח בהצלחה', 'תודה – נעדכן כשגרסת הבטא תהיה מוכנה');
          scrollToBetaForm();
        } else {
          showToast('error', 'לא נשלח', 'אירעה שגיאה בשליחה – נסו שוב בעוד רגע');
        }
      } catch (err) {
        showToast('error', 'שגיאת חיבור', 'לא הצלחנו להתחבר לשרת – נסו שוב מאוחר יותר');
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });
  });
})();
