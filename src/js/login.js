export function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const http.js:25 
 
 POST http://localhost:3000/api/v1/users 400 (Bad Request)
request	@	http.js:25
post	@	http.js:63
registerUser	@	userService.js:26
(anonymous)	@	route.js:82email = document.getElementById("email");
  const password = document.getElementById("password");

  const btn = document.getElementById("loginBtn");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");

  const errors = {
    emailError: document.getElementById("emailError"),
    passwordError: document.getElementById("passwordError"),
  };

  function validate() {
    let valid = true;

    if (!email.value || !email.validity.valid) {
      errors.emailError.textContent = "Correo inválido";
      valid = false;
    } else errors.emailError.textContent = "";

    if (!password.value) {
      errors.passwordError.textContent = "Contraseña requerida";
      valid = false;
    } else errors.passwordError.textContent = "";

    btn.disabled = !valid;
    return valid;
  }

  [email, password].forEach(input =>
    input.addEventListener("input", validate)
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    btn.disabled = true;
    btnText.textContent = "Procesando...";
    spinner.style.display = "inline-block";

    const userData = {
      email: email.value.trim(),
      password: password.value,
    };

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // Guardar token si viene en la respuesta
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        // Guardar el ID del usuario si viene en la respuesta
        if (data.user && data.user._id) {
          localStorage.setItem('userId', data.user._id);
        }
        alert("✅ Login exitoso");
        setTimeout(() => (window.location.hash = "#/board"), 500);
      } else {
        const msg = data.message || data.error || `Error ${res.status}`;
        alert(msg);
      }
    } catch (err) {
      console.error('Login request failed:', err);
      alert("Intenta de nuevo más tarde");
    } finally {
      btn.disabled = false;
      btnText.textContent = "Iniciar sesión";
      spinner.style.display = "none";
    }
  });
}