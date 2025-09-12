// src/js/register.js

export function initRegister() {
  const form = document.getElementById("registerForm");
  const btn = document.getElementById("registerBtn");

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = "Procesando...";

    const userData = {
      nombres: firstName.value.trim(),
      apellidos: lastName.value.trim(),
      edad: Number(age.value),
      email: email.value.trim(),
      password: password.value,
      confirmPassword: confirmPassword.value
    };

    try {
      const res = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (res.status === 201) {
        btn.textContent = "Registrarse";
        alert("✅ Cuenta creada con éxito");
        setTimeout(() => (window.location.hash = "#/login"), 500);
      } else if (res.status === 409) {
        errors.emailError.textContent = "Este correo ya está registrado";
        btn.textContent = "Registrarse";
        btn.disabled = false;
      } else {
        console.error(await res.text());
        alert("Intenta de nuevo más tarde");
        btn.textContent = "Registrarse";
        btn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      alert("Intenta de nuevo más tarde");
      btn.textContent = "Registrarse";
      btn.disabled = false;
    }
  });
}
