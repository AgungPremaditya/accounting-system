import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import type { Account } from '@/types/database.types';
import type { BankAccount } from '@/services/bankAccounts';

interface CreateBankAccountParams {
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  userId: string;
}

export class BankAccountService {
  private static generateAccountCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private static mapAccountToDTO(account: Account): BankAccount {
    return {
      id: account.id,
      name: account.account_name,
      accountNumber: account.account_number,
      bank: account.bank_name,
      type: account.account_type,
      balance: account.current_balance,
      status: account.is_active ? 'Active' : 'Inactive',
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  static async createAccount(params: CreateBankAccountParams): Promise<BankAccount> {
    const supabase = await createServerSupabase();
    
    const { data: account, error } = await supabase
      .from('accounts')
      .insert([
        {
          account_name: params.name,
          account_number: params.accountNumber,
          bank_name: params.bank,
          account_type: params.type,
          initial_balance: params.balance,
          current_balance: params.balance,
          is_active: true,
          user_id: params.userId,
          account_code: this.generateAccountCode(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    return this.mapAccountToDTO(account);
  }

  static async getAccounts(userId: string, page: number, pageSize: number, search?: string) {
    const supabase = await createServerSupabase();
    
    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Add search filter if search term is provided
    if (search) {
      query = query.or(`account_name.ilike.%${search}%,bank_name.ilike.%${search}%,account_number.ilike.%${search}%`);
    }

    // Get paginated data with search filter and count
    const { data: accounts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    return {
      data: accounts.map(this.mapAccountToDTO),
      count: count || 0,
    };
  }
} 