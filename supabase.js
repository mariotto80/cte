# Creo tutti i file pronti per integrazione Supabase semplice

# 1. File supabase.js - Configurazione e funzioni complete
supabase_js_content = '''// supabase.js - Configurazione Completa Supabase
// 🔧 IMPORTANTE: Sostituisci questi valori con i tuoi!
const SUPABASE_URL = 'https://ozmqftibxuspznnqaayh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bXFmdGlieHVzcHpubnFhYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUwNTQsImV4cCI6MjA3MjIyMTA1NH0._Z8pGoW_Yc6PiazF-6jxwVknmJ9vh4WLotN6bPRK1Kk'

// Inizializza client Supabase
const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ===== AUTENTICAZIONE =====
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { 
                data: { 
                    full_name: fullName 
                } 
            }
        })
        
        return { data, error }
    } catch (error) {
        return { data: null, error }
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        })
        
        return { data, error }
    } catch (error) {
        return { data: null, error }
    }
}

async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut()
        return { error }
    } catch (error) {
        return { error }
    }
}

async function getCurrentUser() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser()
        return user
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

// ===== GESTIONE OFFERTE =====
async function saveOffer(offerData) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            throw new Error('Devi essere loggato per salvare offerte')
        }
        
        // Prepara i dati per il database
        const dbData = {
            user_id: user.id,
            fornitore: offerData.fornitore || '',
            nome_offerta: offerData.nome_offerta || '',
            categoria: offerData.categoria || 'Domestico',
            tipo_prezzo: offerData.tipo_prezzo || 'Fisso',
            prezzo_luce: parseFloat(offerData.prezzo_luce) || 0,
            spread_luce: parseFloat(offerData.spread_luce) || 0,
            prezzo_gas: parseFloat(offerData.prezzo_gas) || 0,
            spread_gas: parseFloat(offerData.spread_gas) || 0,
            quota_fissa_luce: parseFloat(offerData.quota_fissa_luce) || 0,
            quota_fissa_gas: parseFloat(offerData.quota_fissa_gas) || 0,
            commissioni: parseFloat(offerData.commissioni) || 0,
            scadenza: offerData.scadenza || new Date().toISOString().split('T')[0],
            durata_mesi: parseInt(offerData.durata_mesi) || 12,
            confidence_score: parseFloat(offerData.confidence_score) || 0.8,
            pdf_filename: offerData.pdf_filename || '',
            attivo: true
        }
        
        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .insert([dbData])
            .select()
        
        if (error) throw error
        
        return { data: data[0], error: null }
        
    } catch (error) {
        console.error('Errore salvataggio offerta:', error)
        return { data: null, error }
    }
}

async function loadOffers(filters = {}) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            throw new Error('Devi essere loggato per vedere le offerte')
        }
        
        let query = supabaseClient
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id)
            .eq('attivo', true)
            .order('created_at', { ascending: false })
        
        // Applica filtri se presenti
        if (filters.categoria) {
            query = query.eq('categoria', filters.categoria)
        }
        if (filters.fornitore) {
            query = query.eq('fornitore', filters.fornitore)
        }
        if (filters.tipo_prezzo) {
            query = query.eq('tipo_prezzo', filters.tipo_prezzo)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        return { data: data || [], error: null }
        
    } catch (error) {
        console.error('Errore caricamento offerte:', error)
        return { data: [], error }
    }
}

async function updateOffer(offerId, updates) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            throw new Error('Devi essere loggato per modificare offerte')
        }
        
        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .update(updates)
            .eq('id', offerId)
            .eq('user_id', user.id)
            .select()
        
        if (error) throw error
        
        return { data: data[0], error: null }
        
    } catch (error) {
        console.error('Errore aggiornamento offerta:', error)
        return { data: null, error }
    }
}

async function deleteOffer(offerId) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            throw new Error('Devi essere loggato per eliminare offerte')
        }
        
        // Soft delete - marca come non attivo
        const { error } = await supabaseClient
            .from('offerte_energia')
            .update({ attivo: false })
            .eq('id', offerId)
            .eq('user_id', user.id)
        
        if (error) throw error
        
        return { error: null }
        
    } catch (error) {
        console.error('Errore eliminazione offerta:', error)
        return { error }
    }
}

// ===== STATISTICHE =====
async function getOfferStats() {
    try {
        const user = await getCurrentUser()
        if (!user) return { data: null, error: new Error('Non loggato') }
        
        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .select('categoria, fornitore, prezzo_luce, prezzo_gas, commissioni')
            .eq('user_id', user.id)
            .eq('attivo', true)
        
        if (error) throw error
        
        return { data, error: null }
        
    } catch (error) {
        return { data: null, error }
    }
}

// ===== REAL-TIME UPDATES =====
function subscribeToOffers(callback) {
    return supabaseClient
        .channel('offers-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'offerte_energia' }, 
            callback
        )
        .subscribe()
}

// Debug: Esporta funzioni per testing
if (typeof window !== 'undefined') {
    window.supabaseFunctions = {
        signUp,
        signIn,
        signOut,
        getCurrentUser,
        saveOffer,
        loadOffers,
        updateOffer,
        deleteOffer,
        getOfferStats
    }
}

console.log('✅ Supabase configurato e pronto!')
'''

# 2. SQL Schema per creare le tabelle
sql_schema = '''-- 🗄️ SCHEMA SQL SUPABASE - Copia e incolla nel SQL Editor

-- 1️⃣ Tabella offerte energia
CREATE TABLE offerte_energia (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Dati fornitore e offerta
  fornitore TEXT NOT NULL DEFAULT '',
  nome_offerta TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'Domestico' CHECK (categoria IN ('Domestico', 'Micro', 'PMI')),
  tipo_prezzo TEXT NOT NULL DEFAULT 'Fisso' CHECK (tipo_prezzo IN ('Fisso', 'Variabile')),
  
  -- Prezzi energia
  prezzo_luce DECIMAL(8,4) NOT NULL DEFAULT 0,
  spread_luce DECIMAL(8,4) NOT NULL DEFAULT 0,
  prezzo_gas DECIMAL(8,4) NOT NULL DEFAULT 0,
  spread_gas DECIMAL(8,4) NOT NULL DEFAULT 0,
  
  -- Costi fissi
  quota_fissa_luce DECIMAL(8,2) NOT NULL DEFAULT 0,
  quota_fissa_gas DECIMAL(8,2) NOT NULL DEFAULT 0,
  commissioni DECIMAL(8,2) NOT NULL DEFAULT 0,
  
  -- Date e durata
  scadenza DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '12 months',
  durata_mesi INTEGER NOT NULL DEFAULT 12,
  
  -- Metadati OCR
  confidence_score DECIMAL(3,2) DEFAULT 0.80,
  pdf_filename TEXT DEFAULT '',
  
  -- Stato e timestamp
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2️⃣ Indici per performance
CREATE INDEX idx_offerte_user_id ON offerte_energia(user_id);
CREATE INDEX idx_offerte_categoria ON offerte_energia(categoria);
CREATE INDEX idx_offerte_fornitore ON offerte_energia(fornitore);
CREATE INDEX idx_offerte_attivo ON offerte_energia(attivo);
CREATE INDEX idx_offerte_created ON offerte_energia(created_at DESC);

-- 3️⃣ Sicurezza RLS (Row Level Security)
ALTER TABLE offerte_energia ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti vedono solo le proprie offerte
CREATE POLICY "Users can view own offers" ON offerte_energia
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire solo per se stessi
CREATE POLICY "Users can insert own offers" ON offerte_energia
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Gli utenti possono modificare solo le proprie offerte
CREATE POLICY "Users can update own offers" ON offerte_energia
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Gli utenti possono eliminare solo le proprie offerte
CREATE POLICY "Users can delete own offers" ON offerte_energia
    FOR DELETE USING (auth.uid() = user_id);

-- 4️⃣ Trigger per aggiornare timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_offerte_updated_at 
    BEFORE UPDATE ON offerte_energia
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 5️⃣ Inserisci alcuni dati di esempio (OPZIONALE)
-- Questi verranno associati al primo utente che si registra
-- Puoi saltare questa parte se vuoi

-- ✅ SCHEMA COMPLETATO!
-- Ora puoi usare la tua web app con database persistente!
'''

# 3. Guida step by step semplicissima
guida_semplice = '''# 🚀 GUIDA SEMPLICE - Collegare App a Supabase

## ⚡ PASSO 1: Crea Progetto Supabase (2 minuti)

1. 🌐 Vai su **supabase.com**
2. 🎯 Clicca **"Start your project"**
3. 📝 **Registrati** con GitHub (o email)
4. ➕ Clicca **"New Project"**
5. 📋 Compila:
   - **Name**: `gestione-energia`
   - **Database Password**: `CreaPasswordForte123!` (salvala!)
   - **Region**: `Europe (Central)`
6. 🚀 Clicca **"Create new project"**
7. ⏳ **Aspetta 2-3 minuti** che si crei

---

## 💾 PASSO 2: Crea Database (1 minuto)

1. 📊 Nel dashboard Supabase → **"SQL Editor"** (menu sinistra)
2. 📄 Clicca **"New Query"**  
3. 📋 **Copia e incolla** tutto il contenuto del file `schema.sql` che ti ho dato
4. ▶️ Clicca **"RUN"**
5. ✅ Dovresti vedere "Success. No rows returned"

---

## 🔑 PASSO 3: Prendi le Chiavi (30 secondi)

1. ⚙️ Vai su **"Settings"** → **"API"** (menu sinistra)
2. 📋 **COPIA** questi 2 valori:
   - **Project URL**: `https://xyz.supabase.co`
   - **anon public**: `eyJ0eXAiOiJKV1Q...` (chiave lunga)

---

## 📁 PASSO 4: Aggiungi File su GitHub (2 minuti)

### ➕ Crea supabase.js:
1. 🌐 Vai su **github.com** nel tuo repository
2. ➕ **"Add file"** → **"Create new file"**
3. 📝 Nome: `supabase.js`
4. 📋 **Copia e incolla** tutto il contenuto del file `supabase.js` che ti ho dato
5. ⚠️ **SOSTITUISCI** le prime 2 righe:
   ```javascript
   const SUPABASE_URL = 'https://IL-TUO-PROJECT-ID.supabase.co'
   const SUPABASE_ANON_KEY = 'LA-TUA-ANON-KEY-QUI'
   ```
   Con i **tuoi valori reali** copiati dal Passo 3
6. 💾 **Commit changes**

### 🔄 Aggiorna index.html:
1. 📄 Clicca su `index.html` nel tuo repository  
2. ✏️ Clicca **matita** per modificare
3. 🔍 Trova la sezione `<head>` 
4. ➕ **Aggiungi** questa riga **PRIMA** di `</head>`:
   ```html
   <script src="supabase.js"></script>
   ```
5. 💾 **Commit changes**

---

## 🧪 PASSO 5: Test (1 minuto)

1. ⏳ **Aspetta 3-5 minuti** che GitHub Pages si aggiorni
2. 🌐 **Vai** alla tua web app: `https://IL-TUO-USERNAME.github.io/gestione-offerte-energia/`
3. 👀 **Dovresti vedere** il modal di login!
4. ✅ **Registrati** con una email vera
5. 📧 **Controlla email** e clicca conferma  
6. 🔐 **Fai login** nell'app
7. 🎯 **Testa upload PDF** - i dati dovrebbero salvarsi nel database!

---

## ✅ FATTO! 

La tua app ora ha:
- 🔐 **Login/Registrazione** sicura
- 💾 **Database PostgreSQL** cloud  
- 🔒 **Ogni utente vede solo i suoi dati**
- ⚡ **Aggiornamenti real-time**
- 🚀 **Scalabilità automatica**

Se hai problemi, dimmi che errore vedi! 😊
'''

# Salvo tutti i file
with open('supabase.js', 'w', encoding='utf-8') as f:
    f.write(supabase_js_content)

with open('schema.sql', 'w', encoding='utf-8') as f:
    f.write(sql_schema)
    
with open('guida-supabase.md', 'w', encoding='utf-8') as f:
    f.write(guida_semplice)

print("🎯 TUTTI I FILE PRONTI CREATI!")
print("\n📁 File creati:")
print("1. supabase.js - Configurazione completa Supabase")  
print("2. schema.sql - SQL per creare tabelle")
print("3. guida-supabase.md - Guida passo-passo")
print(f"\n📊 Statistiche:")
print(f"- supabase.js: {len(supabase_js_content)} caratteri")
print(f"- schema.sql: {len(sql_schema)} caratteri") 
print(f"- guida: {len(guida_semplice)} caratteri")
print("\n🎯 TUTTO PRONTO - Segui la guida e in 5 minuti hai tutto funzionante!")
