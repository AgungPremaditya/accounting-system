import { router } from '../trpc';
import { bankAccountRouter } from './bankAccount';

export const appRouter = router({
  bankAccount: bankAccountRouter,
});

export type AppRouter = typeof appRouter; 