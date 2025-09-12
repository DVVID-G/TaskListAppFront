import { registerUser, loginUser } from '../services/userService.js';

const app = document.getElementById('app');

/**
 * Build a safe URL for fetching view fragments inside Vite (dev and build).
 * @param {string} name - The name of the view (without extension).
 * @returns {URL} The resolved URL for the view HTML file.
 */
const viewURL = (name) => new URL(`../views/${name}.html`, import.meta.url);

/**
 * Load an HTML fragment by view name and initialize its corresponding logic.
 * @async
 * @param {string} name - The view name to load (e.g., "home", "board").
 * @throws {Error} If the view cannot be fetched.
 */
async function loadView(name) {
  const res = await fetch(viewURL(name));
  if (!res.ok) throw new Error(`Failed to load view: ${name}`);
  const html = await res.text();
  app.innerHTML = html;

  if (name === 'home') initHome();
  if (name === 'board') initBoard();
  if (name === 'signup') initSignup();
  if (name === 'createTask') {
    import('../js/createTask.js').then(module => {
      module.initCreateTask();
    });
  }
}

/**
 * Initialize the hash-based router.
 * Attaches an event listener for URL changes and triggers the first render.
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // first render
}

/**
 * Handle the current route based on the location hash.
 * Fallback to 'home' if the route is unknown.
 */
function handleRoute() {
  const path = (location.hash.startsWith('#/') ? location.hash.slice(2) : '') || 'home';
  const known = ['home', 'board', 'signup', 'createTask'];
  const route = known.includes(path) ? path : 'home';

  loadView(route).catch(err => {
    console.error(err);
    app.innerHTML = `<p style="color:#ffb4b4">Error loading the view.</p>`;
  });
}

/* ---- View-specific logic ---- */

/**
 * Initialize the "home" view.
 * Attaches a submit handler to the register form to navigate to the board.
 */
function initHome() {
  // If a login form is present, initialize the login logic from src/js/Login.js
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    import('../js/Login.js').then(mod => {
      try { mod.initLogin(); } catch (e) { console.error('initLogin error', e); }
    }).catch(err => console.error('Could not load Login module', err));

    // Wire the 'Registrarse' button to route to the signup view
    const goSignup = document.getElementById('goSignupBtn');
    if (goSignup) {
      goSignup.addEventListener('click', () => { location.hash = '#/signup'; });
    }

    return; // login form handled
  }

  // Backwards compatibility: if the old minimal register/login form is present, keep previous behavior
  const form = document.getElementById('registerForm');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const msg = document.getElementById('registerMsg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';

    const username = userInput?.value.trim();
    const password = passInput?.value.trim();

    if (!username || !password) {
      msg.textContent = 'Por favor completa usuario y contraseña.';
      return;
    }

    form.querySelector('button[type="submit"]').disabled = true;

    try {
      const data = await loginUser({ email: username, password });
      if (data?.token) localStorage.setItem('token', data.token);
      msg.textContent = 'Login exitoso';
      setTimeout(() => (location.hash = '#/board'), 400);
    } catch (err) {
      msg.textContent = `No se pudo iniciar sesión: ${err.message}`;
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  });
}

/**
 * Initialize the "board" view.
 * Sets up the todo form, input, and list with create/remove/toggle logic.
 */
async function initBoard() {
  // Elementos de columnas Kanban
  const todoList = document.getElementById('todoList-todo');
  const progressList = document.getElementById('todoList-progress');
  const doneList = document.getElementById('todoList-done');
  if (!todoList || !progressList || !doneList) return;

  // Limpiar columnas
  todoList.innerHTML = '';
  progressList.innerHTML = '';
  doneList.innerHTML = '';

  // Obtener tareas del backend
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/tasks`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const data = await res.json();
    console.log('GET /api/v1/tasks payload:', data);
    if (!res.ok) throw new Error(data.message || data.error || 'Error al obtener tareas');
    // Aceptar varias formas de payload: array directo, { data: [...] } o { tasks: [...] }
    const tasks = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (Array.isArray(data.tasks) ? data.tasks : []));
    console.log('Parsed tasks count:', tasks.length);
    // Agrupar tareas por estado y hacerlas arrastrables
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'todo';
      li.setAttribute('draggable', 'true');

      // Obtener el ID real desde las posibles propiedades y normalizarlo
      let realId = '';
      if (task && typeof task === 'object') {
        realId = String(task._id || task.id || task._idTask || '');
      }
      // Quitar prefijos raros como ':id' o '/:id/' y espacios
      realId = realId.replace(/[:\/]/g, '').trim();

      li.dataset.id = realId;
      // Mapear el status backend al texto mostrado en la UI
      const uiStatus = mapStatusForUI(task.status || '');
      li.dataset.status = uiStatus;
      li.innerHTML = `
        <div class="content">
          <strong>${escapeHtml(task.title || '(sin título)')}</strong>
          <div>${escapeHtml(task.description || '')}</div>
        </div>
        <div class="meta">${escapeHtml(uiStatus || '')}</div>
      `;
      if (uiStatus === 'Por hacer') todoList.appendChild(li);
      else if (uiStatus === 'En progreso') progressList.appendChild(li);
      else if (uiStatus === 'Completada') doneList.appendChild(li);
    });

    // Drag & drop listeners para columnas
    [todoList, progressList, doneList].forEach(listEl => {
      listEl.ondragover = e => { e.preventDefault(); listEl.closest('.kanban-column')?.classList.add('drag-over'); };
      listEl.ondragleave = e => { listEl.closest('.kanban-column')?.classList.remove('drag-over'); };
      listEl.ondrop = async e => {
        e.preventDefault();
        listEl.closest('.kanban-column')?.classList.remove('drag-over');
        // Preferir dataset del elemento arrastrado si está presente
        let taskId = e.dataTransfer.getData('text/plain') || '';
        // Si el navegador no pasó el id, intentar leer del elemento objetivo
        if (!taskId && e.target && e.target.closest) {
          const dragged = document.querySelector('[data-dragging-id]');
          taskId = dragged ? dragged.dataset.draggingId : '';
        }
        // Normalizar id: quitar prefijos y barras
        taskId = String(taskId || '').replace(/[:\/]/g, '').trim();
        const newStatus = listEl.closest('.kanban-column')?.getAttribute('data-status') || listEl.parentElement?.getAttribute('data-status');
        // Mapear el status mostrado en la UI al valor que el backend espera
        const mappedStatus = mapStatusForBackend(newStatus);
        if (!taskId || !newStatus) {
          alert('ID de tarea o estado destino no válido.');
          return;
        }
        // Validar formato de ID (MongoDB: 24 hex)
        if (!/^[a-fA-F0-9]{24}$/.test(taskId)) {
          alert('ID de tarea inválido: ' + taskId);
          return;
        }
        // Actualizar estado en backend (usar el valor mapeado para el backend)
        try {
          const patchUrl = `${base.replace(/\/$/, '')}/api/v1/tasks/${taskId}`;
          console.log('PATCH ->', patchUrl, 'body=', { status: mappedStatus, original: newStatus }, 'tokenPresent=', !!token);
          const patchRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ status: mappedStatus })
          });
          const patchBody = await patchRes.text().catch(() => '');
          console.log('PATCH res', patchRes.status, patchBody);
          if (patchRes.ok) {
            // Recargar tablero
            initBoard();
            return;
          }

          // Si el servidor responde 404, intentar PUT como fallback (algunas APIs usan PUT)
          if (patchRes.status === 404) {
            console.warn('PATCH devolvió 404, intentando PUT de fallback');
            const putUrl = patchUrl;
            console.log('PUT ->', putUrl, 'body=', { status: mappedStatus, original: newStatus }, 'tokenPresent=', !!token);
            const putRes = await fetch(putUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
              },
              body: JSON.stringify({ status: mappedStatus })
            });
            const putBody = await putRes.text().catch(() => '');
            console.log('PUT res', putRes.status, putBody);
            if (putRes.ok) {
              initBoard();
              return;
            }

              // Si PUT tampoco funciona, mostrar la respuesta del servidor para depuración
              showServerDebug(patchRes.status, patchBody || putBody || 'Sin cuerpo de respuesta');
              // Si la respuesta es un error de validación de enum, ofrecer mapa interactivo
              if ((patchBody || putBody || '').includes('is not a valid enum value')) {
                const suggested = await askForStatusMapping(newStatus);
                if (suggested) {
                  // reintentar la actualización usando el valor sugerido del backend
                  const retryUrl = patchUrl;
                  const retryRes = await fetch(retryUrl, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({ status: suggested })
                  });
                  const retryBody = await retryRes.text().catch(() => '');
                  console.log('Retry PATCH res', retryRes.status, retryBody);
                  if (retryRes.ok) {
                    initBoard();
                    return;
                  }
                  showServerDebug(retryRes.status, retryBody || 'Sin cuerpo de respuesta');
                }
              }
              throw new Error(`Servidor no encontró la tarea (PATCH/PUT) - status ${patchRes.status}`);
          }

          // Otros errores: mostrar la respuesta
          showServerDebug(patchRes.status, patchBody || 'Sin cuerpo de respuesta');
          throw new Error((patchBody && patchBody) || 'No se pudo actualizar el estado');
        } catch (err) {
          alert(err.message);
        }
      };
    });
    // Drag start para tareas
    // Marcar el elemento que se está arrastrando para fallback si el dataTransfer falla
    document.querySelectorAll('.todo[draggable="true"]').forEach(li => {
      li.ondragstart = e => {
        // Guardar también el id en el elemento para usar como fallback
        li.dataset.draggingId = li.dataset.id || '';
        // además guardar el id limpio en dataTransfer y una marca visible para deleteZone
        e.dataTransfer.setData('text/plain', li.dataset.id || '');
        li.setAttribute('aria-grabbed', 'true');
        setTimeout(() => li.style.opacity = '0.5', 0);
        // mostrar zona de eliminar
        const dz = document.getElementById('deleteZone');
        if (dz) dz.style.display = 'block';
      };
      li.ondragend = e => {
        li.style.opacity = '';
        li.removeAttribute('aria-grabbed');
        delete li.dataset.draggingId;
        // ocultar zona de eliminar
        const dz = document.getElementById('deleteZone');
        if (dz) dz.style.display = 'none';
      };
    });

    // Delete zone handlers
    const deleteZone = document.getElementById('deleteZone');
    if (deleteZone) {
      deleteZone.ondragover = e => { e.preventDefault(); deleteZone.classList.add('drag-over'); };
      deleteZone.ondragleave = e => { deleteZone.classList.remove('drag-over'); };
      deleteZone.ondrop = async e => {
        e.preventDefault();
        deleteZone.classList.remove('drag-over');
        let taskId = e.dataTransfer.getData('text/plain') || '';
        if (!taskId) {
          const dragged = document.querySelector('[data-dragging-id]');
          taskId = dragged ? dragged.dataset.draggingId : '';
        }
        taskId = String(taskId || '').replace(/[:\/]/g, '').trim();
        if (!/^[a-fA-F0-9]{24}$/.test(taskId)) {
          alert('ID de tarea inválido para eliminar: ' + taskId);
          return;
        }
        if (!confirm('¿Seguro que quieres eliminar esta tarea? Esta acción no se puede deshacer.')) return;
        try {
          const delUrl = `${base.replace(/\/$/, '')}/api/v1/tasks/${taskId}`;
          const delRes = await fetch(delUrl, {
            method: 'DELETE',
            headers: {
              ...(token && { 'Authorization': `Bearer ${token}` })
            }
          });
          const delBody = await delRes.text().catch(() => '');
          console.log('DELETE res', delRes.status, delBody);
          if (!delRes.ok) {
            showServerDebug(delRes.status, delBody || 'Sin cuerpo de respuesta');
            throw new Error('No se pudo eliminar la tarea');
          }
          initBoard();
        } catch (err) {
          alert(err.message);
        }
      };
    }
  } catch (err) {
    todoList.innerHTML = progressList.innerHTML = doneList.innerHTML = `<li style="color:#ffb4b4">${err.message}</li>`;
  }

  // Avatar menu toggle (outside try/catch so it always binds when board view exists)
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarMenu = document.getElementById('avatarMenu');
  if (avatarBtn && avatarMenu) {
    avatarBtn.onclick = (e) => {
      e.stopPropagation();
      avatarMenu.classList.toggle('show');
      avatarMenu.setAttribute('aria-hidden', avatarMenu.classList.contains('show') ? 'false' : 'true');
    };
    // cerrar al click fuera
    document.addEventListener('click', () => {
      if (avatarMenu.classList.contains('show')) avatarMenu.classList.remove('show');
    });
  }
}

function initSignup () {
  import('../js/register.js').then(module => {
    module.initRegister();
  });
}

/**
 * Mostrar en la interfaz una caja de depuración con la respuesta del servidor
 * para facilitar lectura del HTML/error devuelto (temporal).
 */
function showServerDebug(status, body) {
  // Buscar o crear contenedor
  let dbg = document.getElementById('serverDebug');
  if (!dbg) {
    dbg = document.createElement('div');
    dbg.id = 'serverDebug';
    dbg.style.background = '#fff3f3';
    dbg.style.border = '1px solid #ffb4b4';
    dbg.style.padding = '1rem';
    dbg.style.margin = '1rem';
    dbg.style.whiteSpace = 'pre-wrap';
    dbg.style.maxHeight = '240px';
    dbg.style.overflow = 'auto';
    // Insertarlo al inicio del app para que esté visible
    const appEl = document.getElementById('app');
    if (appEl) appEl.prepend(dbg);
  }
  dbg.innerHTML = `<strong>Server debug (status ${status}):</strong>\n${escapeHtml(body)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Prompt the user for the backend-expected enum value for a given displayed status.
 * Persists a map in localStorage so the user doesn't need to repeat the mapping.
 * Returns the mapped value (or null if user cancels).
 */
async function askForStatusMapping(displayStatus) {
  const mapKey = 'statusMap_v1';
  const raw = localStorage.getItem(mapKey);
  const map = raw ? JSON.parse(raw) : {};
  if (map[displayStatus]) return map[displayStatus];

  const promptMsg = `El backend rechazó el valor '${displayStatus}' como enum.\nPor favor ingresa el valor exacto que el backend espera para este estado (ej: 'Por hacer', 'por_hacer', 'TODO', etc.).\nSi no sabes, escribe CANCEL para abortar.`;
  const answer = prompt(promptMsg, displayStatus);
  if (!answer || answer.toUpperCase() === 'CANCEL') return null;
  map[displayStatus] = answer;
  try { localStorage.setItem(mapKey, JSON.stringify(map)); } catch (e) { /* ignore */ }
  return answer;
}

/**
 * Map UI status text to the backend enum value.
 * Defaults to known mapping based on your model: ['Por hacer','Haciendo','Hecho']
 * Reads overrides from localStorage key 'statusMap_v1'.
 */
function mapStatusForBackend(uiStatus) {
  if (!uiStatus) return uiStatus;
  const defaults = {
    'Por hacer': 'Por hacer',
    'En progreso': 'Haciendo',
    'Completada': 'Hecho'
  };
  try {
    const raw = localStorage.getItem('statusMap_v1');
    const map = raw ? JSON.parse(raw) : {};
    if (map[uiStatus]) return map[uiStatus];
  } catch (e) {
    // ignore
  }
  return defaults[uiStatus] || uiStatus;
}

/**
 * Map backend status to the UI label.
 * Default mapping: 'Por hacer'->'Por hacer', 'Haciendo'->'En progreso', 'Hecho'->'Completada'
 */
function mapStatusForUI(backendStatus) {
  if (!backendStatus) return backendStatus;
  const defaults = {
    'Por hacer': 'Por hacer',
    'Haciendo': 'En progreso',
    'Hecho': 'Completada'
  };
  try {
    const raw = localStorage.getItem('statusMap_v1');
    const map = raw ? JSON.parse(raw) : {};
    // If user provided custom mapping as ui->backend, try to invert it
    for (const [ui, backend] of Object.entries(map)) {
      if (backend === backendStatus) return ui;
    }
  } catch (e) {
    // ignore
  }
  return defaults[backendStatus] || backendStatus;
}
