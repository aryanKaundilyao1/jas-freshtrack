import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithOTP: (contact: string, method: 'email' | 'phone') => Promise<{ error: any }>;
  verifyOTP: (contact: string, token: string, method: 'email' | 'phone') => Promise<{ error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOTP = async (contact: string, method: 'email' | 'phone') => {
    try {
      const options = method === 'email' 
        ? { 
            email: contact,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${window.location.origin}/auth`
            }
          }
        : { phone: contact };
        
      const { error } = await supabase.auth.signInWithOtp(options);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const verifyOTP = async (contact: string, token: string, method: 'email' | 'phone') => {
    try {
      const verifyOptions = method === 'email'
        ? { email: contact, token, type: 'email' as const }
        : { phone: contact, token, type: 'sms' as const };
        
      const { error } = await supabase.auth.verifyOtp(verifyOptions);
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      // Handle network errors
      if (error?.message?.includes('fetch') || error?.name === 'TypeError') {
        return { error: { message: 'Network error. Please check your connection and try again.' } };
      }
      return { error };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      // Check if user already exists (Supabase returns empty identities array)
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        return { error: { message: 'This email is already registered. Please sign in instead.' } };
      }
      
      return { error };
    } catch (error: any) {
      // Handle network errors
      if (error?.message?.includes('fetch') || error?.name === 'TypeError') {
        return { error: { message: 'Network error. Please check your connection and try again.' } };
      }
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signInWithOTP,
    verifyOTP,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}