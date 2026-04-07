import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

// Shared anon client (for public operations)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Create a user-scoped client with a specific access token
export function createUserScopedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
}
