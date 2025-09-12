export function initLogin() {
  console.log('[initLogin] initializing login form');
  const form = document.getElementById('loginForm');
  if (!form) return;

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
    forgot.addEventListener('click', (ev) => {
      ev.preventDefault();
      const mail = prompt('Ingrese su correo para recibir instrucciones de recuperación:');
      if (!mail) return alert('Operación cancelada');
      // Aquí podríamos llamar a una API de recuperación si existiera
      alert(`Si existe una cuenta asociada a ${mail}, se enviarán instrucciones para recuperar la contraseña.`);
    });
  }
}