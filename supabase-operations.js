// File: supabase-operations.js
import { supabase, TABLES } from './supabase-config.js'

// ===== AUTHENTICATION =====
export async function signUp(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// ===== OFFERTE ENERGIA CRUD =====
export async function createOffer(offerData) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from(TABLES.OFFERS)
      .insert([{
        ...offerData,
        user_id: user.id
      }])
      .select()
    
    if (error) throw error
    return { success: true, data: data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getOffers(filters = {}) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    
    let query = supabase
      .from(TABLES.OFFERS)
      .select('*')
      .eq('user_id', user.id)
      .eq('attivo', true)
      .order('created_at', { ascending: false })
    
    // Applica filtri
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
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateOffer(offerId, updates) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    
    const { data, error } = await supabase
      .from(TABLES.OFFERS)
      .update(updates)
      .eq('id', offerId)
      .eq('user_id', user.id)
      .select()
    
    if (error) throw error
    return { success: true, data: data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteOffer(offerId) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    
    const { error } = await supabase
      .from(TABLES.OFFERS)
      .update({ attivo: false })
      .eq('id', offerId)
      .eq('user_id', user.id)
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ===== REAL-TIME SUBSCRIPTIONS =====
export function subscribeToOffers(callback) {
  return supabase
    .channel('offers-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: TABLES.OFFERS }, 
      callback
    )
    .subscribe()
}
