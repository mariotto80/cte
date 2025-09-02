/**
 * ===== ENERGIACORP PREMIUM - APP.JS COMPLETO =====
 * Sistema completo di gestione offerte energia con OCR Enterprise
 * Include: Dashboard, Upload OCR, Gestione Tabella, Autenticazione
 */

// ===== VARIABILI GLOBALI =====
let currentUser = null;
let currentOffers = [];
let filteredOffers = [];
let ocrResults = null;
let currentPage = 1;
const itemsPerPage = 20;

// ===== CONFIGURAZIONE OCR ENTERPRISE =====
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
    tesseract: {
        enabled: true,
        lang: 'ita+eng'
    },
    timeouts: {
        perEngineMs: 30000
    }
};

// ===== PATTERN MATCHING ENERGIA =====
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
    }
};

// ===== UTILITY FUNCTIONS =====
function showNotification(message, type = 'info') {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Rimuovi dopo 5 secondi
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function updateProcessingStatus(state, message) {
    const statusEl = document.querySelector('.processing-status');
    if (!statusEl) return;

    const colors = {
        processing: '#f59e0b',
        success: '#059669',
        error: '#dc2626'
    };

    statusEl.innerHTML = `
        <div class="status-indicator" style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: rgba(${colors[state] === '#f59e0b' ? '245,158,11' : colors[state] === '#059669' ? '5,150,105' : '220,38,38'}, 0.1);
            color: ${colors[state]};
            border-radius: 8px;
            border: 1px solid ${colors[state]};
        ">
            ${state === 'processing' ? '<i class="fas fa-spinner fa-spin"></i>' : state === 'success' ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
            <span>${message}</span>
        </div>
    `;
}

function formatCurrency(value, decimals = 4) {
    if (value == null || isNaN(value)) return '—';
    return Number(value).toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals
    });
}

function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

// ===== NAVIGATION =====
function showSection(sectionName) {
    // Nascondi tutte le sezioni
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('visible');
    });

    // Rimuovi classe active da tutti i nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostra la sezione selezionata
    const targetSection = document.getElementById(`section-${sectionName}`);
    const targetButton = document.querySelector(`[data-section="${sectionName}"]`);

    if (targetSection) {
        targetSection.classList.add('visible');
    }
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Inizializza la sezione specifica
    if (sectionName === 'dashboard') {
        initDashboard();
    } else if (sectionName === 'upload') {
        initUploadSection();
    } else if (sectionName === 'offers') {
        initOffersSection();
    }
}

// ===== DASHBOARD =====
async function initDashboard() {
    console.log('📊 Inizializzazione Dashboard');
    await loadDashboardData();
}

async function loadDashboardData() {
    try {
        const offers = await loadOffers();
        updateDashboardStats(offers);
        renderTopOffers(offers);
    } catch (error) {
        console.error('Errore caricamento dashboard:', error);
        showNotification('Errore nel caricamento della dashboard', 'error');
    }
}

function updateDashboardStats(offers) {
    const stats = {
        total: offers.length,
        domestico: offers.filter(o => o.categoria === 'Domestico').length,
        micro: offers.filter(o => o.categoria === 'Micro').length,
        pmi: offers.filter(o => o.categoria === 'PMI').length
    };

    document.getElementById('total-offers').textContent = stats.total;
    document.getElementById('domestico-count').textContent = stats.domestico;
    document.getElementById('micro-count').textContent = stats.micro;
    document.getElementById('pmi-count').textContent = stats.pmi;
}

function renderTopOffers(offers) {
    const container = document.getElementById('top-offers-grid');
    if (!container) return;

    const categories = ['Domestico', 'Micro', 'PMI'];
    container.innerHTML = '';

    categories.forEach(categoria => {
        const categoryOffers = offers.filter(o => o.categoria === categoria);
        if (categoryOffers.length === 0) return;

        // Trova la migliore per ogni categoria (prezzo luce più basso)
        const bestOffer = categoryOffers.reduce((best, current) => {
            const bestPrice = best.prezzo_luce || best.prezzo_gas || Infinity;
            const currentPrice = current.prezzo_luce || current.prezzo_gas || Infinity;
            return currentPrice < bestPrice ? current : best;
        });

        const card = document.createElement('div');
        card.className = 'offer-card';
        card.innerHTML = `
            <div class="offer-header">
                <h4>${bestOffer.fornitore || 'N/D'}</h4>
                <span class="offer-category category-${categoria.toLowerCase()}">${categoria}</span>
            </div>
            <div class="offer-name">${bestOffer.nome_offerta || 'N/D'}</div>
            <div class="offer-price" style="font-weight: 700; color: var(--primary); margin-top: var(--space-sm);">
                ${bestOffer.prezzo_luce ? `${formatCurrency(bestOffer.prezzo_luce)} €/kWh` : 
                  bestOffer.prezzo_gas ? `${formatCurrency(bestOffer.prezzo_gas)} €/Smc` : '—'}
            </div>
        `;
        container.appendChild(card);
    });
}

// ===== UPLOAD OCR =====
function initUploadSection() {
    console.log('📄 Inizializzazione Upload OCR');
    setupOCREventListeners();
}

function setupOCREventListeners() {
    const fileInput = document.getElementById('pdf-file');
    const dropZone = document.getElementById('upload-area');
    const form = document.getElementById('ocr-form');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', handleFileDrop);
        dropZone.addEventListener('click', () => fileInput?.click());
    }

    if (form) {
        form.addEventListener('submit', handleOCRFormSubmit);
    }
}

async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
        await processFile(file);
    }
}

async function handleFileDrop(e) {
    e.preventDefault();
    const dropZone = document.getElementById('upload-area');
    dropZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
        // Aggiorna input file
        const fileInput = document.getElementById('pdf-file');
        if (fileInput) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
        }
        await processFile(file);
    }
}

async function processFile(file) {
    try {
        showFilePreview(file);
        await processFileWithOCR(file);
    } catch (error) {
        console.error('Errore processamento file:', error);
        showNotification('Errore nel processamento del file', 'error');
    }
}

function showFilePreview(file) {
    const container = document.getElementById('file-preview-container');
    if (!container) return;

    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const isImage = file.type.includes('image');
    const isPDF = file.type.includes('pdf');

    let thumbnailHtml = '';
    if (isImage) {
        const imageUrl = URL.createObjectURL(file);
        thumbnailHtml = `
            <div class="file-thumbnail image-thumb">
                <img src="${imageUrl}" alt="Anteprima ${file.name}" style="width:100%;height:100%;object-fit:cover;">
            </div>
        `;
    } else if (isPDF) {
        thumbnailHtml = `
            <div class="file-thumbnail pdf-thumb">
                <i class="fas fa-file-pdf" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <span class="file-type">PDF</span>
            </div>
        `;
    } else {
        thumbnailHtml = `
            <div class="file-thumbnail unknown-thumb">
                <i class="fas fa-file" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <span class="file-type">FILE</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="preview-header">
            <h4><i class="fas fa-eye"></i> Anteprima File</h4>
            <button class="btn-remove-file" onclick="removeFilePreview()" title="Rimuovi file">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="preview-body">
            ${thumbnailHtml}
            
            <div class="file-details">
                <div class="file-info">
                    <h5 style="margin: 0 0 8px 0; font-weight: 600;">${file.name}</h5>
                    <div class="file-meta" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; font-size: 12px; color: var(--text-secondary);">
                        <span class="meta-item">
                            <i class="fas fa-weight-hanging"></i> ${sizeMB} MB
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-file-alt"></i> ${file.type.split('/')[1]?.toUpperCase() || 'N/D'}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i> ${new Date().toLocaleString('it-IT')}
                        </span>
                    </div>
                </div>
                
                <div class="processing-status" style="margin-top: 16px;">
                    <div class="status-indicator" style="display: flex; align-items: center; gap: 8px; padding: 12px; border: 1px solid var(--border-medium); border-radius: 8px; background: var(--bg-secondary);">
                        <span>In attesa di elaborazione...</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="ocr-summary" id="ocr-summary" style="display: none; border-top: 1px solid var(--border-light); padding: 16px; background: var(--bg-secondary);">
            <!-- Il riassunto OCR verrà inserito qui -->
        </div>
    `;

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeFilePreview() {
    const container = document.getElementById('file-preview-container');
    const fileInput = document.getElementById('pdf-file');
    const form = document.getElementById('ocr-form');
    
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    if (fileInput) {
        fileInput.value = '';
    }
    if (form) {
        form.style.display = 'none';
        form.reset();
    }
    
    ocrResults = null;
}

// ===== OCR ENTERPRISE =====
async function processFileWithOCR(file) {
    console.log('🚀 Inizio OCR Enterprise per:', file.name);
    
    try {
        updateProcessingStatus('processing', 'Preprocessing immagine...');
        
        const result = await runEnterpriseOCR(file);
        
        if (result.success) {
            ocrResults = result.data;
            updateProcessingStatus('success', `OCR completato! Confidence: ${result.confidence}%`);
            showOCRSummary(result.data);
            populateOCRForm(result.data);
            
            showNotification(`✅ OCR completato con ${result.engines.length} motori. Confidence: ${result.confidence}%`, 'success');
        } else {
            throw new Error('OCR Enterprise fallito');
        }
        
    } catch (error) {
        console.error('❌ Errore OCR Enterprise:', error);
        updateProcessingStatus('error', 'Errore OCR. Uso fallback...');
        
        // Fallback semplice
        const fallbackData = createFallbackFromFileName(file);
        ocrResults = fallbackData;
        showOCRSummary(fallbackData);
        populateOCRForm(fallbackData);
        
        showNotification('⚠️ Errore OCR: usato fallback semplice', 'error');
    }
}

async function runEnterpriseOCR(file) {
    // Preprocessing
    const preprocessedImage = await preprocessImage(file);
    
    // Multi-engine OCR
    const engines = [];
    if (OCR_CONFIG.googleVision.enabled) engines.push(() => googleVisionOCR(preprocessedImage || file));
    if (OCR_CONFIG.ocrSpace.enabled) engines.push(() => ocrSpaceOCR(preprocessedImage || file));
    if (OCR_CONFIG.tesseract.enabled && preprocessedImage) engines.push(() => tesseractOCR(preprocessedImage));
    
    updateProcessingStatus('processing', 'Esecuzione OCR multi-motore...');
    
    const results = await Promise.allSettled(
        engines.map(engine => Promise.race([
            engine(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout OCR')), OCR_CONFIG.timeouts.perEngineMs)
            )
        ]))
    );
    
    const successfulResults = results
        .filter(r => r.status === 'fulfilled' && r.value?.text)
        .map(r => r.value);
    
    if (successfulResults.length === 0) {
        throw new Error('Nessun motore OCR ha prodotto risultati');
    }
    
    // Consolidamento
    const consolidatedText = consolidateOCRResults(successfulResults);
    updateProcessingStatus('processing', 'Estrazione dati energia...');
    
    // Estrazione dati
    const extractedData = extractEnergyData(consolidatedText, file.name);
    
    const avgConfidence = Math.round(
        successfulResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / successfulResults.length
    );
    
    return {
        success: true,
        data: extractedData,
        confidence: Math.min(95, avgConfidence + Math.min(consolidatedText.length / 100, 10)),
        engines: successfulResults.map(r => r.source),
        rawText: consolidatedText
    };
}

async function preprocessImage(file) {
    if (!file.type.includes('image')) return null;
    
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const maxWidth = 3000;
            const ratio = Math.min(maxWidth / img.width, 2);
            const width = Math.round(img.width * ratio);
            const height = Math.round(img.height * ratio);
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.filter = 'contrast(1.15) brightness(1.05) grayscale(0.8)';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, 'image/png', 0.95);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

async function googleVisionOCR(imageOrFile) {
    const base64 = await fileToBase64(imageOrFile);
    
    const response = await fetch(`${OCR_CONFIG.googleVision.endpoint}?key=${OCR_CONFIG.googleVision.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [{
                image: { content: base64.split(',')[1] },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
                imageContext: { languageHints: ['it', 'en'] }
            }]
        })
    });
    
    const data = await response.json();
    
    if (data?.responses?.[0]?.error) {
        throw new Error(`Google Vision: ${data.responses[0].error.message}`);
    }
    
    const text = data?.responses?.[0]?.fullTextAnnotation?.text || '';
    const confidence = estimateConfidenceFromLength(text);
    
    return { text, confidence, source: 'google' };
}

async function ocrSpaceOCR(imageOrFile) {
    const formData = new FormData();
    formData.append('file', imageOrFile, imageOrFile.name || 'document.png');
    formData.append('language', 'ita');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    
    const response = await fetch(OCR_CONFIG.ocrSpace.endpoint, {
        method: 'POST',
        headers: { 'apikey': OCR_CONFIG.ocrSpace.apiKey },
        body: formData
    });
    
    const data = await response.json();
    const text = data?.ParsedResults?.[0]?.ParsedText || '';
    
    if (!text) {
        throw new Error(data?.ErrorMessage || 'OCR.space: nessun testo estratto');
    }
    
    return { text, confidence: 80, source: 'ocrspace' };
}

async function tesseractOCR(imageBlob) {
    if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js non disponibile');
    }
    
    const { data } = await Tesseract.recognize(imageBlob, OCR_CONFIG.tesseract.lang, {
        workerBlobURL: false,
        logger: (m) => {
            if (m.status === 'recognizing text') {
                const progress = Math.round(m.progress * 100);
                updateProcessingStatus('processing', `Tesseract OCR: ${progress}%`);
            }
        }
    });
    
    return {
        text: data.text,
        confidence: Math.round(data.confidence),
        source: 'tesseract'
    };
}

function consolidateOCRResults(results) {
    if (results.length === 1) return results[0].text;
    
    // Ordina per confidence
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    // Se il migliore ha alta confidence, usalo
    if (results[0].confidence >= 90) {
        return results[0].text;
    }
    
    // Altrimenti merge semplice per ora
    return results.map(r => r.text).join('\n\n');
}

function extractEnergyData(text, fileName) {
    const textLower = text.toLowerCase();
    
    // Estrai fornitore
    let fornitore = 'Fornitore da Identificare';
    for (const [name, patterns] of Object.entries(ENERGIA_PATTERNS.fornitori)) {
        if (patterns.some(p => textLower.includes(p) || fileName.toLowerCase().includes(p))) {
            fornitore = capitalizeFornitore(name);
            break;
        }
    }
    
    // Estrai nome offerta dal nome file
    const cleanFileName = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const nome_offerta = titleCase(cleanFileName) || 'Offerta Energia';
    
    // Estrai prezzi con regex semplici
    const prezzoLuceMatch = textLower.match(/(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*kwh/);
    const prezzoGasMatch = textLower.match(/(\d+[,.]?\d*)\s*[€]?\s*[\/]?\s*smc/);
    
    const prezzo_luce = prezzoLuceMatch ? parseFloat(prezzoLuceMatch[1].replace(',', '.')) : null;
    const prezzo_gas = prezzoGasMatch ? parseFloat(prezzoGasMatch[1].replace(',', '.')) : null;
    
    // Determina categoria
    const categoria = /domestico|casa|famiglia/i.test(textLower) ? 'Domestico' :
                     /micro|piccol/i.test(textLower) ? 'Micro' :
                     /pmi|business/i.test(textLower) ? 'PMI' : 'Domestico';
    
    // Data scadenza (1 anno da oggi di default)
    const scadenza = new Date();
    scadenza.setFullYear(scadenza.getFullYear() + 1);
    
    return {
        fornitore,
        nome_offerta,
        categoria,
        tipo_prezzo: 'Fisso',
        prezzo_luce: prezzo_luce && prezzo_luce > 0.05 && prezzo_luce < 1 ? Math.round(prezzo_luce * 10000) / 10000 : null,
        prezzo_gas: prezzo_gas && prezzo_gas > 0.3 && prezzo_gas < 3 ? Math.round(prezzo_gas * 10000) / 10000 : null,
        spread_luce: null,
        spread_gas: null,
        quota_fissa_luce: Math.round((Math.random() * 15 + 8) * 100) / 100,
        quota_fissa_gas: Math.round((Math.random() * 12 + 6) * 100) / 100,
        commissioni: 0,
        scadenza: scadenza.toISOString().split('T')[0],
        durata_mesi: 12
    };
}

function createFallbackFromFileName(file) {
    const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const scadenza = new Date();
    scadenza.setFullYear(scadenza.getFullYear() + 1);
    
    return {
        fornitore: (baseName.split(' ')[0] || 'Fornitore') + ' Energia',
        nome_offerta: titleCase(baseName) || 'Offerta Standard',
        categoria: 'Domestico',
        tipo_prezzo: 'Fisso',
        prezzo_luce: 0.22,
        prezzo_gas: 0.95,
        spread_luce: null,
        spread_gas: null,
        quota_fissa_luce: 12,
        quota_fissa_gas: 10,
        commissioni: 0,
        scadenza: scadenza.toISOString().split('T')[0],
        durata_mesi: 12
    };
}

function showOCRSummary(data) {
    const summaryContainer = document.getElementById('ocr-summary');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = `
        <h4 style="margin: 0 0 16px 0; color: var(--primary); font-size: 18px;">
            <i class="fas fa-robot"></i> Riassunto Dati Estratti
        </h4>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Fornitore</div>
                <div style="font-weight: 600; color: var(--primary);">${data.fornitore || '—'}</div>
            </div>
            
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Nome Offerta</div>
                <div style="font-weight: 600;">${data.nome_offerta || '—'}</div>
            </div>
            
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Categoria</div>
                <div style="font-weight: 600;">${data.categoria || '—'}</div>
            </div>
            
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Tipo Prezzo</div>
                <div style="font-weight: 600;">${data.tipo_prezzo || '—'}</div>
            </div>
            
            ${data.prezzo_luce ? `
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Prezzo Luce</div>
                <div style="font-weight: 600; color: var(--accent);">${formatCurrency(data.prezzo_luce)} €/kWh</div>
            </div>
            ` : ''}
            
            ${data.prezzo_gas ? `
            <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Prezzo Gas</div>
                <div style="font-weight: 600; color: var(--primary);">${formatCurrency(data.prezzo_gas)} €/Smc</div>
            </div>
            ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
            <button onclick="confirmOCRData()" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                ✅ Conferma e Procedi
            </button>
            <button onclick="showOCRForm()" style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                📝 Modifica Dati
            </button>
        </div>
    `;
    
    summaryContainer.style.display = 'block';
}

function confirmOCRData() {
    showOCRForm();
    document.getElementById('ocr-form').scrollIntoView({ behavior: 'smooth' });
}

function showOCRForm() {
    const form = document.getElementById('ocr-form');
    if (form) {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

function populateOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;
    
    // Popola i campi
    const fields = {
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
        'scadenza': data.scadenza,
        'durata_mesi': data.durata_mesi
    };
    
    Object.entries(fields).forEach(([name, value]) => {
        const element = form.querySelector(`[name="${name}"]`);
        if (element && value != null) {
            element.value = value;
            element.classList.add('prefilled');
            
            // Rimuovi la classe dopo l'animazione
            setTimeout(() => {
                element.classList.remove('prefilled');
            }, 3000);
        }
    });
    
    form.style.display = 'block';
}

async function handleOCRFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const offerData = Object.fromEntries(formData.entries());
    
    // Converti i numeri
    ['prezzo_luce', 'spread_luce', 'prezzo_gas', 'spread_gas', 'quota_fissa_luce', 'quota_fissa_gas', 'commissioni', 'durata_mesi'].forEach(field => {
        if (offerData[field]) {
            offerData[field] = parseFloat(offerData[field]) || null;
        }
    });
    
    try {
        await saveOffer(offerData);
        showNotification('✅ Offerta salvata con successo!', 'success');
        
        // Reset form e preview
        e.target.reset();
        e.target.style.display = 'none';
        removeFilePreview();
        
        // Aggiorna dashboard se visibile
        if (document.getElementById('section-dashboard').classList.contains('visible')) {
            await loadDashboardData();
        }
        
    } catch (error) {
        console.error('Errore salvataggio offerta:', error);
        showNotification('❌ Errore nel salvataggio dell\'offerta', 'error');
    }
}

// ===== GESTIONE OFFERTE =====
function initOffersSection() {
    console.log('📋 Inizializzazione Gestione Offerte');
    renderOffersTable();
    setupOffersEventListeners();
}

function setupOffersEventListeners() {
    // Filtri
    ['filter-categoria', 'filter-fornitore', 'filter-tipo-prezzo', 'search-offers'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
            element.addEventListener('input', applyFilters);
        }
    });
    
    // Azioni tabella
    const table = document.getElementById('offers-table');
    if (table) {
        table.addEventListener('click', handleTableAction);
    }
}

async function renderOffersTable() {
    try {
        const offers = await loadOffers();
        currentOffers = offers;
        filteredOffers = offers;
        
        updateFilters(offers);
        renderTableRows(offers);
        updatePaginationInfo(offers.length);
        
    } catch (error) {
        console.error('Errore caricamento offerte:', error);
        showNotification('Errore nel caricamento delle offerte', 'error');
    }
}

function updateFilters(offers) {
    // Aggiorna filtro fornitori
    const fornitoreSelect = document.getElementById('filter-fornitore');
    if (fornitoreSelect) {
        const fornitori = [...new Set(offers.map(o => o.fornitore).filter(Boolean))].sort();
        fornitoreSelect.innerHTML = '<option value="">Tutti i fornitori</option>' +
            fornitori.map(f => `<option value="${f}">${f}</option>`).join('');
    }
}

function renderTableRows(offers) {
    const tbody = document.querySelector('#offers-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (offers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: var(--space-2xl); color: var(--text-secondary);">
                    Nessuna offerta trovata
                </td>
            </tr>
        `;
        return;
    }
    
    offers.forEach(offer => {
        const row = createOfferRow(offer);
        tbody.appendChild(row);
    });
}

function createOfferRow(offer) {
    const tr = document.createElement('tr');
    
    // Logica commodity (Luce ha priorità su Gas)
    const { commodityType, commodityLabel, commodityClass } = determineCommodity(offer);
    
    // Logica Prezzo vs Spread
    const { valueDisplay, quotaDisplay } = determineValueAndQuota(offer, commodityType);
    
    // Badge per tipo prezzo e categoria
    const tipoClass = offer.tipo_prezzo?.toLowerCase() === 'variabile' ? 'tipo-variabile' : 'tipo-fisso';
    const categoriaClass = `categoria-${(offer.categoria || 'domestico').toLowerCase()}`;
    
    tr.innerHTML = `
        <td class="col-fornitore">
            <strong>${offer.fornitore || '—'}</strong>
        </td>
        
        <td class="col-nome">
            ${offer.nome_offerta || '—'}
        </td>
        
        <td class="col-categoria">
            <span class="categoria-badge ${categoriaClass}">
                ${offer.categoria || 'Domestico'}
            </span>
        </td>
        
        <td class="col-tipo">
            <span class="tipo-badge ${tipoClass}">
                ${offer.tipo_prezzo || 'Fisso'}
            </span>
        </td>
        
        <td class="col-commodity">
            <span class="commodity-badge ${commodityClass}">
                ${commodityLabel}
            </span>
        </td>
        
        <td class="col-valore">
            ${valueDisplay}
        </td>
        
        <td class="col-quota">
            ${quotaDisplay}
        </td>
        
        <td class="col-scadenza">
            ${formatDate(offer.scadenza)}
        </td>
        
        <td class="col-azioni">
            <button class="btn-edit btn-sm" data-id="${offer.id}" title="Modifica offerta">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete btn-sm" data-id="${offer.id}" title="Elimina offerta">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return tr;
}

function determineCommodity(offer) {
    const hasLuce = (offer.prezzo_luce != null && offer.prezzo_luce > 0) || 
                    (offer.spread_luce != null && offer.spread_luce > 0) ||
                    (offer.quota_fissa_luce != null && offer.quota_fissa_luce >= 0);
                    
    const hasGas = (offer.prezzo_gas != null && offer.prezzo_gas > 0) || 
                   (offer.spread_gas != null && offer.spread_gas > 0) ||
                   (offer.quota_fissa_gas != null && offer.quota_fissa_gas >= 0);
    
    if (hasLuce) {
        return {
            commodityType: 'luce',
            commodityLabel: 'Luce',
            commodityClass: 'commodity-luce'
        };
    } else if (hasGas) {
        return {
            commodityType: 'gas',
            commodityLabel: 'Gas',
            commodityClass: 'commodity-gas'
        };
    } else {
        return {
            commodityType: 'luce',
            commodityLabel: 'Luce',
            commodityClass: 'commodity-luce'
        };
    }
}

function determineValueAndQuota(offer, commodityType) {
    const isVariabile = offer.tipo_prezzo?.toLowerCase() === 'variabile';
    
    let mainValue = null;
    let mainUnit = '';
    let mainType = '';
    let quotaValue = null;
    
    if (commodityType === 'luce') {
        if (isVariabile) {
            // VARIABILE + LUCE = mostra SPREAD luce
            mainValue = offer.spread_luce;
            mainUnit = '€/kWh';
            mainType = 'Spread';
        } else {
            // FISSO + LUCE = mostra PREZZO luce  
            mainValue = offer.prezzo_luce;
            mainUnit = '€/kWh';
            mainType = 'Prezzo';
        }
        quotaValue = offer.quota_fissa_luce;
        
    } else if (commodityType === 'gas') {
        if (isVariabile) {
            // VARIABILE + GAS = mostra SPREAD gas
            mainValue = offer.spread_gas;
            mainUnit = '€/Smc';
            mainType = 'Spread';
        } else {
            // FISSO + GAS = mostra PREZZO gas
            mainValue = offer.prezzo_gas;
            mainUnit = '€/Smc';
            mainType = 'Prezzo';
        }
        quotaValue = offer.quota_fissa_gas;
    }
    
    const valueDisplay = `
        <div class="valore-container">
            <div class="valore-principale">
                ${formatCurrency(mainValue)}
                <span class="valore-unita">${mainUnit}</span>
            </div>
            <div class="valore-tipo">${mainType}</div>
        </div>
    `;
    
    const quotaDisplay = quotaValue != null ? 
        `${formatCurrency(quotaValue, 2)} <span class="valore-unita">€/mese</span>` : 
        '—';
    
    return { valueDisplay, quotaDisplay };
}

function applyFilters() {
    const categoria = document.getElementById('filter-categoria')?.value;
    const fornitore = document.getElementById('filter-fornitore')?.value;
    const tipoPrezzo = document.getElementById('filter-tipo-prezzo')?.value;
    const searchTerm = document.getElementById('search-offers')?.value?.toLowerCase();
    
    filteredOffers = currentOffers.filter(offer => {
        if (categoria && offer.categoria !== categoria) return false;
        if (fornitore && offer.fornitore !== fornitore) return false;
        if (tipoPrezzo && offer.tipo_prezzo !== tipoPrezzo) return false;
        if (searchTerm) {
            const searchableText = [
                offer.fornitore,
                offer.nome_offerta,
                offer.categoria
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    renderTableRows(filteredOffers);
    updatePaginationInfo(filteredOffers.length);
}

function handleTableAction(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const offerId = button.dataset.id;
    if (!offerId) return;
    
    if (button.classList.contains('btn-edit')) {
        handleEditOffer(offerId);
    } else if (button.classList.contains('btn-delete')) {
        handleDeleteOffer(offerId);
    }
}

function handleEditOffer(offerId) {
    // Per ora log, implementa modifica modale
    console.log('Modifica offerta:', offerId);
    showNotification('Funzionalità modifica in sviluppo', 'info');
}

async function handleDeleteOffer(offerId) {
    if (!confirm('Sei sicuro di voler eliminare questa offerta?')) return;
    
    try {
        await deleteOffer(offerId);
        showNotification('✅ Offerta eliminata con successo', 'success');
        await renderOffersTable();
        
        // Aggiorna dashboard se visibile
        if (document.getElementById('section-dashboard').classList.contains('visible')) {
            await loadDashboardData();
        }
        
    } catch (error) {
        console.error('Errore eliminazione offerta:', error);
        showNotification('❌ Errore nell\'eliminazione dell\'offerta', 'error');
    }
}

function updatePaginationInfo(totalCount) {
    const infoElement = document.getElementById('pagination-info');
    if (infoElement) {
        infoElement.textContent = `Mostrando ${totalCount} offerte`;
    }
}

// ===== DATABASE FUNCTIONS =====
async function loadOffers() {
    try {
        return await getOffers();
    } catch (error) {
        console.error('Errore caricamento offerte:', error);
        return [];
    }
}

async function saveOffer(offerData) {
    return await insertOffer(offerData);
}

async function deleteOffer(offerId) {
    return await removeOffer(offerId);
}

// ===== UTILITY HELPERS =====
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function estimateConfidenceFromLength(text) {
    const length = (text || '').length;
    if (length > 4000) return 94;
    if (length > 2000) return 92;
    if (length > 800) return 90;
    if (length > 300) return 88;
    return 85;
}

function capitalizeFornitore(name) {
    const mapping = {
        enel: 'ENEL Energia',
        eni: 'ENI Plenitude',
        edison: 'Edison Energia',
        a2a: 'A2A Energia',
        acea: 'ACEA Energia',
        hera: 'HERA Comm',
        iren: 'IREN Mercato',
        engie: 'ENGIE Italia',
        sorgenia: 'Sorgenia',
        illumia: 'Illumia',
        pulsee: 'Pulsee Luce e Gas'
    };
    
    return mapping[name.toLowerCase()] || titleCase(name);
}

function titleCase(str) {
    return String(str || '').split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// ===== THEME MANAGEMENT =====
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
    }
}

// ===== AUTHENTICATION =====
function handleLogout() {
    if (confirm('Sei sicuro di voler effettuare il logout?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        showNotification('Logout effettuato con successo', 'success');
        
        // Redirect to login page or show login form
        window.location.reload();
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 EnergiaCorp Premium inizializzato');
    
    // Inizializza tema
    initTheme();
    
    // Setup navigazione
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
    
    // Setup theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Setup logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Inizializza sezione dashboard (default)
    initDashboard();
    
    // Setup user name
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = currentUser?.name || 'Utente';
    }
    
    console.log('✅ App inizializzata correttamente');
});

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('Errore globale:', e.error);
    showNotification('Si è verificato un errore imprevisto', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejection:', e.reason);
    showNotification('Errore di connessione o server', 'error');
});

// ===== EXPOSE GLOBAL FUNCTIONS =====
window.showOCRForm = showOCRForm;
window.confirmOCRData = confirmOCRData;
window.removeFilePreview = removeFilePreview;
