import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const createTransactionSchema = z.object({
  account_id: z.string().min(1, 'Account ID is required'),
  transaction_date: z.date({
    required_error: "Please select a date",
  }),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  total_amount: z.number(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export interface Transaction extends CreateTransactionInput {
  id: string;
  created_at: string;
  updated_at: string;
}

export const transactionRouter = router({
  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create a transaction',
        });
      }

      // TODO: Implement transaction creation logic
      // For now, return a mock response
      return {
        id: 'mock-id',
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Transaction;
    }),
}); 