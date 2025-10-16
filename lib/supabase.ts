import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-load Supabase client to avoid requiring env vars at build time
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

// Export as a getter using Object.defineProperty for seamless usage
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  }
})

