// ===== GLOBAL VARIABLES =====
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let ocrWorker = null;
let currentTheme = 'light';
let currentUser = null;

// OCR Configuration
const OCR_CONFIG = {
    lang: 'ita+eng',
    oem: 1,
    psm: 6
};

// Field Recognition Patterns per OCR
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
        /canone.*?luce.*?(\d+[,\.]\d+)/gi
    ],
    quota_fissa_gas: [
        /quota.*?fissa.*?gas.*?(\d+[,\.]\d+)/gi,
        /canone.*?gas.*?(\d+[,\.]\d+)/gi
    ],
    commissioni: [
        /commissioni.*?(\d+[,\.]\d+)/gi,
        /oneri.*?(\d+[,\.]\d+)/gi,
        /spese.*?attivazione.*?(\d+[,\.]\d+)/gi
    ],
    fornitore: [
        /(?:enel|eni|edison|a2a|iren|acea|sorgenia|wekiwi|plenitude|illumia)/gi
    ]
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Controlla se utente è loggato
        currentUser = await getCurrentUser();

        if (!currentUser) {
            showLoginModal();
            return;
        }

        // User loggato - inizializza app
        await loadOffersFromDatabase();
        setupEventListeners();
        initializeDashboard();
        updateLastUpdate();
        showSection('dashboard');

        // Setup real-time updates
        setupRealtimeSubscription();

    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Errore caricamento applicazione: ' + error.message, 'error');
    }
}

function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function hideLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// ===== AUTHENTICATION HANDLING =====
let isSignupMode = false;

// Setup event listeners per autenticazione
if (document.getElementById('auth-form')) {
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
}

if (document.getElementById('auth-switch')) {
    document.getElementById('auth-switch').addEventListener('click', toggleAuthMode);
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('auth-submit');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.textContent = 'Caricamento...';
        submitBtn.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        let result;

        if (isSignupMode) {
            const fullName = document.getElementById('full-name').value;
            result = await signUp(email, password, fullName);

            if (!result.error) {
                showNotification('Registrazione completata! Controlla la tua email per confermare.', 'success');
                // Passa a modalità login
                toggleAuthMode({ preventDefault: () => {} });
                return;
            }
        } else {
            result = await signIn(email, password);

            if (!result.error) {
                hideLoginModal();
                await initializeApp();
                showNotification('Login effettuato con successo!', 'success');
                return;
            }
        }

        showNotification('Errore: ' + result.error.message, 'error');

    } catch (error) {
        showNotification('Errore: ' + error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function toggleAuthMode(e) {
    e.preventDefault();
    isSignupMode = !isSignupMode;

    const title = document.getElementById('auth-title');
    const submit = document.getElementById('auth-submit');
    const signupFields = document.getElementById('signup-fields');
    const switchText = document.getElementById('switch-text');
    const switchLink = document.getElementById('auth-switch');

    if (isSignupMode) {
        title.textContent = 'Registrazione';
        submit.textContent = 'Registrati';
        signupFields.style.display = 'block';
        switchText.textContent = 'Hai già un account?';
        switchLink.textContent = 'Accedi';
    } else {
        title.textContent = 'Login';
        submit.textContent = 'Accedi';
        signupFields.style.display = 'none';
        switchText.textContent = 'Non hai un account?';
        switchLink.textContent = 'Registrati';
    }
}

async function handleLogout() {
    try {
        await signOut();
        location.reload();
    } catch (error) {
        showNotification('Errore durante logout: ' + error.message, 'error');
    }
}

// ===== DATABASE OPERATIONS =====
async function loadOffersFromDatabase() {
    try {
        showLoadingState(true);

        const result = await loadOffers();

        if (result.error) {
            throw new Error(result.error.message);
        }

        offers = result.data || [];
        filteredOffers = [...offers];

        updateDashboard();
        updateOffersTable();

    } catch (error) {
        console.error('Error loading offers:', error);
        showNotification('Errore caricamento offerte: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

async function saveOfferToDatabase(offerData) {
    try {
        showLoadingState(true);

        const result = await saveOffer(offerData);

        if (result.error) {
            throw new Error(result.error.message);
        }

        showNotification('Offerta salvata con successo!', 'success');
        await loadOffersFromDatabase(); // Ricarica lista

        return result.data;

    } catch (error) {
        console.error('Error saving offer:', error);
        showNotification('Errore salvataggio: ' + error.message, 'error');
        throw error;
    } finally {
        showLoadingState(false);
    }
}

async function updateOfferInDatabase(offerId, updates) {
    try {
        showLoadingState(true);

        const result = await updateOffer(offerId, updates);

        if (result.error) {
            throw new Error(result.error.message);
        }

        showNotification('Offerta aggiornata con successo!', 'success');
        await loadOffersFromDatabase();

        return result.data;

    } catch (error) {
        console.error('Error updating offer:', error);
        showNotification('Errore aggiornamento: ' + error.message, 'error');
        throw error;
    } finally {
        showLoadingState(false);
    }
}

async function deleteOfferFromDatabase(offerId) {
    try {
        showLoadingState(true);

        const result = await deleteOffer(offerId);

        if (result.error) {
            throw new Error(result.error.message);
        }

        showNotification('Offerta eliminata con successo!', 'success');
        await loadOffersFromDatabase();

    } catch (error) {
        console.error('Error deleting offer:', error);
        showNotification('Errore eliminazione: ' + error.message, 'error');
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// ===== REAL-TIME UPDATES =====
function setupRealtimeSubscription() {
    // Sottoscrizione ai cambiamenti della tabella offerte
    supabaseClient
        .channel('offers-changes')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'offerte_energia',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Real-time update:', payload);
            // Ricarica i dati quando ci sono cambiamenti
            loadOffersFromDatabase();
        })
        .subscribe();
}

// ===== OCR PROCESSING =====
async function processFileWithOCR(file) {
    if (!file) return null;

    try {
        const progressBar = document.getElementById('ocr-progress');
        const progressText = document.getElementById('progress-text');

        if (progressBar) progressBar.style.display = 'block';

        updateProgress(10, 'Inizializzazione OCR...');

        // Inizializza Tesseract worker se non esiste
        if (!ocrWorker) {
            ocrWorker = await Tesseract.createWorker();
            await ocrWorker.loadLanguage(OCR_CONFIG.lang);
            await ocrWorker.initialize(OCR_CONFIG.lang);
        }

        updateProgress(30, 'Lettura file PDF...');

        let imagesToProcess = [];

        if (file.type === 'application/pdf') {
            imagesToProcess = await convertPDFToImages(file);
        } else {
            imagesToProcess = [file];
        }

        updateProgress(50, 'Riconoscimento testo...');

        let allText = '';

        for (let i = 0; i < imagesToProcess.length; i++) {
            const progress = 50 + (40 * (i + 1) / imagesToProcess.length);
            updateProgress(progress, `Elaborazione pagina ${i + 1}/${imagesToProcess.length}...`);

            const { data: { text } } = await ocrWorker.recognize(imagesToProcess[i]);
            allText += text + '\n\n';
        }

        updateProgress(95, 'Estrazione dati...');

        const extractedData = extractFieldsFromText(allText);
        extractedData.pdf_filename = file.name;

        updateProgress(100, 'Completato!');

        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
        }, 1000);

        return extractedData;

    } catch (error) {
        console.error('OCR Error:', error);
        showNotification('Errore durante il riconoscimento OCR: ' + error.message, 'error');
        return null;
    }
}

function updateProgress(percentage, text) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressText) progressText.textContent = text;
}

async function convertPDFToImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        images.push(canvas);
    }

    return images;
}

function extractFieldsFromText(text) {
    const extracted = {
        fornitore: '',
        nome_offerta: '',
        categoria: 'Domestico',
        tipo_prezzo: 'Fisso',
        prezzo_luce: 0,
        spread_luce: 0,
        prezzo_gas: 0,
        spread_gas: 0,
        quota_fissa_luce: 0,
        quota_fissa_gas: 0,
        commissioni: 0,
        scadenza: '',
        durata_mesi: 12,
        confidence_score: 0.8
    };

    // Applica pattern di riconoscimento
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches[1]) {
                let value = matches[1];

                if (field === 'fornitore') {
                    extracted[field] = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                } else if (field.includes('prezzo') || field.includes('quota') || field.includes('spread') || field === 'commissioni') {
                    // Converte numeri europei (virgola) in decimali
                    value = parseFloat(value.replace(',', '.'));
                    if (!isNaN(value)) {
                        extracted[field] = value;
                    }
                } else {
                    extracted[field] = value;
                }
                break;
            }
        }
    }

    // Genera nome offerta se non trovato
    if (!extracted.nome_offerta && extracted.fornitore) {
        extracted.nome_offerta = `${extracted.fornitore} ${extracted.tipo_prezzo} ${extracted.categoria}`;
    }

    // Genera scadenza di default se non trovata
    if (!extracted.scadenza) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + extracted.durata_mesi);
        extracted.scadenza = futureDate.toISOString().split('T')[0];
    }

    return extracted;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            showSection(section);
        });
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // File upload
    const fileInput = document.getElementById('pdf-file');
    const dropZone = document.getElementById('upload-area');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleFileDrop);
        dropZone.addEventListener('click', () => fileInput?.click());
    }

    // OCR Form submit
    const ocrForm = document.getElementById('ocr-form');
    if (ocrForm) {
        ocrForm.addEventListener('submit', handleOCRFormSubmit);
    }

    // Filters
    document.querySelectorAll('.filter-control').forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    // Search
    const searchInput = document.getElementById('search-offers');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Logout button (se presente)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        await processAndDisplayFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

async function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) {
        await processAndDisplayFile(file);
    }
}

async function processAndDisplayFile(file) {
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        showNotification('Formato file non supportato. Usa PDF o immagini.', 'error');
        return;
    }

    const extractedData = await processFileWithOCR(file);

    if (extractedData) {
        populateOCRForm(extractedData);
        showSection('upload'); // Mostra form di revisione
    }
}

function populateOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;

    Object.keys(data).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = data[key];

            // Aggiungi indicatore di confidenza
            const confidenceIndicator = input.parentNode.querySelector('.confidence-indicator');
            if (confidenceIndicator) {
                const confidence = data.confidence_score || 0.8;
                confidenceIndicator.textContent = `${Math.round(confidence * 100)}%`;
                confidenceIndicator.className = `confidence-indicator ${confidence > 0.9 ? 'high' : confidence > 0.7 ? 'medium' : 'low'}`;
            }
        }
    });
}

async function handleOCRFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const offerData = Object.fromEntries(formData.entries());

    // Converte i numeri
    ['prezzo_luce', 'spread_luce', 'prezzo_gas', 'spread_gas', 'quota_fissa_luce', 'quota_fissa_gas', 'commissioni'].forEach(field => {
        if (offerData[field]) {
            offerData[field] = parseFloat(offerData[field]);
        }
    });

    if (offerData.durata_mesi) {
        offerData.durata_mesi = parseInt(offerData.durata_mesi);
    }

    // Aggiunge timestamp
    offerData.created_at = new Date().toISOString();
    offerData.attivo = true;

    try {
        await saveOfferToDatabase(offerData);

        // Reset form e torna alla dashboard
        e.target.reset();
        showSection('dashboard');

    } catch (error) {
        // Errore già gestito in saveOfferToDatabase
    }
}

// ===== UI FUNCTIONS =====
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Initialize section-specific functionality
    if (sectionName === 'dashboard') {
        updateDashboard();
    } else if (sectionName === 'gestione') {
        updateOffersTable();
    } else if (sectionName === 'analisi') {
        updateAnalytics();
    }
}

function updateDashboard() {
    updateKPICards();
    updateTopOffers();
    updateCharts();
}

function updateKPICards() {
    if (offers.length === 0) return;

    const stats = {
        total: offers.length,
        domestico: offers.filter(o => o.categoria === 'Domestico').length,
        micro: offers.filter(o => o.categoria === 'Micro').length,
        pmi: offers.filter(o => o.categoria === 'PMI').length,
        avgLuce: offers.reduce((sum, o) => sum + (o.prezzo_luce || 0), 0) / offers.length,
        avgGas: offers.reduce((sum, o) => sum + (o.prezzo_gas || 0), 0) / offers.length
    };

    // Update KPI cards
    const kpiElements = {
        'total-offers': stats.total,
        'domestico-count': stats.domestico,
        'micro-count': stats.micro,
        'pmi-count': stats.pmi,
        'avg-luce': stats.avgLuce.toFixed(4) + ' €/kWh',
        'avg-gas': stats.avgGas.toFixed(4) + ' €/Smc'
    };

    Object.entries(kpiElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function updateTopOffers() {
    const categories = ['Domestico', 'Micro', 'PMI'];

    categories.forEach(categoria => {
        const categoryOffers = offers.filter(o => o.categoria === categoria);
        if (categoryOffers.length === 0) return;

        // Ordina per prezzo totale (luce + gas + commissioni)
        const sorted = categoryOffers.sort((a, b) => {
            const totalA = (a.prezzo_luce || 0) + (a.prezzo_gas || 0) + (a.commissioni || 0);
            const totalB = (b.prezzo_luce || 0) + (b.prezzo_gas || 0) + (b.commissioni || 0);
            return totalA - totalB;
        });

        const topOffer = sorted[0];
        const containerId = `top-${categoria.toLowerCase()}`;
        const container = document.getElementById(containerId);

        if (container && topOffer) {
            container.innerHTML = `
                <div class="top-offer-card">
                    <h4>${topOffer.nome_offerta}</h4>
                    <p><strong>${topOffer.fornitore}</strong></p>
                    <div class="price-info">
                        <span>Luce: ${topOffer.prezzo_luce}€/kWh</span>
                        <span>Gas: ${topOffer.prezzo_gas}€/Smc</span>
                    </div>
                    <p class="savings">Commissioni: ${topOffer.commissioni}€</p>
                </div>
            `;
        }
    });
}

function updateCharts() {
    // Chart prezzi per categoria
    const ctx = document.getElementById('category-chart');
    if (ctx && offers.length > 0) {
        const categories = ['Domestico', 'Micro', 'PMI'];
        const avgPrices = categories.map(cat => {
            const catOffers = offers.filter(o => o.categoria === cat);
            if (catOffers.length === 0) return 0;
            return catOffers.reduce((sum, o) => sum + (o.prezzo_luce || 0), 0) / catOffers.length;
        });

        if (charts.categoryChart) {
            charts.categoryChart.destroy();
        }

        charts.categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Prezzo Medio Luce (€/kWh)',
                    data: avgPrices,
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(245, 159, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Prezzo Medio per Categoria'
                    }
                }
            }
        });
    }
}

function updateOffersTable() {
    const tbody = document.querySelector('#offers-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    filteredOffers.forEach(offer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${offer.fornitore}</td>
            <td>${offer.nome_offerta}</td>
            <td><span class="category-badge ${offer.categoria.toLowerCase()}">${offer.categoria}</span></td>
            <td>${offer.tipo_prezzo}</td>
            <td>${offer.prezzo_luce}€/kWh</td>
            <td>${offer.prezzo_gas}€/Smc</td>
            <td>${offer.commissioni}€</td>
            <td>${new Date(offer.scadenza).toLocaleDateString()}</td>
            <td>
                <button class="btn-edit" onclick="editOffer(${offer.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="confirmDeleteOffer(${offer.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function applyFilters() {
    const categoria = document.getElementById('filter-categoria')?.value || '';
    const fornitore = document.getElementById('filter-fornitore')?.value || '';
    const tipoPrezzo = document.getElementById('filter-tipo-prezzo')?.value || '';
    const searchTerm = document.getElementById('search-offers')?.value.toLowerCase() || '';

    filteredOffers = offers.filter(offer => {
        const matchesCategoria = !categoria || offer.categoria === categoria;
        const matchesFornitore = !fornitore || offer.fornitore === fornitore;
        const matchesTipo = !tipoPrezzo || offer.tipo_prezzo === tipoPrezzo;
        const matchesSearch = !searchTerm || 
            offer.nome_offerta.toLowerCase().includes(searchTerm) ||
            offer.fornitore.toLowerCase().includes(searchTerm);

        return matchesCategoria && matchesFornitore && matchesTipo && matchesSearch;
    });

    updateOffersTable();
}

async function editOffer(offerId) {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    // Popola un modal di modifica (da implementare)
    showNotification('Funzione di modifica in sviluppo', 'info');
}

async function confirmDeleteOffer(offerId) {
    if (confirm('Sei sicuro di voler eliminare questa offerta?')) {
        await deleteOfferFromDatabase(offerId);
    }
}

function updateAnalytics() {
    // Aggiorna grafici di analisi avanzata
    showNotification('Sezione analisi in sviluppo', 'info');
}

// ===== UTILITY FUNCTIONS =====
function showLoadingState(show) {
    const loader = document.getElementById('main-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Aggiungi al body
    document.body.appendChild(notification);

    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Aggiungi click per chiudere
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    localStorage.setItem('theme', currentTheme);
}

function updateLastUpdate() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('it-IT');
    }
}

// ===== INITIALIZATION ON LOAD =====
window.addEventListener('load', function() {
    // Carica tema salvato
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Setup PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
});

// Export functions per debug (development)
if (typeof window !== 'undefined') {
    window.debugApp = {
        offers,
        loadOffersFromDatabase,
        saveOfferToDatabase,
        updateOfferInDatabase,
        deleteOfferFromDatabase
    };
}
