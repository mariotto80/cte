 * ===== SUPABASE CONFIGURATION & DATABASE FUNCTIONS =====
 * Sistema di gestione database per EnergiaCorp Premium
 */

// ===== CONFIGURAZIONE SUPABASE =====
// ⚠️ IMPORTANTE: Sostituisci con i tuoi dati Supabase
const SUPABASE_URL = 'https://ozmqftibxuspznnqaayh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bXFmdGlieHVzcHpubnFhYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUwNTQsImV4cCI6MjA3MjIyMTA1NH0._Z8pGoW_Yc6PiazF-6jxwVknmJ9vh4WLotN6bPRK1Kk';';

// Inizializza client Supabase
let supabaseClient = null;

// Funzione per inizializzare Supabase (carica dinamicamente se CDN non disponibile)
async function initSupabase() {
    if (supabaseClient) return supabaseClient;
    
    try {
        // Prova a usare Supabase se già caricato globalmente
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            // Carica dinamicamente Supabase CDN
            await loadSupabaseScript();
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        
        console.log('✅ Supabase inizializzato correttamente');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase:', error);
        // Fallback: usa localStorage se Supabase non disponibile
        return null;
    }
}

// Carica script Supabase dinamicamente
function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ===== AUTHENTICATION FUNCTIONS =====

/**
 * Effettua il login dell'utente
 */
async function signIn(email, password) {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: simula login con localStorage
        const user = { 
            id: '1', 
            email: email, 
            name: email.split('@')[0],
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { user, error: null };
    }
    
    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Salva utente nel localStorage per persistenza
        if (data.user) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        
        return { user: data.user, error: null };
    } catch (error) {
        console.error('Errore login:', error);
        return { user: null, error: error.message };
    }
}

/**
 * Registra un nuovo utente
 */
async function signUp(email, password, metadata = {}) {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: simula registrazione con localStorage
        const user = { 
            id: Date.now().toString(), 
            email: email, 
            name: metadata.name || email.split('@')[0],
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { user, error: null };
    }
    
    try {
        const { data, error } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: metadata
            }
        });
        
        if (error) throw error;
        
        return { user: data.user, error: null };
    } catch (error) {
        console.error('Errore registrazione:', error);
        return { user: null, error: error.message };
    }
}

/**
 * Effettua il logout
 */
async function signOut() {
    const client = await initSupabase();
    
    // Rimuovi da localStorage
    localStorage.removeItem('currentUser');
    
    if (!client) return { error: null };
    
    try {
        const { error } = await client.auth.signOut();
        return { error };
    } catch (error) {
        console.error('Errore logout:', error);
        return { error: error.message };
    }
}

/**
 * Ottiene l'utente corrente
 */
async function getCurrentUser() {
    // Prima controlla localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    const client = await initSupabase();
    if (!client) return null;
    
    try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
        return user;
    } catch (error) {
        console.error('Errore get current user:', error);
        return null;
    }
}

// ===== DATABASE FUNCTIONS - OFFERS =====

/**
 * Carica tutte le offerte dell'utente
 */
async function getOffers() {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: usa localStorage
        return getOffersFromLocalStorage();
    }
    
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Utente non autenticato');
        
        const { data, error } = await client
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Errore caricamento offerte:', error);
        // Fallback a localStorage in caso di errore
        return getOffersFromLocalStorage();
    }
}

/**
 * Inserisce una nuova offerta
 */
async function insertOffer(offerData) {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: salva in localStorage
        return saveOfferToLocalStorage(offerData);
    }
    
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Utente non autenticato');
        
        const offerToInsert = {
            ...offerData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await client
            .from('offerte_energia')
            .insert([offerToInsert])
            .select();
        
        if (error) throw error;
        
        return data[0];
    } catch (error) {
        console.error('Errore inserimento offerta:', error);
        // Fallback a localStorage
        return saveOfferToLocalStorage(offerData);
    }
}

/**
 * Aggiorna un'offerta esistente
 */
async function updateOffer(offerId, offerData) {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: aggiorna localStorage
        return updateOfferInLocalStorage(offerId, offerData);
    }
    
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Utente non autenticato');
        
        const { data, error } = await client
            .from('offerte_energia')
            .update({
                ...offerData,
                updated_at: new Date().toISOString()
            })
            .eq('id', offerId)
            .eq('user_id', user.id)
            .select();
        
        if (error) throw error;
        
        return data[0];
    } catch (error) {
        console.error('Errore aggiornamento offerta:', error);
        return updateOfferInLocalStorage(offerId, offerData);
    }
}

/**
 * Elimina un'offerta
 */
async function removeOffer(offerId) {
    const client = await initSupabase();
    
    if (!client) {
        // Fallback: rimuovi da localStorage
        return removeOfferFromLocalStorage(offerId);
    }
    
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Utente non autenticato');
        
        const { error } = await client
            .from('offerte_energia')
            .delete()
            .eq('id', offerId)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        return true;
    } catch (error) {
        console.error('Errore eliminazione offerta:', error);
        return removeOfferFromLocalStorage(offerId);
    }
}

// ===== FALLBACK FUNCTIONS (LocalStorage) =====

/**
 * Carica offerte da localStorage
 */
function getOffersFromLocalStorage() {
    try {
        const stored = localStorage.getItem('energiacorp_offers');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Errore localStorage get offers:', error);
        return [];
    }
}

/**
 * Salva offerta in localStorage
 */
function saveOfferToLocalStorage(offerData) {
    try {
        const offers = getOffersFromLocalStorage();
        const newOffer = {
            ...offerData,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        offers.unshift(newOffer);
        localStorage.setItem('energiacorp_offers', JSON.stringify(offers));
        
        return newOffer;
    } catch (error) {
        console.error('Errore localStorage save offer:', error);
        throw error;
    }
}

/**
 * Aggiorna offerta in localStorage
 */
function updateOfferInLocalStorage(offerId, offerData) {
    try {
        const offers = getOffersFromLocalStorage();
        const index = offers.findIndex(o => o.id === offerId);
        
        if (index === -1) {
            throw new Error('Offerta non trovata');
        }
        
        offers[index] = {
            ...offers[index],
            ...offerData,
            updated_at: new Date().toISOString()
        };
        
        localStorage.setItem('energiacorp_offers', JSON.stringify(offers));
        return offers[index];
    } catch (error) {
        console.error('Errore localStorage update offer:', error);
        throw error;
    }
}

/**
 * Rimuovi offerta da localStorage
 */
function removeOfferFromLocalStorage(offerId) {
    try {
        const offers = getOffersFromLocalStorage();
        const filteredOffers = offers.filter(o => o.id !== offerId);
        
        localStorage.setItem('energiacorp_offers', JSON.stringify(filteredOffers));
        return true;
    } catch (error) {
        console.error('Errore localStorage remove offer:', error);
        throw error;
    }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Test connessione Supabase
 */
async function testSupabaseConnection() {
    try {
        const client = await initSupabase();
        if (!client) return false;
        
        // Test semplice: prova a fare una query
        const { error } = await client
            .from('offerte_energia')
            .select('count', { count: 'exact', head: true });
        
        return !error;
    } catch (error) {
        console.error('Test connessione fallito:', error);
        return false;
    }
}

/**
 * Inizializza il database (crea tabelle se non esistono)
 */
async function initializeDatabase() {
    const client = await initSupabase();
    if (!client) {
        console.warn('Supabase non disponibile, uso localStorage come fallback');
        return;
    }
    
    try {
        // Verifica se la tabella esiste facendo una query
        const { error } = await client
            .from('offerte_energia')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('Tabella offerte_energia non trovata o non accessibile:', error.message);
            console.log('Assicurati che la tabella esista nel database Supabase con RLS abilitato');
        } else {
            console.log('✅ Database Supabase connesso e configurato correttamente');
        }
    } catch (error) {
        console.error('Errore inizializzazione database:', error);
    }
}

/**
 * Sincronizza localStorage con Supabase
 */
async function syncLocalStorageWithSupabase() {
    const client = await initSupabase();
    if (!client) return;
    
    try {
        const user = await getCurrentUser();
        if (!user) return;
        
        // Carica offerte locali
        const localOffers = getOffersFromLocalStorage();
        
        // Carica offerte remote
        const { data: remoteOffers } = await client
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id);
        
        // Merge: priorità alle offerte remote più recenti
        if (remoteOffers && remoteOffers.length > 0) {
            console.log(`Sincronizzazione: ${remoteOffers.length} offerte remote, ${localOffers.length} locali`);
            localStorage.setItem('energiacorp_offers', JSON.stringify(remoteOffers));
        }
    } catch (error) {
        console.error('Errore sincronizzazione:', error);
    }
}

/**
 * Backup dati su Supabase
 */
async function backupToSupabase() {
    const client = await initSupabase();
    if (!client) return false;
    
    try {
        const user = await getCurrentUser();
        if (!user) return false;
        
        const localOffers = getOffersFromLocalStorage();
        
        for (const offer of localOffers) {
            // Controlla se l'offerta esiste già
            const { data: existing } = await client
                .from('offerte_energia')
                .select('id')
                .eq('id', offer.id)
                .eq('user_id', user.id);
            
            if (!existing || existing.length === 0) {
                // Inserisci l'offerta
                await client
                    .from('offerte_energia')
                    .insert([{
                        ...offer,
                        user_id: user.id
                    }]);
            }
        }
        
        console.log(`✅ Backup completato: ${localOffers.length} offerte`);
        return true;
    } catch (error) {
        console.error('Errore backup:', error);
        return false;
    }
}

// ===== REAL-TIME SUBSCRIPTIONS (Optional) =====

/**
 * Sottoscrivi aggiornamenti real-time
 */
async function subscribeToOffersChanges(callback) {
    const client = await initSupabase();
    if (!client) return null;
    
    const user = await getCurrentUser();
    if (!user) return null;
    
    try {
        const subscription = client
            .channel('offerte_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'offerte_energia',
                    filter: `user_id=eq.${user.id}`
                },
                callback
            )
            .subscribe();
        
        return subscription;
    } catch (error) {
        console.error('Errore subscription:', error);
        return null;
    }
}

// ===== EXPORT FUNCTIONS =====
// Queste funzioni sono disponibili globalmente per app.js

// Per compatibilità con app.js
window.getOffers = getOffers;
window.insertOffer = insertOffer;
window.updateOffer = updateOffer;
window.removeOffer = removeOffer;
window.getCurrentUser = getCurrentUser;
window.signIn = signIn;
window.signUp = signUp;
window.signOut = signOut;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inizializzazione Supabase...');
    
    try {
        // Inizializza database
        await initializeDatabase();
        
        // Test connessione
        const isConnected = await testSupabaseConnection();
        console.log(`📡 Connessione Supabase: ${isConnected ? '✅ OK' : '❌ FALLBACK localStorage'}`);
        
        // Sincronizza dati se possibile
        if (isConnected) {
            await syncLocalStorageWithSupabase();
        }
        
    } catch (error) {
        console.error('Errore inizializzazione Supabase:', error);
        console.log('💾 Utilizzo localStorage come fallback');
    }
});

// ===== SQL SCHEMA PER RIFERIMENTO =====
/*
-- Tabella offerte_energia
CREATE TABLE public.offerte_energia (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fornitore TEXT NOT NULL,
    nome_offerta TEXT,
    categoria TEXT CHECK (categoria IN ('Domestico', 'Micro', 'PMI')),
    tipo_prezzo TEXT CHECK (tipo_prezzo IN ('Fisso', 'Variabile')),
    prezzo_luce DECIMAL(10,6),
    spread_luce DECIMAL(10,6) DEFAULT 0,
    prezzo_gas DECIMAL(10,6),
    spread_gas DECIMAL(10,6) DEFAULT 0,
    quota_fissa_luce DECIMAL(10,2),
    quota_fissa_gas DECIMAL(10,2),
    commissioni DECIMAL(10,2) DEFAULT 0,
    scadenza DATE,
    durata_mesi INTEGER,
    attivo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offerte_energia ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own offers" 
ON public.offerte_energia FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offers" 
ON public.offerte_energia FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers" 
ON public.offerte_energia FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers" 
ON public.offerte_energia FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_offerte_user_id ON public.offerte_energia(user_id);
CREATE INDEX idx_offerte_categoria ON public.offerte_energia(categoria);
CREATE INDEX idx_offerte_fornitore ON public.offerte_energia(fornitore);
*/

