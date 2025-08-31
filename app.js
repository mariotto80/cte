// ===== GLOBAL VARIABLES =====
let offers = [];
let filteredOffers = [];
let currentSort = { field: null, direction: 'asc' };
let charts = {};
let ocrWorker = null;
let currentTheme = 'light';
let currentUser = null;

// ===== ENHANCED OCR CONFIGURATION =====
const OCR_CONFIG = {
    lang: 'ita+eng',
    oem: 1,
    psm: 6,
    tessedit_char_whitelist: '',
    tessedit_pageseg_mode: 6
};

// Fornitori energetici italiani conosciuti
const KNOWN_SUPPLIERS = [
    'Enel Energia', 'Plenitude', 'Edison', 'A2A Energia', 'Sorgenia',
    'E.ON Energia', 'Iren Mercato', 'Hera Comm', 'Wekiwi', 'Illumia',
    'NeN', 'Pulsee', 'Engie Italia', 'Acea Energia', 'VIVI Energia',
    'Optima Italia', 'Estra', 'Alperia', 'Iberdrola', 'Tate',
    'ENI', 'Enel', 'Edison Energia', 'A2A', 'Iren'
];

// Enhanced Field Recognition Patterns
const ENHANCED_PATTERNS = {
    prezzo_luce: [
        /(?:energia\s+elettrica|luce|elettrica)[\s\S]*?(€?\s*\d+[,\.]\d{3,4})\s*(?:€|euro)?[\s\/]*k?Wh/gim,
        /(?:prezzo|costo|tariffa)[\s\S]*?(?:luce|elettrica)[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /(\d+[,\.]\d{3,4})\s*cent[\s\/]*k?Wh/gim,
        /luce[\s\|]*(\d+[,\.]\d{3,4})/gim,
        /(\d+[,\.]\d{3,4})\s*€\/kWh/gim,
        /€\s*(\d+[,\.]\d{3,4})[\s\/]*kWh/gim
    ],
    prezzo_gas: [
        /(?:gas|metano)[\s\S]*?(€?\s*\d+[,\.]\d{3,4})\s*(?:€|euro)?[\s\/]*(?:Smc|smc|m3|mc)/gim,
        /(?:prezzo|costo|tariffa)[\s\S]*?gas[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /(\d+[,\.]\d{3,4})\s*cent[\s\/]*(?:Smc|smc)/gim,
        /gas[\s\|]*(\d+[,\.]\d{3,4})/gim,
        /(\d+[,\.]\d{3,4})\s*€\/Smc/gim,
        /€\s*(\d+[,\.]\d{3,4})[\s\/]*Smc/gim
    ],
    quota_fissa_luce: [
        /(?:quota\s+fissa|canone\s+mensile|contributo\s+fisso)[\s\S]*?(?:luce|elettrica)[\s\S]*?(€?\s*\d+[,\.]\d{1,2})\s*(?:€|euro)?[\s\/]*mes[ei]/gim,
        /(\d+[,\.]\d{2})\s*€[\s\/]*mese[\s\S]*?luce/gim,
        /luce[\s\S]*?(\d+[,\.]\d{2})\s*€[\s\/]*mese/gim,
        /quota.*luce[\s\|]*(\d+[,\.]\d{2})/gim
    ],
    quota_fissa_gas: [
        /(?:quota\s+fissa|canone\s+mensile|contributo\s+fisso)[\s\S]*?gas[\s\S]*?(€?\s*\d+[,\.]\d{1,2})\s*(?:€|euro)?[\s\/]*mes[ei]/gim,
        /(\d+[,\.]\d{2})\s*€[\s\/]*mese[\s\S]*?gas/gim,
        /gas[\s\S]*?(\d+[,\.]\d{2})\s*€[\s\/]*mese/gim,
        /quota.*gas[\s\|]*(\d+[,\.]\d{2})/gim
    ],
    commissioni: [
        /commissioni[\s\S]*?(€?\s*\d+[,\.]\d{1,2})/gim,
        /oneri[\s\S]*?(€?\s*\d+[,\.]\d{1,2})/gim,
        /(?:spese|costi)\s+(?:attivazione|aggiuntivi)[\s\S]*?(€?\s*\d+[,\.]\d{1,2})/gim,
        /attivazione[\s\S]*?(€?\s*\d+[,\.]\d{1,2})/gim,
        /(\d+[,\.]\d{2})\s*€.*(?:commissioni|oneri|spese)/gim
    ],
    spread_luce: [
        /spread[\s\S]*?luce[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /maggiorazione[\s\S]*?luce[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /margine[\s\S]*?(?:luce|elettrica)[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /\+\s*(\d+[,\.]\d{3,4})[\s\S]*?luce/gim
    ],
    spread_gas: [
        /spread[\s\S]*?gas[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /maggiorazione[\s\S]*?gas[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /margine[\s\S]*?gas[\s\S]*?(€?\s*\d+[,\.]\d{3,4})/gim,
        /\+\s*(\d+[,\.]\d{3,4})[\s\S]*?gas/gim
    ],
    scadenza: [
        /(?:valida|scad|valid)[\s\S]*?fino[\s\S]*?(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/gim,
        /(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})[\s\S]*?scadenza/gim,
        /scadenza[\s\S]*?(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/gim,
        /fino\s+al[\s\S]*?(\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4})/gim
    ],
    fornitore: [
        new RegExp(`(${KNOWN_SUPPLIERS.join('|')})`, 'gim')
    ],
    table_structure: [
        /luce[\s\|]*gas[\s\|]*quota/gim,
        /domestico[\s\|]*micro[\s\|]*pmi/gim,
        /prezzo[\s\|]*quota[\s\|]*commissioni/gim,
        /\|[\s]*\d+[,\.]\d+[\s]*\|/gim
    ],
    categoria: [
        /domestico/gim,
        /micro[\s]*impres[ae]/gim,
        /pmi|piccol[ae]\s+medi[ae]\s+impres[ae]/gim,
        /casa|famiglia|residenzial[ei]/gim
    ]
};

// ===== IMAGE PREPROCESSING FUNCTIONS =====
function enhanceImageForOCR(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    enhanceContrast(imageData, 1.4);
    sharpenImage(imageData);
    convertToOptimalGrayscale(imageData);
    adaptiveBinarization(imageData);
    removeNoise(imageData);

    ctx.putImageData(imageData, 0, 0);
    return scaleToOptimalDPI(canvas);
}

function enhanceContrast(imageData, factor) {
    const data = imageData.data;
    const factor255 = (259 * (factor * 255 + 255)) / (255 * (259 - factor * 255));

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor255 * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor255 * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor255 * (data[i + 2] - 128) + 128));
    }
}

function sharpenImage(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const kidx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += data[kidx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                output[idx + c] = Math.max(0, Math.min(255, sum));
            }
        }
    }
    data.set(output);
}

function convertToOptimalGrayscale(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
}

function adaptiveBinarization(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const windowSize = 15;
    const threshold = 0.15;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            let sum = 0;
            let count = 0;

            for (let wy = Math.max(0, y - windowSize); wy < Math.min(height, y + windowSize); wy++) {
                for (let wx = Math.max(0, x - windowSize); wx < Math.min(width, x + windowSize); wx++) {
                    const widx = (wy * width + wx) * 4;
                    sum += data[widx];
                    count++;
                }
            }

            const localMean = sum / count;
            const pixelValue = data[idx];

            if (pixelValue < localMean * (1 - threshold)) {
                data[idx] = data[idx + 1] = data[idx + 2] = 0;
            } else {
                data[idx] = data[idx + 1] = data[idx + 2] = 255;
            }
        }
    }
}

function removeNoise(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const neighbors = [];

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const kidx = ((y + ky) * width + (x + kx)) * 4;
                    neighbors.push(data[kidx]);
                }
            }

            neighbors.sort((a, b) => a - b);
            const median = neighbors[Math.floor(neighbors.length / 2)];

            output[idx] = output[idx + 1] = output[idx + 2] = median;
        }
    }

    data.set(output);
}

function scaleToOptimalDPI(canvas) {
    const optimalWidth = Math.min(canvas.width * 2, 2000);
    const scaleFactor = optimalWidth / canvas.width;

    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');

    scaledCanvas.width = optimalWidth;
    scaledCanvas.height = canvas.height * scaleFactor;

    scaledCtx.imageSmoothingEnabled = false;
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

    return scaledCanvas;
}

// ===== DOCUMENT CLASSIFICATION =====
function classifyDocument(text) {
    const classification = {
        supplier: null,
        format: 'unknown',
        confidence: 0,
        category_hints: []
    };

    for (const supplier of KNOWN_SUPPLIERS) {
        const regex = new RegExp(supplier.replace(/\s+/g, '\\s*'), 'gim');
        if (regex.test(text)) {
            classification.supplier = supplier;
            classification.confidence += 0.3;
            break;
        }
    }

    if (ENHANCED_PATTERNS.table_structure.some(pattern => pattern.test(text))) {
        classification.format = 'table';
        classification.confidence += 0.2;
    } else if (/contratto|offerta|proposta\s+commerciale/gim.test(text)) {
        classification.format = 'contract';
        classification.confidence += 0.15;
    } else if (/listino|tariffario|scheda/gim.test(text)) {
        classification.format = 'price_list';
        classification.confidence += 0.1;
    }

    if (/domestico|casa|famiglia|residenzial[ei]/gim.test(text)) {
        classification.category_hints.push('Domestico');
    }
    if (/micro|piccol[ae]\s*impres[ae]/gim.test(text)) {
        classification.category_hints.push('Micro');
    }
    if (/pmi|piccol[ae]\s+medi[ae]\s+impres[ae]/gim.test(text)) {
        classification.category_hints.push('PMI');
    }

    return classification;
}

// ===== ENHANCED OCR PROCESSING =====
async function processFileWithAdvancedOCR(file) {
    if (!file) return null;

    try {
        const progressBar = document.getElementById('ocr-progress');
        const progressText = document.getElementById('progress-text');

        if (progressBar) progressBar.style.display = 'block';

        updateProgress(5, 'Inizializzazione OCR avanzato...');

        if (!ocrWorker) {
            ocrWorker = await Tesseract.createWorker();
            await ocrWorker.loadLanguage(OCR_CONFIG.lang);
            await ocrWorker.initialize(OCR_CONFIG.lang);
            await ocrWorker.setParameters(OCR_CONFIG);
        }

        updateProgress(15, 'Pre-elaborazione documento...');

        let imagesToProcess = [];
        let rawText = '';

        if (file.type === 'application/pdf') {
            try {
                rawText = await extractNativeTextFromPDF(file);
                updateProgress(25, 'Testo nativo estratto...');
            } catch (e) {
                console.log('Native text extraction failed, using OCR...');
            }

            if (!rawText || rawText.length < 100) {
                imagesToProcess = await convertPDFToEnhancedImages(file);
            }
        } else {
            imagesToProcess = [file];
        }

        updateProgress(40, 'Classificazione documento...');

        let allText = rawText;

        if (imagesToProcess.length > 0) {
            updateProgress(50, 'Riconoscimento OCR avanzato...');

            for (let i = 0; i < imagesToProcess.length; i++) {
                const progress = 50 + (35 * (i + 1) / imagesToProcess.length);
                updateProgress(progress, `Elaborazione pagina ${i + 1}/${imagesToProcess.length}...`);

                const enhancedImage = enhanceImageForOCR(imagesToProcess[i]);

                const { data: { text: generalText } } = await ocrWorker.recognize(enhancedImage);

                await ocrWorker.setParameters({
                    tessedit_char_whitelist: '0123456789.,'
                });
                const { data: { text: numbersText } } = await ocrWorker.recognize(enhancedImage);

                await ocrWorker.setParameters(OCR_CONFIG);

                allText += generalText + '\n\n';
            }
        }

        updateProgress(85, 'Classificazione e analisi...');

        const classification = classifyDocument(allText);

        updateProgress(90, 'Estrazione dati intelligente...');

        let extractedData;
        if (classification.format === 'table') {
            extractedData = parseTableDocument(allText);
        } else {
            extractedData = extractFieldsWithAdvancedParsing(allText);
        }

        updateProgress(95, 'Validazione e correzione...');

        const validatedData = validateAndCorrectOCR(extractedData, classification);
        validatedData.pdf_filename = file.name;
        validatedData.document_classification = classification;

        updateProgress(100, 'Completato!');

        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
        }, 1500);

        return validatedData;

    } catch (error) {
        console.error('Advanced OCR Error:', error);
        showNotification('Errore durante il riconoscimento OCR avanzato: ' + error.message, 'error');
        return null;
    }
}

async function extractNativeTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText;
}

async function convertPDFToEnhancedImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const images = [];

    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const scale = 2.5;
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

function parseTableDocument(text) {
    const extracted = getDefaultExtractionObject();

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let currentSection = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/domestico/gim.test(line)) currentSection = 'Domestico';
        else if (/micro/gim.test(line)) currentSection = 'Micro';
        else if (/pmi/gim.test(line)) currentSection = 'PMI';

        const values = line.match(/\d+[,\.]\d+/g);
        if (values && values.length >= 2) {
            if (!extracted.prezzo_luce && values[0]) {
                extracted.prezzo_luce = parseFloat(values[0].replace(',', '.'));
            }
            if (!extracted.prezzo_gas && values[1]) {
                extracted.prezzo_gas = parseFloat(values[1].replace(',', '.'));
            }
        }
    }

    const standardExtraction = extractFieldsWithAdvancedParsing(text);

    Object.keys(standardExtraction).forEach(key => {
        if (!extracted[key] && standardExtraction[key]) {
            extracted[key] = standardExtraction[key];
        }
    });

    if (currentSection) {
        extracted.categoria = currentSection;
    }

    return extracted;
}

function extractFieldsWithAdvancedParsing(text) {
    const extracted = getDefaultExtractionObject();
    let totalMatches = 0;

    for (const [field, patterns] of Object.entries(ENHANCED_PATTERNS)) {
        if (field === 'table_structure' || field === 'categoria') continue;

        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                let value = matches[1] || matches[0];

                if (field === 'fornitore') {
                    value = correctSupplierName(value);
                    if (value) {
                        extracted[field] = value;
                        totalMatches++;
                        break;
                    }
                } else if (field.includes('prezzo') || field.includes('quota') || field.includes('spread') || field === 'commissioni') {
                    const numValue = cleanAndParseNumber(value);
                    if (numValue !== null && isReasonableValue(field, numValue)) {
                        extracted[field] = numValue;
                        totalMatches++;
                        break;
                    }
                } else if (field === 'scadenza') {
                    const dateValue = parseAndValidateDate(value);
                    if (dateValue) {
                        extracted[field] = dateValue;
                        totalMatches++;
                        break;
                    }
                }
            }
        }
    }

    if (!extracted.categoria) {
        if (ENHANCED_PATTERNS.categoria[0].test(text)) extracted.categoria = 'Domestico';
        else if (ENHANCED_PATTERNS.categoria[1].test(text)) extracted.categoria = 'Micro';
        else if (ENHANCED_PATTERNS.categoria[2].test(text)) extracted.categoria = 'PMI';
        else if (ENHANCED_PATTERNS.categoria[3].test(text)) extracted.categoria = 'Domestico';
    }

    if (!extracted.nome_offerta && extracted.fornitore) {
        extracted.nome_offerta = `${extracted.fornitore} ${extracted.tipo_prezzo || 'Standard'} ${extracted.categoria || ''}`.trim();
    }

    extracted.confidence_score = Math.min(0.95, 0.4 + (totalMatches * 0.08));

    return extracted;
}

function getDefaultExtractionObject() {
    return {
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
        confidence_score: 0.5
    };
}

function correctSupplierName(name) {
    if (!name) return null;

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const supplier of KNOWN_SUPPLIERS) {
        const supplierNormalized = supplier.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normalized === supplierNormalized) return supplier;

        if (levenshteinDistance(normalized, supplierNormalized) <= 2) {
            return supplier;
        }

        if (normalized.length > 3 && (
            supplierNormalized.includes(normalized) || 
            normalized.includes(supplierNormalized)
        )) {
            return supplier;
        }
    }

    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

function cleanAndParseNumber(value) {
    if (!value) return null;

    let cleaned = value.toString().replace(/[^0-9,\.]/g, '');

    if (cleaned.includes(',')) {
        if (cleaned.includes('.') && cleaned.indexOf(',') > cleaned.indexOf('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(',', '.');
        }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
}

function isReasonableValue(field, value) {
    const ranges = {
        prezzo_luce: [0.01, 1.0],
        prezzo_gas: [0.1, 2.0],
        spread_luce: [0.0, 0.1],
        spread_gas: [0.0, 0.3],
        quota_fissa_luce: [0.0, 50.0],
        quota_fissa_gas: [0.0, 50.0],
        commissioni: [0.0, 200.0]
    };

    const range = ranges[field];
    if (!range) return true;

    return value >= range[0] && value <= range[1];
}

function parseAndValidateDate(dateStr) {
    if (!dateStr) return null;

    const datePatterns = [
        /^(\d{1,2})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{2,4})$/,
        /^(\d{2,4})[\s\/\-\.](\d{1,2})[\s\/\-\.](\d{1,2})$/
    ];

    for (const pattern of datePatterns) {
        const match = dateStr.trim().match(pattern);
        if (match) {
            let day = parseInt(match[1]);
            let month = parseInt(match[2]);
            let year = parseInt(match[3]);

            if (year < 100) year += 2000;
            if (year < 2020) year += 2000;

            if (day > 12) {
                [day, month] = [month, day];
            }

            const date = new Date(year, month - 1, day);
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                return date.toISOString().split('T')[0];
            }
        }
    }

    return null;
}

function validateAndCorrectOCR(extractedData, classification) {
    const corrected = { ...extractedData };
    let confidence = extractedData.confidence_score || 0.5;

    if (corrected.prezzo_luce > 0.8 || corrected.prezzo_luce < 0.02) {
        corrected.prezzo_luce = null;
        confidence *= 0.7;
    }

    if (corrected.prezzo_gas > 1.5 || corrected.prezzo_gas < 0.1) {
        corrected.prezzo_gas = null;
        confidence *= 0.7;
    }

    if (classification.supplier && !corrected.fornitore) {
        corrected.fornitore = classification.supplier;
        confidence += 0.1;
    }

    if (!corrected.categoria && classification.category_hints.length > 0) {
        corrected.categoria = classification.category_hints[0];
        confidence += 0.05;
    }

    if (!corrected.scadenza) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + (corrected.durata_mesi || 12));
        corrected.scadenza = futureDate.toISOString().split('T')[0];
    }

    if (corrected.spread_luce > 0 && corrected.prezzo_luce > 0.15) {
        corrected.spread_luce = 0;
    }

    corrected.confidence_score = Math.max(0.1, Math.min(0.99, confidence));

    return corrected;
}

// ===== DATABASE OPERATIONS =====
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

        if (result.error) throw new Error(result.error.message);

        showNotification('Offerta salvata con successo!', 'success');
        await loadOffersFromDatabase();

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

        if (result.error) throw new Error(result.error.message);

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

        if (result.error) throw new Error(result.error.message);

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

function setupRealtimeSubscription() {
    if (!currentUser) return;

    supabaseClient
        .channel('offers-changes')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'offerte_energia',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Real-time update:', payload);
            loadOffersFromDatabase();
        })
        .subscribe();
}

// ===== AUTHENTICATION HANDLING =====
let isSignupMode = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        currentUser = await getCurrentUser();

        if (!currentUser) {
            showLoginModal();
            return;
        }

        await loadOffersFromDatabase();
        setupEventListeners();
        initializeDashboard();
        updateLastUpdate();
        showSection('dashboard');

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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            showSection(section);
        });
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const fileInput = document.getElementById('pdf-file');
    const dropZone = document.getElementById('upload-area');

    if (fileInput) {
        fileInput.addEventListener('change', handleAdvancedFileSelect);
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleAdvancedFileDrop);
        dropZone.addEventListener('click', () => fileInput?.click());
    }

    const ocrForm = document.getElementById('ocr-form');
    if (ocrForm) {
        ocrForm.addEventListener('submit', handleOCRFormSubmit);
    }

    document.querySelectorAll('.filter-control').forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    const searchInput = document.getElementById('search-offers');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleAdvancedFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        await processAndDisplayAdvancedFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

async function handleAdvancedFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) {
        await processAndDisplayAdvancedFile(file);
    }
}

async function processAndDisplayAdvancedFile(file) {
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        showNotification('Formato file non supportato. Usa PDF o immagini.', 'error');
        return;
    }

    showNotification('Avvio elaborazione OCR avanzata...', 'info');

    const extractedData = await processFileWithAdvancedOCR(file);

    if (extractedData) {
        populateAdvancedOCRForm(extractedData);
        showSection('upload');

        const confidence = Math.round(extractedData.confidence_score * 100);
        showNotification(
            `Estrazione completata con ${confidence}% di confidenza. Verifica i dati estratti.`, 
            confidence > 80 ? 'success' : 'info'
        );
    }
}

function populateAdvancedOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;

    Object.keys(data).forEach(key => {
        if (key === 'document_classification') return;

        const input = form.querySelector(`[name="${key}"]`);
        if (input && data[key] !== null && data[key] !== '') {
            input.value = data[key];

            const parent = input.closest('.form-group');
            if (parent) {
                let indicator = parent.querySelector('.confidence-indicator');
                if (!indicator) {
                    indicator = document.createElement('span');
                    indicator.className = 'confidence-indicator';
                    parent.appendChild(indicator);
                }

                const confidence = data.confidence_score || 0.8;
                indicator.textContent = `${Math.round(confidence * 100)}%`;
                indicator.className = `confidence-indicator ${
                    confidence > 0.85 ? 'high' : confidence > 0.65 ? 'medium' : 'low'
                }`;
            }
        }
    });

    if (data.document_classification) {
        const classification = data.document_classification;
        let infoText = '';

        if (classification.supplier) {
            infoText += `Fornitore: ${classification.supplier}. `;
        }
        if (classification.format !== 'unknown') {
            infoText += `Formato: ${classification.format}. `;
        }
        if (classification.category_hints.length > 0) {
            infoText += `Categoria rilevata: ${classification.category_hints.join(', ')}.`;
        }

        if (infoText) {
            showNotification(infoText, 'info');
        }
    }
}

async function handleOCRFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const offerData = Object.fromEntries(formData.entries());

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
        // Error handled in saveOfferToDatabase
    }
}

// ===== UI FUNCTIONS =====
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

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

    showNotification('Funzione di modifica in sviluppo', 'info');
}

async function confirmDeleteOffer(offerId) {
    if (confirm('Sei sicuro di voler eliminare questa offerta?')) {
        await deleteOfferFromDatabase(offerId);
    }
}

function updateAnalytics() {
    showNotification('Sezione analisi in sviluppo', 'info');
}

// ===== UTILITY FUNCTIONS =====
function updateProgress(percentage, text) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressText) progressText.textContent = text;
}

function showLoadingState(show) {
    const loader = document.getElementById('main-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);

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
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
});

if (typeof window !== 'undefined') {
    window.debugApp = {
        offers,
        loadOffersFromDatabase,
        saveOfferToDatabase,
        updateOfferInDatabase,
        deleteOfferFromDatabase
    };
}
