// File: supabase-config.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://boooedurhdcpenmpclrn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb29lZHVyaGRjcGVubXBjbHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDEyNDEsImV4cCI6MjA3MjIxNzI0MX0.rCEhVot2E_S62h5OACRli_hSrjUgWSKsgglsFQ1N2nE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  OFFERS: 'offerte_energia',
  USERS: 'users'
}
