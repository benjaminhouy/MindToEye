
import { supabase } from './supabase';

export async function signInAnonymously() {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Anonymous auth error:', error);
    throw error;
  }
}
