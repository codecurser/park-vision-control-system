
import { supabase } from "@/integrations/supabase/client";
import { ParkingEntry } from "@/pages/Index";

export interface DatabaseParkingEntry {
  id: string;
  plate_number: string;
  timestamp: string;
  entry_type: "Entry" | "Exit";
  created_at: string;
}

export const parkingService = {
  async insertEntry(plateNumber: string, entryType: "Entry" | "Exit"): Promise<ParkingEntry | null> {
    try {
      console.log('Inserting parking entry:', { plateNumber, entryType });
      
      const { data, error } = await supabase
        .from('parking_entries')
        .insert([
          {
            plate_number: plateNumber,
            entry_type: entryType,
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error inserting parking entry:', error);
        throw error;
      }

      console.log('Successfully inserted parking entry:', data);
      
      if (data) {
        return {
          id: data.id,
          plate_number: data.plate_number,
          timestamp: new Date(data.timestamp),
          entry_type: data.entry_type
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to insert parking entry:', error);
      return null;
    }
  },

  async getAllEntries(): Promise<ParkingEntry[]> {
    try {
      console.log('Fetching all parking entries...');
      
      const { data, error } = await supabase
        .from('parking_entries')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching parking entries:', error);
        throw error;
      }

      console.log('Successfully fetched parking entries:', data?.length || 0, 'entries');
      
      return (data || []).map(entry => ({
        id: entry.id,
        plate_number: entry.plate_number,
        timestamp: new Date(entry.timestamp),
        entry_type: entry.entry_type
      }));
    } catch (error) {
      console.error('Failed to fetch parking entries:', error);
      return [];
    }
  },

  async checkDuplicateEntry(plateNumber: string, entryType: "Entry" | "Exit"): Promise<boolean> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('parking_entries')
        .select('id')
        .eq('plate_number', plateNumber)
        .eq('entry_type', entryType)
        .gte('timestamp', fiveMinutesAgo)
        .limit(1);

      if (error) {
        console.error('Error checking duplicate entry:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Failed to check duplicate entry:', error);
      return false;
    }
  }
};
