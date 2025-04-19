import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwdvbffemldsiustobyd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHZiZmZlbWxkc2l1c3RvYnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzMzUzNDksImV4cCI6MjA1MzkxMTM0OX0.Nud4_Aqz9xsTRs6ZXzbkHSZK9IzcSElH4j6AacS9Z1Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
})