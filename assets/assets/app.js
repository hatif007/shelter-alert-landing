/* assets/app.js */

/* כדי שכפתורים עם onclick="scrollToBetaForm()" יעבדו */
console.log("app.js loaded");

function scrollToBetaForm() {
  var el = document.getElementById('beta-form');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.scrollToBetaForm = scrollToBetaForm;

document.addEventListener('DOMContentLoaded', function () {
  const header = document.getElementById('site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.getElementById('menu-toggle');
  const drawer = document.getElementById('nav-drawer');

  function closeDrawer() {
    if (!drawer || !toggle) return;
    drawer.style.display = 'none';
    toggle.setAttribute('aria-expanded', 'false');
  }
  function openDrawer() {
    if (!drawer || !toggle) return;
    drawer.style.display = 'block';
    toggle.setAttribute('aria-expanded', 'true');
  }

  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeDrawer() : openDrawer();
    });

    document.addEventListener('click', function (e) {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (!isOpen) return;
      if (drawer.contains(e.target) || toggle.contains(e.target)) return;
      closeDrawer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));
  }

  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  const toastClose = document.getElementById('toast-close');
  let toastTimer = null;

  function showToast(type, title, message) {
    if (!toast) return;

    toast.classList.remove('success', 'error', 'show');
    toast.classList.add(type);

    if (toastIcon) toastIcon.textContent = type === 'success' ? '✓' : '!';
    if (toastTitle) toastTitle.textContent = title || (type === 'success' ? 'נשלח בהצלחה' : 'שגיאה');
    if (toastMessage) toastMessage.textContent = message || '';

    if (toastTimer) clearTimeout(toastTimer);

    requestAnimationFrame(() => toast.classList.add('show'));
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
  }

  if (toastClose) {
    toastClose.addEventListener('click', () => toast.classList.remove('show'));
  }

  const FORMS_API_URL = 'https://red-alert-forms-service-production.up.railway.app/contact';

  const betaForm = document.getElementById('beta-form-form');
  const formErrors = document.getElementById('form-errors');

  const emailEl = document.getElementById('email');
  const platformEl = document.getElementById('platform');
  const nameEl = document.getElementById('name');
  const cityEl = document.getElementById('city');
  const roleEl = document.getElementById('role');
  const orgEl = document.getElementById('org');
  const phoneEl = document.getElementById('phone');
  const notesEl = document.getElementById('notes');

  const cityHelp = document.getElementById('city-help');
  const orgHelp = document.getElementById('org-help');

  const submitBtn = document.getElementById('submit-btn');
  const spinner = document.getElementById('submit-spinner');
  const submitText = document.getElementById('submit-text');

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
    if (submitText) submitText.textContent = isLoading ? 'שולח' : 'שלחו לי עדכון כשגרסת הבטא מוכנה';
  }

  function clearInvalid() {
    [emailEl, platformEl, cityEl, roleEl, orgEl].forEach((el) => el && el.classList.remove('invalid'));
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
    const role = (roleEl?.value || '').trim();
    const nonResident = role && role !== 'resident';

    if (cityEl) cityEl.required = !!nonResident;
    if (orgEl) orgEl.required = !!nonResident;

    if (cityHelp) cityHelp.style.display = nonResident ? 'block' : 'none';
    if (orgHelp) orgHelp.style.display = nonResident ? 'block' : 'none';
  }

  roleEl?.addEventListener('change', updateConditionalRequirements);
  updateConditionalRequirements();

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validate() {
    hideFormError();
    clearInvalid();

    const email = (emailEl?.value || '').trim();
    const platform = (platformEl?.value || '').trim();
    const role = (roleEl?.value || '').trim();
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
      const city = (cityEl?.value || '').trim();
      const org = (orgEl?.value || '').trim();
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
  }

  betaForm?.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const email = (emailEl?.value || '').trim();
    const platform = (platformEl?.value || '').trim();
    const name = (nameEl?.value || '').trim();
    const city = (cityEl?.value || '').trim();
    const role = (roleEl?.value || '').trim();
    const organization = (orgEl?.value || '').trim();
    const phone = (phoneEl?.value || '').trim();
    const notes = (notesEl?.value || '').trim();

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
      });

      let json = null;
      try {
        json = await res.json();
      } catch (_) {}

      if (res.ok && json && json.ok) {
        betaForm.reset();
        updateConditionalRequirements();
        hideFormError();
        showToast('success', 'נשלח בהצלחה', 'תודה נעדכן כשגרסת הבטא תהיה מוכנה');
        document.getElementById('beta-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        showToast('error', 'לא נשלח', 'אירעה שגיאה בשליחה נסו שוב בעוד רגע');
      }
    } catch (err) {
      showToast('error', 'שגיאת חיבור', 'לא הצלחנו להתחבר לשרת נסו שוב מאוחר יותר');
    } finally {
      setLoading(false);
    }
  });
});
