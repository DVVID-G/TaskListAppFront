/**
 * Entry point of the application.
 * 
 * - Imports the global base CSS styles.
 * - Imports and initializes the router to handle hash-based navigation.
 */

import './styles/base.css';
import './styles/signup.css';
import { initLogin } from './js/Login.js';

if (window.location.pathname.includes('login')) {
  initLogin();
}
import { initRouter } from './routes/route.js';



/**
 * Initialize the client-side router.
 * This sets up listeners and renders the correct view on app start.
 */
initRouter();
