// ------------ Inizio file app.js --------------
(function() {
  // API key for OCR
  const OCR_CONFIG = {
    googleVision: {
      apiKey: 'AIzaSyCtiM1gEiDUaQo-8xXYHia7oOJcx1JArI4',
      endpoint: 'https://vision.googleapis.com/v1/images:annotate'
    },
    ocrSpace: {
      apiKey: 'K85701396588957',
      endpoint: 'https://api.ocr.space/parse/image'
    },
    tesseract: { enabled: true, lang: 'ita+eng' },
    timeouts: { perEngineMs: 30000 }
  };
  
  // Variabili globali
  let currentFile = null;
  let currentOfferData = null;
  let offers = [];
  let currentPage = 1;
  const pageSize = 10;
  
  // ----------- Utility UI functions ---------
  function showNotification(msg, type='info') { console.log(`[${type}] ${msg}`); }
  function updateProcessingStatus(state, msg='') { console.log(`[${state}] ${msg}`); }
  function showOCRSummary(data) {
    const container = document.querySelector('.ocr-summary');
    if (!container) return;
    container.innerHTML = `
      <strong>Riassunto OCR</strong>
      <div>
        Fornitore: ${data.fornitore || '—'}<br>
        Offerta: ${data.nome_offerta || '—'}<br>
        Luce: ${data.prezzo_luce ?? '—'} €/kWh<br>
        Gas: ${data.prezzo_gas ?? '—'} €/Smc<br>
        Quota Luce: ${data.quota_fissa_luce ?? '—'}<br>
        Quota Gas: ${data.quota_fissa_gas ?? '—'}<br>
        Scadenza: ${data.scadenza || '—'}<br>
        Durata: ${data.durata_mesi ?? '—'} mesi
      </div>
    `;
  }
  function populateOCRForm(data) {
    const form = document.getElementById('ocr-form');
    if (!form) return;
    form.querySelector('input[name="fornitore"]').value= data.fornitore||'';
    form.querySelector('input[name="nome_offerta"]').value= data.nome_offerta||'';
    form.querySelector('input[name="prezzo_luce"]').value= data.prezzo_luce ?? '';
    form.querySelector('input[name="prezzo_gas"]').value= data.prezzo_gas ?? '';
    form.querySelector('input[name="quota_fissa_luce"]').value= data.quota_fissa_luce ?? '';
    form.querySelector('input[name="quota_fissa_gas"]').value= data.quota_fissa_gas ?? '';
    form.querySelector('input[name="scadenza"]').value= data.scadenza || '';
    form.querySelector('input[name="durata_mesi"]').value= data.durata_mesi ?? '';
  }
  
  // ----------- Upload and preview ----------
  function initUpload() {
    const fileInput = document.getElementById('pdf-file');
    const dropZone = document.getElementById('upload-area');
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        loadFile(fileInput.files[0]);
      }
    });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault(); dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        loadFile(e.dataTransfer.files[0]);
      }
    });
    dropZone.addEventListener('click', () => { fileInput.click(); });
  }
  
  function loadFile(file) {
    currentFile = file;
    showPreview(file);
    processFileOCR(file);
  }
  function showPreview(file) {
    const container = document.getElementById('file-preview-container');
    container.style.display='block';
    const sizeMB = (file.size/1024/1024).toFixed(2);
    let thumbHTML=''; if (file.type.includes('image')) {
      const url= URL.createObjectURL(file);
      thumbHTML=`<div class="file-thumbnail image-thumb"><img src="${url}" /></div>`;
    } else if (file.type.includes('pdf')) {
      thumbHTML=`<div class="file-thumbnail pdf-thumb">PDF</div>`;
    } else {
      thumbHTML=`<div class="file-thumbnail"><i>FILE</i></div>`;
    }
    container.innerHTML= `
      <div class="preview-header">
        <strong>Anteprima file</strong>
        <button id="btn-remove-file" style="border:none; background:rgba(255,255,255,0.2);color:#fff;padding:4px 8px;border-radius:6px;">Rimuovi</button>
      </div>
      <div class="preview-body">
        ${thumbHTML}
        <div>
          <div style="font-weight:600">${file.name}</div>
          <div style="font-size:12px; color:#64748b">${file.type} • ${sizeMB} MB</div>
        </div>
      </div>
    `;
    document.getElementById('btn-remove-file').addEventListener('click', ()=> {
      document.getElementById('file-preview-container').innerHTML=''; 
      document.getElementById('file-preview-container').style.display='none';
      document.getElementById('pdf-file').value='';
    });
  }
  
  // ----------- OCR processing ----------
  async function processFileOCR(file) {
    try {
      updateProcessingStatus('processing','Preprocessing...');
      const blob= await preprocessImage(file);
      updateProcessingStatus('processing','Running OCR...');
      const result= await runOCR(blob || file);
      showOCRSummary(result.data);
      populateOCRForm(result.data);
      showNotification(`OCR completato (${result.confidence}%)`, 'success');
    } catch(e) {
      console.log('OCR fallback:', e);
      // fallback dummy
      const fallback= { fornitore:'', nome_offerta:'', prezzo_luce:null, prezzo_gas:null, quota_fissa_luce:null, quota_fissa_gas:null, scadenza:'', durata_mesi:12};
      showOCRSummary(fallback);
      populateOCRForm(fallback);
      showNotification('OCR fallback attivato', 'warn');
    }
  }
  async function preprocessImage(file) {
    return new Promise((res, rej)=>{
      const img= new Image();
      img.onload= ()=> {
        const canvas= document.createElement('canvas');
        const ctx= canvas.getContext('2d');
        const maxW= 3000;
        const scale= Math.min(maxW / img.width, 2);
        const w= Math.round(img.width*scale);
        const h= Math.round(img.height*scale);
        canvas.width=w; canvas.height=h;
        ctx.filter='contrast(1.15) brightness(1.05)';
        ctx.drawImage(img,0,0,w,h);
        canvas.toBlob(b=> res(b), 'image/png', 0.95);
      };
      img.src=URL.createObjectURL(file);
    });
  }
  async function runOCR(blobOrFile) {
    const results= [];
    // Google Vision
    if (OCR_CONFIG.googleVision.apiKey) {
      results.push( await ocrGoogleVision(blobOrFile));
    }
    // OCR.space
    if (OCR_CONFIG.ocrSpace.apiKey) {
      results.push( await ocrSpace(blobOrFile));
    }
    // Tesseract
    if (OCR_CONFIG.tesseract.enabled && typeof Tesseract !== 'undefined') {
      results.push( await ocrTesseract(blobOrFile));
    }
    if (results.length===0) throw new Error('Nessun risultato OCR');
    // Ordina per conf
    results.sort((a,b)=> (b.confidence||0)-(a.confidence||0));
    const best= results[0];
    const text= best.text;
    // merge se conf<90
    let finalText= text;
    if (best.confidence<90 && results.length>1) {
      finalText= results.map(r=>r.text).join('\n');
    }
    // extract dati
    const data= extractEnergyData(finalText, file.name);
    // calcola conf media
    const avgConf= Math.round (results.reduce((s,r)=>s+ (r.confidence||0),0)/results.length);
    return { data, confidence: avgConf, text: finalText };
  }

  async function ocrGoogleVision(blob) {
    const base64= await toBase64(blob);
    const body= { requests: [{ image: { content: String(base64).split(',')[1]}, features: [{ type:'DOCUMENT_TEXT_DETECTION', maxResults:1}], imageContext:{languageHints:['it','en']} }] };
    const ac= new AbortController();
    const t= setTimeout(()=> ac.abort(), OCR_CONFIG.timeouts.perEngineMs);
    const res= await fetch(`${OCR_CONFIG.googleVision.endpoint}?key=${OCR_CONFIG.googleVision.apiKey}`,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: ac.signal});
    clearTimeout(t);
    const json= await res.json();
    const error= json?.responses?.[0]?.error;
    if (error) throw new Error('Vision error: '+ error.message);
    const txt= json?.responses?.[0]?.fullTextAnnotation?.text || '';
    const conf= estimateConfidence(txt);
    return { text: txt, confidence: conf };
  }

  async function ocrSpace(blob) {
    const form= new FormData();
    form.append('file', blob, 'file.png');
    form.append('language','ita');
    form.append('isOverlayRequired','false');
    form.append('detectOrientation','true');
    form.append('scale','true');
    form.append('OCREngine','2');
    const ac= new AbortController();
    const t= setTimeout(()=> ac.abort(), OCR_CONFIG.timeouts.perEngineMs);
    const res= await fetch(OCR_CONFIG.ocrSpace.endpoint, {method:'POST', headers:{apicallback:'none','apikey':OCR_CONFIG.ocrSpace.apiKey}, body:form, signal: ac.signal});
    clearTimeout(t);
    const json= await res.json();
    const parsed= Array.isArray(json?.ParsedResults)? json.ParsedResults[0]: null;
    const txt= parsed?.ParsedText || '';
    if (!txt) throw new Error('OCR.space: nessun testo');
    return { text: txt, confidence:80 };
  }
  async function ocrTesseract(blob) {
    const { data }= await Tesseract.recognize(blob, OCR_CONFIG.tesseract.lang, { workerBlobURL:false, logger: m=> m.status==='recognizing text' && updateProcessingStatus('processing', `Tesseract ${Math.round(m.progress*100)}%`) });
    return { text: data?.text || '', confidence: Math.round(data?.confidence||70) };
  }
  
  function estimateConfidence(text) {
    const len= (text||'').length;
    if (len>4000) return 94;
    if (len>2000) return 92;
    if (len>800) return 90;
    return 85;
  }
  
  function toBase64(file)=> new Promise((res,rej)=>{const r= new FileReader(); r.onload= ()=>res(r.result); r.onerror= rej; r.readAsDataURL(file);});
  
  // ----------- Parsing energy data
  function extractEnergyData(txt, filename) {
    const low= (txt||'').toLowerCase();
    let forn=''; let nome=''; let cat=''; let tp=''; let prezzo=null; let spread=null; let quota=null; let scad=''; let durata=12;
    // Fornitore
    const fornMap={enel:'Enel Energia', eni:'Eni', edison:'Edison', a2a:'A2A', acea:'Acea', hera:'Hera', iren:'Iren', engie:'Engie', sorgenia:'Sorgenia', illumia:'Illumia',pulsee:'Pulsee',octopus:'Octopus', wekiwi:'Wekiwi' };
    for (const [k,v] of Object.entries(fornMap)){
      if (low.includes(k)) { forn= v; break; }
    }
    if (!forn) {
      const f= filename.toLowerCase();
      for (const [k,v] of Object.entries(fornMap)){
        if (f.includes(k)) { forn= v; break;}
      }
    }
    // Nome offerta
    const regOff= /offerta[:\s]+([^\n\r]{5,60})/i;
    const matchOff= low.match(regOff);
    if (matchOff) { nome= titleCase(matchOff[1].replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,' ').trim()); }
    else {
      const base= filename.replace(/\.[^/.]+$/,'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim();
      nome= titleCase(base);
    }
    // Prezzi luce e gas
    function num(rgx) {
      const m= low.match(rgx);
      if (!m) return null;
      const v= parseFloat(m[1].replace(',','.'));
      return isNaN(v)? null: v;
    }
    // Prezzo luce
    prezzo= num(/prezzo.*luce.*[\€]?\s*(\d+[,.]?\d*)/i) || num(/energia.*elettrica.*[\€]?\s*(\d+[,.]?\d*)/i) || num(/componente.*energia.*[\€]?\s*(\d+[,.]?\d*)/i);
    // Spread luce
    spread= num(/spread.*luce.*[\€]?\s*(\d+[,.]?\d*)/i);
    // Prezzo gas
    if (!prezzo) prezzo= num(/prezzo.*gas.*[\€]?\s*(\d+[,.]?\d*)/i);
    else if (!spread) spread= num(/spread.*gas.*[\€]?\s*(\d+[,.]?\d*)/i);
    // Quote fisse
    quota= num(/quota.*fissa.*(luce|gas).*[\€]?\s*(\d+[,.]?\d*)/i) || null;
    // Scadenza
    scad= parseDate(low) || '';
    // Durata
    const durMatch= low.match(/(\d{1,2})\s*mesi/);
    durata= durMatch? parseInt(durMatch[1],10):12;
    // Tipo prezzo
    tp= /variabile|indicizzato|fluttuante/i.test(low) ? 'Variabile':'Fisso';

    return {
      fornitore: forn,
      nome_offerta: nome,
      categoria: /residenziale|casa|famiglia/i.test(low)?'Domestico':/micro|impres[aie]/i.test(low)?'Micro':'PMI',
      tipo_prezzo: tp,
      prezzo_luce: prezzo,
      spread_luce: spread,
      quota_fissa_luce: null,
      prezzo_gas: prezzo,
      spread_gas: spread,
      quota_fissa_gas: null,
      scadenza: scad,
      durata_mesi: durata
    };
  }
  function parseDate(str) {
    const d= str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!d) return null;
    const day= parseInt(d[1],10); const month= parseInt(d[2],10)-1; const year= parseInt(d[3],10);
    const date= new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date;
  }
  function titleCase(str){ return str.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');}
  
  // ----------- Rendering tabella offerte --------
  async function renderOffers() {
    const tbody= document.querySelector('#offers-table tbody');
    tbody.innerHTML='';
    for (const off of offers) {
      const{ commodityLabel, commodityClass }= determineCommodity(off);
      const { valueDisplay, quotaDisplay }= determinePriceSpread(off, commodityLabel);
      const tip= off.tipo_prezzo?.toLowerCase()==='variabile' ?"Variabile":"Fisso";
      const cat= off.categoria || '—';
      const forn=off.fornitore||'—';
      const nome=off.nome_offerta||'—';
      const scad= off.scadenza||'—';
      const row= document.createElement('tr');
      row.innerHTML= `
        <td class="col-fornitore">${forn}</td>
        <td class="col-nome">${nome}</td>
        <td class="col-categoria"><span class="categoria-badge categoria-${cat.toLowerCase()}">${cat}</span></td>
        <td class="col-tipo"><span class="tipo-badge tipo-${tip.toLowerCase()}">${tip}</span></td>
        <td class="col-commodity"><span class="commodity-badge ${commodityClass}">${commodityLabel}</span></td>
        <td class="col-valore">${valueDisplay}</td>
        <td class="col-quota">${quotaDisplay}</td>
        <td class="col-scadenza">${scad}</td>
        <td class="col-azioni">
          <button class="btn-edit" data-id="${off.id}">Modifica</button>
          <button class="btn-delete" data-id="${off.id}">Elimina</button>
        </td>
      `;
      tbody.appendChild(row);
    }
    setupOfferButtons();
  }
  function determineCommodity(offer) {
    const lu= offer.prezzo_luce || offer.spread_luce || offer.quota_fissa_luce;
    const ga= offer.prezzo_gas || offer.spread_gas || offer.quota_fissa_gas;
    if (lu || (offer.prezzo_luce||0)>0 || (offer.spread_luce||0)>0 || (offer.quota_fissa_luce||0)>=0) {
      return { commodityLabel:'Luce', commodityClass:'commodity-luce' };
    } else if (ga || (offer.prezzo_gas||0)>0 || (offer.spread_gas||0)>0 || (offer.quota_fissa_gas||0)>=0) {
      return { commodityLabel:'Gas', commodityClass:'commodity-gas' };
    } else {
      return { commodityLabel:'Luce', commodityClass:'commodity-luce' };
    }
  }
  function determinePriceSpread(offer, commodityLabel) {
    const isVar= offer.tipo_prezzo?.toLowerCase()==='variabile';
    const prezzo= offer.prezzo_luce ?? offer.prezzo_gas ?? null;
    const spread= offer.spread_luce ?? offer.spread_gas ?? null;
    const showUnit= (offer.prezzo_luce!=null)?'€/kWh':'€/Smc';
    if (isVar) {
      return { valueDisplay: `<div class="valore-container"><div class="valore-principale">${formatNumber(spread)} <span class="valore-unita">${showUnit}</span></div><div class="valore-tipo">Spread</div></div>`, quotaDisplay:'—' };
    } else {
      return { valueDisplay: `<div class="valore-container"><div class="valore-principale">${formatNumber(prezzo)} <span class="valore-unita">${showUnit}</span></div><div class="valore-tipo">Prezzo</div></div>`, quotaDisplay: (offer.quota_fissa_luce||offer.quota_fissa_gas)? `${formatNumber(offer.quota_fissa_luce ?? offer.quota_fissa_gas)} €/mese` : '—' };
    }
  }
  function formatNumber(val) {
    return val==null || isNaN(val)? '—': Number(val).toFixed(4);
  }
  // ----------- Next, setup buttons ---------
  function setupOfferButtons() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.onclick= ()=> alert('Modifica offerta '+ btn.dataset.id);
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick= ()=> { if (confirm('Elimina offerta?')) { /* implementa */ renderOffers(); } }
    });
  }
  
  // ----------- Ottieni Offerte ---------
  async function loadOffers() {
    // Qui va il metodo di caricamento da db o API
    // Per esempio, dummy:
    return offers; // se già caricati
  }
  // ----------- Evento form salva ---------
  document.getElementById('ocr-form').addEventListener('submit', async(e) => {
    e.preventDefault();
    const form= e.target;
    const data= Object.fromEntries(new FormData(form));
    // Converti numeri
    ['prezzo_luce','prezzo_gas','quota_fissa_luce','quota_fissa_gas','commissioni','durata_mesi'].forEach(n=> {
      data[n]= parseFloat(data[n])||null;
    });
    // Salva l’offerta
    await saveOffer(data);
    alert('Offerta salvata');
    form.reset();
    renderOffers();
  });
  async function saveOffer(data) {
    // Qui va la logica di salvataggio (db, API, localStorage)
    const newId= Date.now().toString()+Math.random().toString(36).substr(2,5);
    const newOffer= { id: newId, ...data, created_at: new Date().toISOString() };
    offers.push(newOffer);
  }
  
  // ----------- Inizializza ---------
  document.addEventListener('DOMContentLoaded', ()=> {
    initUpload();
    // Carica offerte esempio
    offers= [
      { id:'1', fornitore:'Enel', nome_offerta:'Offerta Casa', categoria:'Domestico', tipo_prezzo:'Fisso', prezzo_luce:0.25, prezzo_gas:0.85, quota_fissa_luce:12, quota_fissa_gas:10, scadenza:'2025-12-31', durata_mesi:12 },
      { id:'2', fornitore:'Edison', nome_offerta:'Edison Variabile', categoria:'Micro', tipo_prezzo:'Variabile', spread_luce:0.015, spread_gas:0.02, scadenza:'2026-01-31', durata_mesi:24 }
    ];
    renderOffers();
  });
})();
