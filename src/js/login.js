export function initLogin() {
  console.log('[initLogin] initializing login form');
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Si viene redirigido desde reset-password, muestra mensaje de éxito
  try {
    const resetMsg = localStorage.getItem('resetSuccessMsg');
    if (resetMsg) {
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

  /**
   * 🔑 Nueva función de validación
   * - Recibe `showErrors` (true/false) para decidir si mostrar mensajes.
   * - Cuando se usa en tiempo real → showErrors = false (solo deshabilita botón).
   * - Cuando el usuario da click en "Iniciar sesión" → showErrors = true (muestra mensajes).
   */
  function validate(showErrors = true) {
    let valid = true;

    // Validar email
    if (!email.value || !email.validity.valid) {
      if (showErrors) errors.emailError.textContent = 'Correo inválido';
      valid = false;
    } else {
      errors.emailError.textContent = '';
    }

    // Validar contraseña
    if (!password.value) {
      if (showErrors) errors.passwordError.textContent = 'Contraseña requerida';
      valid = false;
    } else {
      errors.passwordError.textContent = '';
    }

    // Deshabilita botón si no es válido
    btn.disabled = !valid;
    return valid;
  }

  // Escuchar inputs pero sin mostrar mensajes de error, solo actualiza botón
  [email, password].forEach(input =>
    input.addEventListener('input', () => validate(false))
  );

  // Validar una vez al inicio (sin errores visibles)
  try { validate(false); } catch (e) { /* ignore */ }

  // Botón para mostrar/ocultar contraseña
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
      validate(false);
    });
  }

  // Submit del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 🚨 Aquí validamos con showErrors = true (sí muestra mensajes)
    if (!validate(true)) return;

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
      const res = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user && data.user._id) localStorage.setItem('userId', data.user._id);
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
      const mail = prompt('Ingrese su correo para recibir instrucciones de recuperación:');
      if (!mail) return alert('Operación cancelada');
      const trimmed = String(mail).trim();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return alert('Por favor ingresa un correo válido.');
      }

      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = `${base.replace(/\/$/, '')}/api/v1/auth/forgot-password`;
        console.log('[forgotPassword] POST ->', url, 'body=', { email: trimmed });
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed })
        });

        if (resp.ok) {
          let body = {};
          try { body = await resp.json(); } catch (e) { body = {}; }
          const token = body && body.token ? String(body.token) : null;
          if (token) {
            window.location.hash = `#/reset-password?token=${encodeURIComponent(token)}`;
            return;
          }
          alert('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar la contraseña. Revisa tu bandeja de entrada. Serás redirigido a la pantalla de restablecimiento.');
          window.location.hash = '#/reset-password';
          return;
        } else {
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
