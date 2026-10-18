import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { createProxyAwareFetch } from '@/lib/supabase/proxy'

export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: createProxyAwareFetch() },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  )
}
