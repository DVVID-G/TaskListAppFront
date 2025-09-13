export function initLogin() {
  console.log('[initLogin] initializing login form');
  const form = document.getElementById('loginForm');
  if (!form) return;

  // If redirected from reset-password, show success message stored in localStorage
  try {
    const resetMsg = localStorage.getItem('resetSuccessMsg');
    if (resetMsg) {
      // prefer inline element if exists
      const info = document.getElementById('infoMsg');
      if (info) {
        info.textContent = resetMsg;
        info.style.display = 'block';
      } else {
        alert(resetMsg);
      }
      localStorage.removeItem('resetSuccessMsg');
    }
  } catch (e) { /* ignore */ }

  const email = document.getElementById('email');
  const password = document.getElementById('password');

  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');

  const errors = {
    emailError: document.getElementById('emailError'),
    passwordError: document.getElementById('passwordError'),
  };

  function validate() {
    let valid = true;
    if (!email.value || !email.validity.valid) {
      errors.emailError.textContent = 'Correo inválido';
      valid = false;
    } else {
      errors.emailError.textContent = '';
    }

    if (!password.value) {
      errors.passwordError.textContent = 'Contraseña requerida';
      valid = false;
    } else {
      errors.passwordError.textContent = '';
    }

    btn.disabled = !valid;
    return valid;
  }

  [email, password].forEach(input => input.addEventListener('input', validate));
  // Run validation once at start to set initial button state
  try { validate(); } catch (e) { /* ignore */ }

  // Password toggle button
  const toggleBtn = document.getElementById('togglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const showing = toggleBtn.getAttribute('aria-pressed') === 'true';
      if (showing) {
        password.type = 'password';
        toggleBtn.textContent = 'Mostrar';
        toggleBtn.setAttribute('aria-pressed', 'false');
        toggleBtn.setAttribute('aria-label', 'Mostrar contraseña');
      } else {
        password.type = 'text';
        toggleBtn.textContent = 'Ocultar';
        toggleBtn.setAttribute('aria-pressed', 'true');
        toggleBtn.setAttribute('aria-label', 'Ocultar contraseña');
      }
      validate();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    btn.disabled = true;
    if (btnText) btnText.textContent = 'Procesando...';
    if (spinner) spinner.style.display = 'inline-block';

    const userData = {
      email: email.value.trim(),
      password: password.value,
    };

    console.log('[initLogin] submitting', userData);
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('[initLogin] using base URL', base);
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user && data.user._id) localStorage.setItem('userId', data.user._id);
        alert('✅ Login exitoso');
        setTimeout(() => (window.location.hash = '#/board'), 500);
      } else {
        const msg = data.message || data.error || `Error ${res.status}`;
        alert(msg);
      }
    } catch (err) {
      console.error('Login request failed:', err);
      alert('Intenta de nuevo más tarde');
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Iniciar sesión';
      if (spinner) spinner.style.display = 'none';
    }
  });

  // Forgot password link
  const forgot = document.getElementById('forgotPassword');
  if (forgot) {
    forgot.addEventListener('click', async (ev) => {
      ev.preventDefault();
      // Ask for email via prompt as simple UI fallback, but validate before sending
      const mail = prompt('Ingrese su correo para recibir instrucciones de recuperación:');
      if (!mail) return alert('Operación cancelada');
      const trimmed = String(mail).trim();
      // basic email validation
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return alert('Por favor ingresa un correo válido.');
      }

      // send request to backend
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = `${base.replace(/\/$/, '')}/api/v1/auth/forgot-password`;
        console.log('[forgotPassword] POST ->', url, 'body=', { email: trimmed });
        // Optionally show a spinner or disable UI - using alert flow for now
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed })
        });

        if (resp.ok) {
          // If the backend returns a token directly (some implementations do for testing), pass it
          let body = {};
          try { body = await resp.json(); } catch (e) { body = {}; }
          const token = body && body.token ? String(body.token) : null;
          if (token) {
            // redirect with token in query so reset form can prefill
            window.location.hash = `#/reset-password?token=${encodeURIComponent(token)}`;
            return;
          }
          alert('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar la contraseña. Revisa tu bandeja de entrada. Serás redirigido a la pantalla de restablecimiento.');
          // redirect user to reset-password view to follow instructions
          window.location.hash = '#/reset-password';
          return;
        } else {
          // try to parse body for a helpful message
          let txt = '';
          try { const j = await resp.json(); txt = j.message || j.error || JSON.stringify(j); } catch (e) { txt = await resp.text().catch(() => ''); }
          alert(`No se pudo procesar la solicitud: ${resp.status} ${txt}`);
        }
      } catch (err) {
        console.error('forgot-password error', err);
        alert('Error de red. Intenta de nuevo más tarde.');
      }
    });
  }
}