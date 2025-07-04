import { TransactionService } from '@/lib/services/transactionService';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn(),
}));

describe('TransactionService', () => {
  const mockTransaction = {
    id: 'tr123',
    transaction_number: 'TR-20240315-ABC12',
    transaction_date: '2024-03-15',
    description: 'Test Transaction',
    reference: 'REF123',
    total_amount: 1000,
    created_by: 'user123',
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  };

  const mockEntries = [
    {
      id: 'entry1',
      transaction_id: 'tr123',
      account_id: 'acc1',
      debit_amount: 1000,
      credit_amount: null,
      description: 'Debit entry',
      entry_order: 1,
      created_at: '2024-03-15T10:00:00Z',
    },
    {
      id: 'entry2',
      transaction_id: 'tr123',
      account_id: 'acc2',
      debit_amount: null,
      credit_amount: 1000,
      description: 'Credit entry',
      entry_order: 2,
      created_at: '2024-03-15T10:00:00Z',
    },
  ];

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createTransaction', () => {
    const createParams = {
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

    it('should create a transaction with balanced entries successfully', async () => {
      mockSupabase.select.mockImplementationOnce(() => ({
        data: [mockTransaction],
        error: null,
      }));
      mockSupabase.select.mockImplementationOnce(() => ({
        data: mockEntries,
        error: null,
      }));

      const result = await TransactionService.createTransaction(createParams);

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          transaction_date: createParams.date,
          description: createParams.description,
          reference: createParams.reference,
          total_amount: createParams.totalAmount,
          created_by: createParams.createdBy,
          transaction_number: expect.stringMatching(/^TR-\d{8}-[A-Z0-9]{5}$/),
        }),
      ]);

      expect(result).toEqual({
        id: mockTransaction.id,
        transactionNumber: mockTransaction.transaction_number,
        date: mockTransaction.transaction_date,
        description: mockTransaction.description,
        reference: mockTransaction.reference,
        totalAmount: mockTransaction.total_amount,
        createdBy: mockTransaction.created_by,
        createdAt: mockTransaction.created_at,
        updatedAt: mockTransaction.updated_at,
        entries: expect.arrayContaining([
          expect.objectContaining({
            id: mockEntries[0].id,
            debitAmount: mockEntries[0].debit_amount,
          }),
          expect.objectContaining({
            id: mockEntries[1].id,
            creditAmount: mockEntries[1].credit_amount,
          }),
        ]),
      });
    });

    it('should throw error if transaction creation fails', async () => {
      mockSupabase.select.mockImplementationOnce(() => ({ 
        data: null, 
        error: { message: 'Failed to create transaction' } 
      }));

      await expect(TransactionService.createTransaction(createParams))
        .rejects
        .toThrow('Failed to create transaction');
    });

    it('should throw error and rollback if entries creation fails', async () => {
      mockSupabase.select.mockImplementationOnce(() => ({ data: [mockTransaction], error: null }));
      mockSupabase.select.mockImplementationOnce(() => ({ 
        data: null, 
        error: { message: 'Failed to create transaction entries' } 
      }));

      await expect(TransactionService.createTransaction(createParams))
        .rejects
        .toThrow('Failed to create transaction entries');

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    describe('entry validation', () => {
      it('should throw error if entry has both debit and credit', async () => {
        const invalidParams = {
          ...createParams,
          entries: [
            {
              accountId: 'acc1',
              debitAmount: 1000,
              creditAmount: 1000,
            },
          ],
        };

        await expect(TransactionService.createTransaction(invalidParams))
          .rejects
          .toThrow('Entry 1 cannot have both debit and credit amounts');
      });

      it('should throw error if entry has neither debit nor credit', async () => {
        const invalidParams = {
          ...createParams,
          entries: [
            {
              accountId: 'acc1',
              description: 'Invalid entry',
            },
          ],
        };

        await expect(TransactionService.createTransaction(invalidParams))
          .rejects
          .toThrow('Entry 1 must have either a debit or credit amount');
      });

      it('should throw error if entry has negative debit amount', async () => {
        const invalidParams = {
          ...createParams,
          entries: [
            {
              accountId: 'acc1',
              debitAmount: -1000,
            },
          ],
        };

        await expect(TransactionService.createTransaction(invalidParams))
          .rejects
          .toThrow('Entry 1 cannot have a negative debit amount');
      });

      it('should throw error if entry has negative credit amount', async () => {
        const invalidParams = {
          ...createParams,
          entries: [
            {
              accountId: 'acc1',
              creditAmount: -1000,
            },
          ],
        };

        await expect(TransactionService.createTransaction(invalidParams))
          .rejects
          .toThrow('Entry 1 cannot have a negative credit amount');
      });

      it('should throw error if debits and credits are not balanced', async () => {
        const invalidParams = {
          ...createParams,
          entries: [
            {
              accountId: 'acc1',
              debitAmount: 1000,
            },
            {
              accountId: 'acc2',
              creditAmount: 500,
            },
          ],
        };

        await expect(TransactionService.createTransaction(invalidParams))
          .rejects
          .toThrow('Transaction is not balanced');
      });
    });
  });

  describe('getTransactions', () => {
    const listParams = {
      userId: 'user123',
      page: 1,
      pageSize: 10,
    };

    const mockTransactionWithEntries = {
      ...mockTransaction,
      transaction_entries: mockEntries,
    };

    it('should return paginated transactions with entries', async () => {
      mockSupabase.range.mockImplementation(() => ({
        data: [mockTransactionWithEntries],
        error: null,
        count: 1,
      }));

      const result = await TransactionService.getTransactions(
        listParams.userId,
        listParams.page,
        listParams.pageSize
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, transaction_entries(*)', { count: 'exact' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('created_by', listParams.userId);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual({
        data: [expect.objectContaining({
          id: mockTransaction.id,
          entries: expect.arrayContaining([
            expect.objectContaining({ id: mockEntries[0].id }),
            expect.objectContaining({ id: mockEntries[1].id }),
          ]),
        })],
        count: 1,
      });
    });

    it('should handle search parameter', async () => {
      const search = 'test';
      mockSupabase.range.mockImplementation(() => ({
        data: [mockTransactionWithEntries],
        error: null,
        count: 1,
      }));

      await TransactionService.getTransactions(
        listParams.userId,
        listParams.page,
        listParams.pageSize,
        search
      );

      expect(mockSupabase.or).toHaveBeenCalledWith(
        `transaction_number.ilike.%${search}%,description.ilike.%${search}%,reference.ilike.%${search}%`
      );
    });

    it('should throw error if fetching transactions fails', async () => {
      mockSupabase.range.mockImplementation(() => ({
        data: null,
        error: { message: 'Failed to fetch transactions' },
      }));

      await expect(
        TransactionService.getTransactions(
          listParams.userId,
          listParams.page,
          listParams.pageSize
        )
      ).rejects.toThrow('Failed to fetch transactions');
    });
  });

  describe('getTransactionById', () => {
    const searchParams = {
      id: 'tr123',
      userId: 'user123',
    };

    const mockTransactionWithEntries = {
      ...mockTransaction,
      transaction_entries: mockEntries,
    };

    it('should return transaction with entries by id', async () => {
      mockSupabase.single.mockImplementation(() => ({
        data: mockTransactionWithEntries,
        error: null,
      }));

      const result = await TransactionService.getTransactionById(
        searchParams.id,
        searchParams.userId
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, transaction_entries(*)');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', searchParams.id);
      expect(mockSupabase.eq).toHaveBeenCalledWith('created_by', searchParams.userId);
      expect(result).toEqual(expect.objectContaining({
        id: mockTransaction.id,
        entries: expect.arrayContaining([
          expect.objectContaining({ id: mockEntries[0].id }),
          expect.objectContaining({ id: mockEntries[1].id }),
        ]),
      }));
    });

    it('should throw error if transaction not found', async () => {
      mockSupabase.single.mockImplementation(() => ({
        data: null,
        error: { message: 'Transaction not found' },
      }));

      await expect(
        TransactionService.getTransactionById(searchParams.id, searchParams.userId)
      ).rejects.toThrow('Transaction not found');
    });
  });
}); 