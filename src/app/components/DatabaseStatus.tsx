import React from 'react';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

export function DatabaseStatus() {
  if (!isSupabaseConfigured) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-yellow-100 border border-yellow-400 rounded-full p-2 shadow-md flex items-center gap-2 cursor-help" 
        title="Demo Mode - Using mock data (not connected to database)"
      >
        <AlertCircle className="w-4 h-4 text-yellow-600" />
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-green-100 border border-green-500 rounded-full p-2 shadow-md flex items-center gap-2 cursor-help" 
      title="Database Connected - All actions save to Supabase"
    >
      <CheckCircle className="w-4 h-4 text-green-600" />
    </div>
  );
}