export function initCreateTask() {
  const form = document.getElementById("createTaskForm");
  if (!form) return;

  const title = document.getElementById("title");
  const description = document.getElementById("description");
  const status = document.getElementById("status");
  const userInput = document.getElementById('user');


  const btn = document.getElementById("createTaskBtn");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("spinner");
  const msg = document.getElementById("createTaskMsg");

  // Autocompletar el campo de usuario oculto con el ID autenticado si existe en localStorage
  const storedUserId = localStorage.getItem('userId');
  if (storedUserId && userInput) {
    try { userInput.value = storedUserId; } catch (e) {}
  }

  const errors = {
    titleError: document.getElementById("titleError"),
    descriptionError: document.getElementById("descriptionError"),
    statusError: document.getElementById("statusError"),
  };

  function validate() {
    let valid = true;
    if (title.value.trim().length < 2) {
      errors.titleError.textContent = "Título muy corto";
      valid = false;
    } else errors.titleError.textContent = "";
    if (description.value.trim().length < 5) {
      errors.descriptionError.textContent = "Descripción muy corta";
      valid = false;
    } else errors.descriptionError.textContent = "";
    if (!status.value) {
      errors.statusError.textContent = "Selecciona un estado";
      valid = false;
    } else errors.statusError.textContent = "";
    btn.disabled = !valid;
    return valid;
  }

  [title, description, status].forEach(input =>
    input.addEventListener("input", validate)
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;
    btn.disabled = true;
    btnText.textContent = "Creando...";
    spinner.style.display = "inline-block";
    msg.textContent = "";
    const userId = localStorage.getItem('userId');
    const taskData = {
      title: title.value.trim(),
      description: description.value.trim(),
      status: status.value,
      user: userId || '',
    };
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify(taskData),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        msg.textContent = "✅ Tarea creada con éxito";
        msg.className = 'success-msg';
        // Reset form but keep the stored user id and status default
        const oldStatus = status.value;
        form.reset();
        if (userInput && storedUserId) userInput.value = storedUserId;
        try { status.value = oldStatus; } catch (e) {}
      } else {
        msg.textContent = data.message || data.error || `Error ${res.status}`;
      }
      } catch (err) {
      msg.textContent = "Error de red. Intenta de nuevo.";
      msg.className = 'error-msg';
    } finally {
      btn.disabled = false;
      btnText.textContent = "Crear tarea";
      spinner.style.display = "none";
    }
  });
}
