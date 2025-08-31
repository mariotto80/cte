// Import delle funzioni Supabase (ES Modules)
import {
  signUp, signIn, signOut, getCurrentUser,
  createOffer, getOffers, updateOffer as sbUpdateOffer, deleteOffer as sbDeleteOffer,
  subscribeToOffers
} from './supabase-operations.js'

// Global Variables
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let ocrWorker = null;
let currentTheme = 'light';
let unsubscribeOffers = null; // <- per live updates

// --- Compat layer: showNotification usa il tuo toast ---
function showNotification(message, type = 'success') {
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    console[type === 'error' ? 'error' : 'log'](message);
    alert(message);
  }
}

// OCR Configuration
const OCR_CONFIG = { lang: 'ita+eng', oem: 1, psm: 6 };
// Gestione autenticazione
let isSignup = false

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  
  if (isSignup) {
    const fullName = document.getElementById('full-name').value
    const result = await signUp(email, password, fullName)
    
    if (result.success) {
      showNotification('Registrazione completata! Controlla la tua email.', 'success')
    } else {
      showNotification('Errore registrazione: ' + result.error, 'error')
    }
  } else {
    const result = await signIn(email, password)
    
    if (result.success) {
      document.getElementById('login-modal').style.display = 'none'
      await initializeApp()
    } else {
      showNotification('Errore login: ' + result.error, 'error')
    }
  }
})

// Switch tra login e signup
document.getElementById('auth-switch').addEventListener('click', (e) => {
  e.preventDefault()
  isSignup = !isSignup
  
  if (isSignup) {
    document.getElementById('auth-title').textContent = 'Registrazione'
    document.getElementById('signup-fields').style.display = 'block'
    document.getElementById('auth-submit').textContent = 'Registrati'
    document.getElementById('auth-switch-text').textContent = 'Hai già un account?'
    document.getElementById('auth-switch').textContent = 'Login'
  } else {
    document.getElementById('auth-title').textContent = 'Login'
    document.getElementById('signup-fields').style.display = 'none'
    document.getElementById('auth-submit').textContent = 'Login'
    document.getElementById('auth-switch-text').textContent = 'Non hai un account?'
    document.getElementById('auth-switch').textContent = 'Registrati'
  }
})

// Controlla se l'utente è già loggato
async function checkAuthState() {
  const user = await getCurrentUser()
  if (user) {
    return true
  } else {
    document.getElementById('login-modal').style.display = 'block'
    return false
  }
}

// Field Recognition Patterns (restano identici)
const FIELD_PATTERNS = {
  prezzo_luce: [
    /(\d+[,\.]\d+)\s*(?:€|euro|eur)?\s*\/?\s*kWh/gi,
    /(?:prezzo|tariffa).*?luce.*?(\d+[,\.]\d+)/gi,
    /(?:elettrica|energia).*?(\d+[,\.]\d+)\s*€/gi,
    /(\d+[,\.]\d+)\s*cent.*?kWh/gi
  ],
  prezzo_gas: [
    /(\d+[,\.]\d+)\s*(?:€|euro|eur)?\s*\/?\s*Smc/gi,
    /(?:prezzo|tariffa).*?gas.*?(\d+[,\.]\d+)/gi,
    /(\d+[,\.]\d+)\s*€.*?smc/gi,
    /(\d+[,\.]\d+)\s*cent.*?smc/gi
  ],
  quota_fissa_luce: [
    /quota.*?fissa.*?luce.*?(\d+[,\.]\d+)/gi,
    /canone.*?luce.*?(\d+[,\.]\d+)/gi,
    /(\d+[,\.]\d+)\s*€.*?mese.*?luce/gi
  ],
  quota_fissa_gas: [
    /quota.*?fissa.*?gas.*?(\d+[,\.]\d+)/gi,
    /canone.*?gas.*?(\d+[,\.]\d+)/gi,
    /(\d+[,\.]\d+)\s*€.*?mese.*?gas/gi
  ],
  commissioni: [
    /commissioni.*?(\d+[,\.]\d+)/gi,
    /oneri.*?(\d+[,\.]\d+)/gi,
    /costi.*?aggiuntivi.*?(\d+[,\.]\d+)/gi,
    /spese.*?attivazione.*?(\d+[,\.]\d+)/gi
  ],
  spread_luce: [
    /spread.*?luce.*?(\d+[,\.]\d+)/gi,
    /maggiorazione.*?luce.*?(\d+[,\.]\d+)/gi,
    /margine.*?luce.*?(\d+[,\.]\d+)/gi
  ],
  spread_gas: [
    /spread.*?gas.*?(\d+[,\.]\d+)/gi,
    /maggiorazione.*?gas.*?(\d+[,\.]\d+)/gi,
    /margine.*?gas.*?(\d+[,\.]\d+)/gi
  ],
  scadenza: [
    /(?:valida|scad|v
