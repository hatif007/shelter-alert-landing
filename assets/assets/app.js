// assets/app.js (קובץ מלא, "הגנות ברזל", תואם CSP שלך: script-src 'self')
// - אין inline handlers (onclick וכו')
// - Event delegation (בטוח גם אם מוסיפים כפתורים בעתיד)
// - סגירת drawer קשיחה (קליק בחוץ, ESC, ניווט)
// - גלילה לטופס בצורה יציבה (offset ל-header sticky)
// - הגנות בסיסיות: מניעת double-submit, abort לבקשה קודמת, timeout, ולידציה, ניקוי הודעות
// - הגנת SPAM בסיסית: "honeypot" אם תרצה להוסיף שדה נסתר (אופציונלי)

(() => {
  'use strict';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Config ----------
  const FORMS_API_URL = 'https://red-alert-forms-service-production.up.railway.app/contact';
  const HEADER_OFFSET_PX = 90; // כדי שה-header sticky לא יסתיר את כותרת הטופס
  const REQUEST_TIMEOUT_MS = 12_000;

  // ---------- Safe utils ----------
  const safeText = (v) => (typeof v === 'string' ? v.trim() : '');
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    // עדכון hash בצורה לא "קופצנית"
    try { history.replaceState(null, '', `#${encodeURIComponent(id)}`); } catch (_) {}
  };

  const setAriaExpanded = (btn, expanded) => {
    if (!btn) return;
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  // ---------- Init after DOM ready ----------
  document.addEventListener('DOMContentLoaded', () => {
    const header = qs('#site-header');
    const toggle = qs('#menu-toggle');
    const drawer = qs('#nav-drawer');

    // Header shadow
    const onScroll = () => {
      if (!header) return;
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Drawer control
    const closeDrawer = () => {
      if (!drawer || !toggle) return;
      drawer.setAttribute('aria-hidden', 'true');
      drawer.style.display = 'none';
      setAriaExpanded(toggle, false);
    };

    const openDrawer = () => {
      if (!drawer || !toggle) return;
      drawer.style.display = 'block';
      drawer.setAttribute('aria-hidden', 'false');
      setAriaExpanded(toggle, true);
    };

    const isDrawerOpen = () => toggle?.getAttribute('aria-expanded') === 'true';

    if (toggle && drawer) {
      closeDrawer(); // מצב התחלתי קשוח

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        isDrawerOpen() ? closeDrawer() : openDrawer();
      });

      // קליק מחוץ ל-drawer
      document.addEventListener('click', (e) => {
        if (!isDrawerOpen()) return;
        const t = e.target;
        if (drawer.contains(t) || toggle.contains(t)) return;
        closeDrawer();
      });

      // ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
      });

      // קליק על לינקים בתוך drawer -> סגירה
      qsa('a', drawer).forEach(a => a.addEventListener('click', closeDrawer));
    }

    // Event delegation לכל כפתור עם data-scroll="beta"
    document.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-scroll="beta"]');
      if (!btn) return;
      e.preventDefault();
      closeDrawer();
      scrollToId('beta-form');
    });

    // ---------- Toast ----------
    const toast = qs('#toast');
    const toastIcon = qs('#toast-icon');
    const toastTitle = qs('#toast-title');
    const toastMessage = qs('#toast-message');
    const toastClose = qs('#toast-close');
    let toastTimer = null;

    const showToast = (type, title, message) => {
      if (!toast) return;

      toast.classList.remove('success', 'error', 'show');
      toast.classList.add(type);

      if (toastIcon) toastIcon.textContent = (type === 'success') ? '✓' : '!';
      if (toastTitle) toastTitle.textContent = title || (type === 'success' ? 'נשלח בהצלחה' : 'שגיאה');
      if (toastMessage) toastMessage.textContent = message || '';

      if (toastTimer) clearTimeout(toastTimer);

      requestAnimationFrame(() => toast.classList.add('show'));
      toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
    };

    toastClose?.addEventListener('click', () => toast?.classList.remove('show'));

    // ---------- Form ----------
    const betaForm = qs('#beta-form-form');
    const formErrors = qs('#form-errors');

    const emailEl = qs('#email');
    const platformEl = qs('#platform');
    const nameEl = qs('#name');
    const cityEl = qs('#city');
    const roleEl = qs('#role');
    const orgEl = qs('#org');
    const phoneEl = qs('#phone');
    const notesEl = qs('#notes');

    const cityHelp = qs('#city-help');
    const orgHelp = qs('#org-help');

    const submitBtn = qs('#submit-btn');
    const spinner = qs('#submit-spinner');
    const submitText = qs('#submit-text');

    // AbortController כדי למנוע בקשות כפולות + timeout
    let activeController = null;

    const setLoading = (isLoading) => {
      if (!submitBtn) return;
      submitBtn.disabled = !!isLoading;
      if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
      if (submitText) submitText.textContent = isLoading ? 'שולח' : 'שלחו לי עדכון כשגרסת הבטא מוכנה';
    };

    const clearInvalid = () => {
      [emailEl, platformEl, cityEl, roleEl, orgEl].forEach(el => el?.classList.remove('invalid'));
    };

    const showFormError = (msg) => {
      if (!formErrors) return;
      formErrors.textContent = msg;
      formErrors.style.display = 'block';
    };

    const hideFormError = () => {
      if (!formErrors) return;
      formErrors.textContent = '';
      formErrors.style.display = 'none';
    };

    const updateConditionalRequirements = () => {
      const role = safeText(roleEl?.value);
      const nonResident = role && role !== 'resident';

      if (cityEl) cityEl.required = !!nonResident;
      if (orgEl) orgEl.required = !!nonResident;

      if (cityHelp) cityHelp.style.display = nonResident ? 'block' : 'none';
      if (orgHelp) orgHelp.style.display = nonResident ? 'block' : 'none';
    };

    roleEl?.addEventListener('change', updateConditionalRequirements);
    updateConditionalRequirements();

    const validate = () => {
      hideFormError();
      clearInvalid();

      const email = safeText(emailEl?.value);
      const platform = safeText(platformEl?.value);
      const role = safeText(roleEl?.value);
      const nonResident = role && role !== 'resident';

      if (!email) {
        emailEl?.classList.add('invalid');
        showFormError('נא למלא כתובת אימייל');
        emailEl?.focus();
        return false;
      }
      if (!isValidEmail(email)) {
        emailEl?.classList.add('invalid');
        showFormError('האימייל לא נראה תקין בדקו ונסו שוב');
        emailEl?.focus();
        return false;
      }
      if (!platform) {
        platformEl?.classList.add('invalid');
        showFormError('נא לבחור סוג מכשיר');
        platformEl?.focus();
        return false;
      }
      if (!role) {
        roleEl?.classList.add('invalid');
        showFormError('נא לבחור מי אתם');
        roleEl?.focus();
        return false;
      }

      if (nonResident) {
        const city = safeText(cityEl?.value);
        const org = safeText(orgEl?.value);

        if (!city) {
          cityEl?.classList.add('invalid');
          showFormError('נא למלא עיר או ישוב חובה לרשויות ולגורמים מקצועיים');
          cityEl?.focus();
          return false;
        }
        if (!org) {
          orgEl?.classList.add('invalid');
          showFormError('נא למלא שם ארגון חובה לרשויות ולגורמים מקצועיים');
          orgEl?.focus();
          return false;
        }
      }

      return true;
    };

    const withTimeout = (controller, ms) => {
      const t = setTimeout(() => controller.abort(), ms);
      return () => clearTimeout(t);
    };

    betaForm?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validate()) return;

      // מניעת double-submit
      if (submitBtn?.disabled) return;

      setLoading(true);

      // מבטל בקשה קודמת אם קיימת
      try { activeController?.abort(); } catch (_) {}
      activeController = new AbortController();
      const clearTO = withTimeout(activeController, REQUEST_TIMEOUT_MS);

      const email = safeText(emailEl?.value);
      const platform = safeText(platformEl?.value);
      const name = safeText(nameEl?.value);
      const city = safeText(cityEl?.value);
      const role = safeText(roleEl?.value);
      const organization = safeText(orgEl?.value);
      const phone = safeText(phoneEl?.value);
      const notes = safeText(notesEl?.value);

      const messageLines = [
        'Beta form signup from landing page',
        '',
        `Name: ${name || 'N/A'}`,
        `Email: ${email}`,
        `Platform: ${platform || 'N/A'}`,
        `City: ${city || 'N/A'}`,
        `Role: ${role || 'N/A'}`,
        `Organization: ${organization || 'N/A'}`,
        `Phone: ${phone || 'N/A'}`,
        '',
        'Notes',
        notes || 'N/A',
      ];

      const payload = {
        name,
        email,
        source: 'beta_form',
        message: messageLines.join('\n'),
        platform,
        role,
        city,
        organization,
        phone,
        notes,
      };

      try {
        const res = await fetch(FORMS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: activeController.signal,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'follow',
          mode: 'cors',
        });

        let json = null;
        try { json = await res.json(); } catch (_) {}

        if (res.ok && json && json.ok) {
          betaForm.reset();
          updateConditionalRequirements();
          hideFormError();
          showToast('success', 'נשלח בהצלחה', 'תודה נעדכן כשגרסת הבטא תהיה מוכנה');
          scrollToId('beta-form');
        } else {
          showToast('error', 'לא נשלח', 'אירעה שגיאה בשליחה נסו שוב בעוד רגע');
        }
      } catch (err) {
        // Abort -> לרוב timeout
        if (err?.name === 'AbortError') {
          showToast('error', 'זמן המתנה הסתיים', 'השרת לא ענה בזמן נסו שוב');
        } else {
          showToast('error', 'שגיאת חיבור', 'לא הצלחנו להתחבר לשרת נסו שוב מאוחר יותר');
        }
      } finally {
        clearTO();
        setLoading(false);
      }
    });

    // אם נכנסים עם #beta-form בכתובת -> גלילה עם offset (ולא שיקפוץ מתחת ל-header)
    if (location.hash === '#beta-form') {
      // קטן כדי לאפשר לרינדור להסתיים
      setTimeout(() => scrollToId('beta-form'), 50);
    }
  });
})();
