import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { cookies } from '@/lib/cookies';

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  updated_at: string;
}

// Only store safe user data
type SafeUser = Pick<User, 'id' | 'email' | 'phone' | 'created_at' | 'updated_at' | 'app_metadata' | 'user_metadata'>;

interface UserData {
  user: SafeUser | null;
  profile: UserProfile | null;
}

const LOCAL_STORAGE_KEY = 'user_data';

const extractSafeUserData = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  created_at: user.created_at,
  updated_at: user.updated_at,
  app_metadata: user.app_metadata,
  user_metadata: user.user_metadata,
});

const saveToLocalStorage = (data: UserData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

const clearLocalStorage = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

const getFromLocalStorage = (): UserData | null => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery<UserData>({
    queryKey: ['user_data'],
    queryFn: async () => {
      // Check if we have a valid session first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        clearLocalStorage();
        cookies.clearAuthTokens();
        return { user: null, profile: null };
      }

      // Try to get from localStorage first
      const stored = getFromLocalStorage();
      if (stored?.user?.id === user.id) {
        // Update the stored user data with fresh data
        return { ...stored, user: extractSafeUserData(user) };
      }

      // If no stored data or different user, fetch fresh profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Store safe user data
      const data = { user: extractSafeUserData(user), profile };
      saveToLocalStorage(data);
      return data;
    },
  });

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Save auth tokens to cookies
      if (data.session) {
        cookies.setAuthTokens(
          data.session.access_token,
          data.session.refresh_token
        );
      }

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      // Store safe user data
      const userData = { user: extractSafeUserData(data.user), profile };
      saveToLocalStorage(userData);
      queryClient.setQueryData(['user_data'], userData);
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
    clearLocalStorage();
    cookies.clearAuthTokens();
    queryClient.setQueryData(['user_data'], { user: null, profile: null });
  };

  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!userData?.user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('user_id', userData.user.id)
      .select()
      .single();

    if (error) throw error;

    const newData = {
      user: userData.user,
      profile: data,
    };

    saveToLocalStorage(newData);
    queryClient.setQueryData(['user_data'], newData);
    return data;
  };

  // Refresh session if needed
  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error refreshing session:', error);
      return;
    }

    if (session) {
      cookies.setAuthTokens(
        session.access_token,
        session.refresh_token
      );
    }
  };

  return {
    user: userData?.user ?? null,
    profile: userData?.profile ?? null,
    isLoading,
    isAuthenticated: !!userData?.user,
    signIn,
    signOut,
    updateProfile,
    refreshSession,
  };
} 