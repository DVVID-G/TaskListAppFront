// src/components/footer.js
// Renders a global footer with branding, social media links,
// an "About Us" link, and a centered copyright line.
// Uses custom CSS classes from base.css for layout and responsiveness.

function footerTemplate() {
  return `
    <footer class="site-footer">
      <div class="footer-grid">
        
        <!-- Branding / Description -->
        <div>
          <div class="text-xl font-semibold">Tasklistapp</div>
          <p class="text-sm mt-2">
            Administra tus tareas con tableros Kanban y perfiles de usuario.
          </p>
        </div>

        <!-- Social Media Links -->
        <div class="social-icons flex justify-center md:justify-center">
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

        <!-- About Us -->
        <div>
          <a href="/#/about" class="hover:text-blue-400 text-sm">
            Sobre nosotros
          </a>
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
