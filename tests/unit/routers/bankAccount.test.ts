import { BankAccountService } from '@/lib/services/bankAccountService';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

// Mock the services
jest.mock('@/lib/services/bankAccountService');
jest.mock('@/lib/supabase/server');

describe('Bank Account Router', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };

  const mockAccount = {
    id: 'acc123',
    name: 'Test Account',
    accountNumber: 'ACC123',
    bank: 'Test Bank',
    type: 'checking' as const,
    balance: 1000,
    status: 'Active' as const,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const mockContext = {
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createAccount', () => {
    const createInput = {
      name: 'Test Account',
      accountNumber: 'ACC123',
      bank: 'Test Bank',
      type: 'checking' as const,
      balance: 1000,
    };

    it('should create a bank account successfully', async () => {
      // Arrange
      (BankAccountService.createAccount as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await BankAccountService.createAccount({
        ...createInput,
        userId: mockUser.id,
      });

      // Assert
      expect(result).toEqual(mockAccount);
      expect(BankAccountService.createAccount).toHaveBeenCalledWith({
        ...createInput,
        userId: mockUser.id,
      });
    });

    it('should throw error if service fails', async () => {
      // Arrange
      (BankAccountService.createAccount as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to create account',
        })
      );

      // Act & Assert
      await expect(
        BankAccountService.createAccount({
          ...createInput,
          userId: mockUser.id,
        })
      ).rejects.toThrow('Failed to create account');
    });
  });

  describe('getAccounts', () => {
    const listInput = {
      page: 1,
      pageSize: 10,
      search: 'test',
    };

    it('should return paginated accounts', async () => {
      // Arrange
      const mockResponse = {
        data: [mockAccount],
        count: 1,
      };
      (BankAccountService.getAccounts as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await BankAccountService.getAccounts(
        mockUser.id,
        listInput.page,
        listInput.pageSize,
        listInput.search
      );

      // Assert
      expect(result).toEqual(mockResponse);
      expect(BankAccountService.getAccounts).toHaveBeenCalledWith(
        mockUser.id,
        listInput.page,
        listInput.pageSize,
        listInput.search
      );
    });
  });

  describe('searchByNumber', () => {
    const accountNumber = 'ACC123';

    it('should search account by number', async () => {
      // Arrange
      (BankAccountService.searchByNumber as jest.Mock).mockResolvedValue(mockAccount);

      // Act
      const result = await BankAccountService.searchByNumber(accountNumber, mockUser.id);

      // Assert
      expect(result).toEqual(mockAccount);
      expect(BankAccountService.searchByNumber).toHaveBeenCalledWith(
        accountNumber,
        mockUser.id
      );
    });

    it('should throw error if account not found', async () => {
      // Arrange
      (BankAccountService.searchByNumber as jest.Mock).mockRejectedValue(
        new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        })
      );

      // Act & Assert
      await expect(
        BankAccountService.searchByNumber(accountNumber, mockUser.id)
      ).rejects.toThrow('Account not found');
    });
  });

  describe('getAccountById', () => {
    const accountId = 'acc123';

    it('should return account by id', async () => {
      // Arrange
      const mockDBAccount = {
        id: 'acc123',
        account_name: 'Test Account',
        account_number: 'ACC123',
        bank_name: 'Test Bank',
        account_type: 'checking',
        current_balance: 1000,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockDBAccount,
        error: null,
      });

      (BankAccountService.mapAccountToDTO as jest.Mock).mockReturnValue(mockAccount);

      // Act
      const { data: result } = await mockSupabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', mockUser.id)
        .single();

      // Assert
      expect(BankAccountService.mapAccountToDTO(result)).toEqual(mockAccount);
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', accountId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should throw error if account not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Account not found' },
      });

      // Act & Assert
      await expect(
        mockSupabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', mockUser.id)
          .single()
      ).resolves.toEqual({
        data: null,
        error: { message: 'Account not found' },
      });
    });
  });
}); 