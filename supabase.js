const SUPABASE_URL = 'https://ozmqftibxuspznnqaayh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bXFmdGlieHVzcHpubnFhYXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDUwNTQsImV4cCI6MjA3MjIyMTA1NH0._Z8pGoW_Yc6PiazF-6jxwVknmJ9vh4WLotN6bPRK1Kk'

const { createClient } = supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function signUp(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: password,
    options: { data: { full_name: fullName } }
  })
  return { data, error }
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  })
  return { data, error }
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  return { error }
}

async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser()
  return user
}

async function saveOffer(offerData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
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
  
  return { data: data?.[0], error }
}

async function loadOffers(filters = {}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  let query = supabaseClient
    .from('offerte_energia')
    .select('*')
    .eq('user_id', user.id)
    .eq('attivo', true)
    .order('created_at', { ascending: false })
  
  if (filters.categoria) query = query.eq('categoria', filters.categoria)
  if (filters.fornitore) query = query.eq('fornitore', filters.fornitore)
  
  const { data, error } = await query
  return { data, error }
}

async function updateOffer(offerId, updates) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data, error } = await supabaseClient
    .from('offerte_energia')
    .update(updates)
    .eq('id', offerId)
    .eq('user_id', user.id)
    .select()
  
  return { data: data?.[0], error }
}

async function deleteOffer(offerId) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  
  const { error } = await supabaseClient
    .from('offerte_energia')
    .update({ attivo: false })
    .eq('id', offerId)
    .eq('user_id', user.id)
  
  return { error }
}

console.log('Supabase loaded successfully!')
// Funzione per richiedere nuova email di conferma
async function requestNewConfirmationEmail(email) {
    try {
        const { error } = await supabaseClient.auth.resend({
            type: 'signup',
            email: email
        });
        
        if (error) throw error;
        return { error: null };
        
    } catch (error) {
        console.error('Resend confirmation error:', error);
        return { error };
    }
}

