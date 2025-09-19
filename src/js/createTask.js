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

  // Helper: read query param 'id' from the hash like #/createTask?id=...
  function getTaskIdFromHash() {
    try {
      const raw = location.hash.split('?')[1] || '';
      const params = new URLSearchParams(raw);
      return params.get('id');
    } catch (e) { return null; }
  }

  let editMode = false;
  let editingId = null;

  // If an id is present, load the task and populate form for editing
  const maybeId = getTaskIdFromHash();
  if (maybeId) {
    editMode = true;
    editingId = String(maybeId).replace(/[:\/]/g, '').trim();
    if (editingId) {
      // update UI
      btnText.textContent = 'Cargando...';
      spinner.style.display = 'inline-block';
      (async () => {
        try {
          const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const token = localStorage.getItem('token');
          const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks/${encodeURIComponent(editingId)}`, {
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            msg.textContent = data.message || data.error || `No se pudo cargar la tarea (${res.status})`;
            msg.className = 'error-msg';
            editMode = false;
            editingId = null;
            return;
          }
          // Fill form
          title.value = data.title || data.task?.title || '';
          description.value = data.description || data.task?.description || '';
          // Prefer backend status mapping if available
          const backendStatus = data.status || (data.task && data.task.status) || '';
          // Try to map backend status to one of select options (mapStatusForUI exists in route.js; replicate simple mapping)
          const uiMap = { 'Por hacer':'Por hacer','Haciendo':'En progreso','Hecho':'Completada' };
          if (uiMap[backendStatus]) status.value = uiMap[backendStatus];
          else try { status.value = backendStatus; } catch (e) {}
          msg.textContent = '';
          btnText.textContent = 'Guardar cambios';
        } catch (err) {
          msg.textContent = 'Error cargando la tarea.';
          msg.className = 'error-msg';
          editMode = false;
          editingId = null;
        } finally {
          spinner.style.display = 'none';
          btn.disabled = false;
        }
      })();
    }
  }

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
    btnText.textContent = editMode ? 'Guardando...' : 'Creando...';
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
      let res;
      let data = {};
      if (!editMode) {
        res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
          },
          body: JSON.stringify(taskData),
        });
        data = await res.json().catch(() => ({}));
        if (res.ok) {
          msg.textContent = "✅ Tarea creada con éxito";
          msg.className = 'success-msg';
          const oldStatus = status.value;
          form.reset();
          if (userInput && storedUserId) userInput.value = storedUserId;
          try { status.value = oldStatus; } catch (e) {}
          // Redirect to board for a snappy UX
          setTimeout(() => { location.hash = '#/board'; }, 350);
        } else {
          msg.textContent = data.message || data.error || `Error ${res.status}`;
        }
      } else {
        // Edit mode: try PATCH first, then PUT as fallback
        const url = `${base.replace(/\/$/, '')}/api/v1/tasks/${encodeURIComponent(editingId)}`;
        res = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify(taskData)
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok && res.status === 404) {
          const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(taskData)
          });
          const putData = await putRes.json().catch(() => ({}));
          if (putRes.ok) {
            msg.textContent = '✅ Tarea actualizada';
            msg.className = 'success-msg';
            // Optionally redirect back to board
            setTimeout(() => { location.hash = '#/board'; }, 600);
          } else {
            msg.textContent = putData.message || putData.error || `Error ${putRes.status}`;
          }
        } else if (res.ok) {
          msg.textContent = '✅ Tarea actualizada';
          msg.className = 'success-msg';
          setTimeout(() => { location.hash = '#/board'; }, 600);
        } else {
          msg.textContent = data.message || data.error || `Error ${res.status}`;
        }
      }
      } catch (err) {
      msg.textContent = "Error de red. Intenta de nuevo.";
      msg.className = 'error-msg';
    } finally {
      btn.disabled = false;
      btnText.textContent = editMode ? 'Guardar cambios' : 'Crear tarea';
      spinner.style.display = "none";
    }
  });
}
