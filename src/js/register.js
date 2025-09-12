// src/js/register.js

export function initRegister() {
  const form = document.getElementById("registerForm");
  const btn = document.getElementById("registerBtn");
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('spinner');

  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const age = document.getElementById("age");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  const errors = {
    firstNameError: document.getElementById("firstNameError"),
    lastNameError: document.getElementById("lastNameError"),
    ageError: document.getElementById("ageError"),
    emailError: document.getElementById("emailError"),
    passwordError: document.getElementById("passwordError"),
    confirmPasswordError: document.getElementById("confirmPasswordError"),
  };

  // Regex: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  function validate() {
    let valid = true;

    if (firstName.value.trim().length < 2) {
      errors.firstNameError.textContent = "Ingresa un nombre válido";
      valid = false;
    } else errors.firstNameError.textContent = "";

    if (lastName.value.trim().length < 2) {
      errors.lastNameError.textContent = "Ingresa un apellido válido";
      valid = false;
    } else errors.lastNameError.textContent = "";

    if (!age.value || isNaN(age.value) || Number(age.value) < 13) {
      errors.ageError.textContent = "Debes tener al menos 13 años";
      valid = false;
    } else errors.ageError.textContent = "";

    if (!email.validity.valid) {
      errors.emailError.textContent = "Correo inválido";
      valid = false;
    } else errors.emailError.textContent = "";

    if (!passwordRegex.test(password.value)) {
      errors.passwordError.textContent =
        "Debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo";
      valid = false;
    } else errors.passwordError.textContent = "";

    if (confirmPassword.value !== password.value) {
      errors.confirmPasswordError.textContent = "Las contraseñas no coinciden";
      valid = false;
    } else errors.confirmPasswordError.textContent = "";

    btn.disabled = !valid;
  }

  [firstName, lastName, age, email, password, confirmPassword].forEach(input =>
    input.addEventListener("input", validate)
  );

  // Toggle password visibility for register form
  const togglePasswordReg = document.getElementById('togglePasswordReg');
  const toggleConfirmReg = document.getElementById('toggleConfirmReg');
  if (togglePasswordReg) {
    togglePasswordReg.addEventListener('click', () => {
      const showing = togglePasswordReg.getAttribute('aria-pressed') === 'true';
      password.type = showing ? 'password' : 'text';
      togglePasswordReg.textContent = showing ? 'Mostrar' : 'Ocultar';
      togglePasswordReg.setAttribute('aria-pressed', showing ? 'false' : 'true');
    });
  }
  if (toggleConfirmReg) {
    toggleConfirmReg.addEventListener('click', () => {
      const showing = toggleConfirmReg.getAttribute('aria-pressed') === 'true';
      confirmPassword.type = showing ? 'password' : 'text';
      toggleConfirmReg.textContent = showing ? 'Mostrar' : 'Ocultar';
      toggleConfirmReg.setAttribute('aria-pressed', showing ? 'false' : 'true');
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
  btn.disabled = true;
  if (btnText) btnText.textContent = 'Procesando...';
  if (spinner) spinner.style.display = 'inline-block';

    const userData = {
      nombres: firstName.value.trim(),
      apellidos: lastName.value.trim(),
      edad: Number(age.value),
      email: email.value.trim(),
      password: password.value,
      confirmPassword: confirmPassword.value
    };

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('[initRegister] using base URL', base);
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (res.status === 201) {
        if (btnText) btnText.textContent = 'Registrarse';
        if (spinner) spinner.style.display = 'none';
        alert("✅ Cuenta creada con éxito");
        setTimeout(() => (window.location.hash = "#/login"), 500);
      } else if (res.status === 409) {
        errors.emailError.textContent = "Este correo ya está registrado";
        if (btnText) btnText.textContent = 'Registrarse';
        if (spinner) spinner.style.display = 'none';
        btn.disabled = false;
      } else {
        console.error(await res.text());
        alert("Intenta de nuevo más tarde");
        if (btnText) btnText.textContent = 'Registrarse';
        if (spinner) spinner.style.display = 'none';
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Intenta de nuevo más tarde");
      if (btnText) btnText.textContent = 'Registrarse';
      if (spinner) spinner.style.display = 'none';
      btn.disabled = false;
    }
  });
}
