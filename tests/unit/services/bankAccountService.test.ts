import { BankAccountService } from '@/lib/services/bankAccountService';
import { createServerSupabase } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn(),
}));

describe('BankAccountService', () => {
  const mockAccount = {
    id: '123',
    account_name: 'Test Account',
    account_number: 'ACC123',
    bank_name: 'Test Bank',
    account_type: 'checking',
    current_balance: 1000,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockImplementation(() => ({
      range: jest.fn().mockResolvedValue({
        data: [mockAccount],
        error: null,
        count: 1,
      }),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createAccount', () => {
    it('should create a new bank account successfully', async () => {
      // Arrange
      const params = {
        name: 'Test Account',
        accountNumber: 'ACC123',
        bank: 'Test Bank',
        type: 'checking' as const,
        balance: 1000,
        userId: 'user123',
      };

      mockSupabase.single.mockResolvedValue({ data: mockAccount, error: null });

      // Act
      const result = await BankAccountService.createAccount(params);

      // Assert
      expect(result).toEqual({
        id: '123',
        name: 'Test Account',
        accountNumber: 'ACC123',
        bank: 'Test Bank',
        type: 'checking',
        balance: 1000,
        status: 'Active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should throw an error if account creation fails', async () => {
      // Arrange
      const params = {
        name: 'Test Account',
        accountNumber: 'ACC123',
        bank: 'Test Bank',
        type: 'checking' as const,
        balance: 1000,
        userId: 'user123',
      };

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Account creation failed' },
      });

      // Act & Assert
      await expect(BankAccountService.createAccount(params)).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe('getAccounts', () => {
    it('should return paginated accounts', async () => {
      // Arrange
      const userId = 'user123';
      const page = 1;
      const pageSize = 10;

      // Act
      const result = await BankAccountService.getAccounts(userId, page, pageSize);

      // Assert
      expect(result).toEqual({
        data: [{
          id: '123',
          name: 'Test Account',
          accountNumber: 'ACC123',
          bank: 'Test Bank',
          type: 'checking',
          balance: 1000,
          status: 'Active',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        }],
        count: 1,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle search parameter', async () => {
      // Arrange
      const userId = 'user123';
      const page = 1;
      const pageSize = 10;
      const search = 'test';

      // Act
      const result = await BankAccountService.getAccounts(userId, page, pageSize, search);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.or).toHaveBeenCalledWith(
        `account_name.ilike.%${search}%,bank_name.ilike.%${search}%,account_number.ilike.%${search}%`
      );
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
}); 