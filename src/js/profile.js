// src/js/profile.js
import '../styles/base.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

// Debug panel helper (module scope)
function dbg(msg, obj) {
  try {
    let panel = document.getElementById('profileDebugPanel');
    let toggle = document.getElementById('profileDebugToggle');
    if (!panel) {
      panel = document.createElement('pre');
      panel.id = 'profileDebugPanel';
      panel.style.position = 'fixed';
      panel.style.right = '12px';
      panel.style.bottom = '12px';
      panel.style.maxWidth = '360px';
      panel.style.maxHeight = '40vh';
      panel.style.overflow = 'auto';
      panel.style.background = 'rgba(0,0,0,0.7)';
      panel.style.color = '#fff';
      panel.style.padding = '0.5rem';
      panel.style.fontSize = '12px';
      panel.style.borderRadius = '6px';
      panel.style.zIndex = '9999';
      panel.style.display = 'none'; // hidden by default
      document.body.appendChild(panel);

      // toggle button
      toggle = document.createElement('button');
      toggle.id = 'profileDebugToggle';
      toggle.title = 'Mostrar/Ocultar debug';
      toggle.textContent = '\u2699';
      toggle.style.position = 'fixed';
      toggle.style.right = '12px';
      toggle.style.bottom = '12px';
      toggle.style.width = '36px';
      toggle.style.height = '36px';
      toggle.style.borderRadius = '18px';
      toggle.style.border = 'none';
      toggle.style.background = 'rgba(0,0,0,0.6)';
      toggle.style.color = '#fff';
      toggle.style.zIndex = '10000';
      toggle.style.cursor = 'pointer';
      toggle.style.fontSize = '16px';
      toggle.addEventListener('click', () => {
        if (panel.style.display === 'none') {
          panel.style.display = 'block';
          toggle.style.background = 'rgba(37,99,235,0.9)';
        } else {
          panel.style.display = 'none';
          toggle.style.background = 'rgba(0,0,0,0.6)';
        }
      });
      document.body.appendChild(toggle);
    }
    const line =
      `${new Date().toISOString()} - ${msg}` +
      (obj ? '\n' + (typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)) : '') +
      '\n---\n';
    panel.textContent = line + panel.textContent;
  } catch (e) {
    console.log('[profile dbg]', msg, obj);
  }
}

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No auth token found, saving postLoginRedirect and redirecting to login');
    try { localStorage.setItem('postLoginRedirect', '#/profile'); } catch (e) {}
    window.location.hash = '#/';
    return;
  }

  try {
    // userId from storage or JWT
    const storedUserId = localStorage.getItem('userId');
    let userId = storedUserId;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload && (payload.sub || payload.userId || payload.id || payload._id)) {
          userId = String(payload.sub || payload.userId || payload.id || payload._id);
          if (userId !== storedUserId) {
            try { localStorage.setItem('userId', userId); dbg('Synced localStorage.userId from token', { userId }); } catch (e) {}
          }
        }
      }
    } catch (e) {}

    async function tryFetchUser() {
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      // 1) GET /api/v1/users/:id
      if (userId) {
        try {
          const url1 = `${API}/api/v1/users/${encodeURIComponent(userId)}`;
          console.log('[loadProfile] trying GET', url1);
          const r1 = await fetch(url1, { method: 'GET', headers });
          const j1 = await r1.json().catch(() => ({}));
          if (r1.ok && j1 && Object.keys(j1).length) return j1;
          console.warn('[loadProfile] GET by id failed or empty', r1.status, j1);
        } catch (e) { console.warn('[loadProfile] error fetching by id', e); }
      }

      // 2) GET /api/v1/users?id=:id
      if (userId) {
        try {
          const url2 = `${API}/api/v1/users?id=${encodeURIComponent(userId)}`;
          console.log('[loadProfile] trying GET', url2);
          const r2 = await fetch(url2, { method: 'GET', headers });
          const j2 = await r2.json().catch(() => ({}));
          if (r2.ok && j2 && Object.keys(j2).length) return j2;
          console.warn('[loadProfile] GET ?id failed or empty', r2.status, j2);
        } catch (e) { console.warn('[loadProfile] error fetching ?id', e); }
      }

      // 3) GET /api/v1/users?userId=:id
      if (userId) {
        try {
          const url3 = `${API}/api/v1/users?userId=${encodeURIComponent(userId)}`;
          console.log('[loadProfile] trying GET', url3);
          const r3 = await fetch(url3, { method: 'GET', headers });
          const j3 = await r3.json().catch(() => ({}));
          if (r3.ok && j3 && Object.keys(j3).length) return j3;
          console.warn('[loadProfile] GET ?userId failed or empty', r3.status, j3);
        } catch (e) { console.warn('[loadProfile] error fetching ?userId', e); }
      }

      // 4) GET list
      try {
        const url4 = `${API}/api/v1/users`;
        console.log('[loadProfile] trying GET list', url4);
        const r4 = await fetch(url4, { method: 'GET', headers });
        const j4 = await r4.json().catch(() => ({}));
        if (r4.ok && j4) {
          let list = Array.isArray(j4) ? j4 : (Array.isArray(j4.data) ? j4.data : (Array.isArray(j4.users) ? j4.users : []));
          if (!list.length && typeof j4 === 'object' && Object.keys(j4).length && !Array.isArray(j4)) {
            return j4;
          }
          if (list.length) {
            if (userId) {
              const found = list.find(u => String(u._id || u.id) === String(userId));
              if (found) return found;
            }
            const emailStored = localStorage.getItem('lastResetEmail');
            if (emailStored) {
              const found2 = list.find(u => (u.email || u.correo) === emailStored);
              if (found2) return found2;
            }
            return list[0];
          }
        }
        console.warn('[loadProfile] GET list failed or empty', r4.status, j4);
      } catch (e) { console.warn('[loadProfile] error fetching list', e); }

      return null;
    }

    const result = await tryFetchUser();
    if (!result) {
      dbg('Could not obtain user data from API');
      console.error('[loadProfile] Could not obtain user data from API');
      return;
    }
    dbg('Found user payload', result);

    // normalize payload
    let user = result.user || result.data || result;
    if (Array.isArray(user)) user = user[0] || {};

    // persist id if present
    try {
      if (user && (user._id || user.id) && !localStorage.getItem('userId')) {
        localStorage.setItem('userId', String(user._id || user.id));
        dbg('localStorage.userId set from payload', { userId: localStorage.getItem('userId') });
      }
    } catch (e) {}

    // map fields
    const firstName = user.firstName || user.name || user.firstname || user.nombres || '';
    const lastName = user.lastName || user.surname || user.lastname || user.apellidos || '';
    const email = user.email || user.correo || user.emailAddress || '';
    const age = user.edad || user.age || user.years || null;
    const createdAt = user.createdAt || user.created_at || user.created || null;

    // populate DOM
    const setIf = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value || '';
      else el.textContent = value || '';
    };
    setIf('firstName', firstName);
    setIf('lastName', lastName);
    setIf('email', email);
    setIf('firstNameDisplay', firstName);
    setIf('lastNameDisplay', lastName);
    setIf('emailDisplay', email);
    setIf('age', age);
    setIf('edadDisplay', age);
    setIf('displayEmail', email);

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    setIf('fullName', fullName || '');

    // avatar initials
    try {
      const avatar = document.querySelector('.h-24.w-24') || document.querySelector('.avatar-circle');
      if (avatar) {
        let initials = '';
        if (firstName || lastName) {
          initials = ((firstName[0]||'') + (lastName[0]||'')).toUpperCase();
        } else if (email) {
          const local = String(email).split('@')[0] || '';
          initials = (local[0] || '').toUpperCase();
        }
        avatar.textContent = initials || '??';
      }
    } catch (e) {}

    // member since
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d)) setIf('createdDate', d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }));
    }

    // wire save button robustly (si no usas inline onclick)
    try {
      const saveBtn = document.querySelector('#saveSection button');
      if (saveBtn) {
        const clone = saveBtn.cloneNode(true);
        try { clone.removeAttribute('onclick'); } catch (e) {}
        saveBtn.replaceWith(clone);
        const newBtn = document.querySelector('#saveSection button');
        try { newBtn.removeAttribute('onclick'); } catch (e) {}
        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          try { dbg('Save button clicked'); } catch (err) {}
          if (window.saveProfile) window.saveProfile();
        });
      }
    } catch (e) {}

  } catch (err) {
    console.error('Error fetching profile:', err);
  }
}

// Auto-run
document.addEventListener('DOMContentLoaded', () => {
  window.loadProfile = loadProfile;
  loadProfile();

  // Enlazar botón eliminar si no hay onclick o quieres redundancia
  const delBtn = document.querySelector('.btn.btn-danger, #deleteBtn');
  if (delBtn && !delBtn._deleteBound) {
    delBtn.addEventListener('click', (e) => {
      // si ya tienes onclick="handleDeleteAccount()" en HTML, esto es redundante pero inofensivo
      if (typeof window.deleteAccount === 'function') {
        e.preventDefault();
        window.deleteAccount();
      }
    });
    delBtn._deleteBound = true;
  }
});

/**
 * Guardar perfil (PUT/PATCH con fallbacks)
 */
async function saveProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    try { localStorage.setItem('postLoginRedirect', '#/profile'); } catch (e) {}
    window.location.hash = '#/';
    return;
  }

  // userId
  let userId = localStorage.getItem('userId');
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (payload && (payload.sub || payload.userId || payload.id || payload._id)) {
        userId = String(payload.sub || payload.userId || payload.id || payload._id);
      }
    }
  } catch (e) {}

  if (!userId) {
    dbg('Cannot save profile: missing user id');
    return;
  }

  const getVal = id => {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value.trim();
    return (el.textContent || '').trim();
  };

  const firstName = getVal('firstName') || getVal('firstNameDisplay');
  const lastName = getVal('lastName') || getVal('lastNameDisplay');
  const email = getVal('email') || getVal('emailDisplay') || getVal('displayEmail');

  const payload = {};
  if (firstName) payload.nombres = firstName;
  if (lastName) payload.apellidos = lastName;
  if (email) payload.email = email;

  if (!Object.keys(payload).length) {
    dbg('No profile changes to save');
    if (window.toggleEdit) window.toggleEdit();
    return;
  }

  const saveBtn = document.querySelector('#saveSection button');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const url = `${API}/api/v1/users/${encodeURIComponent(userId)}`;
    dbg('Saving profile to', { url, payload });

    // PUT
    console.log('[saveProfile] Attempting PUT', url);
    const putAttempt = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(payload)
    });
    let putAttemptBody = null;
    try { putAttemptBody = await putAttempt.json(); } catch (e) { putAttemptBody = await putAttempt.text().catch(() => ''); }
    dbg('PUT attempt result', { status: putAttempt.status, body: putAttemptBody });

    let resultBody = null;
    if (putAttempt.ok) {
      dbg('PUT succeeded', putAttemptBody);
      resultBody = putAttemptBody;
    } else {
      // PATCH
      console.log('[saveProfile] PUT failed, trying PATCH', url, 'status', putAttempt.status);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });
      let patchBody = null;
      try { patchBody = await res.json(); } catch (e) { patchBody = await res.text().catch(() => ''); }

      if (res.status === 401) {
        dbg('Save profile unauthorized', { status: res.status, body: patchBody });
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.hash = '#/';
        return;
      }

      if (!res.ok) {
        dbg('Failed to save profile (PATCH) after PUT', { status: res.status, body: patchBody });
        if (res.status === 404) {
          const collUrl = `${API}/api/v1/users`;
          const collPayload = Object.assign({ id: userId }, payload);
          console.log('[saveProfile] Trying collection PATCH fallback', collUrl);
          const collRes = await fetch(collUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(collPayload)
          });
          let collBody = null;
          try { collBody = await collRes.json(); } catch (e) { collBody = await collRes.text().catch(() => ''); }
          dbg('Collection PATCH result', { status: collRes.status, body: collBody });
          if (!collRes.ok) {
            dbg('All save fallbacks failed', { put: { status: putAttempt.status }, patch: { status: res.status }, coll: { status: collRes.status } });
            alert('No se pudieron guardar los cambios. El servidor devolvió ' + res.status);
            return;
          }
          resultBody = collBody;
        } else {
          alert('No se pudieron guardar los cambios: ' + (patchBody && patchBody.message ? patchBody.message : res.status));
          return;
        }
      } else {
        resultBody = patchBody;
      }
    }

    // success: update UI
    dbg('Profile saved successfully', resultBody);
    const setIf = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value || '';
      else el.textContent = value || '';
    };
    if (payload.nombres) { setIf('firstNameDisplay', payload.nombres); setIf('firstName', payload.nombres); }
    if (payload.apellidos) { setIf('lastNameDisplay', payload.apellidos); setIf('lastName', payload.apellidos); }
    if (payload.email) { setIf('emailDisplay', payload.email); setIf('email', payload.email); setIf('displayEmail', payload.email); }

    const getVal = id => {
      const el = document.getElementById(id);
      if (!el) return '';
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value.trim();
      return (el.textContent || '').trim();
    };
    const full = [payload.nombres || getVal('firstNameDisplay'), payload.apellidos || getVal('lastNameDisplay')].filter(Boolean).join(' ');
    setIf('fullName', full);
    try {
      const avatar = document.querySelector('.h-24.w-24') || document.querySelector('.avatar-circle');
      if (avatar) {
        const fn = payload.nombres || getVal('firstNameDisplay') || '';
        const ln = payload.apellidos || getVal('lastNameDisplay') || '';
        avatar.textContent = ((fn[0]||'') + (ln[0]||'')).toUpperCase() || '??';
      }
    } catch (e) {}

    if (window.toggleEdit) window.toggleEdit();

  } catch (err) {
    dbg('Error saving profile', err.message || err);
    alert('Error al guardar: ' + (err.message || String(err)));
  } finally {
    const saveBtn = document.querySelector('#saveSection button');
    if (saveBtn) saveBtn.disabled = false;
  }
}
window.saveProfile = saveProfile;

/**
 * ELIMINAR CUENTA
 * DELETE con body { id: userId } + fallbacks
 */
async function deleteAccount() {
  const token = localStorage.getItem('token');

  // userId desde localStorage o token
  let userId = localStorage.getItem('userId');
  try {
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload && (payload.sub || payload.userId || payload.id || payload._id)) {
          userId = String(payload.sub || payload.userId || payload.id || payload._id);
        }
      }
    }
  } catch (_) {}

  if (!token || !userId) {
    alert('No hay sesión activa.');
    try { localStorage.removeItem('token'); localStorage.removeItem('userId'); } catch (_) {}
    window.location.hash = '#/';
    return;
  }

  const ok = window.confirm('⚠️ Esta acción es permanente. ¿Seguro que quieres eliminar tu cuenta?');
  if (!ok) return;

  const delBtn = document.querySelector('.btn.btn-danger') || document.getElementById('deleteBtn');
  if (delBtn) delBtn.disabled = true;

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const body = JSON.stringify({ id: userId });

  const attempts = [
    { method: 'DELETE', url: `${API}/api/v1/users/${encodeURIComponent(userId)}`, body },
    { method: 'DELETE', url: `${API}/api/v1/users`, body },
    { method: 'POST',   url: `${API}/api/v1/users/delete`, body },
    { method: 'DELETE', url: `${API}/api/v1/users/${encodeURIComponent(userId)}?id=${encodeURIComponent(userId)}`, body: undefined },
    { method: 'DELETE', url: `${API}/api/v1/users?id=${encodeURIComponent(userId)}`, body: undefined },
  ];

  let lastStatus = 0, lastBody = '';
  try {
    for (const a of attempts) {
      try {
        console.log('[deleteAccount] trying', a.method, a.url);
        const res = await fetch(a.url, { method: a.method, headers, ...(a.body ? { body: a.body } : {}) });
        lastStatus = res.status;
        let resBody = '';
        try { resBody = await res.text(); } catch (_) {}
        lastBody = resBody;

        if (res.ok) {
          try { localStorage.removeItem('token'); localStorage.removeItem('userId'); } catch (_) {}
          alert('Tu cuenta ha sido eliminada correctamente.');
          window.location.hash = '#/';
          return;
        }

        if (res.status === 401) {
          alert('Sesión expirada. Vuelve a iniciar sesión.');
          try { localStorage.removeItem('token'); localStorage.removeItem('userId'); } catch (_) {}
          window.location.hash = '#/';
          return;
        }

        console.warn('[deleteAccount] failed', a.method, a.url, res.status, resBody);
      } catch (e) {
        console.warn('[deleteAccount] network error', a, e);
      }
    }

    alert('No se pudo eliminar la cuenta. Código: ' + lastStatus + (lastBody ? `\nRespuesta: ${lastBody}` : ''));
  } finally {
    if (delBtn) delBtn.disabled = false;
  }
}
window.deleteAccount = deleteAccount;

// Sobrescribe el handler esperado por el HTML (onclick="handleDeleteAccount()")
window.handleDeleteAccount = () => window.deleteAccount();

// export para otros módulos si los usas
export { loadProfile, saveProfile, deleteAccount };
