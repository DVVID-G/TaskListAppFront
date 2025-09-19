import { registerUser, loginUser } from '../services/userService.js';

const app = document.getElementById('app');
// Ensure task action global handlers are bound only once
let taskMenuHandlersBound = false;

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

  // Parse the fragment so we can properly move <script> and <link>/<style> tags into the document
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();

  // Move styles and links to the head so they take effect
  const styles = tpl.content.querySelectorAll('link[rel="stylesheet"], style');
  styles.forEach(node => {
    // Avoid duplicating same href/style by simple href/text check
    if (node.tagName === 'LINK') {
      const href = node.getAttribute('href');
      if (href && !document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        document.head.appendChild(node.cloneNode(true));
      }
    } else {
      // inline style
      const text = node.textContent || '';
      const dup = Array.from(document.head.querySelectorAll('style')).some(s => s.textContent === text);
      if (!dup) document.head.appendChild(node.cloneNode(true));
    }
  });

  // Extract scripts so they execute (scripts inserted via innerHTML don't run)
  const scripts = tpl.content.querySelectorAll('script');
  const scriptNodes = [];
  scripts.forEach(s => {
    // Keep copy for later execution, and remove from template so it won't be inserted as inert script
    const copy = document.createElement('script');
    // copy attributes
    for (let i = 0; i < s.attributes.length; i++) {
      const a = s.attributes[i];
      copy.setAttribute(a.name, a.value);
    }
    copy.text = s.textContent || '';
    scriptNodes.push(copy);
    s.remove();
  });

  // Insert the remaining HTML into the app
  app.innerHTML = '';
  app.appendChild(tpl.content.cloneNode(true));

  // Now append scripts to body so they execute in order
  for (const sn of scriptNodes) {
    // Avoid duplicating external scripts by src
    const src = sn.getAttribute('src');
    if (src) {
      if (document.querySelector(`script[src="${src}"]`)) continue;
    }
    // For inline scripts, avoid appending identical script text twice (prevents redeclare errors)
    if (!src) {
      const text = sn.text || sn.textContent || '';
      const already = Array.from(document.querySelectorAll('script')).some(s => (s.textContent || '').trim() === (text || '').trim());
      if (already) continue;
    }
    // append and wait for external scripts to load before continuing
    const p = new Promise((resolve) => {
      sn.onload = () => resolve();
      sn.onerror = () => resolve();
      document.body.appendChild(sn);
      if (!src) resolve();
    });
    // wait synchronously to preserve script execution order
    // eslint-disable-next-line no-await-in-loop
    await p;
  }

  if (name === 'home') initHome();
  if (name === 'board') initBoard();
  if (name === 'signup') initSignup();
  if (name === 'profile') {
    // Lazy-load the profile module and initialize it when the view is shown
    import('../js/profile.js').then(module => {
      try { module.loadProfile && module.loadProfile(); } catch (e) { console.error('initProfile error', e); }
    }).catch(err => console.error('Could not load Profile module', err));
  }
  if (name === 'reset-password') {
    import('../js/resetPassword.js').then(module => { module.initResetPassword(); });
  }
  if (name === 'createTask') {
    import('../js/createTask.js').then(module => {
      module.initCreateTask();
    });
  }
  if (name === 'editTask') {
    import('../js/editTask.js').then(module => {
      try { module.initEditTask && module.initEditTask(); } catch (e) { console.error('initEditTask error', e); }
    }).catch(err => console.error('Could not load editTask module', err));
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
  // Get the hash path (without the leading '#/') and strip any query string.
  // Example: '#/reset-password?token=...' -> 'reset-password'
  const raw = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
  const path = raw ? raw.split('?')[0] : 'home';
  const known = ['home', 'board', 'signup', 'createTask', 'editTask', 'reset-password', 'profile'];
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
  import('../js/login.js').then(mod => {
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
        <button class="task-actions-btn" aria-haspopup="true" aria-expanded="false" title="Acciones" draggable="false" tabindex="0">
          <svg draggable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="19" cy="12" r="1.8" fill="currentColor" />
          </svg>
        </button>
        <div class="task-action-menu" role="menu" aria-hidden="true">
          <ul>
            <li role="menuitem"><a href="#" class="action-edit"><svg class="menu-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>Editar tarea</a></li>
            <li role="menuitem"><a href="#" class="action-delete"><svg class="menu-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Eliminar tarea</a></li>
          </ul>
        </div>
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
          showServerDebug(400, 'ID de tarea o estado destino no válido.');
          return;
        }
        // Validar formato de ID (MongoDB: 24 hex)
        if (!/^[a-fA-F0-9]{24}$/.test(taskId)) {
          showServerDebug(400, 'ID de tarea inválido: ' + taskId);
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
          showServerDebug(500, err.message || String(err));
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

      // Bind global handlers for task action menus only once
      if (!taskMenuHandlersBound) {
        taskMenuHandlersBound = true;

        // Prevent drag from starting when interacting with actions button/menu
        document.addEventListener('pointerdown', function onTaskActionPointerDown(e) {
          const target = e && e.target;
          if (!(target && target.closest)) return;
          const isAction = target.closest('.task-actions-btn') || target.closest('.task-action-menu');
          if (!isAction) return;
          try { e.stopPropagation(); } catch (err) {}
          try { e.preventDefault(); } catch (err) {}

          const btn = target.closest('.task-actions-btn');
          const li = btn ? btn.closest('.todo') : (target.closest('.task-action-menu') && target.closest('.todo'));
          if (!li) return;

          try { li.__prevDraggable = li.draggable; } catch (err) { /* ignore */ }
          try { li.draggable = false; } catch (err) { /* ignore */ }
          try { li.dataset._dragDisabled = '1'; } catch (err) { /* ignore */ }

          const restore = () => {
            try {
              li.draggable = (typeof li.__prevDraggable !== 'undefined') ? li.__prevDraggable : true;
            } catch (err) { /* ignore */ }
            try { delete li.__prevDraggable; } catch (err) { /* ignore */ }
            try { delete li.dataset._dragDisabled; } catch (err) { /* ignore */ }
            window.removeEventListener('pointerup', restore);
            window.removeEventListener('pointercancel', restore);
          };

          window.addEventListener('pointerup', restore);
          window.addEventListener('pointercancel', restore);
        });

        // Event delegation: open per-task action menu and handle edit/delete
        document.addEventListener('click', function onTaskActionClick(e) {
          const target = e && e.target;
          if (!(target && target.closest)) return;

          const isBtn = !!target.closest('.task-actions-btn');
          const isMenu = !!target.closest('.task-action-menu');

          // Close any open menus when clicking outside
          if (!isBtn && !isMenu) {
            document.querySelectorAll('.task-action-menu.show').forEach(m => {
              m.classList.remove('show');
              m.setAttribute('aria-hidden', 'true');
            });
          }

          // Toggle menu when clicking the actions button
          if (isBtn) {
            e.stopPropagation();
            const btn = target.closest('.task-actions-btn');
            const container = btn && btn.closest('.todo');
            const menu = container && container.querySelector('.task-action-menu');
            if (menu) {
              const isOpen = menu.classList.toggle('show');
              menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
              btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            }
            return;
          }

          // Edit action
          const edit = target.closest('.action-edit');
          if (edit) {
            e.preventDefault();
            const li = edit.closest('.todo');
            const tid = li && li.dataset && li.dataset.id;
            if (tid) location.hash = '#/editTask?id=' + encodeURIComponent(tid);
            return;
          }

          // Delete action
          const del = target.closest('.action-delete');
          if (del) {
            e.preventDefault();
            const li = del.closest('.todo');
            const tid = li && li.dataset && li.dataset.id;
            if (!tid) return showServerDebug(400, 'ID de tarea inválido para eliminar');
            if (!confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return;
            (async () => {
              try {
                const delUrl = `${base.replace(/\/$/, '')}/api/v1/tasks/${tid}`;
                const delRes = await fetch(delUrl, { method: 'DELETE', headers: { ...(token && { 'Authorization': `Bearer ${token}` }) } });
                const delBody = await delRes.text().catch(() => '');
                if (!delRes.ok) {
                  showServerDebug(delRes.status, delBody || 'Sin cuerpo de respuesta');
                  throw new Error('No se pudo eliminar la tarea');
                }
                // remove element from DOM immediately for snappy UX
                li.remove();
              } catch (err) {
                showServerDebug(500, err.message || String(err));
              }
            })();
            return;
          }
        });
      }

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
          showServerDebug(400, 'ID de tarea inválido para eliminar: ' + taskId);
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
          showServerDebug(500, err.message || String(err));
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
