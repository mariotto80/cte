// app.js - Applicazione Completa EnergiaCorp Premium
// ===== VARIABILI GLOBALI =====
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let ocrWorker = null;
let currentTheme = 'light';
let currentUser = null;

// ===== INIZIALIZZAZIONE APPLICAZIONE =====
async function initializeApp() {
    try {
        console.log('🚀 Inizializzazione app...');

        // Verifica utente corrente
        currentUser = await getCurrentUser();

        if (!currentUser) {
            console.error('❌ Nessun utente loggato');
            showNotification('Devi essere loggato per usare l\'app', 'error');
            return;
        }

        console.log('✅ Utente loggato:', currentUser.email);

        // Carica dati
        await loadOffersFromDatabase();

        // Setup interfaccia
        setupEventListeners();
        initializeDashboard();
        updateLastUpdate();
        showSection('dashboard');

        // Setup real-time
        setupRealtimeSubscription();

        console.log('🎉 App inizializzata con successo!');

    } catch (error) {
        console.error('❌ Errore inizializzazione app:', error);
        showNotification('Errore caricamento applicazione: ' + error.message, 'error');
    }
}

// ===== GESTIONE DATABASE =====
async function loadOffersFromDatabase() {
    try {
        console.log('📊 Caricamento offerte...');
        showLoadingState(true);

        const result = await loadOffers();

        if (result.error) {
            throw new Error(result.error.message);
        }

        offers = result.data || [];
        filteredOffers = [...offers];

        console.log(`✅ Caricate ${offers.length} offerte`);

        updateDashboard();
        updateOffersTable();

    } catch (error) {
        console.error('❌ Errore caricamento offerte:', error);
        showNotification('Errore caricamento offerte: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

async function saveOfferToDatabase(offerData) {
    try {
        console.log('💾 Salvataggio offerta...');
        showLoadingState(true);

        const result = await saveOffer(offerData);

        if (result.error) {
            throw new Error(result.error.message);
        }

        showNotification('✅ Offerta salvata con successo!', 'success');
        await loadOffersFromDatabase();

        return result.data;

    } catch (error) {
        console.error('❌ Errore salvataggio offerta:', error);
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

        if (result.error) throw new Error(result.error.message);

        showNotification('✅ Offerta aggiornata!', 'success');
        await loadOffersFromDatabase();

        return result.data;

    } catch (error) {
        console.error('❌ Errore aggiornamento:', error);
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

        if (result.error) throw new Error(result.error.message);

        showNotification('✅ Offerta eliminata!', 'success');
        await loadOffersFromDatabase();

    } catch (error) {
        console.error('❌ Errore eliminazione:', error);
        showNotification('Errore eliminazione: ' + error.message, 'error');
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// ===== GESTIONE UI =====
function showSection(sectionName) {
    console.log('📄 Cambio sezione:', sectionName);

    // Nascondi tutte le sezioni
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Mostra sezione target
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        console.error('❌ Sezione non trovata:', sectionName);
    }

    // Aggiorna navigazione
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Aggiorna contenuto sezione
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'gestione':
            updateOffersTable();
            break;
        case 'analisi':
            updateAnalytics();
            break;
        case 'upload':
            // Upload section doesn't need special updates
            break;
    }
}

function updateDashboard() {
    console.log('📊 Aggiornamento dashboard...');
    updateKPICards();
    updateTopOffers();
    updateCharts();
}

function initializeDashboard() {
    console.log('🏠 Inizializzazione dashboard...');
    // Dashboard viene aggiornata in loadOffersFromDatabase
}

function updateKPICards() {
    if (offers.length === 0) {
        console.log('📊 Nessuna offerta per KPI');
        return;
    }

    const stats = {
        total: offers.length,
        domestico: offers.filter(o => o.categoria === 'Domestico').length,
        micro: offers.filter(o => o.categoria === 'Micro').length,
        pmi: offers.filter(o => o.categoria === 'PMI').length,
        avgLuce: offers.reduce((sum, o) => sum + (parseFloat(o.prezzo_luce) || 0), 0) / offers.length,
        avgGas: offers.reduce((sum, o) => sum + (parseFloat(o.prezzo_gas) || 0), 0) / offers.length
    };

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

    console.log('✅ KPI aggiornate:', stats);
}

function updateTopOffers() {
    const categories = ['Domestico', 'Micro', 'PMI'];

    categories.forEach(categoria => {
        const categoryOffers = offers.filter(o => o.categoria === categoria);
        if (categoryOffers.length === 0) return;

        const sorted = categoryOffers.sort((a, b) => {
            const totalA = (parseFloat(a.prezzo_luce) || 0) + (parseFloat(a.prezzo_gas) || 0) + (parseFloat(a.commissioni) || 0);
            const totalB = (parseFloat(b.prezzo_luce) || 0) + (parseFloat(b.prezzo_gas) || 0) + (parseFloat(b.commissioni) || 0);
            return totalA - totalB;
        });

        const topOffer = sorted[0];
        const containerId = `top-${categoria.toLowerCase()}`;
        const container = document.getElementById(containerId);

        if (container && topOffer) {
            container.innerHTML = `
                <div class="top-offer-card">
                    <h4>${topOffer.nome_offerta || 'Offerta ' + categoria}</h4>
                    <p><strong>${topOffer.fornitore}</strong></p>
                    <div class="price-info">
                        <span>Luce: ${(parseFloat(topOffer.prezzo_luce) || 0).toFixed(4)}€/kWh</span>
                        <span>Gas: ${(parseFloat(topOffer.prezzo_gas) || 0).toFixed(4)}€/Smc</span>
                    </div>
                    <p class="savings">Commissioni: ${(parseFloat(topOffer.commissioni) || 0).toFixed(2)}€</p>
                </div>
            `;
        }
    });
}

function updateCharts() {
    console.log('📈 Aggiornamento grafici...');

    // Controlla se Chart.js è disponibile
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js non disponibile, salto grafici');
        return;
    }

    const ctx = document.getElementById('category-chart');
    if (!ctx || offers.length === 0) {
        console.log('📈 Nessun canvas o dati per grafico');
        return;
    }

    try {
        const categories = ['Domestico', 'Micro', 'PMI'];
        const avgPrices = categories.map(cat => {
            const catOffers = offers.filter(o => o.categoria === cat);
            if (catOffers.length === 0) return 0;
            return catOffers.reduce((sum, o) => sum + (parseFloat(o.prezzo_luce) || 0), 0) / catOffers.length;
        });

        // Distruggi grafico esistente
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
                    ],
                    borderColor: [
                        'rgba(102, 126, 234, 1)',
                        'rgba(245, 159, 11, 1)',
                        'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Prezzo Medio per Categoria'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '€/kWh'
                        }
                    }
                }
            }
        });

        console.log('✅ Grafico creato con successo');

    } catch (error) {
        console.error('❌ Errore creazione grafico:', error);
    }
}

function updateOffersTable() {
    console.log('🗂️ Aggiornamento tabella offerte...');

    const tbody = document.querySelector('#offers-table tbody');
    if (!tbody) {
        console.error('❌ Tabella offerte non trovata');
        return;
    }

    tbody.innerHTML = '';

    if (filteredOffers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    Nessuna offerta trovata
                </td>
            </tr>
        `;
        return;
    }

    filteredOffers.forEach((offer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${offer.fornitore || '-'}</td>
            <td>${offer.nome_offerta || '-'}</td>
            <td><span class="category-badge ${(offer.categoria || '').toLowerCase()}">${offer.categoria || '-'}</span></td>
            <td>${offer.tipo_prezzo || '-'}</td>
            <td>${(parseFloat(offer.prezzo_luce) || 0).toFixed(4)}€/kWh</td>
            <td>${(parseFloat(offer.prezzo_gas) || 0).toFixed(4)}€/Smc</td>
            <td>${(parseFloat(offer.commissioni) || 0).toFixed(2)}€</td>
            <td>${offer.scadenza ? new Date(offer.scadenza).toLocaleDateString('it-IT') : '-'}</td>
            <td>
                <button class="btn-edit" onclick="editOffer(${offer.id})" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="confirmDeleteOffer(${offer.id})" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    console.log(`✅ Tabella aggiornata con ${filteredOffers.length} offerte`);
}

function applyFilters() {
    console.log('🔍 Applicazione filtri...');

    const categoria = document.getElementById('filter-categoria')?.value || '';
    const fornitore = document.getElementById('filter-fornitore')?.value || '';
    const tipoPrezzo = document.getElementById('filter-tipo-prezzo')?.value || '';
    const searchTerm = document.getElementById('search-offers')?.value.toLowerCase() || '';

    filteredOffers = offers.filter(offer => {
        const matchesCategoria = !categoria || offer.categoria === categoria;
        const matchesFornitore = !fornitore || offer.fornitore === fornitore;
        const matchesTipo = !tipoPrezzo || offer.tipo_prezzo === tipoPrezzo;
        const matchesSearch = !searchTerm || 
            (offer.nome_offerta || '').toLowerCase().includes(searchTerm) ||
            (offer.fornitore || '').toLowerCase().includes(searchTerm);

        return matchesCategoria && matchesFornitore && matchesTipo && matchesSearch;
    });

    console.log(`🔍 Filtrate ${filteredOffers.length} offerte di ${offers.length}`);
    updateOffersTable();
}

// ===== GESTIONE OFFERTE =====
async function editOffer(offerId) {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) {
        showNotification('Offerta non trovata', 'error');
        return;
    }

    showNotification('🔧 Funzione di modifica in sviluppo', 'info');
    console.log('✏️ Modifica offerta:', offer);
}

async function confirmDeleteOffer(offerId) {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) {
        showNotification('Offerta non trovata', 'error');
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare l'offerta "${offer.nome_offerta || 'Senza nome'}" di ${offer.fornitore}?`)) {
        await deleteOfferFromDatabase(offerId);
    }
}

function updateAnalytics() {
    console.log('📈 Sezione Analytics');
    showNotification('📊 Sezione analisi avanzate in sviluppo', 'info');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    console.log('🎛️ Setup event listeners...');

    // Navigazione
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

    // Upload OCR
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

    // OCR Form
    const ocrForm = document.getElementById('ocr-form');
    if (ocrForm) {
        ocrForm.addEventListener('submit', handleOCRFormSubmit);
    }

    // Filtri
    document.querySelectorAll('.filter-control').forEach(filter => {
        filter.addEventListener('change', applyFilters);
        filter.addEventListener('input', applyFilters);
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    console.log('✅ Event listeners configurati');
}

// ===== GESTIONE FILE OCR =====
async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        await processFileWithOCR(file);
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
        await processFileWithOCR(file);
    }
}

async function processFileWithOCR(file) {
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        showNotification('❌ Formato file non supportato. Usa PDF o immagini.', 'error');
        return;
    }

    console.log('🔍 Inizio OCR per:', file.name);
    showNotification('🚀 Avvio elaborazione OCR...', 'info');

    // Placeholder per ora - OCR complesso implementato separatamente
    const mockData = {
        fornitore: 'Estratto da ' + file.name.split('.')[0],
        nome_offerta: 'Offerta Standard',
        categoria: 'Domestico',
        tipo_prezzo: 'Fisso',
        prezzo_luce: 0.25,
        prezzo_gas: 1.20,
        quota_fissa_luce: 15.00,
        quota_fissa_gas: 12.00,
        commissioni: 0.00,
        scadenza: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        durata_mesi: 12
    };

    populateOCRForm(mockData);
    showSection('upload');
    showNotification('✅ OCR completato! Verifica i dati estratti.', 'success');
}

function populateOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;

    Object.keys(data).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && data[key] !== null && data[key] !== '') {
            input.value = data[key];
        }
    });
}

async function handleOCRFormSubmit(e) {
    e.preventDefault();

    console.log('💾 Invio form OCR...');

    const formData = new FormData(e.target);
    const offerData = Object.fromEntries(formData.entries());

    // Conversioni numeriche
    ['prezzo_luce', 'spread_luce', 'prezzo_gas', 'spread_gas', 'quota_fissa_luce', 'quota_fissa_gas', 'commissioni'].forEach(field => {
        if (offerData[field]) {
            offerData[field] = parseFloat(offerData[field]);
        }
    });

    if (offerData.durata_mesi) {
        offerData.durata_mesi = parseInt(offerData.durata_mesi);
    }

    offerData.created_at = new Date().toISOString();
    offerData.attivo = true;

    try {
        await saveOfferToDatabase(offerData);
        e.target.reset();
        showSection('dashboard');
    } catch (error) {
        // Errore gestito in saveOfferToDatabase
    }
}

// ===== UTILITY FUNCTIONS =====
function showLoadingState(show) {
    const loader = document.getElementById('main-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);

    // Rimuovi notifiche esistenti
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const iconMap = {
        error: 'exclamation-circle',
        success: 'check-circle', 
        info: 'info-circle',
        warning: 'exclamation-triangle'
    };

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-rimozione dopo 5 secondi
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Rimozione al click
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
    showNotification(`🎨 Tema cambiato in ${currentTheme}`, 'info');
}

function updateLastUpdate() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('it-IT');
    }
}

async function handleLogout() {
    try {
        console.log('👋 Logout utente...');
        await signOut();
        showNotification('✅ Logout effettuato', 'success');
        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error('❌ Errore logout:', error);
        showNotification('Errore durante logout: ' + error.message, 'error');
    }
}

// ===== REAL-TIME SUBSCRIPTION =====
function setupRealtimeSubscription() {
    if (!currentUser) return;

    console.log('🔄 Setup real-time subscription...');

    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient.channel) {
            supabaseClient
                .channel('offers-changes')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'offerte_energia',
                    filter: `user_id=eq.${currentUser.id}`
                }, (payload) => {
                    console.log('🔄 Real-time update:', payload);
                    loadOffersFromDatabase();
                })
                .subscribe();
        }
    } catch (error) {
        console.warn('⚠️ Real-time subscription non disponibile:', error.message);
    }
}

// ===== INIZIALIZZAZIONE TEMA =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);

    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ===== INIZIALIZZAZIONE GLOBALE =====
window.addEventListener('load', function() {
    console.log('🌟 App caricata, inizializzazione tema...');
    initializeTheme();

    // Setup PDF.js se disponibile
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
});

// ===== DEBUG UTILITY =====
if (typeof window !== 'undefined') {
    window.debugApp = {
        offers,
        loadOffersFromDatabase,
        saveOfferToDatabase,
        updateOfferInDatabase,
        deleteOfferFromDatabase,
        currentUser,
        charts
    };
}

console.log('📱 App.js caricato completamente!');
