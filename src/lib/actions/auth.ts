'use server';

import { cookies } from 'next/headers';
import { createServerSupabase } from '../supabase/server';
import { redirect } from 'next/navigation';

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerSupabase();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createServerSupabase();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { message: 'Check your email for the confirmation link.' };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  redirect('/auth/login');
}

export async function getSession() {
  const supabase = await createServerSupabase();
  
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    return { error: error.message };
  }

  return { session };
} 