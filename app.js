// app.js - EnergiaCorp Premium Application Logic
// ===== VARIABILI GLOBALI =====
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let currentTheme = 'light';
let currentUser = null;

// ===== INIZIALIZZAZIONE APPLICAZIONE =====
async function initializeApp() {
    try {
        console.log('🚀 Inizializzazione app dashboard...');

        // Verifica utente corrente
        currentUser = await getCurrentUser();

        if (!currentUser) {
            console.error('❌ Nessun utente loggato');
            showNotification('Errore: utente non loggato', 'error');
            return;
        }

        console.log('✅ Utente loggato:', currentUser.email);

        // Setup interfaccia
        setupEventListeners();
        initializeDashboard();
        updateLastUpdate();

        // Carica dati
        await loadOffersFromDatabase();

        // Setup real-time
        setupRealtimeSubscription();

        console.log('🎉 App dashboard inizializzata con successo!');
        showNotification('✅ Dashboard caricata correttamente', 'success');

    } catch (error) {
        console.error('❌ Errore inizializzazione app:', error);
        showNotification('Errore caricamento: ' + error.message, 'error');
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
        updateFilters();

    } catch (error) {
        console.error('❌ Errore caricamento offerte:', error);
        showNotification('Errore caricamento offerte: ' + error.message, 'error');
        offers = [];
        filteredOffers = [];
        updateDashboard();
        updateOffersTable();
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
        return;
    }

    // Aggiorna navigazione
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#6b7280';
    });

    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#667eea';
        activeBtn.style.color = 'white';
    }

    // Aggiorna contenuto sezione
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'gestione':
            updateOffersTable();
            applyFilters();
            break;
        case 'analisi':
            updateAnalytics();
            break;
        case 'upload':
            // Upload section non richiede aggiornamenti
            break;
    }
}

function initializeDashboard() {
    console.log('🏠 Dashboard pronta per caricamento dati...');
}

function updateDashboard() {
    console.log('📊 Aggiornamento dashboard con', offers.length, 'offerte...');
    updateKPICards();
    updateTopOffers();
    updateCharts();
}

function updateKPICards() {
    const stats = {
        total: offers.length,
        domestico: offers.filter(o => o.categoria === 'Domestico').length,
        micro: offers.filter(o => o.categoria === 'Micro').length,
        pmi: offers.filter(o => o.categoria === 'PMI').length
    };

    const kpiElements = {
        'total-offers': stats.total,
        'domestico-count': stats.domestico,
        'micro-count': stats.micro,
        'pmi-count': stats.pmi
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
    const categories = ['domestico', 'micro', 'pmi'];

    categories.forEach(categoria => {
        const categoryName = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        const categoryOffers = offers.filter(o => o.categoria === categoryName);
        const container = document.getElementById(`top-${categoria}`);

        if (!container) return;

        if (categoryOffers.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-style: italic;">Nessuna offerta disponibile</p>';
            return;
        }

        // Ordina per prezzo totale più basso
        const sorted = categoryOffers.sort((a, b) => {
            const totalA = (parseFloat(a.prezzo_luce) || 0) + (parseFloat(a.prezzo_gas) || 0) + (parseFloat(a.commissioni) || 0);
            const totalB = (parseFloat(b.prezzo_luce) || 0) + (parseFloat(b.prezzo_gas) || 0) + (parseFloat(b.commissioni) || 0);
            return totalA - totalB;
        });

        const topOffer = sorted[0];

        container.innerHTML = `
            <div class="top-offer-card">
                <h4>${topOffer.nome_offerta || 'Offerta ' + categoryName}</h4>
                <p><strong>${topOffer.fornitore || 'Fornitore N/D'}</strong></p>
                <div class="price-info">
                    <span>⚡ ${(parseFloat(topOffer.prezzo_luce) || 0).toFixed(4)}€/kWh</span>
                    <span>🔥 ${(parseFloat(topOffer.prezzo_gas) || 0).toFixed(4)}€/Smc</span>
                </div>
                <p class="savings">💰 Commissioni: ${(parseFloat(topOffer.commissioni) || 0).toFixed(2)}€</p>
            </div>
        `;
    });
}

function updateCharts() {
    console.log('📈 Tentativo aggiornamento grafici...');

    // Controlla se Chart.js è disponibile
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js non disponibile, salto grafici');
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">📊 Grafici non disponibili - Chart.js non caricato</p>';
        }
        return;
    }

    const ctx = document.getElementById('category-chart');
    if (!ctx) {
        console.log('📈 Canvas chart non trovato');
        return;
    }

    if (offers.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer.querySelector('canvas')) {
            chartContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af;"><i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>Nessun dato per grafici</div>';
        }
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
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Prezzo Medio per Categoria',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '€/kWh',
                            font: { weight: 'bold' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    bar: {
                        borderRadius: 4
                    }
                }
            }
        });

        console.log('✅ Grafico creato con successo');

    } catch (error) {
        console.error('❌ Errore creazione grafico:', error);
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">❌ Errore caricamento grafico</p>';
        }
    }
}

function updateOffersTable() {
    console.log('🗂️ Aggiornamento tabella con', filteredOffers.length, 'offerte...');

    const tbody = document.querySelector('#offers-table tbody');
    if (!tbody) {
        console.error('❌ Tabella offerte non trovata');
        return;
    }

    tbody.innerHTML = '';

    if (filteredOffers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: #9ca3af;">
                    <div>
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                        <strong>Nessuna offerta trovata</strong>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                            ${offers.length === 0 ? 'Carica la prima offerta usando la sezione Upload OCR' : 'Prova a modificare i filtri di ricerca'}
                        </p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filteredOffers.forEach((offer, index) => {
        const row = document.createElement('tr');
        row.style.transition = 'background-color 0.2s ease';

        row.innerHTML = `
            <td style="font-weight: 600;">${offer.fornitore || 'N/D'}</td>
            <td>${offer.nome_offerta || 'Offerta ' + (index + 1)}</td>
            <td>
                <span class="category-badge ${(offer.categoria || 'domestico').toLowerCase()}">${offer.categoria || 'Domestico'}</span>
            </td>
            <td>
                <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: ${offer.tipo_prezzo === 'Fisso' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${offer.tipo_prezzo === 'Fisso' ? '#059669' : '#d97706'};">
                    ${offer.tipo_prezzo || 'Fisso'}
                </span>
            </td>
            <td style="font-family: monospace; font-weight: 600;">${(parseFloat(offer.prezzo_luce) || 0).toFixed(4)} €/kWh</td>
            <td style="font-family: monospace; font-weight: 600;">${(parseFloat(offer.prezzo_gas) || 0).toFixed(4)} €/Smc</td>
            <td style="font-family: monospace; font-weight: 600; color: ${(parseFloat(offer.commissioni) || 0) === 0 ? '#059669' : '#d97706'};">
                ${(parseFloat(offer.commissioni) || 0).toFixed(2)} €
            </td>
            <td style="font-size: 0.9rem;">${offer.scadenza ? new Date(offer.scadenza).toLocaleDateString('it-IT') : 'N/D'}</td>
            <td style="white-space: nowrap;">
                <button class="btn-edit" onclick="editOffer(${offer.id})" title="Modifica offerta" style="padding: 0.5rem; margin: 0 0.25rem; border: none; border-radius: 6px; cursor: pointer; background: rgba(59, 130, 246, 0.1); color: #3b82f6; transition: all 0.2s;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="confirmDeleteOffer(${offer.id})" title="Elimina offerta" style="padding: 0.5rem; margin: 0 0.25rem; border: none; border-radius: 6px; cursor: pointer; background: rgba(239, 68, 68, 0.1); color: #ef4444; transition: all 0.2s;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Aggiungi hover effects
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f8fafc';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
    });

    console.log(`✅ Tabella aggiornata con ${filteredOffers.length} righe`);
}

function updateFilters() {
    // Aggiorna dropdown fornitori
    const fornitoreFilter = document.getElementById('filter-fornitore');
    if (fornitoreFilter && offers.length > 0) {
        const fornitori = [...new Set(offers.map(o => o.fornitore).filter(f => f))];

        // Mantieni il valore corrente
        const currentValue = fornitoreFilter.value;

        fornitoreFilter.innerHTML = '<option value="">Tutti i fornitori</option>';
        fornitori.forEach(fornitore => {
            const option = document.createElement('option');
            option.value = fornitore;
            option.textContent = fornitore;
            if (fornitore === currentValue) option.selected = true;
            fornitoreFilter.appendChild(option);
        });
    }
}

function applyFilters() {
    if (offers.length === 0) {
        filteredOffers = [];
        updateOffersTable();
        return;
    }

    const categoria = document.getElementById('filter-categoria')?.value || '';
    const fornitore = document.getElementById('filter-fornitore')?.value || '';
    const tipoPrezzo = document.getElementById('filter-tipo-prezzo')?.value || '';
    const searchTerm = document.getElementById('search-offers')?.value?.toLowerCase() || '';

    filteredOffers = offers.filter(offer => {
        const matchesCategoria = !categoria || offer.categoria === categoria;
        const matchesFornitore = !fornitore || offer.fornitore === fornitore;
        const matchesTipo = !tipoPrezzo || offer.tipo_prezzo === tipoPrezzo;
        const matchesSearch = !searchTerm || 
            (offer.nome_offerta || '').toLowerCase().includes(searchTerm) ||
            (offer.fornitore || '').toLowerCase().includes(searchTerm);

        return matchesCategoria && matchesFornitore && matchesTipo && matchesSearch;
    });

    console.log(`🔍 Filtrate ${filteredOffers.length} offerte su ${offers.length} totali`);
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

    const confirmed = confirm(
        `Sei sicuro di voler eliminare questa offerta?\n\n` +
        `• Fornitore: ${offer.fornitore}\n` +
        `• Nome: ${offer.nome_offerta}\n` +
        `• Categoria: ${offer.categoria}\n\n` +
        `Questa azione non può essere annullata.`
    );

    if (confirmed) {
        await deleteOfferFromDatabase(offerId);
    }
}

function updateAnalytics() {
    console.log('📈 Sezione Analytics');
    showNotification('📊 Sezione analisi avanzate in sviluppo', 'info');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    console.log('🎛️ Setup event listeners dashboard...');

    // Navigazione
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            if (section) {
                showSection(section);
            }
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

    if (fileInput && dropZone) {
        fileInput.addEventListener('change', handleFileSelect);

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#667eea';
            dropZone.style.background = '#f0f4ff';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#d1d5db';
            dropZone.style.background = '#f9fafb';
        });

        dropZone.addEventListener('drop', handleFileDrop);
        dropZone.addEventListener('click', () => fileInput.click());
    }

    // OCR Form
    const ocrForm = document.getElementById('ocr-form');
    if (ocrForm) {
        ocrForm.addEventListener('submit', handleOCRFormSubmit);
    }

    // Filtri
    ['filter-categoria', 'filter-fornitore', 'filter-tipo-prezzo', 'search-offers'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
            element.addEventListener('input', applyFilters);
        }
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

async function handleFileDrop(e) {
    e.preventDefault();
    const dropZone = e.currentTarget;
    dropZone.style.borderColor = '#d1d5db';
    dropZone.style.background = '#f9fafb';

    const file = e.dataTransfer.files[0];
    if (file) {
        await processFileWithOCR(file);
    }
}

async function processFileWithOCR(file) {
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        showNotification('❌ Formato non supportato. Usa PDF o immagini (JPG, PNG).', 'error');
        return;
    }

    console.log('🔍 Inizio OCR per:', file.name);
    showNotification(`🚀 Elaborazione OCR di "${file.name}"...`, 'info');

    // Simula elaborazione OCR
    const mockData = {
        fornitore: file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Fornitore Estratto',
        nome_offerta: 'Offerta Standard',
        categoria: 'Domestico',
        tipo_prezzo: 'Fisso',
        prezzo_luce: Math.round((Math.random() * 0.1 + 0.15) * 10000) / 10000,
        prezzo_gas: Math.round((Math.random() * 0.5 + 0.8) * 10000) / 10000,
        quota_fissa_luce: Math.round((Math.random() * 10 + 10) * 100) / 100,
        quota_fissa_gas: Math.round((Math.random() * 8 + 8) * 100) / 100,
        commissioni: 0.00,
        scadenza: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        durata_mesi: 12
    };

    // Simula tempo di elaborazione
    await new Promise(resolve => setTimeout(resolve, 2000));

    populateOCRForm(mockData);
    showSection('upload');
    showNotification('✅ OCR completato! Verifica i dati estratti prima di salvare.', 'success');
}

function populateOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;

    Object.keys(data).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && data[key] !== null && data[key] !== '') {
            input.value = data[key];

            // Evidenzia i campi pre-compilati
            input.style.backgroundColor = '#f0f9ff';
            input.style.borderColor = '#0284c7';
        }
    });

    // Scroll al form
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleOCRFormSubmit(e) {
    e.preventDefault();

    console.log('💾 Invio form OCR...');

    const formData = new FormData(e.target);
    const offerData = Object.fromEntries(formData.entries());

    // Validazione base
    if (!offerData.fornitore || !offerData.nome_offerta) {
        showNotification('❌ Fornitore e Nome offerta sono obbligatori', 'error');
        return;
    }

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
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        min-width: 300px;
        max-width: 500px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        cursor: pointer;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;

    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.9)', border: '#10b981', icon: 'check-circle' },
        error: { bg: 'rgba(239, 68, 68, 0.9)', border: '#ef4444', icon: 'times-circle' },
        info: { bg: 'rgba(59, 130, 246, 0.9)', border: '#3b82f6', icon: 'info-circle' },
        warning: { bg: 'rgba(245, 158, 11, 0.9)', border: '#f59e0b', icon: 'exclamation-triangle' }
    };

    const color = colors[type] || colors.info;
    notification.style.background = color.bg;
    notification.style.borderLeft = `4px solid ${color.border}`;
    notification.style.color = 'white';

    notification.innerHTML = `
        <i class="fas fa-${color.icon}" style="font-size: 1.25rem;"></i>
        <span>${message}</span>
        <i class="fas fa-times" style="margin-left: auto; opacity: 0.7; cursor: pointer;" onclick="this.parentElement.remove()"></i>
    `;

    document.body.appendChild(notification);

    // Auto-rimozione dopo 5 secondi
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);

    // Rimozione al click
    notification.addEventListener('click', (e) => {
        if (e.target.classList.contains('fa-times')) {
            notification.remove();
        }
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
    showNotification(`🎨 Tema cambiato: ${currentTheme}`, 'info');
}

function updateLastUpdate() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('it-IT');
    }
}

async function handleLogout() {
    if (!confirm('Sei sicuro di voler uscire?')) {
        return;
    }

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
                    setTimeout(() => loadOffersFromDatabase(), 1000);
                })
                .subscribe();

            console.log('✅ Real-time subscription attiva');
        }
    } catch (error) {
        console.warn('⚠️ Real-time non disponibile:', error.message);
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

// ===== AUTO-INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 App.js DOM loaded');
    initializeTheme();
});

// ===== DEBUG E UTILITY GLOBALI =====
if (typeof window !== 'undefined') {
    window.debugApp = {
        offers: () => offers,
        filteredOffers: () => filteredOffers,
        currentUser: () => currentUser,
        charts: () => charts,
        reloadOffers: loadOffersFromDatabase,
        showNotification: showNotification,
        showSection: showSection
    };

    console.log('🐛 Debug utilities disponibili in window.debugApp');
}

console.log('✅ App.js caricato completamente - versione pulita');
/* ===== ENTERPRISE OCR SYSTEM (Google Vision + OCR.space + Tesseract) ===== */

/* Config API: chiavi già inserite dove fornite */
const OCR_CONFIG = {
  googleVision: {
    apiKey: 'AIzaSyCtiM1gEiDUaQo-8xXYHia7oOJcx1JArI4',
    endpoint: 'https://vision.googleapis.com/v1/images:annotate'
  },
  ocrSpace: {
    apiKey: 'K85701396588957',
    endpoint: 'https://api.ocr.space/parse/image'
  };

const ENERGIA_PATTERNS = {
  fornitori: {
    enel: ['enel', 'enel energia', 'enel mercato'],
    eni: ['eni', 'eni gas', 'eni luce', 'plenitude'],
    edison: ['edison', 'edison energia', 'edison next'],
    a2a: ['a2a', 'a2a energia'],
    acea: ['acea', 'acea energia'],
    hera: ['hera', 'hera comm', 'hera energia'],
    iren: ['iren', 'iren mercato'],
    engie: ['engie', 'engie italia'],
    sorgenia: ['sorgenia'],
    green: ['green network', 'green energy'],
    wekiwi: ['wekiwi'],
    octopus: ['octopus energy'],
    pulsee: ['pulsee', 'axpo'],
    illumia: ['illumia'],
    tate: ['tate'],
    'e.on': ['e.on', 'eon energia']
  },
  prezzi: {
    luce: [
      /prezzo.*luce.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*kwh/gi,
      /energia.*elettrica.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*kwh/gi,
      /componente.*energia.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*kwh/gi,
      /pe.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*kwh/gi
    ],
    gas: [
      /prezzo.*gas.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*smc/gi,
      /gas.*naturale.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*smc/gi,
      /componente.*gas.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*smc/gi,
      /cmem.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*smc/gi
    ],
    quotaFissaLuce: [
      /quota.*fissa.*luce.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*mese/gi,
      /spesa.*fissa.*luce.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*mese/gi
    ],
    quotaFissaGas: [
      /quota.*fissa.*gas.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*mese/gi,
      /spesa.*fissa.*gas.*[€]?\s*(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*mese/gi
    ]
  },
  info: {
    categoria: [
      { pattern: /domestico|residenziale|casa|famiglia/gi, value: 'Domestico' },
      { pattern: /micro|piccol[aie].*impres[aie]/gi, value: 'Micro' },
      { pattern: /pmi|business|medi[aie].*impres[aie]/gi, value: 'PMI' }
    ],
    tipoPrezzo: [
      { pattern: /fisso|bloccato|fermo/gi, value: 'Fisso' },
      { pattern: /variabile|indicizzato|fluttuante/gi, value: 'Variabile' }
    ],
    durata: [/durata.*(\d+).*mes[ie]/gi, /validità.*(\d+).*mes[ie]/gi, /(\d+).*mes[ie]/gi]
  }
};

class EnterpriseOCR {
  constructor() {
    this.confidence = 0;
    this.rawText = '';
    this.structuredData = {};
    this.apiResults = [];
  }

  async processFile(file) {
    updateProcessingStatus?.('processing', 'Preprocessing immagine per OCR…');
    const imageBlob = await this.preprocessImage(file);
    updateProcessingStatus?.('processing', 'Esecuzione OCR con più motori…');
    const results = await this.runMultipleOCR(imageBlob);
    if (!results.length) throw new Error('Nessun risultato OCR disponibile');

    updateProcessingStatus?.('processing', 'Consolidamento AI dei risultati…');
    const consolidatedText = await this.consolidateResults(results);
    this.rawText = consolidatedText;

    updateProcessingStatus?.('processing', 'Estrazione e validazione dati…');
    const data = await this.extractStructuredData(consolidatedText, file.name);
    const validData = await this.validateAndCorrect(data);
    this.structuredData = validData;
    this.confidence = this.calculateOverallConfidence();
    updateProcessingStatus?.('success', `OCR completato (confidence ${this.confidence}%)`);
    return { success: true, data: validData, confidence: this.confidence, rawText: consolidatedText, apiResults: this.apiResults };
  }

  preprocessImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const targetW = Math.min(img.width * 2, 3000);
        const targetH = Math.round((img.height * targetW) / img.width);
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.filter = 'contrast(1.2) brightness(1.05) saturate(0)';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async runMultipleOCR(imageBlob) {
    const promises = [];
    if (OCR_CONFIG.googleVision.apiKey) promises.push(this.googleVisionOCR(imageBlob));
    if (OCR_CONFIG.ocrSpace.apiKey) promises.push(this.ocrSpaceOCR(imageBlob));
    promises.push(this.tesseractOCR(imageBlob));
    const settled = await Promise.allSettled(
      promises.map((p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout OCR')), 30000))]))
    );
    return settled.filter((r) => r.status === 'fulfilled' && r.value?.text).map((r) => r.value);
  }

  async googleVisionOCR(imageBlob) {
    try {
      const base64 = await this.blobToBase64(imageBlob);
      const res = await fetch(`${OCR_CONFIG.googleVision.endpoint}?key=${OCR_CONFIG.googleVision.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64.split(',')[1] },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
              imageContext: { languageHints: ['it', 'en'] }
            }
          ]
        })
      });
      const json = await res.json();
      const text = json?.responses?.[0]?.fullTextAnnotation?.text || '';
      const confidence = this.estimateConfidenceFromGoogle(json?.responses?.[0]) || 90;
      this.apiResults.push({ api: 'Google Vision', confidence, success: true, textLength: text.length });
      return { text, confidence, source: 'google' };
    } catch (e) {
      this.apiResults.push({ api: 'Google Vision', confidence: 0, success: false, error: String(e) });
      return { text: '', confidence: 0, source: 'google' };
    }
  }

  async ocrSpaceOCR(imageBlob) {
    try {
      const form = new FormData();
      form.append('file', imageBlob, 'doc.png');
      form.append('language', 'ita');
      form.append('isOverlayRequired', 'false');
      form.append('detectOrientation', 'true');
      form.append('scale', 'true');
      form.append('OCREngine', '2');
      const res = await fetch(OCR_CONFIG.ocrSpace.endpoint, { method: 'POST', headers: { apikey: OCR_CONFIG.ocrSpace.apiKey }, body: form });
      const json = await res.json();
      const text = json?.ParsedResults?.[0]?.ParsedText || '';
      const confidence = text ? 80 : 0;
      this.apiResults.push({ api: 'OCR.space', confidence, success: !!text, textLength: text.length });
      return { text, confidence, source: 'ocrspace' };
    } catch (e) {
      this.apiResults.push({ api: 'OCR.space', confidence: 0, success: false, error: String(e) });
      return { text: '', confidence: 0, source: 'ocrspace' };
    }
  }

  async tesseractOCR(imageBlob) {
    try {
      if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js non caricato');
      const { data } = await Tesseract.recognize(imageBlob, 'ita+eng', {
        logger: (m) => m.status === 'recognizing text' && updateProcessingStatus?.('processing', `Tesseract ${Math.round(m.progress * 100)}%`)
      });
      const text = data?.text || '';
      const confidence = Math.round(data?.confidence || 70);
      this.apiResults.push({ api: 'Tesseract', confidence, success: !!text, textLength: text.length });
      return { text, confidence, source: 'tesseract' };
    } catch (e) {
      this.apiResults.push({ api: 'Tesseract', confidence: 0, success: false, error: String(e) });
      return { text: '', confidence: 0, source: 'tesseract' };
    }
  }

  estimateConfidenceFromGoogle(resp) {
    // Stima basic se manca confidence per parole
    const txt = resp?.fullTextAnnotation?.text || '';
    if (!txt) return 0;
    const len = txt.length;
    if (len > 4000) return 94;
    if (len > 2000) return 92;
    if (len > 800) return 90;
    return 85;
  }

  async consolidateResults(results) {
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (results[0]?.confidence >= 90) return results[0].text;
    // merge semplice: preferisci google, poi ocrspace, poi tesseract
    const bySource = (s) => results.find((r) => r.source === s)?.text || '';
    const merged = [bySource('google'), bySource('ocrspace'), bySource('tesseract')].join('\n');
    return merged || results[0].text;
  }

  async extractStructuredData(text, fileName) {
    const data = {
      fornitore: this.extractFornitore(text, fileName),
      nome_offerta: this.extractNomeOfferta(text, fileName),
      categoria: this.extractCategoria(text),
      tipo_prezzo: this.extractTipoPrezzo(text),
      prezzo_luce: this.extractPrezzoLuce(text),
      prezzo_gas: this.extractPrezzoGas(text),
      quota_fissa_luce: this.extractQuotaFissaLuce(text),
      quota_fissa_gas: this.extractQuotaFissaGas(text),
      commissioni: this.extractCommissioni(text),
      scadenza: this.extractScadenza(text),
      durata_mesi: this.extractDurata(text)
    };
    return data;
  }

  extractFornitore(text, fileName) {
    const low = (text || '').toLowerCase();
    for (const [name, pats] of Object.entries(ENERGIA_PATTERNS.fornitori)) {
      if (pats.some((p) => low.includes(p))) return this.capFornitore(name);
    }
    const fileLow = (fileName || '').toLowerCase();
    for (const [name, pats] of Object.entries(ENERGIA_PATTERNS.fornitori)) {
      if (pats.some((p) => fileLow.includes(p))) return this.capFornitore(name);
    }
    return 'Fornitore da Identificare';
  }

  extractNomeOfferta(text, fileName) {
    const pats = [/offerta[:\s]+([^\n\r]{5,60})/gi, /prodotto[:\s]+([^\n\r]{5,60})/gi, /piano[:\s]+([^\n\r]{5,60})/gi];
    for (const p of pats) {
      const m = p.exec(text || '');
      if (m?.[1]) return this.cleanOfferName(m[1]);
    }
    return this.extractNomeOffertaFromFileName(fileName);
  }

  extractPrezzoLuce(text) {
    for (const p of ENERGIA_PATTERNS.prezzi.luce) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseFloat(String(m[1]).replace(',', '.'));
        if (v > 0.05 && v < 1.5) return v;
      }
    }
    return null;
  }

  extractPrezzoGas(text) {
    for (const p of ENERGIA_PATTERNS.prezzi.gas) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseFloat(String(m[1]).replace(',', '.'));
        if (v > 0.2 && v < 4) return v;
      }
    }
    return null;
  }

  extractQuotaFissaLuce(text) {
    for (const p of ENERGIA_PATTERNS.prezzi.quotaFissaLuce) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseFloat(String(m[1]).replace(',', '.'));
        if (v >= 0 && v <= 50) return v;
      }
    }
    return null;
  }

  extractQuotaFissaGas(text) {
    for (const p of ENERGIA_PATTERNS.prezzi.quotaFissaGas) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseFloat(String(m[1]).replace(',', '.'));
        if (v >= 0 && v <= 50) return v;
      }
    }
    return null;
  }

  extractCommissioni(text) {
    const pats = [/commissioni.*[€]?\s*(\d+[,.]?\d*)/gi, /attivazione.*[€]?\s*(\d+[,.]?\d*)/gi];
    for (const p of pats) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseFloat(String(m[1]).replace(',', '.'));
        if (v >= 0 && v <= 200) return v;
      }
    }
    return 0;
  }

  extractScadenza(text) {
    const pats = [/scadenza.*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi, /valida.*fino.*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi];
    for (const p of pats) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const d = this.parseItDate(m[1]);
        if (d && d > new Date()) return d.toISOString().split('T')[0];
      }
    }
    const def = new Date(); def.setFullYear(def.getFullYear() + 1);
    return def.toISOString().split('T')[0];
  }

  extractDurata(text) {
    for (const p of ENERGIA_PATTERNS.info.durata) {
      const m = p.exec(text || '');
      if (m?.[1]) {
        const v = parseInt(m[1], 10);
        if (v > 0 && v <= 60) return v;
      }
    }
    return 12;
  }

  async validateAndCorrect(data) {
    const clamp = (v, min, max) => (v == null ? null : Math.min(Math.max(v, min), max));
    data.prezzo_luce = clamp(data.prezzo_luce, 0.05, 1.5);
    data.prezzo_gas = clamp(data.prezzo_gas, 0.2, 4);
    data.quota_fissa_luce = clamp(data.quota_fissa_luce, 0, 50);
    data.quota_fissa_gas = clamp(data.quota_fissa_gas, 0, 50);
    if (data.prezzo_luce != null) data.prezzo_luce = Math.round(data.prezzo_luce * 10000) / 10000;
    if (data.prezzo_gas != null) data.prezzo_gas = Math.round(data.prezzo_gas * 10000) / 10000;
    if (data.quota_fissa_luce != null) data.quota_fissa_luce = Math.round(data.quota_fissa_luce * 100) / 100;
    if (data.quota_fissa_gas != null) data.quota_fissa_gas = Math.round(data.quota_fissa_gas * 100) / 100;
    return data;
  }

  calculateOverallConfidence() {
    const succ = this.apiResults.filter((r) => r.success);
    if (!succ.length) return 0;
    const avg = succ.reduce((s, r) => s + (r.confidence || 0), 0) / succ.length;
    const bonusAPIs = Math.min(succ.length * 5, 15);
    const bonusLen = Math.min((this.rawText?.length || 0) / 100, 10);
    return Math.round(Math.min(95, avg + bonusAPIs + bonusLen));
  }

  blobToBase64(blob) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  }

  capFornitore(name) {
    const map = { enel: 'ENEL Energia', eni: 'ENI Plenitude', edison: 'Edison Energia', a2a: 'A2A Energia', acea: 'ACEA Energia', hera: 'HERA Comm', iren: 'IREN Mercato', engie: 'ENGIE Italia' };
    return map[name] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  cleanOfferName(n) {
    return String(n).replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  extractNomeOffertaFromFileName(fn) {
    let n = String(fn || '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (n.length > 60) n = n.slice(0, 60) + '…';
    return n.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  parseItDate(s) {
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1, y = parseInt(parts[2], 10);
      if (d >= 1 && d <= 31 && m >= 0 && m <= 11 && y >= 2024) return new Date(y, m, d);
    }
    return null;
  }
}

const enterpriseOCR = new EnterpriseOCR();

async function processFileWithOCR(file) {
  try {
    showNotification?.('🚀 OCR Enterprise avviato…', 'info');
    const result = await enterpriseOCR.processFile(file);
    ocrResults = result.data;
    showOCRSummary?.(result.data);
    populateOCRForm?.(result.data);
    const okAPIs = result.apiResults.filter((r) => r.success).length;
    showNotification?.(`✅ OCR completato! API usate: ${okAPIs}, confidence ${result.confidence}%`, 'success');
  } catch (e) {
    console.error(e);
    showNotification?.('❌ Errore OCR. Uso fallback semplice.', 'error');
    await processFileWithSimpleOCR(file);
  }
}

async function processFileWithSimpleOCR(file) {
  updateProcessingStatus?.('processing', 'OCR semplice in corso…');
  await new Promise((r) => setTimeout(r, 1200));
  const name = enterpriseOCR.extractNomeOffertaFromFileName(file.name);
  const data = {
    fornitore: name.split(' ')[0] + ' Energia',
    nome_offerta: name,
    categoria: 'Domestico',
    tipo_prezzo: 'Fisso',
    prezzo_luce: 0.22,
    prezzo_gas: 0.95,
    quota_fissa_luce: 12,
    quota_fissa_gas: 10,
    commissioni: 0,
    scadenza: new Date(Date.now() + 31536e6).toISOString().split('T')[0],
    durata_mesi: 12
  };
  ocrResults = data;
  updateProcessingStatus?.('success', 'OCR semplice completato');
  showOCRSummary?.(data);
  populateOCRForm?.(data);
  showNotification?.('✅ Fallback OCR completato', 'success');
}
// ===== BRIDGE UPLOAD + ANTEPRIMA + OCR =====
function ensureOCRListeners() {
  const fileInput = document.getElementById('pdf-file');
  const dropZone = document.getElementById('upload-area');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      await showFilePreview(f);
      await processFileWithOCR(f);
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      const fileInput = document.getElementById('pdf-file');
      if (fileInput) {
        const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files;
      }
      await showFilePreview(f);
      await processFileWithOCR(f);
    });
    dropZone.addEventListener('click', () => document.getElementById('pdf-file')?.click());
  }
}

// Call after DOM ready or after login init
document.addEventListener('DOMContentLoaded', ensureOCRListeners);
/* ===== OCR MODULE: COMPLETE REWRITE (Plug & Play) =====
   Requisiti minimi nel DOM:
   - #upload-area (div area drag&drop)
   - #pdf-file (input type="file")
   - #file-preview-container (div anteprima; se assente lo crea)
   - #ocr-form (form con campi name: fornitore, nome_offerta, prezzo_luce, prezzo_gas, quota_fissa_luce, quota_fissa_gas, commissioni, scadenza, durata_mesi)
   - Funzioni opzionali UI (se non esistono, il modulo usa fallback interni):
     showNotification(type,msg), updateProcessingStatus(state,msg), showOCRSummary(data), populateOCRForm(data)
*/

(function () {
  'use strict';

  // ====== CONFIG ======
  const OCR_CONFIG = {
    googleVision: {
      apiKey: 'AIzaSyCtiM1gEiDUaQo-8xXYHia7oOJcx1JArI4',
      endpoint: 'https://vision.googleapis.com/v1/images:annotate',
      enabled: true
    },
    ocrSpace: {
      apiKey: 'K85701396588957',
      endpoint: 'https://api.ocr.space/parse/image',
      enabled: true
    },
    tesseract: { enabled: true, lang: 'ita+eng' },
    timeouts: { perEngineMs: 30000 }
  };

  // ====== UTIL UI (safe no-op se mancano implementazioni esterne) ======
  const ui = {
    notify(type, msg) {
      try { window.showNotification?.(msg, type); }
      catch (_) { console.log(`[${type}] ${msg}`); }
    },
    status(state, msg) {
      try { window.updateProcessingStatus?.(state, msg); }
      catch (_) { console.log(`[${state}] ${msg}`); }
    },
    ensurePreviewContainer() {
      let c = document.getElementById('file-preview-container');
      if (!c) {
        c = document.createElement('div');
        c.id = 'file-preview-container';
        c.className = 'file-preview-container';
        const up = document.querySelector('.upload-container') || document.getElementById('upload-area')?.parentNode || document.body;
        up.appendChild(c);
      }
      return c;
    },
    showPreview(file) {
      const cont = ui.ensurePreviewContainer();
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const isImg = (file.type || '').includes('image');
      const isPdf = (file.type || '').includes('pdf');
      let thumb = '';
      if (isImg) {
        const url = URL.createObjectURL(file);
        thumb = `<div class="file-thumbnail image-thumb"><img src="${url}" alt="preview" style="width:100%;height:100%;object-fit:cover;"></div>`;
      } else if (isPdf) {
        thumb = `<div class="file-thumbnail pdf-thumb"><i style="font-size:28px;color:#fff">PDF</i></div>`;
      } else {
        thumb = `<div class="file-thumbnail unknown-thumb"><i>FILE</i></div>`;
      }
      cont.innerHTML = `
        <div class="preview-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:linear-gradient(135deg,#3b82f6,#0ea5e9);color:#fff">
          <strong>Anteprima file</strong>
          <button id="btn-remove-file" style="background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">Rimuovi</button>
        </div>
        <div class="preview-body" style="display:grid;grid-template-columns:auto 1fr;gap:12px;padding:12px;background:#fff;border:1px solid #e2e8f0">
          ${thumb}
          <div class="file-details">
            <div style="margin-bottom:8px">
              <div style="font-weight:600">${file.name}</div>
              <div style="color:#64748b;font-size:12px">${file.type || 'n/d'} • ${sizeMB} MB • ${new Date().toLocaleString('it-IT')}</div>
            </div>
            <div class="processing-status" style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:#f8fafc;color:#1e293b">
              <span>In attesa…</span>
            </div>
          </div>
        </div>
      `;
      cont.style.display = 'block';
      cont.querySelector('#btn-remove-file')?.addEventListener('click', () => {
        cont.innerHTML = '';
        cont.style.display = 'none';
        const input = document.getElementById('pdf-file');
        if (input) input.value = '';
      });
      cont.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    showSummary(data) {
      try { window.showOCRSummary?.(data); }
      catch (_) {
        const cont = ui.ensurePreviewContainer();
        const existing = cont.querySelector('.ocr-summary');
        const html = `
          <div class="ocr-summary" style="border-top:1px solid #e2e8f0;padding:12px;background:#f8fafc;margin-top:8px">
            <strong>Riassunto OCR</strong>
            <div style="margin-top:8px;font-size:14px;color:#334155;display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div>Fornitore: <b>${data.fornitore || '—'}</b></div>
              <div>Offerta: <b>${data.nome_offerta || '—'}</b></div>
              <div>Luce €/kWh: <b>${data.prezzo_luce ?? '—'}</b></div>
              <div>Gas €/Smc: <b>${data.prezzo_gas ?? '—'}</b></div>
              <div>Quota luce: <b>${data.quota_fissa_luce ?? '—'}</b></div>
              <div>Quota gas: <b>${data.quota_fissa_gas ?? '—'}</b></div>
              <div>Commissioni: <b>${data.commissioni ?? '—'}</b></div>
              <div>Scadenza: <b>${data.scadenza || '—'}</b></div>
              <div>Durata mesi: <b>${data.durata_mesi ?? '—'}</b></div>
            </div>
          </div>
        `;
        if (existing) existing.outerHTML = html;
        else cont.insertAdjacentHTML('beforeend', html);
      }
    },
    fillForm(data) {
      try { window.populateOCRForm?.(data); }
      catch (_) {
        const form = document.getElementById('ocr-form');
        if (!form) return;
        const set = (n, v) => { const el = form.querySelector(`[name="${n}"]`); if (el) el.value = v ?? ''; };
        set('fornitore', data.fornitore);
        set('nome_offerta', data.nome_offerta);
        set('prezzo_luce', data.prezzo_luce);
        set('prezzo_gas', data.prezzo_gas);
        set('quota_fissa_luce', data.quota_fissa_luce);
        set('quota_fissa_gas', data.quota_fissa_gas);
        set('commissioni', data.commissioni);
        set('scadenza', data.scadenza);
        set('durata_mesi', data.durata_mesi);
      }
    },
    setProcessingMessage(text) {
      const box = document.querySelector('#file-preview-container .processing-status');
      if (box) box.innerHTML = `<span>${text}</span>`;
    }
  };

  // ====== PREVIEW + EVENTS ======
  function bindUploadEvents() {
    const input = document.getElementById('pdf-file');
    const zone = document.getElementById('upload-area');

    async function handle(file) {
      ui.showPreview(file);
      ui.status('processing', 'Preprocessing…');
      ui.setProcessingMessage('Preprocessing…');
      try {
        const result = await runEnterpriseOCR(file);
        ui.status('success', `OCR completato (confidence ${result.confidence}%)`);
        ui.setProcessingMessage(`OCR completato (confidence ${result.confidence}%)`);
        ui.showSummary(result.data);
        ui.fillForm(result.data);
        ui.notify('success', `OCR OK • Confidence ${result.confidence}%`);
      } catch (err) {
        console.error('OCR error:', err);
        ui.status('error', 'Errore OCR. Avvio fallback semplice…');
        ui.setProcessingMessage('Errore OCR. Fallback…');
        const fb = simpleFallbackFromFileName(file);
        ui.showSummary(fb);
        ui.fillForm(fb);
        ui.notify('error', 'Errore OCR: usato fallback semplice');
      }
    }

    input?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (f) await handle(f);
    });

    if (zone) {
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const f = e.dataTransfer.files?.[0];
        if (f) {
          const dt = new DataTransfer(); dt.items.add(f);
          if (input) input.files = dt.files;
          await handle(f);
        }
      });
      zone.addEventListener('click', () => input?.click());
    }
  }

  // ====== PREPROCESSING ======
  function preprocessToPNGBlob(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 3000;
        const ratio = Math.min(maxW / img.width, 2);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const cx = cv.getContext('2d');
        cx.filter = 'contrast(1.15) brightness(1.05) grayscale(0.8)';
        cx.drawImage(img, 0, 0, w, h);
        cv.toBlob((b) => resolve(b), 'image/png', 0.95);
      };
      // se PDF, comunque caricherà “broken”; in tal caso il preprocessing non serve
      img.src = URL.createObjectURL(file);
    });
  }

  // ====== OCR ENGINES ======
  async function ocrGoogleVision(imageOrFile) {
    if (!OCR_CONFIG.googleVision.enabled || !OCR_CONFIG.googleVision.apiKey) throw new Error('Vision disabilitato');
    const base64 = await toBase64(imageOrFile);
    const body = {
      requests: [{
        image: { content: String(base64).split(',')[1] },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        imageContext: { languageHints: ['it', 'en'] }
      }]
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OCR_CONFIG.timeouts.perEngineMs);
    const res = await fetch(`${OCR_CONFIG.googleVision.endpoint}?key=${OCR_CONFIG.googleVision.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal
    });
    clearTimeout(t);
    const json = await res.json();
    const err = json?.responses?.[0]?.error;
    if (err) throw new Error(`Vision: ${err.message || 'errore'}`);
    const text = json?.responses?.[0]?.fullTextAnnotation?.text || '';
    const conf = estimateConfidenceByLength(text);
    return { source: 'google', text, confidence: conf };
  }

  async function ocrSpace(imageOrFile) {
    if (!OCR_CONFIG.ocrSpace.enabled || !OCR_CONFIG.ocrSpace.apiKey) throw new Error('OCR.space disabilitato');
    const fd = new FormData();
    // se già blob PNG, ottimo; se è file pdf, lo manda così
    const name = (imageOrFile?.name) ? imageOrFile.name : 'doc.png';
    fd.append('file', imageOrFile, name);
    fd.append('language', 'ita');
    fd.append('isOverlayRequired', 'false');
    fd.append('detectOrientation', 'true');
    fd.append('scale', 'true');
    fd.append('OCREngine', '2');

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OCR_CONFIG.timeouts.perEngineMs);
    const res = await fetch(OCR_CONFIG.ocrSpace.endpoint, {
      method: 'POST',
      headers: { apikey: OCR_CONFIG.ocrSpace.apiKey },
      body: fd,
      signal: ctrl.signal
    });
    clearTimeout(t);
    const json = await res.json();
    const parsed = Array.isArray(json?.ParsedResults) ? json.ParsedResults[0] : null;
    const text = parsed?.ParsedText || '';
    if (!text) throw new Error(json?.ErrorMessage || 'OCR.space: nessun testo');
    const conf = 80;
    return { source: 'ocrspace', text, confidence: conf };
  }

  async function ocrTesseract(imageOrFile) {
    if (!OCR_CONFIG.tesseract.enabled) throw new Error('Tesseract disabilitato');
    if (typeof Tesseract === 'undefined') throw new Error('Tesseract non caricato');
    const { data } = await Tesseract.recognize(imageOrFile, OCR_CONFIG.tesseract.lang, {
      workerBlobURL: false,
      logger: m => (m?.status === 'recognizing text') && ui.setProcessingMessage(`Tesseract ${Math.round((m.progress || 0) * 100)}%`)
    });
    const text = data?.text || '';
    const conf = Math.round(data?.confidence || 70);
    if (!text) throw new Error('Tesseract: nessun testo');
    return { source: 'tesseract', text, confidence: conf };
  }

  // ====== PIPELINE ======
  async function runEnterpriseOCR(file) {
    ui.setProcessingMessage('Preparo immagine…');
    let preBlob = null;
    try { preBlob = await preprocessToPNGBlob(file); }
    catch { /* se fallisce preprocessing, si userà direttamente il file */ }

    const targetForImageEngines = preBlob || (file.type.includes('image') ? file : null);
    const engines = [];

    // per PDF: Vision/OCR.space lavorano anche con PDF; Tesseract meglio su immagine
    if (OCR_CONFIG.googleVision.enabled) engines.push(() => ocrGoogleVision(targetForImageEngines || file));
    if (OCR_CONFIG.ocrSpace.enabled) engines.push(() => ocrSpace(targetForImageEngines || file));
    if (OCR_CONFIG.tesseract.enabled && (targetForImageEngines)) engines.push(() => ocrTesseract(targetForImageEngines));

    ui.setProcessingMessage('Eseguo OCR (multi-engine)…');
    const settled = await Promise.allSettled(engines.map(fn => fn()));
    const ok = settled
      .filter(s => s.status === 'fulfilled' && s.value?.text)
      .map(s => s.value);

    if (!ok.length) throw new Error('Nessun engine ha prodotto testo');

    // Ordina per conf
    ok.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const best = ok[0];

    // Se conf molto alta, usa; altrimenti merge semplice
    const text = (best.confidence >= 90) ? best.text : mergeTexts(ok);
    const data = extractEnergyData(text, file.name);

    const avgConf = Math.min(95, Math.round(ok.reduce((s, r) => s + (r.confidence || 0), 0) / ok.length) + Math.min(text.length / 100, 10));
    return { data, confidence: avgConf, engines: ok.map(e => e.source) };
  }

  // ====== HELPERS ======
  function toBase64(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(fileOrBlob);
    });
  }

  function estimateConfidenceByLength(text) {
    const len = (text || '').length;
    if (len > 4000) return 94;
    if (len > 2000) return 92;
    if (len > 800) return 90;
    if (len > 300) return 88;
    return 85;
  }

  function mergeTexts(list) {
    const seen = new Set();
    const out = [];
    for (const r of list) {
      const chunks = String(r.text).split(/\n+/);
      for (const c of chunks) {
        const k = c.trim();
        if (k && !seen.has(k)) { seen.add(k); out.push(k); }
      }
    }
    return out.join('\n');
  }

  function cleanOfferName(n) {
    return String(n || '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleCase(s) {
    return String(s || '').split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ');
  }

  function parseItDate(s) {
    const m = String(s || '').match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!m) return null;
    const d = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, y = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function clamp(v, min, max) {
    if (v == null || Number.isNaN(v)) return null;
    return Math.min(Math.max(v, min), max);
  }

  function extractEnergyData(text, fileName) {
    const low = String(text || '').toLowerCase();

    // Fornitore da testo o da file name
    const providers = {
      enel: ['enel', 'enel energia'],
      eni: ['eni', 'plenitude'],
      edison: ['edison'],
      a2a: ['a2a'],
      acea: ['acea'],
      hera: ['hera'],
      iren: ['iren'],
      engie: ['engie'],
      sorgenia: ['sorgenia'],
      illumia: ['illumia'],
      pulsee: ['pulsee', 'axpo'],
      octopus: ['octopus energy'],
      wekiwi: ['wekiwi']
    };
    let fornitore = null;
    for (const [name, pats] of Object.entries(providers)) {
      if (pats.some(p => low.includes(p))) { fornitore = name; break; }
    }
    if (!fornitore) {
      const fl = String(fileName || '').toLowerCase();
      for (const [name, pats] of Object.entries(providers)) {
        if (pats.some(p => fl.includes(p))) { fornitore = name; break; }
      }
    }
    const mapCap = { enel: 'ENEL Energia', eni: 'ENI Plenitude', edison: 'Edison Energia', a2a: 'A2A Energia', acea: 'ACEA Energia', hera: 'HERA Comm', iren: 'IREN Mercato', engie: 'ENGIE Italia' };
    const fornDisplay = mapCap[fornitore] || (fornitore ? titleCase(fornitore) : 'Fornitore da Identificare');

    // Nome offerta da testo o dal file
    const offerMatch = low.match(/offerta[:\s]+([^\n\r]{5,60})/i) || low.match(/prodotto[:\s]+([^\n\r]{5,60})/i) || low.match(/piano[:\s]+([^\n\r]{5,60})/i);
    let nome_offerta = offerMatch?.[1] ? titleCase(cleanOfferName(offerMatch[1])) : titleCase(cleanOfferName(String(fileName || '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')));

    // Prezzi e quote
    const num = (rgx) => {
      const m = low.match(rgx);
      if (!m?.[1]) return null;
      const v = parseFloat(m[1].replace(',', '.'));
      return Number.isNaN(v) ? null : v;
    };
    const prezzo_luce = num(/(prezzo.*luce|energia.*elettrica|componente.*energia|pe).*?[€]?\s*(\d+[,.]?\d*)\s*[€]?[^a-z0-9]*kwh/i) ||
                         num(/(\d+[,.]?\d*)\s*[€]?[^a-z0-9]*kwh/i);
    const prezzo_gas = num(/(prezzo.*gas|gas.*naturale|componente.*gas|cmem).*?[€]?\s*(\d+[,.]?\d*)\s*[€]?[^a-z0-9]*smc/i) ||
                       num(/(\d+[,.]?\d*)\s*[€]?[^a-z0-9]*smc/i);

    const quota_fissa_luce = num(/(quota|spesa).*fissa.*luce.*?[€]?\s*(\d+[,.]?\d*)/i);
    const quota_fissa_gas  = num(/(quota|spesa).*fissa.*gas.*?[€]?\s*(\d+[,.]?\d*)/i);

    // Commissioni
    const commissioni = num(/(commissioni|attivazione|spese).*?[€]?\s*(\d+[,.]?\d*)/i) ?? 0;

    // Categoria e tipo prezzo
    const categoria = /domestico|residenziale|casa|famiglia/i.test(low) ? 'Domestico'
                    : /micro|piccol[aie].*impres[aie]/i.test(low) ? 'Micro'
                    : /pmi|business|medi[aie].*impres[aie]/i.test(low) ? 'PMI'
                    : 'Domestico';
    const tipo_prezzo = /variabile|indicizzato|fluttuante/i.test(low) ? 'Variabile' : 'Fisso';

    // Scadenza, Durata
    const d = parseItDate(low);
    const scadenza = (d && d > new Date()) ? d.toISOString().split('T')[0] : (() => { const t = new Date(); t.setFullYear(t.getFullYear() + 1); return t.toISOString().split('T')[0]; })();
    const durata_mesi = (() => {
      const m = low.match(/(durata|validit[aà]).*?(\d{1,2}).*?mes/i) || low.match(/(\d{1,2}).*?mes/i);
      const v = m?.[2] || m?.[1];
      const n = parseInt(v, 10);
      return (n && n > 0 && n <= 60) ? n : 12;
    })();

    // Clamp e arrotondamenti
    const pl = clamp(prezzo_luce, 0.05, 1.5);
    const pg = clamp(prezzo_gas, 0.2, 4);
    const ql = clamp(quota_fissa_luce, 0, 50);
    const qg = clamp(quota_fissa_gas, 0, 50);

    return {
      fornitore: fornDisplay,
      nome_offerta,
      categoria,
      tipo_prezzo,
      prezzo_luce: pl != null ? Math.round(pl * 10000) / 10000 : null,
      prezzo_gas: pg != null ? Math.round(pg * 10000) / 10000 : null,
      quota_fissa_luce: ql != null ? Math.round(ql * 100) / 100 : null,
      quota_fissa_gas: qg != null ? Math.round(qg * 100) / 100 : null,
      commissioni: Math.round((commissioni || 0) * 100) / 100,
      scadenza,
      durata_mesi
    };
  }

  function simpleFallbackFromFileName(file) {
    const base = String(file.name || '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const nome_offerta = titleCase(base || 'Offerta Energia');
    const forn = (base.split(' ')[0] || 'Fornitore') + ' Energia';
    const t = new Date(); t.setFullYear(t.getFullYear() + 1);
    return {
      fornitore: forn,
      nome_offerta,
      categoria: 'Domestico',
      tipo_prezzo: 'Fisso',
      prezzo_luce: 0.22,
      prezzo_gas: 0.95,
      quota_fissa_luce: 12,
      quota_fissa_gas: 10,
      commissioni: 0,
      scadenza: t.toISOString().split('T')[0],
      durata_mesi: 12
    };
  }

  // ====== BOOTSTRAP ======
  document.addEventListener('DOMContentLoaded', bindUploadEvents);
})();
