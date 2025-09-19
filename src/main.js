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
