import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zlowfpodzdkjuifxdkkw.supabase.co";
const supabaseAnonKey = "sb_publishable_vQIwHk9F63_q8J5a3ooRfw_IzSgd-Ya";

console.log("Supabase connected to:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);