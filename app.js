// Global variables
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
async function initializeApp() {
    try {
        // Load initial data
        await loadInitialData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize dashboard
        initializeDashboard();
        
        // Update footer
        updateLastUpdate();
        
        // Show dashboard by default
        showSection('dashboard');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Errore nel caricamento dell\'applicazione', 'error');
    }
}

// Load initial data from the provided JSON
async function loadInitialData() {
    const initialData = [
        {
            "id": "OFF_001",
            "fornitore": "A2A Energia",
            "nome_offerta": "A2A Energia Variabile Domestico",
            "categoria": "Domestico",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1185,
            "spread_luce": 0.0084,
            "prezzo_gas": 0.3098,
            "spread_gas": 0.054,
            "quota_fissa_luce": 7.53,
            "quota_fissa_gas": 6.02,
            "commissioni": 15.13,
            "scadenza": "2027-08-21",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_002",
            "fornitore": "Wekiwi",
            "nome_offerta": "Wekiwi Variabile Domestico",
            "categoria": "Domestico",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.0879,
            "spread_luce": 0.0141,
            "prezzo_gas": 0.3152,
            "spread_gas": 0.0841,
            "quota_fissa_luce": 8.85,
            "quota_fissa_gas": 7.3,
            "commissioni": 20.8,
            "scadenza": "2028-08-15",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_003",
            "fornitore": "Plenitude",
            "nome_offerta": "Plenitude Fisso Domestico",
            "categoria": "Domestico",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.0925,
            "spread_luce": 0.0,
            "prezzo_gas": 0.3781,
            "spread_gas": 0.0,
            "quota_fissa_luce": 7.92,
            "quota_fissa_gas": 6.97,
            "commissioni": 19.56,
            "scadenza": "2028-08-15",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_004",
            "fornitore": "Tate",
            "nome_offerta": "Tate Fisso Micro",
            "categoria": "Micro",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1164,
            "spread_luce": 0.0,
            "prezzo_gas": 0.5342,
            "spread_gas": 0.0,
            "quota_fissa_luce": 11.36,
            "quota_fissa_gas": 10.33,
            "commissioni": 24.74,
            "scadenza": "2027-08-21",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_005",
            "fornitore": "Illumia",
            "nome_offerta": "Illumia Fisso Micro",
            "categoria": "Micro",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1188,
            "spread_luce": 0.0,
            "prezzo_gas": 0.4577,
            "spread_gas": 0.0,
            "quota_fissa_luce": 13.03,
            "quota_fissa_gas": 12.48,
            "commissioni": 0.94,
            "scadenza": "2028-08-15",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_006",
            "fornitore": "Iren Mercato",
            "nome_offerta": "Iren Mercato Fisso Micro",
            "categoria": "Micro",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1568,
            "spread_luce": 0.0,
            "prezzo_gas": 0.5111,
            "spread_gas": 0.0,
            "quota_fissa_luce": 14.25,
            "quota_fissa_gas": 13.37,
            "commissioni": 5.98,
            "scadenza": "2027-08-21",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_007",
            "fornitore": "Tate",
            "nome_offerta": "Tate Fisso PMI",
            "categoria": "PMI",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1531,
            "spread_luce": 0.0,
            "prezzo_gas": 0.513,
            "spread_gas": 0.0,
            "quota_fissa_luce": 25.61,
            "quota_fissa_gas": 20.41,
            "commissioni": 9.43,
            "scadenza": "2028-08-15",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_008",
            "fornitore": "Acea Energia",
            "nome_offerta": "Acea Energia Variabile PMI",
            "categoria": "PMI",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1126,
            "spread_luce": 0.0112,
            "prezzo_gas": 0.3445,
            "spread_gas": 0.1018,
            "quota_fissa_luce": 18.0,
            "quota_fissa_gas": 31.34,
            "commissioni": 3.11,
            "scadenza": "2027-08-21",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_009",
            "fornitore": "Illumia",
            "nome_offerta": "Illumia Variabile PMI",
            "categoria": "PMI",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1155,
            "spread_luce": 0.0128,
            "prezzo_gas": 0.3747,
            "spread_gas": 0.0651,
            "quota_fissa_luce": 26.64,
            "quota_fissa_gas": 32.27,
            "commissioni": 6.48,
            "scadenza": "2028-08-15",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_010",
            "fornitore": "Enel Energia",
            "nome_offerta": "Enel Energia Fisso Domestico",
            "categoria": "Domestico",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1245,
            "spread_luce": 0.0,
            "prezzo_gas": 0.4123,
            "spread_gas": 0.0,
            "quota_fissa_luce": 9.50,
            "quota_fissa_gas": 8.75,
            "commissioni": 12.50,
            "scadenza": "2026-12-31",
            "durata_mesi": 12,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_011",
            "fornitore": "Edison",
            "nome_offerta": "Edison Dynamic Luce e Gas",
            "categoria": "Domestico",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1337,
            "spread_luce": 0.0095,
            "prezzo_gas": 0.4421,
            "spread_gas": 0.075,
            "quota_fissa_luce": 8.20,
            "quota_fissa_gas": 7.85,
            "commissioni": 18.25,
            "scadenza": "2027-06-30",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        },
        {
            "id": "OFF_012",
            "fornitore": "Sorgenia",
            "nome_offerta": "Sorgenia Next Energy Sunlight",
            "categoria": "Domestico",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1208,
            "spread_luce": 0.006,
            "prezzo_gas": 0.4371,
            "spread_gas": 0.080,
            "quota_fissa_luce": 6.65,
            "quota_fissa_gas": 6.65,
            "commissioni": 0.0,
            "scadenza": "2027-12-31",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 10:38:15",
            "attivo": true
        }
    ];
    
    offers = initialData.filter(offer => offer.attivo);
    filteredOffers = [...offers];
}

// Setup event listeners
function setupEventListeners() {
    // Navigation - Fixed implementation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const section = btn.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // Category tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('data-category');
            if (category) {
                showTopOffers(category);
            }
        });
    });

    // Upload area
    setupUploadArea();

    // Form submissions
    const offerForm = document.getElementById('offer-form');
    if (offerForm) {
        offerForm.addEventListener('submit', saveNewOffer);
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-offers');
    if (searchInput) {
        searchInput.addEventListener('input', searchOffers);
    }

    // Filters
    document.getElementById('filter-categoria').addEventListener('change', applyFilters);
    document.getElementById('filter-fornitore').addEventListener('change', applyFilters);
    document.getElementById('filter-tipo').addEventListener('change', applyFilters);

    // Scenario selector
    const scenarioSelector = document.getElementById('scenario-selector');
    if (scenarioSelector) {
        scenarioSelector.addEventListener('change', updateScenarioAnalysis);
    }
}

// Navigation functions - Fixed implementation
function showSection(sectionName) {
    console.log('Navigating to section:', sectionName);
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Initialize section-specific content
    setTimeout(() => {
        switch(sectionName) {
            case 'dashboard':
                initializeDashboard();
                break;
            case 'upload':
                // Reset upload area when navigating to it
                resetUpload();
                break;
            case 'gestione':
                renderOffersTable();
                break;
            case 'analisi':
                initializeAnalysis();
                break;
        }
    }, 100);
}

// Dashboard functions
function initializeDashboard() {
    updateKPIs();
    populateSupplierFilter();
    showTopOffers('Domestico');
    
    // Delay chart creation to ensure DOM is ready
    setTimeout(() => {
        createPriceComparisonChart();
    }, 200);
}

function updateKPIs() {
    const totalOffers = offers.length;
    const avgLuce = offers.reduce((sum, offer) => sum + offer.prezzo_luce, 0) / totalOffers;
    const avgGas = offers.reduce((sum, offer) => sum + offer.prezzo_gas, 0) / totalOffers;
    const avgSpread = offers.reduce((sum, offer) => sum + offer.spread_luce + offer.spread_gas, 0) / totalOffers / 2;

    const totalOffersEl = document.getElementById('total-offers');
    const avgLuceEl = document.getElementById('avg-luce');
    const avgGasEl = document.getElementById('avg-gas');
    const avgSpreadEl = document.getElementById('avg-spread');

    if (totalOffersEl) totalOffersEl.textContent = totalOffers;
    if (avgLuceEl) avgLuceEl.textContent = `€${avgLuce.toFixed(4)}`;
    if (avgGasEl) avgGasEl.textContent = `€${avgGas.toFixed(4)}`;
    if (avgSpreadEl) avgSpreadEl.textContent = `${(avgSpread * 100).toFixed(2)}%`;
}

function populateSupplierFilter() {
    const suppliers = [...new Set(offers.map(offer => offer.fornitore))].sort();
    const supplierSelect = document.getElementById('filter-fornitore');
    
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Tutti</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            supplierSelect.appendChild(option);
        });
    }
}

function showTopOffers(category) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.querySelector(`[data-category="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Get top 3 offers for category
    const categoryOffers = offers.filter(offer => offer.categoria === category);
    const sortedOffers = categoryOffers.sort((a, b) => 
        (a.prezzo_luce + a.prezzo_gas + a.commissioni) - (b.prezzo_luce + b.prezzo_gas + b.commissioni)
    ).slice(0, 3);

    // Render offers
    const container = document.getElementById('top-offers-container');
    if (container) {
        container.innerHTML = sortedOffers.map(offer => createOfferCard(offer)).join('');
    }
}

function createOfferCard(offer) {
    const totalCost = offer.prezzo_luce + offer.prezzo_gas + offer.commissioni;
    return `
        <div class="offer-card">
            <div class="offer-card__header">
                <div>
                    <h4 class="offer-card__title">${offer.nome_offerta}</h4>
                    <p class="offer-card__supplier">${offer.fornitore}</p>
                </div>
                <span class="offer-card__badge">${offer.tipo_prezzo}</span>
            </div>
            <div class="offer-card__details">
                <div class="offer-detail">
                    <div class="offer-detail__label">Luce</div>
                    <div class="offer-detail__value">€${offer.prezzo_luce.toFixed(4)}</div>
                </div>
                <div class="offer-detail">
                    <div class="offer-detail__label">Gas</div>
                    <div class="offer-detail__value">€${offer.prezzo_gas.toFixed(4)}</div>
                </div>
                <div class="offer-detail">
                    <div class="offer-detail__label">Commissioni</div>
                    <div class="offer-detail__value">€${offer.commissioni.toFixed(2)}</div>
                </div>
                <div class="offer-detail">
                    <div class="offer-detail__label">Scadenza</div>
                    <div class="offer-detail__value">${formatDate(offer.scadenza)}</div>
                </div>
            </div>
        </div>
    `;
}

function createPriceComparisonChart() {
    const ctx = document.getElementById('price-comparison-chart');
    if (!ctx) return;

    const categories = ['Domestico', 'Micro', 'PMI'];
    const luceData = categories.map(cat => {
        const catOffers = offers.filter(o => o.categoria === cat);
        return catOffers.length > 0 ? catOffers.reduce((sum, o) => sum + o.prezzo_luce, 0) / catOffers.length : 0;
    });
    const gasData = categories.map(cat => {
        const catOffers = offers.filter(o => o.categoria === cat);
        return catOffers.length > 0 ? catOffers.reduce((sum, o) => sum + o.prezzo_gas, 0) / catOffers.length : 0;
    });

    if (charts.priceComparison) {
        charts.priceComparison.destroy();
    }

    charts.priceComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Prezzo Medio Luce (€/kWh)',
                    data: luceData,
                    backgroundColor: '#1FB8CD',
                    borderColor: '#1FB8CD',
                    borderWidth: 1
                },
                {
                    label: 'Prezzo Medio Gas (€/Smc)',
                    data: gasData,
                    backgroundColor: '#FFC185',
                    borderColor: '#FFC185',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Prezzo (€)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Upload functionality
function setupUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('pdf-file');

    if (!uploadArea || !fileInput) return;

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        showNotification('Seleziona un file PDF valido', 'error');
        return;
    }

    // Hide upload area and show processing
    const uploadArea = document.getElementById('upload-area');
    const ocrProcessing = document.getElementById('ocr-processing');
    
    if (uploadArea) uploadArea.style.display = 'none';
    if (ocrProcessing) ocrProcessing.classList.remove('hidden');

    // Simulate OCR processing
    simulateOCRProcessing();
}

function simulateOCRProcessing() {
    const progressBar = document.getElementById('ocr-progress');
    const statusText = document.getElementById('ocr-status');
    const steps = [
        'Scansione documento...',
        'Riconoscimento testo...',
        'Estrazione dati offerta...',
        'Validazione informazioni...',
        'Completamento...'
    ];

    let currentStep = 0;
    let progress = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 25;
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            setTimeout(() => {
                const ocrProcessing = document.getElementById('ocr-processing');
                const extractedForm = document.getElementById('extracted-data-form');
                
                if (ocrProcessing) ocrProcessing.classList.add('hidden');
                if (extractedForm) extractedForm.classList.remove('hidden');
                
                populateExtractedData();
            }, 500);
        }

        if (progressBar) progressBar.style.width = `${progress}%`;
        
        if (currentStep < steps.length - 1 && progress > (currentStep + 1) * 20) {
            currentStep++;
            if (statusText) statusText.textContent = steps[currentStep];
        }
    }, 200);
}

function populateExtractedData() {
    // Simulate extracted data with some randomization
    const suppliers = ['Edison', 'Enel Energia', 'Eni Plenitude', 'A2A'];
    const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    
    const mockData = {
        fornitore: randomSupplier,
        nome_offerta: `${randomSupplier} Offerta Speciale`,
        categoria: 'Domestico',
        tipo_prezzo: Math.random() > 0.5 ? 'Fisso' : 'Variabile',
        prezzo_luce: (Math.random() * 0.05 + 0.08).toFixed(4),
        spread_luce: Math.random() > 0.5 ? (Math.random() * 0.02).toFixed(4) : '0',
        prezzo_gas: (Math.random() * 0.1 + 0.3).toFixed(4),
        spread_gas: Math.random() > 0.5 ? (Math.random() * 0.1).toFixed(4) : '0',
        quota_fissa_luce: (Math.random() * 5 + 7).toFixed(2),
        quota_fissa_gas: (Math.random() * 3 + 6).toFixed(2),
        commissioni: (Math.random() * 20).toFixed(2),
        scadenza: '2028-12-31'
    };

    // Populate form fields
    Object.keys(mockData).forEach(key => {
        const field = document.getElementById(key);
        if (field) {
            field.value = mockData[key];
        }
    });

    showNotification('Dati estratti con successo! Verifica e correggi se necessario.', 'success');
}

function saveNewOffer(e) {
    e.preventDefault();
    
    const newOffer = {
        id: `OFF_${Date.now()}`,
        fornitore: document.getElementById('fornitore').value,
        nome_offerta: document.getElementById('nome_offerta').value,
        categoria: document.getElementById('categoria').value,
        tipo_prezzo: document.getElementById('tipo_prezzo').value,
        prezzo_luce: parseFloat(document.getElementById('prezzo_luce').value),
        spread_luce: parseFloat(document.getElementById('spread_luce').value) || 0,
        prezzo_gas: parseFloat(document.getElementById('prezzo_gas').value),
        spread_gas: parseFloat(document.getElementById('spread_gas').value) || 0,
        quota_fissa_luce: parseFloat(document.getElementById('quota_fissa_luce').value),
        quota_fissa_gas: parseFloat(document.getElementById('quota_fissa_gas').value),
        commissioni: parseFloat(document.getElementById('commissioni').value) || 0,
        scadenza: document.getElementById('scadenza').value,
        durata_mesi: 24, // Default
        data_inserimento: new Date().toISOString(),
        attivo: true
    };

    offers.push(newOffer);
    filteredOffers = [...offers];
    
    showNotification('Offerta salvata con successo!', 'success');
    resetUpload();
    initializeDashboard();
}

function resetUpload() {
    const uploadArea = document.getElementById('upload-area');
    const ocrProcessing = document.getElementById('ocr-processing');
    const extractedForm = document.getElementById('extracted-data-form');
    const offerForm = document.getElementById('offer-form');
    const pdfFile = document.getElementById('pdf-file');

    if (uploadArea) uploadArea.style.display = 'block';
    if (ocrProcessing) ocrProcessing.classList.add('hidden');
    if (extractedForm) extractedForm.classList.add('hidden');
    if (offerForm) offerForm.reset();
    if (pdfFile) pdfFile.value = '';
}

// Table management
function renderOffersTable() {
    const tbody = document.getElementById('offers-table-body');
    if (!tbody) return;

    tbody.innerHTML = filteredOffers.map(offer => `
        <tr>
            <td>${offer.fornitore}</td>
            <td>${offer.nome_offerta}</td>
            <td><span class="status status--info">${offer.categoria}</span></td>
            <td><span class="status ${offer.tipo_prezzo === 'Fisso' ? 'status--success' : 'status--warning'}">${offer.tipo_prezzo}</span></td>
            <td>€${offer.prezzo_luce.toFixed(4)}</td>
            <td>€${offer.prezzo_gas.toFixed(4)}</td>
            <td>${formatDate(offer.scadenza)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn--edit" onclick="editOffer('${offer.id}')" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn--delete" onclick="deleteOffer('${offer.id}')" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function searchOffers() {
    const searchInput = document.getElementById('search-offers');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase();
    filteredOffers = offers.filter(offer => 
        offer.fornitore.toLowerCase().includes(query) ||
        offer.nome_offerta.toLowerCase().includes(query) ||
        offer.categoria.toLowerCase().includes(query)
    );
    renderOffersTable();
}

function applyFilters() {
    const categoriaEl = document.getElementById('filter-categoria');
    const fornitoreEl = document.getElementById('filter-fornitore');
    const tipoEl = document.getElementById('filter-tipo');

    const categoria = categoriaEl ? categoriaEl.value : '';
    const fornitore = fornitoreEl ? fornitoreEl.value : '';
    const tipo = tipoEl ? tipoEl.value : '';

    filteredOffers = offers.filter(offer => {
        return (!categoria || offer.categoria === categoria) &&
               (!fornitore || offer.fornitore === fornitore) &&
               (!tipo || offer.tipo_prezzo === tipo);
    });

    const gestioneSection = document.getElementById('gestione-section');
    if (gestioneSection && gestioneSection.classList.contains('active')) {
        renderOffersTable();
    }
}

function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    filteredOffers.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (currentSort.direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });

    renderOffersTable();
}

function editOffer(id) {
    const offer = offers.find(o => o.id === id);
    if (!offer) return;

    // Populate edit modal
    const editId = document.getElementById('edit-id');
    const editFornitore = document.getElementById('edit-fornitore');
    const editNomeOfferta = document.getElementById('edit-nome_offerta');
    const editPrezzoLuce = document.getElementById('edit-prezzo_luce');
    const editPrezzoGas = document.getElementById('edit-prezzo_gas');
    const editCommissioni = document.getElementById('edit-commissioni');
    const editScadenza = document.getElementById('edit-scadenza');

    if (editId) editId.value = offer.id;
    if (editFornitore) editFornitore.value = offer.fornitore;
    if (editNomeOfferta) editNomeOfferta.value = offer.nome_offerta;
    if (editPrezzoLuce) editPrezzoLuce.value = offer.prezzo_luce;
    if (editPrezzoGas) editPrezzoGas.value = offer.prezzo_gas;
    if (editCommissioni) editCommissioni.value = offer.commissioni;
    if (editScadenza) editScadenza.value = offer.scadenza;

    // Show modal
    const editModal = document.getElementById('edit-modal');
    if (editModal) editModal.classList.remove('hidden');
}

function closeEditModal() {
    const editModal = document.getElementById('edit-modal');
    if (editModal) editModal.classList.add('hidden');
}

function saveEditedOffer() {
    const editId = document.getElementById('edit-id');
    if (!editId) return;
    
    const id = editId.value;
    const offerIndex = offers.findIndex(o => o.id === id);
    
    if (offerIndex === -1) return;

    // Update offer
    offers[offerIndex] = {
        ...offers[offerIndex],
        fornitore: document.getElementById('edit-fornitore').value,
        nome_offerta: document.getElementById('edit-nome_offerta').value,
        prezzo_luce: parseFloat(document.getElementById('edit-prezzo_luce').value),
        prezzo_gas: parseFloat(document.getElementById('edit-prezzo_gas').value),
        commissioni: parseFloat(document.getElementById('edit-commissioni').value),
        scadenza: document.getElementById('edit-scadenza').value
    };

    filteredOffers = [...offers];
    renderOffersTable();
    closeEditModal();
    showNotification('Offerta modificata con successo!', 'success');
}

function deleteOffer(id) {
    if (confirm('Sei sicuro di voler eliminare questa offerta?')) {
        offers = offers.filter(o => o.id !== id);
        filteredOffers = [...offers];
        renderOffersTable();
        showNotification('Offerta eliminata con successo!', 'success');
    }
}

function exportToCSV() {
    const headers = ['Fornitore', 'Offerta', 'Categoria', 'Tipo', 'Prezzo Luce', 'Prezzo Gas', 'Commissioni', 'Scadenza'];
    const csvContent = [
        headers.join(','),
        ...filteredOffers.map(offer => [
            offer.fornitore,
            offer.nome_offerta,
            offer.categoria,
            offer.tipo_prezzo,
            offer.prezzo_luce,
            offer.prezzo_gas,
            offer.commissioni,
            offer.scadenza
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offerte_energia_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Analysis functions
function initializeAnalysis() {
    setTimeout(() => {
        createSupplierComparisonChart();
        createSpreadAnalysisChart();
        updateScenarioAnalysis();
    }, 200);
}

function createSupplierComparisonChart() {
    const ctx = document.getElementById('supplier-comparison-chart');
    if (!ctx) return;

    const suppliers = [...new Set(offers.map(o => o.fornitore))];
    const supplierData = suppliers.map(supplier => {
        const supplierOffers = offers.filter(o => o.fornitore === supplier);
        const avgLuce = supplierOffers.reduce((sum, o) => sum + o.prezzo_luce, 0) / supplierOffers.length;
        const avgGas = supplierOffers.reduce((sum, o) => sum + o.prezzo_gas, 0) / supplierOffers.length;
        return { supplier, avgLuce, avgGas };
    });

    if (charts.supplierComparison) {
        charts.supplierComparison.destroy();
    }

    charts.supplierComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: supplierData.map(d => d.supplier),
            datasets: [
                {
                    label: 'Prezzo Medio Luce',
                    data: supplierData.map(d => d.avgLuce),
                    backgroundColor: '#B4413C',
                    borderColor: '#B4413C',
                    borderWidth: 1
                },
                {
                    label: 'Prezzo Medio Gas',
                    data: supplierData.map(d => d.avgGas),
                    backgroundColor: '#ECEBD5',
                    borderColor: '#ECEBD5',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Prezzo (€)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

function createSpreadAnalysisChart() {
    const ctx = document.getElementById('spread-analysis-chart');
    if (!ctx) return;

    const data = offers.map(offer => ({
        x: offer.spread_luce + offer.spread_gas,
        y: offer.commissioni,
        label: offer.fornitore
    }));

    if (charts.spreadAnalysis) {
        charts.spreadAnalysis.destroy();
    }

    charts.spreadAnalysis = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Spread vs Commissioni',
                data: data,
                backgroundColor: '#5D878F',
                borderColor: '#5D878F',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Spread Totale'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Commissioni (€)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.parsed;
                            return `${data[context.dataIndex].label}: Spread ${point.x.toFixed(4)}, Commissioni €${point.y.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function updateScenarioAnalysis() {
    const scenarioSelector = document.getElementById('scenario-selector');
    const container = document.getElementById('scenario-results');
    
    if (!scenarioSelector || !container) return;
    
    const scenario = scenarioSelector.value;
    let sortedOffers = [];
    let title = '';
    let valueFormatter = (value) => `€${value.toFixed(4)}`;

    switch(scenario) {
        case 'prezzo_totale':
            title = 'Miglior Prezzo Totale';
            sortedOffers = [...offers].sort((a, b) => 
                (a.prezzo_luce + a.prezzo_gas + a.quota_fissa_luce + a.quota_fissa_gas + a.commissioni) - 
                (b.prezzo_luce + b.prezzo_gas + b.quota_fissa_luce + b.quota_fissa_gas + b.commissioni)
            ).slice(0, 5);
            valueFormatter = (offer) => `€${(offer.prezzo_luce + offer.prezzo_gas + offer.quota_fissa_luce + offer.quota_fissa_gas + offer.commissioni).toFixed(2)}`;
            break;
        case 'prezzo_luce':
            title = 'Miglior Prezzo Luce';
            sortedOffers = [...offers].sort((a, b) => a.prezzo_luce - b.prezzo_luce).slice(0, 5);
            valueFormatter = (offer) => `€${offer.prezzo_luce.toFixed(4)}/kWh`;
            break;
        case 'prezzo_gas':
            title = 'Miglior Prezzo Gas';
            sortedOffers = [...offers].sort((a, b) => a.prezzo_gas - b.prezzo_gas).slice(0, 5);
            valueFormatter = (offer) => `€${offer.prezzo_gas.toFixed(4)}/Smc`;
            break;
        case 'commissioni':
            title = 'Minori Commissioni';
            sortedOffers = [...offers].sort((a, b) => a.commissioni - b.commissioni).slice(0, 5);
            valueFormatter = (offer) => `€${offer.commissioni.toFixed(2)}`;
            break;
    }

    container.innerHTML = sortedOffers.map((offer, index) => `
        <div class="scenario-item">
            <div class="scenario-item__header">
                <span class="scenario-item__title">${index + 1}. ${offer.nome_offerta}</span>
                <span class="scenario-item__value">${valueFormatter(offer)}</span>
            </div>
            <div class="scenario-item__details">
                ${offer.fornitore} • ${offer.categoria} • ${offer.tipo_prezzo}
            </div>
        </div>
    `).join('');
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function updateLastUpdate() {
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleString('it-IT');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Add notification styles to head if not present
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        }
        .notification--success { background: #43A047; }
        .notification--error { background: #E53935; }
        .notification--info { background: #1E88E5; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Global functions for HTML onclick handlers
window.editOffer = editOffer;
window.deleteOffer = deleteOffer;
window.closeEditModal = closeEditModal;
window.saveEditedOffer = saveEditedOffer;
window.exportToCSV = exportToCSV;
window.sortTable = sortTable;
window.applyFilters = applyFilters;
window.resetUpload = resetUpload;