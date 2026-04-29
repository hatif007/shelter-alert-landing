// Live clock in topbar
(function () {
  var el = document.getElementById('clock');
  function tick() {
    if (!el) return;
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    el.textContent = hh + ':' + mm + ':' + ss;
  }
  tick();
  setInterval(tick, 1000);
})();

// Reveal-on-scroll using IntersectionObserver
(function () {
  var nodes = document.querySelectorAll('.fade-in');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

  var vh = window.innerHeight || 0;
  nodes.forEach(function (n) {
    var r = n.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      n.classList.add('visible');
    } else {
      io.observe(n);
    }
  });

  // Safety net
  setTimeout(function () {
    nodes.forEach(function (n) { n.classList.add('visible'); });
  }, 1500);
})();

// Demo modal + form submit
(function () {
  var FORMS_API_URL = 'https://red-alert-forms-service-production.up.railway.app/contact';
  var RECAPTCHA_SITE_KEY = '6LeKyZwsAAAAAAbEGSU6yYKHJrqBxvcoz-xY8L_B';

  function getRecaptchaToken(action) {
    return new Promise(function (resolve) {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        resolve('');
        return;
      }
      try {
        window.grecaptcha.ready(function () {
          window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action })
            .then(function (token) { resolve(token || ''); })
            .catch(function () { resolve(''); });
        });
      } catch (e) {
        resolve('');
      }
    });
  }

  var modal = document.getElementById('demo-modal');
  var form = document.getElementById('demo-form');
  var errors = document.getElementById('d-errors');
  var submit = document.getElementById('d-submit');
  var spinner = document.getElementById('d-spinner');
  var submitText = document.getElementById('d-submit-text');

  var emailEl = document.getElementById('d-email');
  var roleEl = document.getElementById('d-role');
  var nameEl = document.getElementById('d-name');
  var phoneEl = document.getElementById('d-phone');
  var orgEl = document.getElementById('d-org');
  var cityEl = document.getElementById('d-city');
  var notesEl = document.getElementById('d-notes');

  var toast = document.getElementById('toast');
  var toastIcon = document.getElementById('toast-icon');
  var toastTitle = document.getElementById('toast-title');
  var toastMsg = document.getElementById('toast-msg');
  var toastTimer = null;

  function open() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { emailEl.focus(); }, 50);
  }
  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    clearInvalid();
    hideError();
  }

  document.querySelectorAll('[data-open-demo]').forEach(function (b) {
    b.addEventListener('click', open);
  });
  document.querySelectorAll('[data-close-demo]').forEach(function (b) {
    b.addEventListener('click', close);
  });
  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });

  function setLoading(on) {
    submit.disabled = on;
    spinner.classList.toggle('show', on);
    submitText.textContent = on ? 'שולח...' : 'שלחו בקשה';
  }
  function clearInvalid() {
    [emailEl, roleEl, orgEl].forEach(function (el) { el.classList.remove('invalid'); });
  }
  function showError(msg) {
    errors.textContent = msg;
    errors.classList.add('show');
  }
  function hideError() {
    errors.textContent = '';
    errors.classList.remove('show');
  }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function showToast(type, title, msg) {
    toast.classList.remove('success', 'error', 'show');
    toast.classList.add(type);
    toastIcon.textContent = type === 'success' ? '✓' : '!';
    toastTitle.textContent = title;
    toastMsg.textContent = msg;
    if (toastTimer) clearTimeout(toastTimer);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 4500);
  }

  function validate() {
    hideError();
    clearInvalid();
    var email = emailEl.value.trim();
    var role = roleEl.value.trim();
    var org = orgEl.value.trim();

    if (!email) { emailEl.classList.add('invalid'); showError('נא למלא כתובת אימייל.'); emailEl.focus(); return false; }
    if (!isEmail(email)) { emailEl.classList.add('invalid'); showError('האימייל לא נראה תקין.'); emailEl.focus(); return false; }
    if (!role) { roleEl.classList.add('invalid'); showError('נא לבחור מי אתם.'); roleEl.focus(); return false; }
    if (!org) { orgEl.classList.add('invalid'); showError('נא למלא שם ארגון / רשות.'); orgEl.focus(); return false; }
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    var role = roleEl.value.trim();
    var organization = orgEl.value.trim();
    var city = cityEl.value.trim();
    var phone = phoneEl.value.trim();
    var notes = notesEl.value.trim();

    var lines = [
      'C&C Demo request from cnc.html landing:',
      '',
      'Name: ' + (name || 'N/A'),
      'Email: ' + email,
      'Role: ' + role,
      'Organization: ' + organization,
      'City: ' + (city || 'N/A'),
      'Phone: ' + (phone || 'N/A'),
      '',
      'Notes:',
      notes || 'N/A'
    ];

    getRecaptchaToken('cnc_demo').then(function (recaptchaToken) {
    var payload = {
      name: name,
      email: email,
      source: 'cnc_demo',
      message: lines.join('\n'),
      role: role,
      organization: organization,
      city: city,
      phone: phone,
      notes: notes,
      recaptchaToken: recaptchaToken
    };

    fetch(FORMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (json) {
        return { ok: res.ok, json: json, status: res.status };
      });
    }).then(function (result) {
      if (result.ok && result.json && result.json.ok) {
        form.reset();
        close();
        showToast('success', 'הבקשה נשלחה', 'תודה! נחזור אליכם בקרוב.');
      } else {
        console.error(result.json || { status: result.status });
        showToast('error', 'שליחה נכשלה', 'אירעה שגיאה. נסו שוב בעוד רגע.');
      }
    }).catch(function (err) {
      console.error(err);
      showToast('error', 'שגיאת חיבור', 'לא הצלחנו להתחבר לשרת.');
    }).then(function () {
      setLoading(false);
    });
    });
  });
})();
