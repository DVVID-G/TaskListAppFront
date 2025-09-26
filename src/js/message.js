// Shared message helper used by multiple views
export function showMessage(text, type = 'info', opts = {}) {
  try {
    // Accept element ids commonly used by views
    const preferredIds = ['infoMsg', 'loginMsg', 'resetMsg', 'forgotMsg'];
    let target = null;
    for (const id of preferredIds) {
      const el = document.getElementById(id);
      if (el) { target = el; break; }
    }

    // If target exists, use it (keeps existing layout in views)
    if (target) {
      target.textContent = text;
      target.style.display = 'block';
      // normalize classes
      target.classList.remove('app-message', 'app-message--success', 'app-message--error', 'app-message--info');
      target.classList.add('app-message', `app-message--${type}`);
      // set ARIA role
      target.setAttribute('role', type === 'error' ? 'alert' : 'status');
      return target;
    }

    // Otherwise create a transient message element and insert before #app
    const container = document.createElement('div');
    container.className = `app-message app-message--${type}`;
    container.setAttribute('role', type === 'error' ? 'alert' : 'status');
    container.textContent = text;

    const ref = document.getElementById('app') || document.body;
    if (ref.parentElement) ref.parentElement.insertBefore(container, ref);
    else document.body.appendChild(container);

    if (opts.autoHide !== false) {
      const timeout = typeof opts.timeout === 'number' ? opts.timeout : 4000;
      setTimeout(() => container.remove(), timeout);
    }
    return container;
  } catch (e) {
    console[type === 'error' ? 'error' : 'log'](text);
  }
}
