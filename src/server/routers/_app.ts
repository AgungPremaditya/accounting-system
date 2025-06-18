import { router } from '../trpc';
import { bankAccountRouter } from './bankAccount';
import { transactionRouter } from './transaction';

export const appRouter = router({
  bankAccount: bankAccountRouter,
  transaction: transactionRouter,
});

export type AppRouter = typeof appRouter; 