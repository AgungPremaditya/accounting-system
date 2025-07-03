import { BankAccountService } from '@/lib/services/bankAccountService';
import { TransactionService } from '@/lib/services/transactionService';
import { TRPCError } from '@trpc/server';

// Mock the services
jest.mock('@/lib/services/bankAccountService');
jest.mock('@/lib/services/transactionService');

describe('Transaction Router', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockTransaction = {
    id: 'tr123',
    transactionNumber: 'TR-20240315-ABC12',
    date: '2024-03-15',
    description: 'Test Transaction',
    reference: 'REF123',
    totalAmount: 1000,
    createdBy: 'user123',
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-03-15T00:00:00Z',
    entries: [
      {
        id: 'entry1',
        transactionId: 'tr123',
        accountId: 'acc1',
        debitAmount: 1000,
        creditAmount: null,
        description: 'Debit entry',
        entryOrder: 1,
        createdAt: '2024-03-15T00:00:00Z',
      },
      {
        id: 'entry2',
        transactionId: 'tr123',
        accountId: 'acc2',
        debitAmount: null,
        creditAmount: 1000,
        description: 'Credit entry',
        entryOrder: 2,
        createdAt: '2024-03-15T00:00:00Z',
      },
    ],
  };

  const mockAccounts = [
    {
      id: 'acc1',
      name: 'Sender Account',
      accountNumber: 'ACC123',
      bank: 'Test Bank',
      type: 'checking' as const,
      balance: 2000,
      status: 'Active' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'acc2',
      name: 'Receiver Account',
      accountNumber: 'ACC456',
      bank: 'Test Bank',
      type: 'savings' as const,
      balance: 1000,
      status: 'Active' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockContext = {
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserAccounts', () => {
    it('should return user accounts', async () => {
      // Arrange
      const mockResponse = {
        data: mockAccounts,
        count: 2,
      };
      (BankAccountService.getAccounts as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await BankAccountService.getAccounts(mockUser.id, 1, 100);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(BankAccountService.getAccounts).toHaveBeenCalledWith(
        mockUser.id,
        1,
        100
      );
    });

    it('should throw error if service fails', async () => {
      // Arrange
      (BankAccountService.getAccounts as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to fetch accounts',
        })
      );

      // Act & Assert
      await expect(
        BankAccountService.getAccounts(mockUser.id, 1, 100)
      ).rejects.toThrow('Failed to fetch accounts');
    });
  });

  describe('list', () => {
    const listInput = {
      page: 1,
      pageSize: 10,
      search: 'test',
    };

    it('should return paginated transactions', async () => {
      // Arrange
      const mockResponse = {
        data: [mockTransaction],
        count: 1,
      };
      (TransactionService.getTransactions as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await TransactionService.getTransactions(
        mockUser.id,
        listInput.page,
        listInput.pageSize,
        listInput.search
      );

      // Assert
      expect(result).toEqual(mockResponse);
      expect(TransactionService.getTransactions).toHaveBeenCalledWith(
        mockUser.id,
        listInput.page,
        listInput.pageSize,
        listInput.search
      );
    });

    it('should throw error if service fails', async () => {
      // Arrange
      (TransactionService.getTransactions as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to fetch transactions',
        })
      );

      // Act & Assert
      await expect(
        TransactionService.getTransactions(
          mockUser.id,
          listInput.page,
          listInput.pageSize,
          listInput.search
        )
      ).rejects.toThrow('Failed to fetch transactions');
    });
  });

  describe('create', () => {
    const createInput = {
      sender_account_id: 'acc1',
      receiver_account_id: 'acc2',
      transaction_date: new Date('2024-03-15'),
      description: 'Test Transaction',
      reference: 'REF123',
      total_amount: 1000,
    };

    it('should create a transaction successfully', async () => {
      // Arrange
      (TransactionService.createTransaction as jest.Mock).mockResolvedValue(mockTransaction);

      // Act
      const result = await TransactionService.createTransaction({
        date: createInput.transaction_date.toISOString(),
        description: createInput.description,
        reference: createInput.reference,
        totalAmount: createInput.total_amount,
        createdBy: mockUser.id,
        entries: [
          {
            accountId: createInput.sender_account_id,
            debitAmount: createInput.total_amount,
            creditAmount: 0,
          },
          {
            accountId: createInput.receiver_account_id,
            debitAmount: 0,
            creditAmount: createInput.total_amount,
          },
        ],
      });

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(TransactionService.createTransaction).toHaveBeenCalledWith({
        date: createInput.transaction_date.toISOString(),
        description: createInput.description,
        reference: createInput.reference,
        totalAmount: createInput.total_amount,
        createdBy: mockUser.id,
        entries: [
          {
            accountId: createInput.sender_account_id,
            debitAmount: createInput.total_amount,
            creditAmount: 0,
          },
          {
            accountId: createInput.receiver_account_id,
            debitAmount: 0,
            creditAmount: createInput.total_amount,
          },
        ],
      });
    });

    it('should throw error if service fails', async () => {
      // Arrange
      (TransactionService.createTransaction as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to create transaction',
        })
      );

      // Act & Assert
      await expect(
        TransactionService.createTransaction({
          date: createInput.transaction_date.toISOString(),
          description: createInput.description,
          reference: createInput.reference,
          totalAmount: createInput.total_amount,
          createdBy: mockUser.id,
          entries: [
            {
              accountId: createInput.sender_account_id,
              debitAmount: createInput.total_amount,
              creditAmount: 0,
            },
            {
              accountId: createInput.receiver_account_id,
              debitAmount: 0,
              creditAmount: createInput.total_amount,
            },
          ],
        })
      ).rejects.toThrow('Failed to create transaction');
    });
  });

  describe('getById', () => {
    const transactionId = 'tr123';

    it('should return transaction by id', async () => {
      // Arrange
      (TransactionService.getTransactionById as jest.Mock).mockResolvedValue(mockTransaction);

      // Act
      const result = await TransactionService.getTransactionById(transactionId, mockUser.id);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(TransactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        mockUser.id
      );
    });

    it('should throw error if transaction not found', async () => {
      // Arrange
      (TransactionService.getTransactionById as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Transaction not found',
        })
      );

      // Act & Assert
      await expect(
        TransactionService.getTransactionById(transactionId, mockUser.id)
      ).rejects.toThrow('Transaction not found');
    });
  });
}); 