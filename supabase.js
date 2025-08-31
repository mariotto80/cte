// supabase.js - Configurazione e funzioni Supabase
// ===== CONFIGURAZIONE SUPABASE =====

// IMPORTANTE: Sostituisci questi valori con i tuoi da Supabase Dashboard
const SUPABASE_URL = 'https://ozmqftibxuspznnqaayh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bXFmdGlieHVzcHpubnFhYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUwNTQsImV4cCI6MjA3MjIyMTA1NH0._Z8pGoW_Yc6PiazF-6jxwVknmJ9vh4WLotN6bPRK1Kk';

// Inizializzazione client Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase loaded successfully!');

// ===== FUNZIONI AUTENTICAZIONE =====

/**
 * Registrazione nuovo utente
 * @param {string} email - Email utente
 * @param {string} password - Password utente  
 * @param {string} fullName - Nome completo utente
 * @returns {Object} Risultato registrazione
 */
async function signUp(email, password, fullName) {
    try {
        console.log('🔐 Tentativo registrazione per:', email);

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            console.error('❌ Errore registrazione:', error);
            return { error, data: null };
        }

        console.log('✅ Registrazione riuscita:', data);
        return { error: null, data };

    } catch (error) {
        console.error('❌ Errore generale registrazione:', error);
        return { error, data: null };
    }
}

/**
 * Login utente esistente
 * @param {string} email - Email utente
 * @param {string} password - Password utente
 * @returns {Object} Risultato login
 */
async function signIn(email, password) {
    try {
        console.log('🔐 Tentativo login per:', email);

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Errore login:', error);
            return { error, data: null };
        }

        console.log('✅ Login riuscito:', data.user.email);
        return { error: null, data };

    } catch (error) {
        console.error('❌ Errore generale login:', error);
        return { error, data: null };
    }
}

/**
 * Logout utente corrente
 * @returns {Object} Risultato logout
 */
async function signOut() {
    try {
        console.log('👋 Tentativo logout...');

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error('❌ Errore logout:', error);
            return { error };
        }

        console.log('✅ Logout riuscito');
        return { error: null };

    } catch (error) {
        console.error('❌ Errore generale logout:', error);
        return { error };
    }
}

/**
 * Ottieni utente corrente
 * @returns {Object|null} Utente corrente o null
 */
async function getCurrentUser() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    } catch (error) {
        console.error('❌ Errore recupero utente:', error);
        return null;
    }
}

/**
 * Controlla se utente è autenticato
 * @returns {boolean} True se autenticato
 */
async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Richiedi nuova email di conferma
 * @param {string} email - Email per cui richiedere nuova conferma
 * @returns {Object} Risultato richiesta
 */
async function requestNewConfirmationEmail(email) {
    try {
        console.log('📧 Richiesta nuova email di conferma per:', email);

        const { error } = await supabaseClient.auth.resend({
            type: 'signup',
            email: email
        });

        if (error) {
            console.error('❌ Errore richiesta email:', error);
            return { error };
        }

        console.log('✅ Nuova email di conferma inviata');
        return { error: null };

    } catch (error) {
        console.error('❌ Errore generale richiesta email:', error);
        return { error };
    }
}

// ===== FUNZIONI DATABASE OFFERTE =====

/**
 * Carica tutte le offerte dell'utente corrente
 * @returns {Object} Array di offerte o errore
 */
async function loadOffers() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('📊 Caricamento offerte per utente:', user.id);

        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Errore caricamento offerte:', error);
            return { error, data: null };
        }

        console.log(`✅ Caricate ${data?.length || 0} offerte`);
        return { error: null, data: data || [] };

    } catch (error) {
        console.error('❌ Errore generale caricamento offerte:', error);
        return { error, data: null };
    }
}

/**
 * Salva una nuova offerta
 * @param {Object} offerData - Dati dell'offerta
 * @returns {Object} Offerta salvata o errore
 */
async function saveOffer(offerData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('💾 Salvataggio nuova offerta...');

        // Aggiungi user_id e timestamp
        const offerToSave = {
            ...offerData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .insert([offerToSave])
            .select()
            .single();

        if (error) {
            console.error('❌ Errore salvataggio offerta:', error);
            return { error, data: null };
        }

        console.log('✅ Offerta salvata con ID:', data.id);
        return { error: null, data };

    } catch (error) {
        console.error('❌ Errore generale salvataggio:', error);
        return { error, data: null };
    }
}

/**
 * Aggiorna un'offerta esistente
 * @param {number} offerId - ID dell'offerta da aggiornare
 * @param {Object} updates - Campi da aggiornare
 * @returns {Object} Offerta aggiornata o errore
 */
async function updateOffer(offerId, updates) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('📝 Aggiornamento offerta ID:', offerId);

        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .update(updateData)
            .eq('id', offerId)
            .eq('user_id', user.id) // Sicurezza: solo le proprie offerte
            .select()
            .single();

        if (error) {
            console.error('❌ Errore aggiornamento offerta:', error);
            return { error, data: null };
        }

        console.log('✅ Offerta aggiornata:', data.id);
        return { error: null, data };

    } catch (error) {
        console.error('❌ Errore generale aggiornamento:', error);
        return { error, data: null };
    }
}

/**
 * Elimina un'offerta
 * @param {number} offerId - ID dell'offerta da eliminare
 * @returns {Object} Risultato eliminazione
 */
async function deleteOffer(offerId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('🗑️ Eliminazione offerta ID:', offerId);

        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .delete()
            .eq('id', offerId)
            .eq('user_id', user.id) // Sicurezza: solo le proprie offerte
            .select()
            .single();

        if (error) {
            console.error('❌ Errore eliminazione offerta:', error);
            return { error, data: null };
        }

        console.log('✅ Offerta eliminata:', data.id);
        return { error: null, data };

    } catch (error) {
        console.error('❌ Errore generale eliminazione:', error);
        return { error, data: null };
    }
}

/**
 * Cerca offerte con filtri
 * @param {Object} filters - Filtri di ricerca
 * @returns {Object} Array di offerte filtrate o errore
 */
async function searchOffers(filters = {}) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('🔍 Ricerca offerte con filtri:', filters);

        let query = supabaseClient
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id);

        // Applica filtri
        if (filters.categoria) {
            query = query.eq('categoria', filters.categoria);
        }

        if (filters.fornitore) {
            query = query.eq('fornitore', filters.fornitore);
        }

        if (filters.tipo_prezzo) {
            query = query.eq('tipo_prezzo', filters.tipo_prezzo);
        }

        if (filters.search) {
            query = query.or(
                `fornitore.ilike.%${filters.search}%,nome_offerta.ilike.%${filters.search}%`
            );
        }

        // Ordinamento
        query = query.order(filters.orderBy || 'created_at', { 
            ascending: filters.ascending || false 
        });

        // Limite risultati
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Errore ricerca offerte:', error);
            return { error, data: null };
        }

        console.log(`✅ Trovate ${data?.length || 0} offerte`);
        return { error: null, data: data || [] };

    } catch (error) {
        console.error('❌ Errore generale ricerca:', error);
        return { error, data: null };
    }
}

/**
 * Ottieni statistiche offerte utente
 * @returns {Object} Statistiche o errore
 */
async function getOfferStats() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log('📈 Calcolo statistiche offerte...');

        const { data, error } = await supabaseClient
            .from('offerte_energia')
            .select('categoria, prezzo_luce, prezzo_gas, commissioni, fornitore')
            .eq('user_id', user.id);

        if (error) {
            console.error('❌ Errore calcolo statistiche:', error);
            return { error, data: null };
        }

        // Calcola statistiche
        const stats = {
            total: data.length,
            by_category: {},
            by_supplier: {},
            avg_prices: {
                luce: 0,
                gas: 0,
                commissioni: 0
            },
            price_ranges: {
                luce: { min: Number.MAX_VALUE, max: 0 },
                gas: { min: Number.MAX_VALUE, max: 0 }
            }
        };

        if (data.length > 0) {
            let totalLuce = 0, totalGas = 0, totalCommissioni = 0;

            data.forEach(offer => {
                // Conteggi per categoria
                stats.by_category[offer.categoria] = (stats.by_category[offer.categoria] || 0) + 1;

                // Conteggi per fornitore
                stats.by_supplier[offer.fornitore] = (stats.by_supplier[offer.fornitore] || 0) + 1;

                // Calcoli prezzi
                const prezzoLuce = parseFloat(offer.prezzo_luce) || 0;
                const prezzoGas = parseFloat(offer.prezzo_gas) || 0;
                const commissioni = parseFloat(offer.commissioni) || 0;

                totalLuce += prezzoLuce;
                totalGas += prezzoGas;
                totalCommissioni += commissioni;

                // Range prezzi
                if (prezzoLuce > 0) {
                    stats.price_ranges.luce.min = Math.min(stats.price_ranges.luce.min, prezzoLuce);
                    stats.price_ranges.luce.max = Math.max(stats.price_ranges.luce.max, prezzoLuce);
                }

                if (prezzoGas > 0) {
                    stats.price_ranges.gas.min = Math.min(stats.price_ranges.gas.min, prezzoGas);
                    stats.price_ranges.gas.max = Math.max(stats.price_ranges.gas.max, prezzoGas);
                }
            });

            // Medie
            stats.avg_prices.luce = totalLuce / data.length;
            stats.avg_prices.gas = totalGas / data.length;
            stats.avg_prices.commissioni = totalCommissioni / data.length;

            // Correggi min values se nessun dato valido
            if (stats.price_ranges.luce.min === Number.MAX_VALUE) {
                stats.price_ranges.luce.min = 0;
            }
            if (stats.price_ranges.gas.min === Number.MAX_VALUE) {
                stats.price_ranges.gas.min = 0;
            }
        }

        console.log('✅ Statistiche calcolate:', stats);
        return { error: null, data: stats };

    } catch (error) {
        console.error('❌ Errore generale calcolo statistiche:', error);
        return { error, data: null };
    }
}

// ===== FUNZIONI UTILITÀ =====

/**
 * Ottieni migliori offerte per categoria
 * @param {string} categoria - Categoria offerte
 * @param {number} limit - Numero massimo risultati
 * @returns {Object} Array delle migliori offerte o errore
 */
async function getBestOffers(categoria, limit = 5) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Utente non autenticato');
        }

        console.log(`🏆 Ricerca migliori offerte ${categoria}...`);

        let query = supabaseClient
            .from('offerte_energia')
            .select('*')
            .eq('user_id', user.id);

        if (categoria && categoria !== 'all') {
            query = query.eq('categoria', categoria);
        }

        const { data, error } = await query
            .order('prezzo_luce', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('❌ Errore ricerca migliori offerte:', error);
            return { error, data: null };
        }

        console.log(`✅ Trovate ${data?.length || 0} migliori offerte`);
        return { error: null, data: data || [] };

    } catch (error) {
        console.error('❌ Errore generale ricerca migliori offerte:', error);
        return { error, data: null };
    }
}

/**
 * Verifica se tabella offerte esiste e la crea se necessario
 * @returns {Object} Risultato verifica/creazione tabella
 */
async function ensureOfferTableExists() {
    try {
        console.log('🔍 Verifica esistenza tabella offerte...');

        // Testa con una query semplice
        const { error: testError } = await supabaseClient
            .from('offerte_energia')
            .select('id')
            .limit(1);

        if (testError) {
            console.warn('⚠️ Tabella offerte non trovata:', testError.message);
            return { 
                error: new Error('Tabella offerte_energia non configurata. Controlla il database Supabase.'), 
                data: null 
            };
        }

        console.log('✅ Tabella offerte trovata');
        return { error: null, data: true };

    } catch (error) {
        console.error('❌ Errore verifica tabella:', error);
        return { error, data: null };
    }
}

/**
 * Funzione di setup iniziale
 * @returns {Object} Risultato setup
 */
async function initializeSupabase() {
    try {
        console.log('🚀 Inizializzazione Supabase...');

        // Verifica configurazione
        if (SUPABASE_URL === 'https://your-project.supabase.co' || 
            SUPABASE_ANON_KEY === 'your-anon-key') {
            throw new Error('Configurazione Supabase non valida. Aggiorna SUPABASE_URL e SUPABASE_ANON_KEY.');
        }

        // Verifica connessione
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('❌ Errore connessione Supabase:', error);
            return { error, data: null };
        }

        // Verifica tabella offerte
        const tableCheck = await ensureOfferTableExists();
        if (tableCheck.error) {
            return tableCheck;
        }

        console.log('✅ Supabase inizializzato correttamente');
        return { error: null, data: true };

    } catch (error) {
        console.error('❌ Errore inizializzazione Supabase:', error);
        return { error, data: null };
    }
}

// ===== LISTENERS AUTH STATE =====

/**
 * Listener per cambiamenti stato autenticazione
 * @param {Function} callback - Callback da chiamare su cambio stato
 */
function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        if (callback) {
            callback(event, session);
        }
    });
}

// ===== ESPORTAZIONI GLOBALI =====

// Rende le funzioni disponibili globalmente
if (typeof window !== 'undefined') {
    window.supabaseClient = supabaseClient;
    window.signUp = signUp;
    window.signIn = signIn;
    window.signOut = signOut;
    window.getCurrentUser = getCurrentUser;
    window.isAuthenticated = isAuthenticated;
    window.requestNewConfirmationEmail = requestNewConfirmationEmail;
    window.loadOffers = loadOffers;
    window.saveOffer = saveOffer;
    window.updateOffer = updateOffer;
    window.deleteOffer = deleteOffer;
    window.searchOffers = searchOffers;
    window.getOfferStats = getOfferStats;
    window.getBestOffers = getBestOffers;
    window.ensureOfferTableExists = ensureOfferTableExists;
    window.initializeSupabase = initializeSupabase;
    window.onAuthStateChange = onAuthStateChange;
}

// ===== AUTO-INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 Supabase DOM loaded, inizializzazione...');

    const result = await initializeSupabase();
    if (result.error) {
        console.error('❌ Errore inizializzazione Supabase:', result.error.message);

        // Notifica utente se funzione disponibile
        if (typeof showNotification === 'function') {
            showNotification('Errore configurazione database: ' + result.error.message, 'error');
        } else {
            alert('⚠️ Errore configurazione: ' + result.error.message);
        }
    } else {
        console.log('✅ Supabase pronto all\'uso');
    }
});

console.log('🎯 Supabase.js caricato completamente');
