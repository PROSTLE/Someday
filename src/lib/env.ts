export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const instagramBot = process.env.NEXT_PUBLIC_INSTAGRAM_BOT_USERNAME ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const missingSupabaseEnv = [
  !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
  !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
].filter(Boolean) as string[];

export function instagramChatUrl(ref?: string) {
  if (!instagramBot) return null;
  const base = `https://ig.me/m/${encodeURIComponent(instagramBot)}`;
  return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
}
