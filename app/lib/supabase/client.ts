import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "~/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}

const supabase = createClient();

export default supabase;
