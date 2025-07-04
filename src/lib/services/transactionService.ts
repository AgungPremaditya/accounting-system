import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import type { Database } from '@/types/database.types';

type DBTransaction = Database['public']['Tables']['transactions']['Row'];
type DBTransactionEntry = Database['public']['Tables']['transaction_entries']['Row'];

export type Transaction = {
  id: string;
  transactionNumber: string;
  date: string;
  description: string;
  reference: string | null;
  totalAmount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  entries: TransactionEntry[];
};

type TransactionEntry = {
  id: string;
  transactionId: string;
  accountId: string;
  debitAmount: number | null;
  creditAmount: number | null;
  description: string | null;
  entryOrder: number;
  createdAt: string;
};

interface CreateTransactionParams {
  date: string;
  description: string;
  reference?: string;
  totalAmount: number;
  createdBy: string;
  entries: Array<{
    accountId: string;
    debitAmount?: number;
    creditAmount?: number;
    description?: string;
  }>;
}

export class TransactionService {
  /**
   * Generates a unique transaction number
   * Format: TR-YYYYMMDD-XXXXX (e.g., TR-20240315-A12B3)
   * @returns The generated transaction number
   */
  private static generateTransactionNumber(): string {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TR-${datePart}-${randomPart}`;
  }

  /**
   * Maps a transaction from the database to a DTO
   * @param transaction - The transaction from the database
   * @param entries - The entries for the transaction
   * @returns The transaction in DTO format
   */
  private static mapTransactionToDTO(
    transaction: DBTransaction,
    entries: DBTransactionEntry[]
  ): Transaction {
    return {
      id: transaction.id,
      transactionNumber: transaction.transaction_number,
      date: transaction.transaction_date,
      description: transaction.description,
      reference: transaction.reference,
      totalAmount: transaction.total_amount,
      createdBy: transaction.created_by,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      entries: entries.map(this.mapTransactionEntryToDTO),
    };
  }

  /**
   * Maps a transaction entry from the database to a DTO
   * @param entry - The entry from the database
   * @returns The entry in DTO format
   */
  private static mapTransactionEntryToDTO(entry: DBTransactionEntry): TransactionEntry {
    return {
      id: entry.id,
      transactionId: entry.transaction_id,
      accountId: entry.account_id,
      debitAmount: entry.debit_amount,
      creditAmount: entry.credit_amount,
      description: entry.description,
      entryOrder: entry.entry_order,
      createdAt: entry.created_at,
    };
  }

  /**
   * Validates that the transaction entries are balanced (total debits = total credits)
   * Also validates that each entry has either a debit or credit amount, but not both
   * @param entries - The entries for the transaction
   */
  private static validateTransactionEntries(entries: CreateTransactionParams['entries']): void {
    let totalDebits = 0;
    let totalCredits = 0;

    // Validate each entry and calculate totals
    entries.forEach((entry, index) => {
      // Check if entry has both debit and credit
      if (entry.debitAmount && entry.creditAmount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Entry ${index + 1} cannot have both debit and credit amounts`,
        });
      }

      // Check if entry has neither debit nor credit
      if (!entry.debitAmount && !entry.creditAmount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Entry ${index + 1} must have either a debit or credit amount`,
        });
      }

      // Check for negative amounts
      if (entry.debitAmount && entry.debitAmount < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Entry ${index + 1} cannot have a negative debit amount`,
        });
      }
      if (entry.creditAmount && entry.creditAmount < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Entry ${index + 1} cannot have a negative credit amount`,
        });
      }

      // Add to totals
      if (entry.debitAmount) totalDebits += entry.debitAmount;
      if (entry.creditAmount) totalCredits += entry.creditAmount;
    });

    // Check if debits equal credits
    if (Math.abs(totalDebits - totalCredits) > 0.001) { // Using small epsilon for floating point comparison
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Transaction is not balanced. Total debits (${totalDebits}) must equal total credits (${totalCredits})`,
      });
    }
  }

  /**
   * Creates a new transaction with its entries
   * @param params - The parameters for creating the transaction
   * @returns The created transaction
   */
  static async createTransaction(params: CreateTransactionParams): Promise<Transaction> {
    // Validate transaction entries before proceeding
    this.validateTransactionEntries(params.entries);

    const supabase = await createServerSupabase();

    // Start a Supabase transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          transaction_number: this.generateTransactionNumber(),
          transaction_date: params.date,
          description: params.description,
          reference: params.reference,
          total_amount: params.totalAmount,
          created_by: params.createdBy,
        },
      ])
      .select();

    if (transactionError || !transaction?.[0]) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: transactionError?.message || 'Failed to create transaction',
      });
    }

    // Create transaction entries
    const entries = params.entries.map((entry, index) => ({
      transaction_id: transaction[0].id,
      account_id: entry.accountId,
      debit_amount: entry.debitAmount || null,
      credit_amount: entry.creditAmount || null,
      description: entry.description || null,
      entry_order: index + 1,
    }));

    const { data: createdEntries, error: entriesError } = await supabase
      .from('transaction_entries')
      .insert(entries)
      .select();

    if (entriesError || !createdEntries) {
      // If entries creation fails, delete the transaction
      await supabase.from('transactions').delete().eq('id', transaction[0].id);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: entriesError?.message || 'Failed to create transaction entries',
      });
    }

    return this.mapTransactionToDTO(transaction[0], createdEntries);
  }

  /**
   * Gets transactions with pagination and optional search
   * @param userId - The ID of the user
   * @param page - The page number
   * @param pageSize - The number of transactions per page
   * @param search - The search term
   * @returns The transactions
   */
  static async getTransactions(
    userId: string,
    page: number,
    pageSize: number,
    search?: string
  ) {
    const supabase = await createServerSupabase();
    
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('transactions')
      .select('*, transaction_entries(*)', { count: 'exact' })
      .eq('created_by', userId);

    if (search) {
      query = query.or(
        `transaction_number.ilike.%${search}%,description.ilike.%${search}%,reference.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query
      .order('transaction_date', { ascending: false })
      .range(from, to);

    if (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    }

    return {
      data: data.map(transaction => 
        this.mapTransactionToDTO(
          transaction,
          transaction.transaction_entries
        )
      ),
      count: count || 0,
    };
  }

  /**
   * Gets a single transaction by ID with its entries
   * @param id - The ID of the transaction
   * @param userId - The ID of the user
   * @returns The transaction
   */
  static async getTransactionById(id: string, userId: string): Promise<Transaction> {
    const supabase = await createServerSupabase();
    
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*, transaction_entries(*)')
      .eq('id', id)
      .eq('created_by', userId)
      .single();

    if (error || !transaction) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return this.mapTransactionToDTO(
      transaction,
      transaction.transaction_entries
    );
  }
} 