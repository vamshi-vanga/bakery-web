import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://elvkdkfnnjmlqdxwngnt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmtka2ZubmptbHFkeHduZ250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTYxNDAsImV4cCI6MjEwNzg5MjE0MH0.koapRZuHnFy8qUCb6ii-CY6BNww0L4tccBpiMRi8lJo';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder')
    ? process.env.EXPO_PUBLIC_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')
    ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
