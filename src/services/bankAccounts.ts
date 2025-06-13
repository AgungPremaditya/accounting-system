import { createBrowserSupabase } from '@/lib/supabase/client';

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'investment';
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  account_code: string;
}

export interface CreateBankAccountDTO {
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
}

export async function createBankAccount(data: CreateBankAccountDTO): Promise<BankAccount> {
  const supabase = createBrowserSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be logged in to create a bank account');
  }

  const response = await fetch('/api/banking/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create bank account');
  }

  return response.json();
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const supabase = createBrowserSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be logged in to view bank accounts');
  }

  const response = await fetch('/api/banking/accounts');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch bank accounts');
  }

  return response.json();
} 