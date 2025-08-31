// app.js - Gestione Interfaccia e integrazione con Supabase

import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  saveOffer,
  loadOffers,
  updateOffer,
  deleteOffer
} from './supabase.js';

let offers = [];
let filteredOffers = [];

const loginModal = document.getElementById('login-modal');

async function initializeApp() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      loginModal.style.display = 'flex';
      return;
    }
    await loadOffersFromDatabase();
    setupEventListeners();
    initializeDashboard();
    updateLastUpdate();
    showSection('dashboard');
  } catch (error) {
    console.error('Error initializing:', error);
  }
}

// Carica offerte dal DB
async function loadOffersFromDatabase() {
  try {
    showLoadingState(true);
    const result = await loadOffers();
    if (result.error) throw new Error(result.error.message);
    offers = result.data || [];
    filteredOffers = [...offers];
    updateDashboard();
    updateOffersTable();
  } catch (error) {
    console.error('Error loading:', error);
  } finally {
    showLoadingState(false);
  }
}

// Salva nuova offerta
async function saveOfferToDatabase(offerData) {
  try {
    const result = await saveOffer(offerData);
    if (result.error) throw new Error(result.error.message);
    showNotification('Offerta salvata!', 'success');
    await loadOffersFromDatabase();
    return result.data;
  } catch (err) {
    showNotification('Errore nel salvataggio', 'error');
  }
}

// Setup login/logout
document.addEventListener('DOMContentLoaded', () => {
  // Login form
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }
  document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
  
  initializeApp();
});

// Funzioni auth
let isSignupMode = false;
function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  document.getElementById('signup-fields').style.display = isSignupMode ? 'block' : 'none';
  document.getElementById('auth-title').textContent = isSignupMode ? 'Registrazione' : 'Login';
  document.getElementById('auth-submit').textContent = isSignupMode ? 'Registrati' : 'Accedi';
  document.getElementById('switch-text').textContent = isSignupMode ? 'Hai già un account?' : 'Non hai un account?';
  document.getElementById('auth-switch').textContent = isSignupMode ? 'Accedi' : 'Registrati';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    if (isSignupMode) {
      const fullName = document.getElementById('full-name').value;
      const result = await signUp(email, password, fullName);
      if (result.error) throw new Error(result.error.message);
      showNotification('Registrazione completata! Controlla email.', 'success');
    } else {
      const result = await signIn(email, password);
      if (result.error) throw new Error(result.error.message);
      loginModal.style.display = 'none';
      await initializeApp();
    }
  } catch (err) {
    showNotification('Errore: ' + err.message, 'error');
  }
}

// Funzione di caricamento offerte dal DB
async function loadOffersFromDatabase() {
  const result = await loadOffers();
  if (result.error) throw new Error(result.error.message);
  offers = result.data || [];
  filteredOffers = [...offers];
  updateDashboard();
  updateOffersTable();
}

// Funzione di salvataggio offerte nel DB
async function processNewOffer(offerData) {
  await saveOfferToDatabase(offerData);
  // La UI si aggiornerà in loadOffersFromDatabase
}

// Altre funzioni dashboard, CRUD, ecc. devono essere implementate come nel progetto.

