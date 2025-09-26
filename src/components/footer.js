// src/components/footer.js
// Renders a global footer with branding, social media links,
// an "About Us" link, and a centered copyright line.
// Uses custom CSS classes from base.css for layout and responsiveness.

function footerTemplate() {
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        
        <!-- Branding / Description (logo + short description) -->
        <div class="footer-brand">
          <img src="/logo.png" alt="Tasklistapp" class="footer-logo" />
          <p class="text-sm mt-2 footer-brand-desc">
            Administra tus tareas con tableros Kanban y perfiles de usuario.
          </p>
        </div>

        <!-- Social Media Links -->
        <div class="social-section">
          <h4 class="social-title">Redes sociales</h4>
          <div class="social-icons">
            <a href="https://twitter.com" target="_blank" aria-label="Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" aria-label="LinkedIn">
              <i class="fab fa-linkedin"></i>
            </a>
            <a href="https://instagram.com" target="_blank" aria-label="Instagram">
              <i class="fab fa-instagram"></i>
            </a>
            <a href="https://facebook.com" target="_blank" aria-label="Facebook">
              <i class="fab fa-facebook"></i>
            </a>
            <a href="https://youtube.com" target="_blank" aria-label="YouTube">
              <i class="fab fa-youtube"></i>
            </a>
          </div>
        </div>

        <!-- About Us (summarized paragraph) -->
        <div class="about-summary-block">
          <h3 class="footer-about-title">Sobre nosotros</h3>
          <p class="about-text">
            TasklistApp es una aplicación web full‑stack para gestionar tus tareas de forma sencilla y segura. Permite registrarse y autenticarse, crear, editar y eliminar tareas, y visualizar el flujo de trabajo en un tablero Kanban responsivo, accesible desde desktop, tablet y móvil.
          </p>
        </div>
      </div>

      <!-- Bottom copyright line -->
      <div class="footer-bottom">
        © ${new Date().getFullYear()} Tasklistapp. Todos los derechos reservados.
      </div>
    </footer>
  `;
}

export function renderFooter(targetId = "footer-root") {
  const mount = document.getElementById(targetId);
  if (!mount) return;
  mount.innerHTML = footerTemplate();
}
