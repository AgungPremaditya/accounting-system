import { createServerSupabase } from '@/lib/supabase/server';

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export interface CreateBankAccountInput {
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
}

interface GetBankAccountsParams {
  page: number;
  pageSize: number;
  search?: string;
}

export async function getBankAccounts({ page, pageSize, search }: GetBankAccountsParams): Promise<PaginatedResponse<BankAccount>> {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search) {
    searchParams.append('search', search);
  }

  const response = await fetch(`/api/banking/accounts?${searchParams.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch bank accounts');
  }

  return data;
}

export async function createBankAccount(data: CreateBankAccountInput): Promise<BankAccount> {
  const response = await fetch('/api/banking/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create bank account');
  }

  return result;
} 