// profile.js
// Fetches current user info and populates the profile view.

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

// Debug panel helper (module scope) - hidden by default, toggle with the gear button
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

      // create toggle button
      toggle = document.createElement('button');
      toggle.id = 'profileDebugToggle';
      toggle.title = 'Mostrar/Ocultar debug';
      toggle.textContent = '\u2699'; // gear
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
    const line = `${new Date().toISOString()} - ${msg}` + (obj ? '\n' + (typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)) : '') + '\n---\n';
    panel.textContent = line + panel.textContent;
  } catch (e) { console.log('[profile dbg]', msg, obj); }
}

async function loadProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    // No token — save intended route and redirect to login so user returns after login
    console.warn('No auth token found, saving postLoginRedirect and redirecting to login');
    try { localStorage.setItem('postLoginRedirect', '#/profile'); } catch (e) { /* ignore */ }
    window.location.hash = '#/';
    return;
  }

  try {
    // Try several strategies to obtain the authenticated user. Backends differ.
    // Prefer the id encoded in the JWT (if token is a JWT), otherwise use stored localStorage.userId
    const storedUserId = localStorage.getItem('userId');
    let userId = storedUserId;
    try {
      // naive JWT parse: header.payload.signature
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload && (payload.sub || payload.userId || payload.id || payload._id)) {
          userId = String(payload.sub || payload.userId || payload.id || payload._id);
          if (userId !== storedUserId) {
            try { localStorage.setItem('userId', userId); dbg('Synced localStorage.userId from token', { userId }); } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (e) {
      // not a JWT or parse failed; fall back to stored id
    }
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

      // 2) GET /api/v1/users?id=:id (some APIs expect query param)
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

      // 4) GET /api/v1/users (list) and filter by id or email
      try {
        const url4 = `${API}/api/v1/users`;
        console.log('[loadProfile] trying GET list', url4);
        const r4 = await fetch(url4, { method: 'GET', headers });
        const j4 = await r4.json().catch(() => ({}));
        if (r4.ok && j4) {
          // j4 could be array or { data: [...] } or { users: [...] }
          let list = Array.isArray(j4) ? j4 : (Array.isArray(j4.data) ? j4.data : (Array.isArray(j4.users) ? j4.users : []));
          if (!list.length && typeof j4 === 'object' && Object.keys(j4).length && !Array.isArray(j4)) {
            // maybe API returned single object even though ok; return it
            return j4;
          }
          if (list.length) {
            if (userId) {
              const found = list.find(u => String(u._id || u.id) === String(userId));
              if (found) return found;
            }
            // fallback: try to match by email stored in localStorage.lastResetEmail or token payload if available
            const emailStored = localStorage.getItem('lastResetEmail');
            if (emailStored) {
              const found2 = list.find(u => (u.email || u.correo) === emailStored);
              if (found2) return found2;
            }
            // return first as last resort
            return list[0];
          }
        }
        console.warn('[loadProfile] GET list failed or empty', r4.status, j4);
      } catch (e) { console.warn('[loadProfile] error fetching list', e); }

      // nothing found
      return null;
    }

    // Use module-scope dbg() for debug panel (defined at top of file)

    const result = await tryFetchUser();
    if (!result) {
      dbg('Could not obtain user data from API');
      console.error('[loadProfile] Could not obtain user data from API');
      return;
    }
    dbg('Found user payload', result);
    const res = { ok: true };
    const json = result;

    if (res.status === 401) {
      // Unauthorized — force login
      console.warn('Token invalid or expired. Redirecting to login.');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.hash = '#/';
      return;
    }

    // handled above

  // Try several common shapes: { user: {...} }, { data: {...} }, {...}
  let user = json.user || json.data || json;
  // If endpoint returns an array, pick first
  if (Array.isArray(user)) user = user[0] || {};

  // Persist the user id locally if backend provided it and localStorage missing it
  try {
    if (user && (user._id || user.id) && !localStorage.getItem('userId')) {
      localStorage.setItem('userId', String(user._id || user.id));
      dbg('localStorage.userId set from payload', { userId: localStorage.getItem('userId') });
    }
  } catch (e) { /* ignore */ }

  // Map possible fields (support English and Spanish keys)
  const firstName = user.firstName || user.name || user.firstname || user.nombres || '';
  const lastName = user.lastName || user.surname || user.lastname || user.apellidos || '';
  const email = user.email || user.correo || user.emailAddress || '';
  const age = user.edad || user.age || user.years || null;
  const createdAt = user.createdAt || user.created_at || user.created || null;

    // Populate DOM (guarded)
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

  // age mapping (some templates use 'age' or 'edad' ids)
  setIf('age', age);
  setIf('edadDisplay', age);
  // Some templates reference `displayEmail` (profile.html has it) — keep both in sync
  setIf('displayEmail', email);

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    setIf('fullName', fullName || '');

    // avatar initials (robust: fall back to email local-part if names missing)
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
    } catch (e) { /* ignore */ }

    // Populate member-since date in avatar card (id: createdDate)
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d)) setIf('createdDate', d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }));
    }

    // Wire save button to module function (robust binding in case inline onclick not present)
    try {
      const saveBtn = document.querySelector('#saveSection button');
      if (saveBtn) {
        // clone and remove inline onclick attribute so it won't call an undefined global
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
    } catch (e) { /* ignore */ }

    // If .back-btn style didn't apply (some SPA setups may not run inline styles), inject a small fallback
    try {
      const back = document.querySelector('.back-btn');
      if (back) {
        const cs = window.getComputedStyle(back);
        // If display isn't inline-flex or color is default, add a high-specificity fallback style
        if (cs.display !== 'inline-flex' || cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.color === 'rgb(0, 0, 0)') {
          const id = 'profile-backbtn-fallback-style';
          if (!document.getElementById(id)) {
            const s = document.createElement('style');
            s.id = id;
            s.textContent = `
              .back-btn{ color: var(--primary, #2563eb) !important; background: rgba(37,99,235,0.06) !important; padding:0.45rem !important; border-radius:0.6rem !important; border:1px solid rgba(37,99,235,0.12) !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; cursor:pointer !important; }
              .back-btn:hover{ background: rgba(37,99,235,0.10) !important; }
            `;
            document.head.appendChild(s);
          }
          // Also apply inline styles directly to the element as a hard fallback
          try {
            back.style.color = 'var(--primary, #2563eb)';
            back.style.background = 'rgba(37,99,235,0.06)';
            back.style.padding = '0.45rem';
            back.style.borderRadius = '0.6rem';
            back.style.border = '1px solid rgba(37,99,235,0.12)';
            back.style.display = 'inline-flex';
            back.style.alignItems = 'center';
            back.style.justifyContent = 'center';
            back.style.cursor = 'pointer';
          } catch (e) { /* ignore inline style failures */ }
          // Log computed styles into debug panel for diagnostics
          try { dbg('back-btn computed styles (after fallback)', { display: cs.display, color: cs.color, backgroundColor: cs.backgroundColor }); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }

  } catch (err) {
    console.error('Error fetching profile:', err);
  }
}

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Expose for manual calls
  window.loadProfile = loadProfile;
  loadProfile();
});

/**
 * Save profile edits to the backend. Sends only changed fields.
 */
async function saveProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    try { localStorage.setItem('postLoginRedirect', '#/profile'); } catch (e) {}
    window.location.hash = '#/';
    return;
  }

  // Determine userId from token or stored
  let userId = localStorage.getItem('userId');
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      if (payload && (payload.sub || payload.userId || payload.id || payload._id)) {
        userId = String(payload.sub || payload.userId || payload.id || payload._id);
      }
    }
  } catch (e) { /* ignore */ }

  if (!userId) {
    dbg('Cannot save profile: missing user id');
    return;
  }

  // Read inputs (fall back to display text if inputs not present)
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
    // toggle off edit mode if present
    if (window.toggleEdit) window.toggleEdit();
    return;
  }

  const saveBtn = document.querySelector('#saveSection button');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const url = `${API}/api/v1/users/${encodeURIComponent(userId)}`;
    dbg('Saving profile to', { url, payload });
    // Try PUT first (some APIs expect PUT for updates)
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
      // treat as success
      dbg('PUT succeeded', putAttemptBody);
      resultBody = putAttemptBody;
    } else {
      // PUT failed, now try PATCH to same URL
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
        // unauthorized
        dbg('Save profile unauthorized', { status: res.status, body: patchBody });
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.hash = '#/';
        return;
      }

      if (!res.ok) {
        dbg('Failed to save profile (PATCH) after PUT', { status: res.status, body: patchBody });
        if (res.status === 404) {
          // Try PATCH to collection endpoint
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
          // Use collBody to update UI if present
          resultBody = collBody;
        } else {
          alert('No se pudieron guardar los cambios: ' + (patchBody && patchBody.message ? patchBody.message : res.status));
          return;
        }
      } else {
        // PATCH succeeded
        resultBody = patchBody;
      }
    }

    // Success — update UI
    dbg('Profile saved successfully', resultBody);
    // Update displays
    const setIf = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = value || '';
      else el.textContent = value || '';
    };
    if (payload.nombres) {
      setIf('firstNameDisplay', payload.nombres);
      setIf('firstName', payload.nombres);
    }
    if (payload.apellidos) {
      setIf('lastNameDisplay', payload.apellidos);
      setIf('lastName', payload.apellidos);
    }
    if (payload.email) {
      setIf('emailDisplay', payload.email);
      setIf('email', payload.email);
      setIf('displayEmail', payload.email);
    }
    // Update full name and avatar initials
    const full = [payload.nombres || getVal('firstNameDisplay'), payload.apellidos || getVal('lastNameDisplay')].filter(Boolean).join(' ');
    setIf('fullName', full);
    try {
      const avatar = document.querySelector('.h-24.w-24') || document.querySelector('.avatar-circle');
      if (avatar) {
        const fn = payload.nombres || getVal('firstNameDisplay') || '';
        const ln = payload.apellidos || getVal('lastNameDisplay') || '';
        avatar.textContent = ((fn[0]||'') + (ln[0]||'')).toUpperCase() || '??';
      }
    } catch (e) { /* ignore */ }

    // Exit edit mode
    if (window.toggleEdit) window.toggleEdit();

  } catch (err) {
    dbg('Error saving profile', err.message || err);
    alert('Error al guardar: ' + (err.message || String(err)));
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// expose saveProfile globally
window.saveProfile = saveProfile;

export { loadProfile, saveProfile };
