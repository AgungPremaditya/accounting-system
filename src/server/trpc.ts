import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import { type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
interface CreateContextOptions {
  req: NextRequest;
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  const { req } = opts;
  return {
    req,
  };
};

export type Context = {
  user: {
    id: string;
  } | null;
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the "/src/server/api/routers" directory.
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: {
        id: user.id,
      },
    },
  });
}); 