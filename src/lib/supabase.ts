import { createClient } from '@supabase/supabase-js';

// Configuration placeholders for Supabase. 
// Uses standard Vite environment variables if available.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * DATABASE STRUCTURE MIGRATION PLAN
 * =================================
 * 
 * Future tables to be created in Supabase for production:
 * 
 * 1. `users`: Authentication and profiles (admin, caixa, atendimento)
 * 2. `clients`: Real CRM clients (id, phone, name, channel, created_at, tags)
 * 3. `orders_delivery`: Delivery orders (address, subtotal, delivery_fee)
 * 4. `orders_local`: Local comanda (table_id, subtotal, payment_method)
 * 5. `kitchen_queue`: Cozinha items connected real-time to orders
 * 6. `cashier_sessions`: Caixa entries (abertura, fechamento, operator_id)
 * 7. `transactions`: All transactions linked to a cashier_session (sangria, entrada)
 * 8. `whatsapp_sessions`: Baileys QR sync states and tokens (Secure)
 * 
 */

export const mockRealtimeSubscribe = (channel: string, callback: (payload: any) => void) => {
  // Mock realtime connectivity for the UI preparation
  console.log(`[Supabase] Mock subscribed to channel: ${channel}`);
  
  // Return an unsubscribe function
  return () => {
    console.log(`[Supabase] Mock unsubscribed from channel: ${channel}`);
  };
};
