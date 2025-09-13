export function initResetPassword() {
  const form = document.getElementById('resetForm');
  if (!form) return;

  const tokenInput = document.getElementById('token');
  const newPass = document.getElementById('newPassword');
  const confirm = document.getElementById('confirmNewPassword');
  const btn = document.getElementById('resetBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');
  const msg = document.getElementById('resetMsg');

  function validate() {
    let valid = true;
    msg.textContent = '';
    if (!tokenInput.value.trim()) valid = false;
    if (!newPass.value || newPass.value.length < 8) valid = false;
    if (newPass.value !== confirm.value) valid = false;
    btn.disabled = !valid;
    return valid;
  }

  [tokenInput, newPass, confirm].forEach(i => i.addEventListener('input', validate));
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
      token: tokenInput.value.trim(),
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
        // show success and redirect to login
        try { localStorage.setItem('resetSuccessMsg', 'Cambio de contraseña exitoso'); } catch (e) {}
        setTimeout(() => { window.location.hash = '#/login'; }, 500);
        return;
      }

      // read error body
      let txt = '';
      try { const j = await res.json(); txt = j.message || j.error || JSON.stringify(j); } catch (_) { txt = await res.text().catch(() => ''); }
      alert('No se pudo cambiar la contraseña: ' + (txt || res.status));
    } catch (err) {
      console.error('reset-password error', err);
      alert('Error de red. Intenta de nuevo más tarde.');
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Cambiar contraseña';
      if (spinner) spinner.style.display = 'none';
    }
  });
  // Prefill token if present in hash query: #/reset-password?token=...
  try {
    const hash = window.location.hash || '';
    const q = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(q);
    const t = params.get('token');
    if (t && tokenInput && !tokenInput.value) tokenInput.value = decodeURIComponent(t);
    validate();
  } catch (e) { /* ignore */ }
}
