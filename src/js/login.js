// Compatibility stub: some build systems or older imports may reference 'Login.js' (capital L).
// Re-export from the canonical lowercase module so both import paths resolve to the same implementation.
export * from './login.js';
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
        showMessage(resetMsg, 'success');
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

  // Non-modal message helper (replaces alert())
  function showMessage(text, type = 'info') {
    try {
      const info = document.getElementById('infoMsg') || document.getElementById('loginMsg');
      if (info) {
        info.textContent = text;
        info.style.display = 'block';
        info.style.color = type === 'error' ? 'var(--error-color)' : (type === 'success' ? 'var(--success-color)' : 'inherit');
        return;
      }
      const container = document.createElement('div');
      container.id = 'loginMsg';
      container.textContent = text;
      container.style.margin = '0.5rem 0';
      container.style.padding = '0.5rem 0.75rem';
      container.style.borderRadius = '4px';
      container.style.background = type === 'error' ? '#fff3f3' : 'transparent';
      container.style.color = type === 'error' ? 'var(--error-color)' : (type === 'success' ? 'var(--success-color)' : '#fff');
      const ref = form || document.getElementById('app') || document.body;
      ref.parentElement ? ref.parentElement.insertBefore(container, ref) : document.body.appendChild(container);
    } catch (e) {
      console[type === 'error' ? 'error' : 'log'](text);
    }
  }

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
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
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
          showMessage('✅ Login exitoso', 'success');
          // Prefer redirect saved in postLoginRedirect (if any)
          setTimeout(() => {
            try {
              const target = localStorage.getItem('postLoginRedirect');
              if (target) {
                localStorage.removeItem('postLoginRedirect');
                window.location.hash = target;
                return;
              }
            } catch (e) { /* ignore */ }
            window.location.hash = '#/board';
          }, 500);
      } else {
        const msg = data.message || data.error || `Error ${res.status}`;
        showMessage(msg, 'error');
          if (data?.token) localStorage.setItem('token', data.token);
          msg.textContent = 'Login exitoso';
          setTimeout(() => {
            try {
              const target = localStorage.getItem('postLoginRedirect');
              if (target) {
                localStorage.removeItem('postLoginRedirect');
                location.hash = target;
                return;
              }
            } catch (e) { /* ignore */ }
            location.hash = '#/board';
          }, 400);
      }
    } catch (err) {
      console.error('Login request failed:', err);
      showMessage('Intenta de nuevo más tarde', 'error');
    } finally {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'Iniciar sesión';
      if (spinner) spinner.style.display = 'none';
    }
  });

  // Forgot password link (robusta y con logs)
  (function setupForgot() {
    const forgot = document.getElementById('forgotPassword');
    let forgotContainer = document.getElementById('forgotContainer');
    let forgotForm = document.getElementById('forgotForm');
    let forgotEmail = document.getElementById('forgotEmail');
    let forgotEmailError = document.getElementById('forgotEmailError');
    let forgotSendBtn = document.getElementById('forgotSendBtn');
    let forgotBtnText = document.getElementById('forgotBtnText');
    let forgotSpinner = document.getElementById('forgotSpinner');
    let forgotMsg = document.getElementById('forgotMsg');

    console.log('[initLogin] forgot elements', {
      forgot: !!forgot,
      forgotContainer: !!forgotContainer,
      forgotForm: !!forgotForm,
      forgotEmail: !!forgotEmail,
      forgotSendBtn: !!forgotSendBtn
    });

    // If there are duplicate IDs in the DOM (from previous dynamic creation), remove extras
    try {
      // Remove any forgot elements that are nested inside the login form (they block validation)
      const nestedEmail = document.querySelectorAll('#loginForm #forgotEmail');
      if (nestedEmail && nestedEmail.length) {
        console.warn('[initLogin] removing forgotEmail elements nested inside #loginForm');
        nestedEmail.forEach(el => el.remove());
      }
      const nestedBtn = document.querySelectorAll('#loginForm #forgotSendBtn');
      if (nestedBtn && nestedBtn.length) {
        console.warn('[initLogin] removing forgotSendBtn elements nested inside #loginForm');
        nestedBtn.forEach(el => el.remove());
      }
      const nestedForm = document.querySelectorAll('#loginForm #forgotForm');
      if (nestedForm && nestedForm.length) {
        console.warn('[initLogin] removing forgotForm elements nested inside #loginForm');
        nestedForm.forEach(el => el.remove());
      }

      // Also remove any plain duplicates keeping the first occurrence
      const dupEmail = document.querySelectorAll('#forgotEmail');
      if (dupEmail.length > 1) {
        console.warn('[initLogin] found duplicate #forgotEmail, removing extras');
        for (let i = 1; i < dupEmail.length; i++) dupEmail[i].remove();
      }
      const dupBtn = document.querySelectorAll('#forgotSendBtn');
      if (dupBtn.length > 1) {
        console.warn('[initLogin] found duplicate #forgotSendBtn, removing extras');
        for (let i = 1; i < dupBtn.length; i++) dupBtn[i].remove();
      }
      const dupForm = document.querySelectorAll('#forgotForm');
      if (dupForm.length > 1) {
        console.warn('[initLogin] found duplicate #forgotForm, removing extras');
        for (let i = 1; i < dupForm.length; i++) dupForm[i].remove();
      }

      // Re-query after cleanup
      forgotContainer = document.getElementById('forgotContainer') || forgotContainer;
      forgotForm = document.getElementById('forgotForm') || forgotForm;
      forgotEmail = document.getElementById('forgotEmail') || forgotEmail;
      forgotSendBtn = document.getElementById('forgotSendBtn') || forgotSendBtn;
      forgotEmailError = document.getElementById('forgotEmailError') || forgotEmailError;
      forgotBtnText = document.getElementById('forgotBtnText') || forgotBtnText;
      forgotSpinner = document.getElementById('forgotSpinner') || forgotSpinner;
      forgotMsg = document.getElementById('forgotMsg') || forgotMsg;

      // Defensive: ensure the forgotEmail input is associated with the forgotForm (not the login form)
      try {
        if (forgotEmail && forgotForm) {
          forgotEmail.setAttribute('form', forgotForm.id || 'forgotForm');
        }
      } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }

    // If the static form exists but some ids differ, try to find inside the container
    if (!forgotContainer && forgotForm) forgotContainer = forgotForm.parentElement;
    if (!forgotForm && forgotContainer) forgotForm = forgotContainer.querySelector('form') || null;
    if (!forgotEmail && forgotForm) forgotEmail = forgotForm.querySelector('input[type="email"]') || null;
    if (!forgotSendBtn && forgotForm) forgotSendBtn = forgotForm.querySelector('button[type="submit"], button') || null;
    if (!forgotEmailError && forgotContainer) forgotEmailError = forgotContainer.querySelector('.error-msg') || null;
    if (!forgotMsg && forgotContainer) forgotMsg = forgotContainer.querySelector('#forgotMsg') || null;
    if (!forgotBtnText && forgotSendBtn) forgotBtnText = forgotSendBtn.querySelector('span') || null;
    if (!forgotSpinner && forgotContainer) forgotSpinner = forgotContainer.querySelector('.spinner') || null;

    if (!forgot || !forgotContainer || !forgotForm || !forgotEmail || !forgotSendBtn) {
      console.warn('[initLogin] forgot UI not fully present, will create dynamic UI');

      // If there's no link to attach to, abort
      if (!forgot) return;

      // Build the same structure used by the static HTML so wiring below works unchanged
      try {
        const container = document.createElement('div');
        container.id = 'forgotContainer';
  container.style.display = 'none';
        container.style.marginTop = '1rem';

        const formEl = document.createElement('form');
        formEl.id = 'forgotForm';
        formEl.autocomplete = 'off';
        formEl.style.margin = '0';

        const row = document.createElement('div');
        row.className = 'row center-row';

        const label = document.createElement('label');
        label.setAttribute('for', 'forgotEmail');
        label.style.color = '#fff';
        label.style.fontSize = '0.95rem';
        label.textContent = 'Recuperar contraseña';

        const inputWrap = document.createElement('div');
        inputWrap.className = 'input-wrap';

        const input = document.createElement('input');
        input.id = 'forgotEmail';
        input.name = 'forgotEmail';
        input.type = 'email';
        input.placeholder = 'Ingresa tu correo electrónico';
        input.required = true;
        input.style.background = '#fff';
        input.style.color = '#222';

        inputWrap.appendChild(input);

        const errDiv = document.createElement('div');
        errDiv.id = 'forgotEmailError';
        errDiv.className = 'error-msg';

        row.appendChild(label);
        row.appendChild(inputWrap);
        row.appendChild(errDiv);

        const row2 = document.createElement('div');
        row2.className = 'row center-row';

        const btn = document.createElement('button');
        btn.id = 'forgotSendBtn';
        btn.type = 'submit';
        btn.className = 'btn';
        btn.style.width = '100%';
        btn.style.background = '#2563eb';
        btn.style.marginTop = '0.5rem';

        const spanText = document.createElement('span');
        spanText.id = 'forgotBtnText';
        spanText.textContent = 'Enviar instrucciones';

        const spanSpinner = document.createElement('span');
        spanSpinner.id = 'forgotSpinner';
        spanSpinner.className = 'spinner';
        spanSpinner.style.display = 'none';

        btn.appendChild(spanText);
        btn.appendChild(spanSpinner);
        row2.appendChild(btn);

        const msgDiv = document.createElement('div');
        msgDiv.id = 'forgotMsg';
        msgDiv.style.textAlign = 'center';
        msgDiv.style.marginTop = '0.5rem';
        msgDiv.style.color = 'var(--success-color)';

        formEl.appendChild(row);
        formEl.appendChild(row2);
        formEl.appendChild(msgDiv);

        container.appendChild(formEl);

        // Insert after the forgot link container
        forgot.parentElement?.appendChild(container);

        // Re-assign variables so wiring below uses the created nodes
        forgotContainer = container;
        forgotForm = formEl;
        forgotEmail = input;
        forgotEmailError = errDiv;
        forgotSendBtn = btn;
        forgotBtnText = spanText;
        forgotSpinner = spanSpinner;
        forgotMsg = msgDiv;
      } catch (e) {
        console.error('[initLogin] failed to create forgot UI', e);
        return;
      }
    }

    // Ensure hidden at init and disable the input so it doesn't block login form validation
    try {
      if (forgotContainer) forgotContainer.style.display = 'none';
      if (forgotEmail) forgotEmail.disabled = true;
    } catch (e) {}

    // Toggle visibility using computed style to avoid mismatches
    forgot.addEventListener('click', (ev) => {
      ev.preventDefault();
      const cs = window.getComputedStyle(forgotContainer);
      const hidden = cs.display === 'none' || forgotContainer.style.display === 'none' || forgotContainer.style.display === '';
      forgotContainer.style.display = hidden ? 'block' : 'none';
      if (hidden) {
        // enable and focus input when showing
        try { forgotEmail.disabled = false; } catch (e) {}
        setTimeout(() => { try { forgotEmail.focus(); } catch (e) {} }, 50);
      } else {
        try { forgotEmail.disabled = true; } catch (e) {}
      }
      if (forgotMsg) forgotMsg.textContent = '';
      if (forgotEmail) { forgotEmail.value = ''; }
      if (forgotEmailError) forgotEmailError.textContent = '';
    });

    // Basic email validation
    function validEmail(v) { return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    function updateState() {
      const v = String(forgotEmail.value || '').trim();
      try { forgotSendBtn.disabled = !validEmail(v); } catch (e) {}
      if (forgotEmailError) forgotEmailError.textContent = '';
      if (forgotMsg) forgotMsg.textContent = '';
    }

    // wire input
    forgotEmail.addEventListener('input', updateState);
    updateState();

    // If the button is of type submit inside the form, better listen to form submit
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = String(forgotEmail.value || '').trim();
        if (!validEmail(emailVal)) {
          if (forgotEmailError) forgotEmailError.textContent = 'Correo inválido';
          return;
        }
        // UI feedback
        try { forgotSendBtn.disabled = true; } catch (e) {}
        const origText = (forgotBtnText && forgotBtnText.textContent) || forgotSendBtn.textContent;
        if (forgotBtnText) forgotBtnText.textContent = 'Enviando...'; else forgotSendBtn.textContent = 'Enviando...';
        if (forgotSpinner) forgotSpinner.style.display = 'inline-block';
        if (forgotEmailError) forgotEmailError.textContent = '';
        if (forgotMsg) forgotMsg.textContent = '';

        try {
          // Save the email used to request reset so the reset page can try auto-login if needed
          try { localStorage.setItem('lastResetEmail', emailVal); } catch (e) { /* ignore */ }
          const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
          const url = `${base}/api/v1/auth/forgot-password`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailVal })
          });
          if (resp.ok) {
            let body = {};
            try { body = await resp.json(); } catch (e) { body = {}; }
            const token = body && body.token ? String(body.token) : null;
            if (token) {
              window.location.hash = `#/reset-password?token=${encodeURIComponent(token)}`;
              return;
            }
            if (forgotMsg) {
              forgotMsg.style.color = 'var(--success-color)';
              forgotMsg.textContent = 'Si existe una cuenta con ese correo, recibirás instrucciones por correo.';
            } else {
              showMessage('Si existe una cuenta con ese correo, recibirás instrucciones por correo.', 'info');
            }
          } else {
            let txt = '';
            try { const j = await resp.json(); txt = j.message || j.error || JSON.stringify(j); } catch (e) { txt = await resp.text().catch(() => ''); }
            if (forgotEmailError) {
              forgotEmailError.textContent = `No se pudo procesar la solicitud: ${resp.status} ${txt}`;
            } else {
              showMessage(`No se pudo procesar la solicitud: ${resp.status} ${txt}`, 'error');
            }
          }
        } catch (err) {
          console.error('forgot-password error', err);
          if (forgotEmailError) forgotEmailError.textContent = 'Error de red. Intenta de nuevo más tarde.';
        } finally {
          try { forgotSendBtn.disabled = false; } catch (e) {}
          if (forgotBtnText) forgotBtnText.textContent = origText || 'Enviar instrucciones'; else forgotSendBtn.textContent = origText || 'Enviar instrucciones';
          if (forgotSpinner) forgotSpinner.style.display = 'none';
        }
      });
    }
  })();
}
