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
