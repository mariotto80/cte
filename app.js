// ===== OCR MIGLIORATO: NOME FILE = NOME OFFERTA ===== 

/**
 * Elabora il file con OCR e mostra riassunto (VERSIONE MIGLIORATA)
 */
async function processFileWithOCR(file) {
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
        showNotification('❌ Formato non supportato. Usa PDF o immagini (JPG, PNG).', 'error');
        updateProcessingStatus('error', 'Formato file non supportato');
        return;
    }

    console.log('🔍 Inizio OCR per:', file.name);
    updateProcessingStatus('processing', 'Elaborazione OCR in corso...');

    try {
        // Simula elaborazione OCR
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ESTRAE NOME OFFERTA DAL NOME FILE
        let nomeOffertaEstratto = file.name
            .replace(/\.[^/.]+$/, "") // Rimuove estensione
            .replace(/[_-]/g, ' ')    // Sostituisce _ e - con spazi
            .replace(/\s+/g, ' ')     // Normalizza spazi multipli
            .trim();

        // Capitalizza ogni parola
        nomeOffertaEstratto = nomeOffertaEstratto
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        // Se troppo lungo, accorcia
        if (nomeOffertaEstratto.length > 50) {
            nomeOffertaEstratto = nomeOffertaEstratto.substring(0, 50) + '...';
        }

        // Se troppo corto o generico, usa default
        if (nomeOffertaEstratto.length < 3 || nomeOffertaEstratto.match(/^(file|document|doc|pdf|img)/i)) {
            nomeOffertaEstratto = 'Offerta Standard';
        }

        // Estrae possibile fornitore dal nome file
        let fornitoreEstratto = 'Fornitore Estratto';
        const possibiliNomi = ['enel', 'eni', 'acea', 'edison', 'engie', 'a2a', 'hera', 'iren', 'green', 'energy'];
        const nomeFileLower = file.name.toLowerCase();

        for (const nome of possibiliNomi) {
            if (nomeFileLower.includes(nome)) {
                fornitoreEstratto = nome.charAt(0).toUpperCase() + nome.slice(1) + ' Energia';
                break;
            }
        }

        // Dati mock OCR estratti
        const extractedData = {
            fornitore: fornitoreEstratto,
            nome_offerta: nomeOffertaEstratto, // USA IL NOME DEL FILE
            categoria: 'Domestico',
            tipo_prezzo: 'Fisso',
            prezzo_luce: Math.round((Math.random() * 0.1 + 0.15) * 10000) / 10000,
            prezzo_gas: Math.round((Math.random() * 0.5 + 0.8) * 10000) / 10000,
            quota_fissa_luce: Math.round((Math.random() * 10 + 10) * 100) / 100,
            quota_fissa_gas: Math.round((Math.random() * 8 + 8) * 100) / 100,
            commissioni: 0.00,
            scadenza: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
            durata_mesi: 12,
            confidence: Math.round((Math.random() * 0.2 + 0.8) * 100) // 80-100%
        };

        ocrResults = extractedData;
        updateProcessingStatus('success', 'OCR completato con successo!');
        showOCRSummary(extractedData);
        populateOCRForm(extractedData);

        showNotification('✅ OCR completato! Nome offerta estratto dal file.', 'success');

    } catch (error) {
        console.error('❌ Errore OCR:', error);
        updateProcessingStatus('error', 'Errore durante elaborazione OCR');
        showNotification('❌ Errore durante elaborazione OCR: ' + error.message, 'error');
    }
}

/**
 * Mostra anteprima del file caricato (VERSIONE DEBUG)
 */
async function showFilePreview(file) {
    console.log('📄 Creazione anteprima per:', file.name);

    let previewContainer = document.getElementById('file-preview-container');

    if (!previewContainer) {
        // Crea container anteprima se non esiste
        previewContainer = document.createElement('div');
        previewContainer.id = 'file-preview-container';
        previewContainer.className = 'file-preview-container';

        const uploadContainer = document.querySelector('.upload-container');
        if (uploadContainer) {
            uploadContainer.appendChild(previewContainer);
        } else {
            // Fallback: aggiungi dopo upload area
            const uploadArea = document.getElementById('upload-area');
            if (uploadArea && uploadArea.parentNode) {
                uploadArea.parentNode.insertBefore(previewContainer, uploadArea.nextSibling);
            }
        }
    }

    // Informazioni file
    const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
    const fileType = file.type || 'Tipo non identificato';

    let previewContent = '';
    let thumbnailHtml = '';

    // Genera thumbnail basato sul tipo
    if (file.type.includes('pdf')) {
        thumbnailHtml = `
            <div class="file-thumbnail pdf-thumb">
                <i class="fas fa-file-pdf"></i>
                <span class="file-type">PDF</span>
            </div>
        `;
    } else if (file.type.includes('image')) {
        // Crea anteprima immagine
        const imageUrl = URL.createObjectURL(file);
        thumbnailHtml = `
            <div class="file-thumbnail image-thumb">
                <img src="${imageUrl}" alt="Anteprima ${file.name}" onload="console.log('Immagine caricata'); this.style.opacity=1;" style="opacity:0; transition: opacity 0.3s;">
            </div>
        `;
    } else {
        thumbnailHtml = `
            <div class="file-thumbnail unknown-thumb">
                <i class="fas fa-file"></i>
                <span class="file-type">FILE</span>
            </div>
        `;
    }

    previewContent = `
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
                    <h5>${file.name}</h5>
                    <div class="file-meta">
                        <span class="meta-item">
                            <i class="fas fa-weight-hanging"></i>
                            ${fileSize} MB
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-file-alt"></i>
                            ${file.type.split('/')[1]?.toUpperCase() || 'N/D'}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${new Date().toLocaleString('it-IT')}
                        </span>
                    </div>
                </div>

                <div class="processing-status">
                    <div class="status-indicator processing">
                        <div class="status-spinner"></div>
                        <span>Elaborazione OCR in corso...</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="ocr-summary" id="ocr-summary" style="display: none;">
            <!-- Il riassunto OCR verrà inserito qui -->
        </div>
    `;

    previewContainer.innerHTML = previewContent;

    // FORZA LA VISIBILITÀ 
    previewContainer.style.display = 'block';
    previewContainer.style.visibility = 'visible';
    previewContainer.style.opacity = '1';
    previewContainer.classList.add('debug-visible');

    console.log('🎯 Container anteprima creato:', previewContainer);
    console.log('🎯 Display style:', window.getComputedStyle(previewContainer).display);
    console.log('🎯 Visibility:', window.getComputedStyle(previewContainer).visibility);

    // Smooth scroll to preview
    setTimeout(() => {
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

/**
 * Setup migliorato event listeners (OVERRIDE)
 */
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

    // Theme toggle - NUOVO POSIZIONAMENTO
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Rimuovi da posizione fissa e metti nelle actions
        const headerActions = document.querySelector('.header__actions');
        if (headerActions && themeToggle.parentNode !== headerActions) {
            headerActions.insertBefore(themeToggle, headerActions.firstChild);
        }
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Upload OCR - LISTENER MIGLIORATI
    const fileInput = document.getElementById('pdf-file');
    const dropZone = document.getElementById('upload-area');

    if (fileInput && dropZone) {
        // Remove existing listeners
        fileInput.removeEventListener('change', handleFileSelect);
        dropZone.removeEventListener('drop', handleFileDrop);

        // Add new listeners
        fileInput.addEventListener('change', handleFileSelect);

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
            dropZone.style.borderColor = '#667eea';
            dropZone.style.background = '#f0f4ff';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
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

    console.log('✅ Event listeners configurati con anteprima migliorata');
}

console.log('✅ OCR e UI fix caricati - Nome file diventa nome offerta');
