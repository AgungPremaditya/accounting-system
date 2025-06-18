import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import type { Database } from '@/types/database.types';

type Account = Database['public']['Tables']['accounts']['Row'];
type BankAccount = {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
};

interface CreateBankAccountParams {
  name: string;
  accountNumber: string;
  bank: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  userId: string;
}

export class BankAccountService {
  /**
   * Generates a random account code
   * @returns The generated account code
   */
  private static generateAccountCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Maps an account from the database to a DTO
   * @param account - The account from the database
   * @returns The account in DTO format
   */
  static mapAccountToDTO(account: Account): BankAccount {
    return {
      id: account.id,
      name: account.account_name,
      accountNumber: account.account_number,
      bank: account.bank_name,
      type: account.account_type as 'checking' | 'savings' | 'investment',
      balance: account.current_balance,
      status: account.is_active ? 'Active' : 'Inactive',
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  /**
   * Creates a new bank account
   * @param params - The parameters for creating the account
   * @returns The created account
   */
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

  /**
   * Gets all accounts for a user
   * @param userId - The ID of the user
   * @param page - The page number
   * @param pageSize - The number of accounts per page
   * @param search - The search term
   * @returns The accounts
   */
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

  /**
   * Searches for an account by number
   * @param accountNumber - The account number
   * @param userId - The ID of the user
   * @returns The account
   */
  static async searchByNumber(accountNumber: string, userId: string): Promise<BankAccount> {
    const supabase = await createServerSupabase();
    
    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_number', accountNumber)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Account not found',
      });
    }

    return this.mapAccountToDTO(account);
  }
} 