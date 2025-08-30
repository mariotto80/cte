// Stato viewer
let pdfInstance = null;
let scale = 1.0;
let currentPage = 1;

const el = (id) => document.getElementById(id);
const viewport = el('pdfViewport');

const fileInput = el('fileInput');
const prevBtn = el('prevBtn');
const nextBtn = el('nextBtn');
const pageNumEl = el('pageNum');
const pageCountEl = el('pageCount');
const zoomIn = el('zoomIn');
const zoomOut = el('zoomOut');
const zoomLevel = el('zoomLevel');
const pageMode = el('pageMode');
const ocrBtn = el('ocrBtn');
const ocrText = el('ocrText');
const ocrProgress = el('ocrProgress');
const downloadBtn = el('downloadBtn');

const fornitoreSelect = el('fornitoreSelect');
const spreadInput = el('spreadInput');
const fissoInput = el('fissoInput');
const scadenzaInput = el('scadenzaInput');

const FORNITORI_AMMESSI = [
  'A2A','EDISON','DUFERCO','SINERGY','SORGENIA','ITALPOWER','SEGNO VERDE'
];

const FORNITORI_ALIAS = [
  ['A2A','A2A ENERGIA'],
  ['EDISON','EDISON ENERGIA'],
  ['DUFERCO','DUFERCO ENERGIA'],
  ['SINERGY','SINERGY','SINERGIA'],
  ['SORGENIA','SORGENIA SPA','SORGENIA S.P.A.'],
  ['ITALPOWER','ITAL POWER','ITALPOWER SRL'],
  ['SEGNO VERDE','SEGNO VERDE ENERGIA','SEGNO VERDE S.R.L.'],
];

function normalizeBrand(s){
  return s.toUpperCase()
    .replace(/\s+/g,' ')
    .replace(/[.,]/g,'')
    .replace(/\bS\.?P\.?A\.?\b/g,'')
    .replace(/\bSRL\b/g,'')
    .trim();
}

function mapToFornitore(text){
  const norm = normalizeBrand(text);
  for(const [canon, ...aliases] of FORNITORI_ALIAS){
    if (norm === canon) return canon;
    if (aliases.some(a => norm.includes(normalizeBrand(a)))) return canon;
  }
  // fuzzy semplice
  for(const [canon] of FORNITORI_ALIAS){
    if (norm.includes(canon)) return canon;
  }
  return '';
}

async function loadPDF(file){
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
  pdfInstance = await loadingTask.promise;
  currentPage = 1;
  pageCountEl.textContent = pdfInstance.numPages;
  pageNumEl.textContent = currentPage;
  prevBtn.disabled = nextBtn.disabled = zoomIn.disabled = zoomOut.disabled = false;
  ocrBtn.disabled = false;
  downloadBtn.disabled = false;
  render();
}

async function render(){
  viewport.innerHTML = '';
  const mode = pageMode.value;
  if (mode === 'single'){
    const page = await pdfInstance.getPage(currentPage);
    const canvas = await renderPageToCanvas(page, scale);
    appendPage(canvas);
  } else {
    for (let p=1; p<=pdfInstance.numPages; p++){
      const page = await pdfInstance.getPage(p);
      const canvas = await renderPageToCanvas(page, scale);
      appendPage(canvas, p);
    }
  }
  pageNumEl.textContent = currentPage;
  zoomLevel.textContent = Math.round(scale*100)+'%';
}

async function renderPageToCanvas(page, scaleFactor){
  const viewport = page.getViewport({ scale: scaleFactor });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d', { willReadFrequently:true });
  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;
  return canvas;
}

function appendPage(canvas, pageNum){
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-page';
  if (pageNum) {
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = 'Pagina ' + pageNum;
    cap.style.marginBottom = '6px';
    cap.style.color = '#9aa4b2';
    wrapper.appendChild(cap);
  }
  wrapper.appendChild(canvas);
  viewport.appendChild(wrapper);
}

prevBtn.addEventListener('click', async ()=>{
  if (currentPage>1){ currentPage--; await render(); }
});
nextBtn.addEventListener('click', async ()=>{
  if (currentPage<pdfInstance.numPages){ currentPage++; await render(); }
});
zoomIn.addEventListener('click', async ()=>{ scale = Math.min(scale+0.1, 3); await render(); });
zoomOut.addEventListener('click', async ()=>{ scale = Math.max(scale-0.1, 0.5); await render(); });
pageMode.addEventListener('change', render);

fileInput.addEventListener('change', async (e)=>{
  const file = e.target.files?.;
  if (!file) return;
  await loadPDF(file);
  // abilita download del file caricato
  downloadBtn.onclick = ()=> {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };
});

async function ocrROIFromCanvas(canvas, x, y, w, h){
  const sub = document.createElement('canvas');
  sub.width = w; sub.height = h;
  const sctx = sub.getContext('2d');
  sctx.drawImage(canvas, x,y,w,h, 0,0,w,h);
  // scala di grigi semplice
  const img = sctx.getImageData(0,0,w,h);
  const data = img.data;
  for (let i=0;i<data.length;i+=4){
    const gray = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2];
    data[i]=data[i+1]=data[i+2]=gray;
  }
  sctx.putImageData(img,0,0);

  const { createWorker } = Tesseract;
  const worker = await createWorker('ita', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/worker.min.js'
  });

  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .&/-',
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
    tessedit_pageseg_mode: '6'
  });

  const res = await worker.recognize(sub);
  await worker.terminate();
  return res.data.text || '';
}

async function runOCR(){
  if (!pdfInstance) return;
  ocrText.textContent = '';
  ocrProgress.textContent = 'Elaborazione...';

  // usa sempre la prima pagina
  const page = await pdfInstance.getPage(1);
  const canvas = await renderPageToCanvas(page, 1.5); // maggiore risoluzione per OCR

  const W = canvas.width, H = canvas.height;

  // ROI header sinistro: 35% larghezza, 25% altezza
  let x=0, y=0, w=Math.floor(W*0.35), h=Math.floor(H*0.25);
  let headerText = await ocrROIFromCanvas(canvas, x,y,w,h);

  // mappatura su lista chiusa
  let brand = mapToFornitore(headerText);
  if (!brand){
    // fallback: header intero
    w = W; h = Math.floor(H*0.25);
    headerText = await ocrROIFromCanvas(canvas, 0,0,w,h);
    brand = mapToFornitore(headerText);
  }
  if (!brand){
    // fallback: pagina intera
    headerText = await ocrROIFromCanvas(canvas, 0,0,W,H);
    brand = mapToFornitore(headerText);
  }

  if (brand){
    fornitoreSelect.value = brand;
  }

  // esempio semplice di estrazioni addizionali da testo
  const text = headerText;
  // spread tipico: 0,012 oppure 0.012 €/kWh
  const spreadMatch = text.match(/([0-9]+[.,][0-9]{3,})\s*(€|eur)?\s*\/?\s*kwh/i);
  if (spreadMatch) spreadInput.value = spreadMatch.replace('.',',');

  // scadenza gg/mm/aaaa
  const dateMatch = text.match(/\b([0-3]?\d)[\/\-](?\d)[\/\-](20\d{2})\b/);
  if (dateMatch) scadenzaInput.value = `${dateMatch.padStart(2,'0')}/${dateMatch.padStart(2,'0')}/${dateMatch}`;

  ocrText.textContent = headerText.trim();
  ocrProgress.textContent = 'Completato';
}

ocrBtn.addEventListener('click', runOCR);

// Archivio demo in localStorage
function getArchive(){
  const raw = localStorage.getItem('gestoffer_v3') || '[]';
  return JSON.parse(raw);
}
function setArchive(arr){
  localStorage.setItem('gestoffer_v3', JSON.stringify(arr));
  renderCards();
}

function buildOffer(){
  return {
    fornitore: fornitoreSelect.value,
    spread: spreadInput.value,
    fisso: fissoInput.value,
    scadenza: scadenzaInput.value,
    societa: el('societaFilter').value || 'PMI',
    createdAt: new Date().toISOString()
  };
}

function renderCards(){
  const cardsEl = document.getElementById('cards');
  const societaF = el('societaFilter').value;
  const fornitoreF = el('fornitoreFilter').value;
  const data = getArchive().filter(o =>
    (!societaF || o.societa===societaF) &&
    (!fornitoreF || o.fornitore===fornitoreF)
  );
  cardsEl.innerHTML = '';
  data.forEach(o=>{
    const c = document.createElement('div'); c.className='card';
    c.innerHTML = `
      <div class="badge">${o.societa}</div>
      <h3>${o.fornitore || '—'}</h3>
      <p>Spread: ${o.spread || '—'}</p>
      <p>Fisso: ${o.fisso || '—'}</p>
      <p>Scadenza: ${o.scadenza || '—'}</p>
      <small>${new Date(o.createdAt).toLocaleString()}</small>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="save">Salva</button>
        <button class="del">Elimina</button>
      </div>
    `;
    c.querySelector('.save').onclick = ()=>{
      const arr = getArchive();
      arr.push(o);
      setArchive(arr);
    };
    c.querySelector('.del').onclick = ()=>{
      const arr = getArchive().filter(x=>x!==o);
      setArchive(arr);
    };
    document.getElementById('cards').appendChild(c);
  });
}
document.getElementById('societaFilter').addEventListener('change', renderCards);
document.getElementById('fornitoreFilter').addEventListener('change', renderCards);

// primo render cards
renderCards();
