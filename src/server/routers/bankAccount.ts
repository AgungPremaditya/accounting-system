import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { BankAccountService } from '@/lib/services/bankAccountService';
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

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bank: z.string().min(1, 'Bank name is required'),
  type: z.enum(['checking', 'savings', 'investment'], {
    required_error: 'Account type is required',
  }),
  balance: z.number().min(0, 'Balance must be positive'),
});

const listAccountsSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
  search: z.string().optional(),
});

const searchAccountSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const bankAccountRouter = router({
  create: protectedProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create a bank account',
        });
      }

      return BankAccountService.createAccount({
        ...input,
        userId: ctx.user.id,
      });
    }),

  list: protectedProcedure
    .input(listAccountsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view bank accounts',
        });
      }

      return BankAccountService.getAccounts(ctx.user.id, input.page, input.pageSize, input.search);
    }),

  searchByNumber: protectedProcedure
    .input(searchAccountSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to search bank accounts',
        });
      }

      return BankAccountService.searchByNumber(input.accountNumber, ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({
      id: z.string().min(1, 'Account ID is required'),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view bank account details',
        });
      }

      const supabase = await createServerSupabase();
      
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .single();

      if (error || !account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      return BankAccountService.mapAccountToDTO(account);
    }),
}); 