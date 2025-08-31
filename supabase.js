// supabase.js - Configurazione Supabase e funzioni CRUD

// RICORDA: SOSTITUISCI questi valori con le tue credenziali
const SUPABASE_URL = 'https://IL-TUO-PROJECT-ID.supabase.co'; // Inserisci il tuo project URL
const SUPABASE_ANON_KEY = 'LA-TUA-ANON-KEY'; // Inserisci la tua anon key

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authentication functions
async function signUp(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });
  return { data, error };
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  return { error };
}

async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// CRUD operations for offerte energia
async function saveOffer(offerData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabaseClient
    .from('offerte_energia')
    .insert([{ ...offerData, user_id: user.id }])
    .select();

  return { data: data?.[0], error };
}

async function loadOffers(filters = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabaseClient
    .from('offerte_energia')
    .select('*')
    .eq('user_id', user.id)
    .eq('attivo', true)
    .order('created_at', { ascending: false });

  if (filters.categoria) query = query.eq('categoria', filters.categoria);
  if (filters.fornitore) query = query.eq('fornitore', filters.fornitore);

  const { data, error } = await query;
  return { data, error };
}

async function updateOffer(offerId, updates) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabaseClient
    .from('offerte_energia')
    .update(updates)
    .eq('id', offerId)
    .eq('user_id', user.id)
    .select();

  return { data: data?.[0], error };
}

async function deleteOffer(offerId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabaseClient
    .from('offerte_energia')
    .update({ attivo: false })
    .eq('id', offerId);
  return { error };
}

// Esporta le funzioni
export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  saveOffer,
  loadOffers,
  updateOffer,
  deleteOffer
};
