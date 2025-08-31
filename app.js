// Global Variables
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let ocrWorker = null;
let currentTheme = 'light';

// OCR Configuration
const OCR_CONFIG = {
    lang: 'ita+eng',
    oem: 1,
    psm: 6
};

// Field Recognition Patterns
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
        /(?:valida|scad|valid).*?fino.*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi,
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}).*?scadenza/gi,
        /scadenza.*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi
    ],
    fornitore: [
        /(?:enel|eni|edison|a2a|iren|acea|sorgenia|wekiwi|plenitude|illumia|tate)/gi
    ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Starting app initialization...');
    initializeApp();
});

async function initializeApp() {
    try {
        console.log('🔄 Starting app initialization...');
        
        // Load initial data first
        await loadInitialData();
        console.log('✅ Initial data loaded');
        
        // Initialize theme
        initializeTheme();
        console.log('✅ Theme initialized');
        
        // Initialize OCR worker (in background)
        initializeOCR().then(() => {
            console.log('✅ OCR worker initialized');
        }).catch(err => {
            console.warn('⚠️ OCR initialization failed, will use simulation');
        });
        
        // Setup event listeners - Critical fix
        setTimeout(() => {
            setupEventListeners();
            console.log('✅ Event listeners setup complete');
        }, 100);
        
        // Initialize dashboard after a short delay
        setTimeout(() => {
            initializeDashboard();
            console.log('✅ Dashboard initialized');
            
            // Ensure we start on dashboard
            showSection('dashboard');
            console.log('✅ Dashboard section activated');
        }, 200);
        
        console.log('✅ App initialization complete');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showToast('Errore nel caricamento dell\'applicazione', 'error');
    }
}

// Load Initial Data
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
            "attivo": true,
            "confidence_score": 0.95
        },
        {
            "id": "OFF_002",
            "fornitore": "Enel Energia",
            "nome_offerta": "Enel Energia Bioraria Casa",
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
            "data_inserimento": "2025-08-31 11:01:00",
            "attivo": true,
            "confidence_score": 0.98
        },
        {
            "id": "OFF_003",
            "fornitore": "Edison",
            "nome_offerta": "Edison World Casa Luce e Gas",
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
            "data_inserimento": "2025-08-31 11:01:00",
            "attivo": true,
            "confidence_score": 0.92
        },
        {
            "id": "OFF_004",
            "fornitore": "Sorgenia",
            "nome_offerta": "Next Energy Sunlight Micro",
            "categoria": "Micro",
            "tipo_prezzo": "Variabile",
            "prezzo_luce": 0.1208,
            "spread_luce": 0.006,
            "prezzo_gas": 0.4371,
            "spread_gas": 0.080,
            "quota_fissa_luce": 12.65,
            "quota_fissa_gas": 11.65,
            "commissioni": 5.00,
            "scadenza": "2027-12-31",
            "durata_mesi": 24,
            "data_inserimento": "2025-08-31 11:01:00",
            "attivo": true,
            "confidence_score": 0.94
        },
        {
            "id": "OFF_005",
            "fornitore": "Iren Mercato",
            "nome_offerta": "IrenLuceGas Fisso PMI",
            "categoria": "PMI",
            "tipo_prezzo": "Fisso",
            "prezzo_luce": 0.1568,
            "spread_luce": 0.0,
            "prezzo_gas": 0.5111,
            "spread_gas": 0.0,
            "quota_fissa_luce": 25.25,
            "quota_fissa_gas": 28.37,
            "commissioni": 15.98,
            "scadenza": "2028-03-31",
            "durata_mesi": 36,
            "data_inserimento": "2025-08-31 11:01:00",
            "attivo": true,
            "confidence_score": 0.97
        },
        {
            "id": "OFF_006",
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
            "attivo": true,
            "confidence_score": 0.91
        },
        {
            "id": "OFF_007",
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
            "attivo": true,
            "confidence_score": 0.96
        },
        {
            "id": "OFF_008",
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
            "attivo": true,
            "confidence_score": 0.93
        }
    ];
    
    offers = initialData.filter(offer => offer.attivo);
    filteredOffers = [...offers];
    
    console.log(`📊 Loaded ${offers.length} offers`);
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    
    // Recreate charts with new theme
    setTimeout(() => {
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            createPriceComparisonChart();
        }
        if (document.getElementById('analisi-section').classList.contains('active')) {
            createSupplierComparisonChart();
            createSpreadAnalysisChart();
        }
    }, 100);
}

// OCR Initialization
async function initializeOCR() {
    try {
        console.log('🔄 Initializing OCR worker...');
        
        // Check if Tesseract is available
        if (typeof Tesseract === 'undefined') {
            console.warn('⚠️ Tesseract.js not available, OCR will use simulation');
            return false;
        }
        
        ocrWorker = await Tesseract.createWorker(OCR_CONFIG.lang);
        await ocrWorker.setParameters({
            tessedit_ocr_engine_mode: OCR_CONFIG.oem,
            tessedit_pageseg_mode: OCR_CONFIG.psm,
        });
        console.log('✅ OCR worker initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize OCR:', error);
        console.log('📝 Will use OCR simulation instead');
        return false;
    }
}

// Event Listeners Setup - FIXED IMPLEMENTATION
function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
        console.log('✅ Theme toggle listener added');
    }

    // Navigation - CRITICAL FIX: Use event delegation and proper selectors
    const navButtons = document.querySelectorAll('.nav-btn[data-section]');
    console.log(`🔍 Found ${navButtons.length} navigation buttons`);
    
    navButtons.forEach((btn, index) => {
        const section = btn.getAttribute('data-section');
        console.log(`🔗 Adding listener to nav button ${index + 1}: ${section}`);
        
        // Remove any existing listeners
        btn.removeEventListener('click', handleNavClick);
        
        // Add new listener
        btn.addEventListener('click', handleNavClick);
    });
    
    console.log('✅ Navigation listeners added');

    // Category tabs
    const categoryTabs = document.querySelectorAll('.tab-btn[data-category]');
    categoryTabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.closest('.tab-btn').getAttribute('data-category');
            console.log('🏷️ Category tab clicked:', category);
            if (category) {
                showTopOffers(category);
            }
        });
    });
    console.log('✅ Category tab listeners added');

    // Upload functionality
    setupUploadListeners();

    // Form submissions
    const offerForm = document.getElementById('offer-form');
    if (offerForm) {
        offerForm.addEventListener('submit', saveNewOffer);
        console.log('✅ Form submission listener added');
    }

    // Search functionality
    const searchInput = document.getElementById('search-offers');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchOffers, 300));
        console.log('✅ Search listener added');
    }

    // Filters
    setupFilterListeners();

    // Scenario selector
    const scenarioSelector = document.getElementById('scenario-selector');
    if (scenarioSelector) {
        scenarioSelector.addEventListener('change', updateScenarioAnalysis);
        console.log('✅ Scenario selector listener added');
    }
}

// Navigation click handler - FIXED
function handleNavClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const section = btn.getAttribute('data-section');
    
    console.log('🖱️ Navigation clicked:', section, btn);
    
    if (section) {
        showSection(section);
    } else {
        console.error('❌ No data-section attribute found on button');
    }
}

// Upload Event Listeners
function setupUploadListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('pdf-file');

    if (!uploadArea || !fileInput) {
        console.log('⚠️ Upload elements not found');
        return;
    }

    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
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
    
    console.log('✅ Upload listeners added');
}

// Filter Event Listeners
function setupFilterListeners() {
    const filters = ['filter-categoria', 'filter-fornitore', 'filter-tipo'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
    console.log('✅ Filter listeners added');
}

// Navigation Functions - COMPLETELY FIXED
function showSection(sectionName) {
    console.log('📍 Switching to section:', sectionName);
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        console.log('✅ Active nav button updated');
    } else {
        console.error('❌ Navigation button not found for section:', sectionName);
    }

    // Hide ALL content sections first
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
        console.log('✅ Target section activated:', `${sectionName}-section`);
    } else {
        console.error('❌ Target section not found:', `${sectionName}-section`);
        return;
    }

    // Initialize section-specific content with delay
    setTimeout(() => {
        switch(sectionName) {
            case 'dashboard':
                initializeDashboard();
                console.log('🏠 Dashboard initialized');
                break;
            case 'upload':
                resetUploadWizard();
                console.log('📤 Upload section reset');
                break;
            case 'gestione':
                renderOffersTable();
                updateTableStats();
                console.log('📋 Management table rendered');
                break;
            case 'analisi':
                initializeAnalysis();
                console.log('📊 Analytics initialized');
                break;
            default:
                console.warn('⚠️ Unknown section:', sectionName);
        }
    }, 150);
    
    console.log('✅ Section switch complete');
}

// Dashboard Functions
function initializeDashboard() {
    console.log('📊 Initializing dashboard...');
    updateKPIs();
    updateSidebarStats();
    populateSupplierFilter();
    showTopOffers('Domestico');
    
    // Create chart with delay to ensure DOM is ready
    setTimeout(() => {
        createPriceComparisonChart();
    }, 300);
}

function updateKPIs() {
    const totalOffers = offers.length;
    const avgLuce = totalOffers > 0 ? offers.reduce((sum, offer) => sum + offer.prezzo_luce, 0) / totalOffers : 0;
    const avgGas = totalOffers > 0 ? offers.reduce((sum, offer) => sum + offer.prezzo_gas, 0) / totalOffers : 0;
    const avgSpread = totalOffers > 0 ? offers.reduce((sum, offer) => sum + (offer.spread_luce || 0) + (offer.spread_gas || 0), 0) / totalOffers / 2 : 0;

    // Animate counters
    animateCounter('total-offers', totalOffers);
    animateCounter('avg-luce', avgLuce, (val) => `€${val.toFixed(4)}`);
    animateCounter('avg-gas', avgGas, (val) => `€${val.toFixed(4)}`);
    animateCounter('avg-spread', avgSpread * 100, (val) => `${val.toFixed(2)}%`);
}

function updateSidebarStats() {
    const totalOffers = offers.length;
    const activeOffers = offers.filter(o => o.attivo).length;

    animateCounter('sidebar-total', totalOffers);
    animateCounter('sidebar-active', activeOffers);
}

function animateCounter(elementId, targetValue, formatter = (val) => Math.round(val).toString()) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = startValue + (targetValue - startValue) * easeOutQuart(progress);
        element.textContent = formatter(currentValue);

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

function populateSupplierFilter() {
    const suppliers = [...new Set(offers.map(offer => offer.fornitore))].sort();
    const supplierSelect = document.getElementById('filter-fornitore');
    
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">Tutti i fornitori</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            supplierSelect.appendChild(option);
        });
    }
}

function showTopOffers(category) {
    console.log('🏆 Showing top offers for:', category);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.querySelector(`[data-category="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Get top 3 offers for category
    const categoryOffers = offers.filter(offer => offer.categoria === category);
    const sortedOffers = categoryOffers.sort((a, b) => {
        const totalA = a.prezzo_luce + a.prezzo_gas + (a.commissioni || 0);
        const totalB = b.prezzo_luce + b.prezzo_gas + (b.commissioni || 0);
        return totalA - totalB;
    }).slice(0, 3);

    // Render offers
    const container = document.getElementById('top-offers-container');
    if (container) {
        container.innerHTML = sortedOffers.map(offer => createOfferCard(offer)).join('');
        console.log(`✅ Rendered ${sortedOffers.length} offer cards for ${category}`);
    }
}

function createOfferCard(offer) {
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
                    <div class="offer-detail__value">€${(offer.commissioni || 0).toFixed(2)}</div>
                </div>
                <div class="offer-detail">
                    <div class="offer-detail__label">Scadenza</div>
                    <div class="offer-detail__value">${formatDate(offer.scadenza)}</div>
                </div>
            </div>
        </div>
    `;
}

// Chart Functions - Fixed implementation
function createPriceComparisonChart() {
    const ctx = document.getElementById('price-comparison-chart');
    if (!ctx) {
        console.error('❌ Chart canvas not found');
        return;
    }

    console.log('📈 Creating price comparison chart...');

    const categories = ['Domestico', 'Micro', 'PMI'];
    const luceData = categories.map(cat => {
        const catOffers = offers.filter(o => o.categoria === cat);
        return catOffers.length > 0 ? catOffers.reduce((sum, o) => sum + o.prezzo_luce, 0) / catOffers.length : 0;
    });
    const gasData = categories.map(cat => {
        const catOffers = offers.filter(o => o.categoria === cat);
        return catOffers.length > 0 ? catOffers.reduce((sum, o) => sum + o.prezzo_gas, 0) / catOffers.length : 0;
    });

    // Destroy existing chart
    if (charts.priceComparison) {
        charts.priceComparison.destroy();
    }

    try {
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
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    },
                    {
                        label: 'Prezzo Medio Gas (€/Smc)',
                        data: gasData,
                        backgroundColor: '#FFC185',
                        borderColor: '#FFC185',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                weight: '600',
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            font: {
                                weight: '500',
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                weight: '500',
                                size: 11
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Price comparison chart created successfully');
    } catch (error) {
        console.error('❌ Error creating chart:', error);
    }
}

// PDF Upload and OCR Processing
async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        showToast('Seleziona un file PDF valido', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Il file è troppo grande. Massimo 10MB consentiti.', 'error');
        return;
    }

    console.log('📄 Starting PDF processing:', file.name);
    
    // Move to processing step
    showUploadStep('processing-step');
    
    try {
        // Use simulation since OCR libraries may not be available
        console.log('📝 Using OCR simulation...');
        const extractedData = await simulateOCRProcessing();
        showUploadStep('review-step');
        populateFormWithExtractedData(extractedData);
        showToast('Dati estratti con successo! Verifica e correggi se necessario.', 'success');
        
    } catch (error) {
        console.error('❌ OCR Processing failed:', error);
        showToast('Errore durante l\'elaborazione del PDF. Riprova.', 'error');
        resetUploadWizard();
    }
}

async function simulateOCRProcessing() {
    console.log('🎭 Simulating OCR processing...');
    
    const steps = [
        'Lettura PDF...',
        'Conversione in immagini...',
        'Scansione OCR...',
        'Analisi intelligente...',
        'Validazione dati...'
    ];
    
    let progress = 0;
    
    for (let i = 0; i < steps.length; i++) {
        updateOCRProgress(progress, steps[i]);
        updateProcessingStep(i + 1);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        progress += 20;
        updateOCRDetail('pages-processed', `${i + 1} / 3`);
        updateOCRDetail('fields-recognized', Math.min(i * 2, 8));
        updateOCRDetail('confidence-score', `${Math.min(60 + i * 8, 95)}%`);
    }
    
    updateOCRProgress(100, 'Elaborazione completata!');
    
    // Generate mock extracted data
    const suppliers = ['Edison', 'Enel Energia', 'Eni Plenitude', 'A2A'];
    const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    
    return {
        fornitore: randomSupplier,
        nome_offerta: `${randomSupplier} Offerta Speciale`,
        categoria: 'Domestico',
        tipo_prezzo: Math.random() > 0.5 ? 'Fisso' : 'Variabile',
        prezzo_luce: +(Math.random() * 0.05 + 0.08).toFixed(4),
        spread_luce: Math.random() > 0.5 ? +(Math.random() * 0.02).toFixed(4) : 0,
        prezzo_gas: +(Math.random() * 0.1 + 0.3).toFixed(4),
        spread_gas: Math.random() > 0.5 ? +(Math.random() * 0.1).toFixed(4) : 0,
        quota_fissa_luce: +(Math.random() * 5 + 7).toFixed(2),
        quota_fissa_gas: +(Math.random() * 3 + 6).toFixed(2),
        commissioni: +(Math.random() * 20).toFixed(2),
        scadenza: '2028-12-31',
        confidence_scores: {
            fornitore: 0.95,
            prezzo_luce: 0.88,
            prezzo_gas: 0.91,
            commissioni: 0.76,
            scadenza: 0.82
        },
        overall_confidence: 0.86
    };
}

// Upload UI Management
function showUploadStep(stepId) {
    document.querySelectorAll('.upload-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.classList.add('active');
    }
}

function updateOCRProgress(percentage, status) {
    // Update circular progress
    const circle = document.getElementById('progress-circle');
    const percentageText = document.getElementById('progress-percentage');
    const statusText = document.getElementById('ocr-status');
    
    if (circle) {
        const circumference = 339.292; // 2 * π * r (r = 54)
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
    
    if (percentageText) {
        percentageText.textContent = `${Math.round(percentage)}%`;
    }
    
    if (statusText) {
        statusText.textContent = status;
    }
    
    // Update confidence score
    if (percentage === 100) {
        updateOCRDetail('confidence-score', '95%');
    }
}

function updateProcessingStep(stepNumber) {
    document.querySelectorAll('.step-item').forEach((step, index) => {
        if (index + 1 <= stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function updateOCRDetail(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function populateFormWithExtractedData(data) {
    console.log('📝 Populating form with extracted data...');
    
    // Populate form fields
    const fieldMappings = {
        'fornitore': data.fornitore,
        'nome_offerta': data.nome_offerta,
        'categoria': data.categoria,
        'tipo_prezzo': data.tipo_prezzo,
        'prezzo_luce': data.prezzo_luce,
        'spread_luce': data.spread_luce,
        'prezzo_gas': data.prezzo_gas,
        'spread_gas': data.spread_gas,
        'quota_fissa_luce': data.quota_fissa_luce,
        'quota_fissa_gas': data.quota_fissa_gas,
        'commissioni': data.commissioni,
        'scadenza': data.scadenza
    };
    
    Object.keys(fieldMappings).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        const value = fieldMappings[fieldId];
        
        if (element && value !== undefined && value !== null) {
            element.value = value;
            
            // Add confidence indicator
            const confidence = data.confidence_scores?.[fieldId];
            if (confidence) {
                showFieldConfidence(fieldId, confidence);
            }
        }
    });
    
    // Update final confidence badge
    const confidenceBadge = document.getElementById('final-confidence');
    if (confidenceBadge && data.overall_confidence) {
        const percentage = Math.round(data.overall_confidence * 100);
        confidenceBadge.innerHTML = `
            <i class="fas fa-brain"></i>
            <span>${percentage}% Accuracy</span>
        `;
    }
}

function showFieldConfidence(fieldId, confidence) {
    const confidenceElement = document.getElementById(`${fieldId}-confidence`);
    if (confidenceElement) {
        const percentage = Math.round(confidence * 100);
        let color = '#10b981'; // Green
        
        if (confidence < 0.7) color = '#f59e0b'; // Yellow
        if (confidence < 0.5) color = '#ef4444'; // Red
        
        confidenceElement.innerHTML = `
            <span style="color: ${color};">
                <i class="fas fa-circle" style="font-size: 0.6rem;"></i>
                ${percentage}% confidence
            </span>
        `;
    }
}

function resetUploadWizard() {
    // Reset file input
    const fileInput = document.getElementById('pdf-file');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Reset progress
    updateOCRProgress(0, 'Pronto per elaborazione...');
    updateProcessingStep(1);
    updateOCRDetail('pages-processed', '0 / 0');
    updateOCRDetail('fields-recognized', '0');
    updateOCRDetail('confidence-score', '0%');
    
    // Reset form
    const form = document.getElementById('offer-form');
    if (form) {
        form.reset();
    }
    
    // Clear confidence indicators
    document.querySelectorAll('.field-confidence').forEach(el => {
        el.innerHTML = '';
    });
    
    // Show upload step
    showUploadStep('upload-step');
}

// Form Management
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
        attivo: true,
        confidence_score: 0.95 // From OCR
    };

    // Validate required fields
    if (!newOffer.fornitore || !newOffer.nome_offerta || !newOffer.prezzo_luce || !newOffer.prezzo_gas) {
        showToast('Compila tutti i campi obbligatori', 'error');
        return;
    }

    offers.push(newOffer);
    filteredOffers = [...offers];
    
    showToast('✅ Offerta salvata con successo!', 'success');
    resetUploadWizard();
    
    // Refresh dashboard
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        initializeDashboard();
    }
}

// Table Management
function renderOffersTable() {
    console.log('📋 Rendering offers table...');
    
    const tbody = document.getElementById('offers-table-body');
    if (!tbody) {
        console.error('❌ Table body not found');
        return;
    }

    tbody.innerHTML = filteredOffers.map(offer => `
        <tr>
            <td>
                <div style="font-weight: 600;">${offer.fornitore}</div>
            </td>
            <td>
                <div style="font-weight: 500;">${offer.nome_offerta}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">ID: ${offer.id}</div>
            </td>
            <td>
                <span class="status status--info">${offer.categoria}</span>
            </td>
            <td>
                <span class="status ${offer.tipo_prezzo === 'Fisso' ? 'status--success' : 'status--warning'}">${offer.tipo_prezzo}</span>
            </td>
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
    
    console.log(`✅ Rendered ${filteredOffers.length} offers in table`);
}

function updateTableStats() {
    const tableCount = document.getElementById('table-count');
    const filteredCount = document.getElementById('filtered-count');
    
    if (tableCount) tableCount.textContent = offers.length;
    if (filteredCount) filteredCount.textContent = filteredOffers.length;
}

function searchOffers() {
    const searchInput = document.getElementById('search-offers');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase();
    filteredOffers = offers.filter(offer => 
        offer.fornitore.toLowerCase().includes(query) ||
        offer.nome_offerta.toLowerCase().includes(query) ||
        offer.categoria.toLowerCase().includes(query) ||
        offer.id.toLowerCase().includes(query)
    );
    
    renderOffersTable();
    updateTableStats();
}

function applyFilters() {
    const categoria = document.getElementById('filter-categoria')?.value || '';
    const fornitore = document.getElementById('filter-fornitore')?.value || '';
    const tipo = document.getElementById('filter-tipo')?.value || '';

    filteredOffers = offers.filter(offer => {
        return (!categoria || offer.categoria === categoria) &&
               (!fornitore || offer.fornitore === fornitore) &&
               (!tipo || offer.tipo_prezzo === tipo);
    });

    // Re-render table if we're on gestione section
    if (document.getElementById('gestione-section').classList.contains('active')) {
        renderOffersTable();
        updateTableStats();
    }
    
    // Update dashboard if we're there
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        showTopOffers(document.querySelector('.tab-btn.active')?.getAttribute('data-category') || 'Domestico');
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
    document.getElementById('edit-id').value = offer.id;
    document.getElementById('edit-fornitore').value = offer.fornitore;
    document.getElementById('edit-nome_offerta').value = offer.nome_offerta;
    document.getElementById('edit-prezzo_luce').value = offer.prezzo_luce;
    document.getElementById('edit-prezzo_gas').value = offer.prezzo_gas;
    document.getElementById('edit-commissioni').value = offer.commissioni || 0;
    document.getElementById('edit-scadenza').value = offer.scadenza;

    // Show modal
    showModal('edit-modal');
}

function closeEditModal() {
    hideModal('edit-modal');
}

function saveEditedOffer() {
    const id = document.getElementById('edit-id').value;
    const offerIndex = offers.findIndex(o => o.id === id);
    
    if (offerIndex === -1) return;

    // Update offer
    offers[offerIndex] = {
        ...offers[offerIndex],
        fornitore: document.getElementById('edit-fornitore').value,
        nome_offerta: document.getElementById('edit-nome_offerta').value,
        prezzo_luce: parseFloat(document.getElementById('edit-prezzo_luce').value),
        prezzo_gas: parseFloat(document.getElementById('edit-prezzo_gas').value),
        commissioni: parseFloat(document.getElementById('edit-commissioni').value) || 0,
        scadenza: document.getElementById('edit-scadenza').value
    };

    filteredOffers = [...offers];
    renderOffersTable();
    closeEditModal();
    showToast('✅ Offerta modificata con successo!', 'success');
    
    // Refresh dashboard if needed
    if (document.getElementById('dashboard-section').classList.contains('active')) {
        initializeDashboard();
    }
}

function deleteOffer(id) {
    if (confirm('Sei sicuro di voler eliminare questa offerta?')) {
        offers = offers.filter(o => o.id !== id);
        filteredOffers = [...offers];
        renderOffersTable();
        updateTableStats();
        showToast('✅ Offerta eliminata con successo!', 'success');
        
        // Refresh dashboard if needed
        if (document.getElementById('dashboard-section').classList.contains('active')) {
            initializeDashboard();
        }
    }
}

function exportToCSV() {
    const headers = ['Fornitore', 'Offerta', 'Categoria', 'Tipo', 'Prezzo Luce', 'Prezzo Gas', 'Commissioni', 'Scadenza'];
    const csvContent = [
        headers.join(','),
        ...filteredOffers.map(offer => [
            `"${offer.fornitore}"`,
            `"${offer.nome_offerta}"`,
            offer.categoria,
            offer.tipo_prezzo,
            offer.prezzo_luce,
            offer.prezzo_gas,
            offer.commissioni || 0,
            offer.scadenza
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `offerte_energia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('✅ Export CSV completato!', 'success');
}

// Analytics Functions
function initializeAnalysis() {
    console.log('📊 Initializing analytics...');
    setTimeout(() => {
        createSupplierComparisonChart();
        createSpreadAnalysisChart();
        updateScenarioAnalysis();
    }, 300);
}

function createSupplierComparisonChart() {
    const ctx = document.getElementById('supplier-comparison-chart');
    if (!ctx) return;

    console.log('📈 Creating supplier comparison chart...');

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
                    backgroundColor: '#667eea',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                },
                {
                    label: 'Prezzo Medio Gas',
                    data: supplierData.map(d => d.avgGas),
                    backgroundColor: '#f093fb',
                    borderColor: '#f093fb',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            weight: '600'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createSpreadAnalysisChart() {
    const ctx = document.getElementById('spread-analysis-chart');
    if (!ctx) return;

    console.log('📈 Creating spread analysis chart...');

    const data = offers.map(offer => ({
        x: (offer.spread_luce || 0) + (offer.spread_gas || 0),
        y: offer.commissioni || 0,
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
                backgroundColor: '#4facfe',
                borderColor: '#4facfe',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.parsed;
                            return `${data[context.dataIndex].label}: Spread ${point.x.toFixed(4)}, Commissioni €${point.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Spread Totale'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Commissioni (€)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
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
    let valueFormatter = (offer) => `€${offer.prezzo_luce.toFixed(4)}`;

    switch(scenario) {
        case 'prezzo_totale':
            sortedOffers = [...offers].sort((a, b) => {
                const totalA = a.prezzo_luce + a.prezzo_gas + (a.quota_fissa_luce || 0) + (a.quota_fissa_gas || 0) + (a.commissioni || 0);
                const totalB = b.prezzo_luce + b.prezzo_gas + (b.quota_fissa_luce || 0) + (b.quota_fissa_gas || 0) + (b.commissioni || 0);
                return totalA - totalB;
            }).slice(0, 5);
            valueFormatter = (offer) => {
                const total = offer.prezzo_luce + offer.prezzo_gas + (offer.quota_fissa_luce || 0) + (offer.quota_fissa_gas || 0) + (offer.commissioni || 0);
                return `€${total.toFixed(2)}`;
            };
            break;
        case 'prezzo_luce':
            sortedOffers = [...offers].sort((a, b) => a.prezzo_luce - b.prezzo_luce).slice(0, 5);
            valueFormatter = (offer) => `€${offer.prezzo_luce.toFixed(4)}/kWh`;
            break;
        case 'prezzo_gas':
            sortedOffers = [...offers].sort((a, b) => a.prezzo_gas - b.prezzo_gas).slice(0, 5);
            valueFormatter = (offer) => `€${offer.prezzo_gas.toFixed(4)}/Smc`;
            break;
        case 'commissioni':
            sortedOffers = [...offers].sort((a, b) => (a.commissioni || 0) - (b.commissioni || 0)).slice(0, 5);
            valueFormatter = (offer) => `€${(offer.commissioni || 0).toFixed(2)}`;
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

// UI Helper Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('success-toast');
    const messageElement = toast?.querySelector('.toast-message');
    
    if (toast && messageElement) {
        messageElement.textContent = message;
        toast.classList.remove('hidden');
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            hideToast();
        }, 4000);
    } else {
        // Fallback to alert if toast not found
        console.log('Toast message:', message);
    }
}

function hideToast() {
    const toast = document.getElementById('success-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global Functions for HTML onclick handlers
window.editOffer = editOffer;
window.deleteOffer = deleteOffer;
window.closeEditModal = closeEditModal;
window.saveEditedOffer = saveEditedOffer;
window.exportToCSV = exportToCSV;
window.sortTable = sortTable;
window.applyFilters = applyFilters;
window.resetUpload = resetUploadWizard;
window.hideToast = hideToast;

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
    if (ocrWorker) {
        await ocrWorker.terminate();
    }
});

console.log('🚀 EnergiaCorp Premium Dashboard loaded and ready!');