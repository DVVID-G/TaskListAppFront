export function initEditTask() {
  const form = document.getElementById('editTaskForm');
  if (!form) return;

  const title = document.getElementById('title');
  const description = document.getElementById('description');
  const status = document.getElementById('status');
  const userInput = document.getElementById('user');

  const btn = document.getElementById('editTaskBtn');
  const btnText = document.getElementById('btnTextEdit');
  const spinner = document.getElementById('spinnerEdit');
  const msg = document.getElementById('editTaskMsg');

  function getTaskIdFromHash() {
    try {
      const raw = location.hash.split('?')[1] || '';
      const params = new URLSearchParams(raw);
      return params.get('id');
    } catch (e) { return null; }
  }

  const errors = {
    titleError: document.getElementById('titleError'),
    descriptionError: document.getElementById('descriptionError'),
    statusError: document.getElementById('statusError')
  };

  function validate() {
    let valid = true;
    if (title.value.trim().length < 2) {
      errors.titleError.textContent = 'Título muy corto';
      valid = false;
    } else errors.titleError.textContent = '';
    if (description.value.trim().length < 5) {
      errors.descriptionError.textContent = 'Descripción muy corta';
      valid = false;
    } else errors.descriptionError.textContent = '';
    if (!status.value) {
      errors.statusError.textContent = 'Selecciona un estado';
      valid = false;
    } else errors.statusError.textContent = '';
    btn.disabled = !valid;
    return valid;
  }

  [title, description, status].forEach(i => i.addEventListener('input', validate));

  // populate user hidden field if available
  const storedUserId = localStorage.getItem('userId');
  if (storedUserId && userInput) userInput.value = storedUserId;

  // Load the task by id and populate the form
  const id = getTaskIdFromHash();
  if (!id) {
    msg.textContent = 'ID de tarea no proporcionado.';
    msg.className = 'error-msg';
    return;
  }

  let editingId = String(id).replace(/[:\/]/g, '').trim();
  (async () => {
    btnText.textContent = 'Cargando...';
    spinner.style.display = 'inline-block';
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks/${encodeURIComponent(editingId)}`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msg.textContent = data.message || data.error || `No se pudo cargar la tarea (${res.status})`;
        msg.className = 'error-msg';
        return;
      }
      title.value = data.title || data.task?.title || '';
      description.value = data.description || data.task?.description || '';
      const backendStatus = data.status || data.task?.status || '';
      const uiMap = { 'Por hacer':'Por hacer','Haciendo':'En progreso','Hecho':'Completada' };
      if (uiMap[backendStatus]) status.value = uiMap[backendStatus];
      else try { status.value = backendStatus; } catch (e) {}
      msg.textContent = '';
      validate();
    } catch (err) {
      msg.textContent = 'Error cargando la tarea.';
      msg.className = 'error-msg';
    } finally {
      btnText.textContent = 'Guardar cambios';
      spinner.style.display = 'none';
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    btn.disabled = true;
    btnText.textContent = 'Guardando...';
    spinner.style.display = 'inline-block';
    msg.textContent = '';
    const taskData = {
      title: title.value.trim(),
      description: description.value.trim(),
      status: status.value,
      user: localStorage.getItem('userId') || ''
    };
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const url = `${base.replace(/\/$/, '')}/api/v1/tasks/${encodeURIComponent(editingId)}`;
      let res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(taskData)
      });
      let data = await res.json().catch(() => ({}));
      if (!res.ok && res.status === 404) {
        const putRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify(taskData)
        });
        const putData = await putRes.json().catch(() => ({}));
        if (putRes.ok) {
          msg.textContent = '✅ Tarea actualizada';
          msg.className = 'success-msg';
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
    } catch (err) {
      msg.textContent = 'Error de red. Intenta de nuevo.';
      msg.className = 'error-msg';
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Guardar cambios';
      spinner.style.display = 'none';
    }
  });
}
