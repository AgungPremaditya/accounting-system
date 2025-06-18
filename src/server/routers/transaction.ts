import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { BankAccountService } from '@/lib/services/bankAccountService';
import { TransactionService } from '@/lib/services/transactionService';

const createTransactionSchema = z.object({
  sender_account_id: z.string().min(1, 'Sender Account ID is required'),
  receiver_account_id: z.string().min(1, 'Receiver Account ID is required'),
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
  getUserAccounts: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view accounts',
        });
      }

      return BankAccountService.getAccounts(ctx.user.id, 1, 100);
    }),

  create: protectedProcedure
    .input(createTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create a transaction',
        });
      }

      return TransactionService.createTransaction({
        date: input.transaction_date.toISOString(),
        description: input.description,
        reference: input.reference,
        totalAmount: input.total_amount,
        createdBy: ctx.user.id,
        entries: [{ 
          accountId: input.sender_account_id,
          debitAmount: input.total_amount,
          creditAmount: 0,
        }, {
          accountId: input.receiver_account_id,
          debitAmount: 0,
          creditAmount: input.total_amount,
        }],
      });

    }),
}); 