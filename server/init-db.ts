import { supabase } from './supabase';
import { SupabaseStorage } from './supabase';

// Initialize tables and verify connection
export async function initializeDatabase() {
  if (supabase) {
    try {
      // Create tables if they don't exist
      const storage = new SupabaseStorage();
      await storage.createTablesIfNotExist();
      
      // Simple query to verify connection
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('Supabase connection error:', error.message);
      } else {
        console.log('Successfully connected to Supabase');
      }
    } catch (err) {
      console.error('Failed to connect to Supabase:', err);
    }
  }
}