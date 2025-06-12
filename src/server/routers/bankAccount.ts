import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bank: z.string().min(1, 'Bank name is required'),
  type: z.enum(['checking', 'savings', 'investment'], {
    required_error: 'Account type is required',
  }),
  balance: z.number().min(0, 'Balance must be positive'),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const bankAccountRouter = router({
  create: publicProcedure
    .input(createBankAccountSchema)
    .mutation(async ({ input }) => {
      try {
        const supabase = await createServerSupabase();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
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
              user_id: session.user.id,
              account_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return account;
      } catch (error) {
        console.error('Create account error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create bank account',
        });
      }
    }),

  list: publicProcedure.query(async () => {
    try {
      const supabase = await createServerSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view bank accounts',
        });
      }

      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return accounts;
    } catch (error) {
      console.error('List accounts error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch bank accounts',
      });
    }
  }),
}); 