import { loginUser } from '../services/userService.js';

export function initResetPassword() {
  const form = document.getElementById('resetForm');
  if (!form) return;

  // Token may be passed via the hash query (preferred) or present as an input for backwards compatibility.
  const tokenInput = document.getElementById('token');
  // We'll keep the token in this variable and not require the user to type it.
  let tokenValue = '';
  const newPass = document.getElementById('newPassword');
  const confirm = document.getElementById('confirmNewPassword');
  const btn = document.getElementById('resetBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');
  const msg = document.getElementById('resetMsg');

  function showResetMessage(text, type = 'info') {
    try {
      if (msg) {
        msg.textContent = text;
        msg.style.display = 'block';
        msg.style.color = type === 'error' ? 'var(--error-color)' : (type === 'success' ? 'var(--success-color)' : 'inherit');
        return;
      }
      console[type === 'error' ? 'error' : 'log'](text);
    } catch (e) { console.error(e); }
  }

  function validate() {
    let valid = true;
    msg.textContent = '';
    const tokenPresent = (tokenValue && tokenValue.trim()) || (tokenInput && tokenInput.value && tokenInput.value.trim());
    if (!tokenPresent) valid = false;
    if (!newPass.value || newPass.value.length < 8) valid = false;
    if (newPass.value !== confirm.value) valid = false;
    btn.disabled = !valid;
    return valid;
  }

  // If a token input exists (legacy), listen to it; otherwise listen only to password fields.
  if (tokenInput) tokenInput.addEventListener('input', () => { tokenValue = tokenInput.value; validate(); });
  [newPass, confirm].forEach(i => i.addEventListener('input', validate));
  validate();

  // toggles
  const t1 = document.getElementById('toggleNewPass');
  const t2 = document.getElementById('toggleConfirmNew');
  if (t1) t1.addEventListener('click', () => {
    const showing = t1.getAttribute('aria-pressed') === 'true';
    newPass.type = showing ? 'password' : 'text';
    t1.textContent = showing ? 'Mostrar' : 'Ocultar';
    t1.setAttribute('aria-pressed', showing ? 'false' : 'true');
  });
  if (t2) t2.addEventListener('click', () => {
    const showing = t2.getAttribute('aria-pressed') === 'true';
    confirm.type = showing ? 'password' : 'text';
    t2.textContent = showing ? 'Mostrar' : 'Ocultar';
    t2.setAttribute('aria-pressed', showing ? 'false' : 'true');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    btn.disabled = true;
    if (btnText) btnText.textContent = 'Procesando...';
    if (spinner) spinner.style.display = 'inline-block';

    const payload = {
      token: (tokenValue && tokenValue.trim()) || (tokenInput && tokenInput.value && tokenInput.value.trim()) || '',
      password: newPass.value,
      confirmPassword: confirm.value
    };

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = `${base.replace(/\/$/, '')}/api/v1/auth/reset-password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

        if (res.ok) {
          // Try to auto-login the user. Some backends return a token directly.
          let body = null;
          try { body = await res.json(); } catch (e) { /* ignore */ }

          // Look for token in common fields
          const tokenFromBody = body && (body.token || body.accessToken || body.authToken || (body.data && body.data.token));
          if (tokenFromBody) {
            try { localStorage.setItem('token', tokenFromBody); } catch (e) {}
            setTimeout(() => { window.location.hash = '#/board'; }, 400);
            return;
          }

          // If server returned email/user, attempt login with the new password
          const emailFromBody = body && (body.email || (body.user && body.user.email) || (body.data && body.data.email));
          if (emailFromBody) {
            try {
              const loginResp = await loginUser({ email: emailFromBody, password: newPass.value });
              // loginUser returns parsed JSON via http.post; it should include token
              const loginToken = loginResp && (loginResp.token || loginResp.accessToken || loginResp.authToken || (loginResp.data && loginResp.data.token));
              if (loginToken) {
                try { localStorage.setItem('token', loginToken); } catch (e) {}
                setTimeout(() => { window.location.hash = '#/board'; }, 400);
                return;
              }
            } catch (err) {
              // login attempt failed; fall through to default behavior
              console.warn('Auto-login after reset failed:', err.message || err);
            }
            }

          // If still no token and no email returned, try the email saved during the 'forgot' request
          try {
            const saved = localStorage.getItem('lastResetEmail');
            if (!tokenFromBody && !emailFromBody && saved) {
              const loginResp2 = await loginUser({ email: saved, password: newPass.value });
              const loginToken2 = loginResp2 && (loginResp2.token || loginResp2.accessToken || loginResp2.authToken || (loginResp2.data && loginResp2.data.token));
              if (loginToken2) {
                try { localStorage.setItem('token', loginToken2); } catch (e) {}
                // cleanup saved email
                try { localStorage.removeItem('lastResetEmail'); } catch (e) {}
                setTimeout(() => { window.location.hash = '#/board'; }, 400);
                return;
              }
            }
          } catch (e) { /* ignore */ }

          // Fallback: show success message and redirect to login
          try { localStorage.setItem('resetSuccessMsg', 'Cambio de contraseña exitoso'); } catch (e) {}
          setTimeout(() => { window.location.hash = '#/login'; }, 500);
          return;
        }

      // read error body
      let txt = '';
      try { const j = await res.json(); txt = j.message || j.error || JSON.stringify(j); } catch (_) { txt = await res.text().catch(() => ''); }
      showResetMessage('No se pudo cambiar la contraseña: ' + (txt || res.status), 'error');
    } catch (err) {
      console.error('reset-password error', err);
      showResetMessage('Error de red. Intenta de nuevo más tarde.', 'error');
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Cambiar contraseña';
      if (spinner) spinner.style.display = 'none';
    }
  });
  // Prefill token if present in hash query: #/reset-password?token=...
  try {
    // Prefill token if present in hash query: #/reset-password?token=...
    const hash = window.location.hash || '';
    const q = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(q);
    const t = params.get('token');
    if (t) {
      tokenValue = decodeURIComponent(t);
      // For backward compatibility, if a hidden token input exists, populate it but keep it disabled/hidden.
      if (tokenInput) {
        try {
          tokenInput.value = tokenValue;
          // hide and disable the input so it doesn't interfere with layout or validation
          tokenInput.type = 'hidden';
          tokenInput.removeAttribute('required');
          tokenInput.style.display = 'none';
        } catch (e) { /* ignore DOM quirks */ }
      }
    }
    validate();
  } catch (e) { /* ignore */ }
}
