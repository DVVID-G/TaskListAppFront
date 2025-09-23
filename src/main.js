/**
 * Entry point of the application.
 * 
 * - Imports the global base CSS styles.
 * - Imports and initializes the router to handle hash-based navigation.
 */

import './styles/base.css';
import { initLogin } from './js/login.js';
// If the app was opened with a plain path like /reset-password?token=...,
// rewrite it to the SPA hash route so the router and reset page can read the token.
try {
  const pathname = window.location.pathname || '';
  const search = window.location.search || '';
  if (pathname.includes('reset-password')) {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (token) {
      // Replace the URL to the hash-based route so the SPA router handles it
      const newUrl = `/#/reset-password?token=${encodeURIComponent(token)}`;
      history.replaceState(null, '', newUrl);
    }
  }
} catch (e) { /* ignore in environments without history */ }

if (window.location.pathname.includes('login')) {
  initLogin();
}
import { initRouter } from './routes/route.js';



/**
 * Initialize the client-side router.
 * This sets up listeners and renders the correct view on app start.
 */
initRouter();

initRouter();

// ----------------------
// Integrar "Quiénes Somos" desde el menú del avatar
// ----------------------
const aboutMenuItem = document.querySelector('.avatar-menu a span.menu-item:contains("Sobre nosotros")') || 
                      [...document.querySelectorAll('.avatar-menu a')].find(a => a.textContent.includes('Sobre nosotros'));

const kanbanBoard = document.getElementById('kanbanBoard');

if (aboutMenuItem && kanbanBoard) {
  aboutMenuItem.parentElement.addEventListener('click', (e) => {
    e.preventDefault();

    // Oculta el tablero Kanban
    kanbanBoard.style.display = 'none';

    // Verifica si ya existe el contenedor de "Quiénes Somos"
    let aboutContainer = document.getElementById('aboutContainer');
    if (!aboutContainer) {
      aboutContainer = document.createElement('div');
      aboutContainer.id = 'aboutContainer';
      aboutContainer.className = 'card quienes-container';
      aboutContainer.innerHTML = `
        <h1>Quiénes Somos</h1>
        <p>
          Bienvenido a <strong>TasklistApp</strong>, la aplicación web full-stack diseñada para gestionar tus tareas personales de manera sencilla, segura y accesible desde cualquier dispositivo.
        </p>

        <h2>Nuestro propósito</h2>
        <ul>
          <li>✅ Permitir que cualquier usuario se registre y autentique de forma segura.</li>
          <li>✅ Gestionar tareas: crear, editar y eliminar con facilidad.</li>
          <li>✅ Acceso desde cualquier dispositivo: desktop, tablet o móvil.</li>
          <li>✅ Interfaz moderna, intuitiva y atractiva.</li>
        </ul>

        <h2>¿Qué puedes hacer con TasklistApp?</h2>
        <ul>
          <li>Organizar tu día a día con listas de tareas.</li>
          <li>Visualizar tareas pendientes, en progreso o completadas en nuestro tablero estilo Kanban.</li>
          <li>Disfrutar de un diseño limpio y responsive, optimizado para todo tipo de pantallas.</li>
        </ul>

        <div class="back-to-login">
          <a href="#" id="backToBoard" class="link">← Volver al tablero</a>
        </div>
      `;
      kanbanBoard.parentNode.appendChild(aboutContainer);
    }

    aboutContainer.style.display = 'block';

    // Listener para volver al tablero
    const backBtn = document.getElementById('backToBoard');
    backBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      aboutContainer.style.display = 'none';
      kanbanBoard.style.display = 'flex';
    });

    // Cierra el menú de avatar
    const avatarMenu = document.getElementById('avatarMenu');
    if (avatarMenu) {
      avatarMenu.classList.remove('show');
    }
  });
}
