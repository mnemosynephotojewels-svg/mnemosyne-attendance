import { requireSupabase } from './supabaseClient';

// Map team names to UUIDs
// You can fetch these dynamically or hardcode based on your database
export const getTeamIdByName = async (teamName: string): Promise<string | null> => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('teams')
      .select('id')
      .eq('name', teamName)
      .single();
    
    if (error) {
      console.error('Error fetching team ID:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getTeamIdByName:', error);
    return null;
  }
};

// Alternative: If you have predefined teams, you can use a static map
export const TEAM_MAP: Record<string, string> = {
  'Engineering': 'TEAM_UUID_1',
  'Design': 'TEAM_UUID_2',
  'Marketing': 'TEAM_UUID_3',
  'Human Resources': 'TEAM_UUID_4',
};