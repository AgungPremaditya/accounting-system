import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

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

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bank: z.string().min(1, 'Bank name is required'),
  type: z.enum(['checking', 'savings', 'investment'], {
    required_error: 'Account type is required',
  }),
  balance: z.number().min(0, 'Balance must be positive'),
});

const paginationSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

export const bankAccountRouter = router({
  create: protectedProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }): Promise<BankAccount> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create a bank account',
        });
      }

      const supabase = await createServerSupabase();
      const { data: account, error } = await supabase
        .from('accounts')
        .insert([
          {
            account_name: input.name,
            account_number: input.accountNumber,
            bank_name: input.bank,
            account_type: input.type,
            initial_balance: input.balance,
            current_balance: input.balance,
            is_active: true,
            user_id: ctx.user.id,
            account_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
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
    }),

  list: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }): Promise<PaginatedResponse<BankAccount>> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view bank accounts',
        });
      }

      const supabase = await createServerSupabase();

      // Calculate range for pagination
      const from = (input.page - 1) * input.pageSize;
      const to = from + input.pageSize - 1;

      // Get total count
      const { count } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id);

      // Get paginated data
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }

      return {
        data: accounts.map(account => ({
          id: account.id,
          name: account.account_name,
          accountNumber: account.account_number,
          bank: account.bank_name,
          type: account.account_type,
          balance: account.current_balance,
          status: account.is_active ? 'Active' : 'Inactive',
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        })),
        count: count || 0,
      };
    }),
}); 