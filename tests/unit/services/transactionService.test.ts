import { TransactionService } from '@/lib/services/transactionService';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn(),
}));

describe('TransactionService', () => {
  const mockTransaction = {
    id: '123',
    transaction_number: 'TR-20240315-ABC12',
    transaction_date: '2024-03-15',
    description: 'Test Transaction',
    reference: 'REF123',
    total_amount: 1000,
    created_by: 'user123',
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z',
  };

  const mockTransactionEntries = [
    {
      id: 'entry1',
      transaction_id: '123',
      account_id: 'acc1',
      debit_amount: 1000,
      credit_amount: null,
      description: 'Debit entry',
      entry_order: 1,
      created_at: '2024-03-15T00:00:00Z',
    },
    {
      id: 'entry2',
      transaction_id: '123',
      account_id: 'acc2',
      debit_amount: null,
      credit_amount: 1000,
      description: 'Credit entry',
      entry_order: 2,
      created_at: '2024-03-15T00:00:00Z',
    },
  ];

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockImplementation(() => ({
      range: jest.fn().mockResolvedValue({
        data: [{ ...mockTransaction, transaction_entries: mockTransactionEntries }],
        error: null,
        count: 1,
      }),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createTransaction', () => {
    it('should create a new transaction with entries successfully', async () => {
      const params = {
        date: '2024-03-15',
        description: 'Test Transaction',
        reference: 'REF123',
        totalAmount: 1000,
        createdBy: 'user123',
        entries: [
          {
            accountId: 'acc1',
            debitAmount: 1000,
            description: 'Debit entry',
          },
          {
            accountId: 'acc2',
            creditAmount: 1000,
            description: 'Credit entry',
          },
        ],
      };

      // Mock transaction creation
      mockSupabase.insert.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null }),
      }));

      // Mock transaction entries creation
      mockSupabase.insert.mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue({ data: mockTransactionEntries, error: null }),
      }));

      const result = await TransactionService.createTransaction(params);

      expect(result).toEqual({
        id: '123',
        transactionNumber: 'TR-20240315-ABC12',
        date: '2024-03-15',
        description: 'Test Transaction',
        reference: 'REF123',
        totalAmount: 1000,
        createdBy: 'user123',
        createdAt: '2024-03-15T00:00:00Z',
        updatedAt: '2024-03-15T00:00:00Z',
        entries: mockTransactionEntries.map(entry => ({
          id: entry.id,
          transactionId: entry.transaction_id,
          accountId: entry.account_id,
          debitAmount: entry.debit_amount,
          creditAmount: entry.credit_amount,
          description: entry.description,
          entryOrder: entry.entry_order,
          createdAt: entry.created_at,
        })),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should validate transaction entries balance', async () => {
      const params = {
        date: '2024-03-15',
        description: 'Test Transaction',
        totalAmount: 1000,
        createdBy: 'user123',
        entries: [
          {
            accountId: 'acc1',
            debitAmount: 1000,
          },
          {
            accountId: 'acc2',
            creditAmount: 500, // Unbalanced amount
          },
        ],
      };

      await expect(TransactionService.createTransaction(params)).rejects.toThrow(
        'Transaction is not balanced'
      );
    });

    it('should throw an error if transaction creation fails', async () => {
      const params = {
        date: '2024-03-15',
        description: 'Test Transaction',
        totalAmount: 1000,
        createdBy: 'user123',
        entries: [
          {
            accountId: 'acc1',
            debitAmount: 1000,
          },
          {
            accountId: 'acc2',
            creditAmount: 1000,
          },
        ],
      };

      mockSupabase.insert.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Transaction creation failed' },
        }),
      }));

      await expect(TransactionService.createTransaction(params)).rejects.toThrow(
        'Transaction creation failed'
      );
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const userId = 'user123';
      const page = 1;
      const pageSize = 10;

      const result = await TransactionService.getTransactions(userId, page, pageSize);

      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, transaction_entries(*)', { count: 'exact' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('created_by', userId);
    });

    it('should handle search parameter', async () => {
      const userId = 'user123';
      const page = 1;
      const pageSize = 10;
      const search = 'test';

      const result = await TransactionService.getTransactions(userId, page, pageSize, search);

      expect(result.data).toHaveLength(1);
      expect(mockSupabase.or).toHaveBeenCalledWith(
        `transaction_number.ilike.%${search}%,description.ilike.%${search}%,reference.ilike.%${search}%`
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return a single transaction with entries', async () => {
      const transactionId = '123';
      const userId = 'user123';

      mockSupabase.single.mockResolvedValue({
        data: { ...mockTransaction, transaction_entries: mockTransactionEntries },
        error: null,
      });

      const result = await TransactionService.getTransactionById(transactionId, userId);

      expect(result).toEqual({
        id: '123',
        transactionNumber: 'TR-20240315-ABC12',
        date: '2024-03-15',
        description: 'Test Transaction',
        reference: 'REF123',
        totalAmount: 1000,
        createdBy: 'user123',
        createdAt: '2024-03-15T00:00:00Z',
        updatedAt: '2024-03-15T00:00:00Z',
        entries: expect.arrayContaining([
          expect.objectContaining({
            id: 'entry1',
            transactionId: '123',
          }),
          expect.objectContaining({
            id: 'entry2',
            transactionId: '123',
          }),
        ]),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, transaction_entries(*)');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', transactionId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('created_by', userId);
    });

    it('should throw an error if transaction is not found', async () => {
      const transactionId = 'nonexistent';
      const userId = 'user123';

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Transaction not found' },
      });

      await expect(TransactionService.getTransactionById(transactionId, userId)).rejects.toThrow(
        'Transaction not found'
      );
    });
  });
}); 