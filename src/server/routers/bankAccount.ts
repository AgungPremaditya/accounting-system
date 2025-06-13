import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

const createBankAccountSchema = z.object({
  name: z.string(),
  accountNumber: z.string(),
  bank: z.string(),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number(),
});

export const bankAccountRouter = router({
  create: protectedProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = await createServerSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create a bank account',
        });
      }

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
            user_id: user.id,
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

      return account;
    }),

  list: protectedProcedure.query(async () => {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view bank accounts',
      });
    }

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    return accounts;
  }),
}); 