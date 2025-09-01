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
/* ===== ENTERPRISE OCR ADVANCED UI ===== */

.ocr-stats-container {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    border-radius: 16px;
    padding: var(--space-xl);
    margin: var(--space-lg) 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.ocr-stats-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
}

.ocr-stats-header h4 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 700;
}

.api-badge {
    background: rgba(255, 255, 255, 0.1);
    padding: var(--space-xs) var(--space-sm);
    border-radius: 20px;
    font-size: var(--text-xs);
    font-weight: 600;
}

.ocr-apis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    margin: var(--space-lg) 0;
}

.api-result-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: var(--space-md);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
}

.api-result-card:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
}

.api-result-card.success {
    border-left: 4px solid #10b981;
}

.api-result-card.failed {
    border-left: 4px solid #ef4444;
}

.api-name {
    font-weight: 600;
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.api-confidence {
    font-size: var(--text-2xl);
    font-weight: 800;
    color: #10b981;
    margin-bottom: var(--space-xs);
}

.api-confidence.low { color: #ef4444; }
.api-confidence.medium { color: #f59e0b; }
.api-confidence.high { color: #10b981; }

.api-meta {
    font-size: var(--text-xs);
    opacity: 0.8;
    display: flex;
    justify-content: space-between;
}

.confidence-visualization {
    margin: var(--space-lg) 0;
}

.confidence-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin: var(--space-sm) 0;
}

.confidence-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.8s ease;
    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
}

.processing-advanced {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: var(--space-lg);
    border-radius: 12px;
    margin: var(--space-lg) 0;
}

.processing-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-md);
    margin-top: var(--space-md);
}

.processing-step {
    text-align: center;
    padding: var(--space-md);
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.3s ease;
}

.processing-step.active {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
}

.processing-step.completed {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid #10b981;
}

.step-icon {
    font-size: var(--text-2xl);
    margin-bottom: var(--space-sm);
}

.step-label {
    font-size: var(--text-xs);
    font-weight: 600;
}

.raw-text-preview {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: var(--space-md);
    margin: var(--space-lg) 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.raw-text-preview h5 {
    margin: 0 0 var(--space-sm) 0;
    color: #cbd5e1;
    font-size: var(--text-sm);
}

.raw-text-content {
    font-family: 'Courier New', monospace;
    font-size: var(--text-xs);
    line-height: 1.4;
    max-height: 150px;
    overflow-y: auto;
    opacity: 0.8;
}

.enterprise-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    padding: var(--space-xs) var(--space-sm);
    border-radius: 20px;
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.quality-indicators {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-md);
    margin: var(--space-lg) 0;
}

.quality-indicator {
    text-align: center;
    padding: var(--space-md);
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.quality-value {
    font-size: var(--text-xl);
    font-weight: 800;
    margin-bottom: var(--space-xs);
}

.quality-label {
    font-size: var(--text-xs);
    opacity: 0.8;
}

/* Animazioni avanzate */
@keyframes ocrProcessing {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes dataExtraction {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

.ocr-processing-icon {
    animation: ocrProcessing 2s linear infinite;
}

.data-extraction-icon {
    animation: dataExtraction 1.5s ease-in-out infinite;
}

/* Mobile responsive per OCR avanzato */
@media (max-width: 768px) {
    .ocr-apis-grid {
        grid-template-columns: 1fr;
    }

    .processing-steps {
        grid-template-columns: repeat(2, 1fr);
    }

    .quality-indicators {
        grid-template-columns: 1fr;
    }

    .ocr-stats-container {
        padding: var(--space-lg);
    }
}

