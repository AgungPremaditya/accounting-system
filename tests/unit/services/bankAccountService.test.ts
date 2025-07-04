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
    account_type: 'checking' as 'checking' | 'savings' | 'investment',
    current_balance: 1000,
    initial_balance: 1000,
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    user_id: 'user123',
    account_code: 'ABC123'
  };

  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('mapAccountToDTO', () => {
    it('should correctly map account data to DTO', () => {
      const result = BankAccountService.mapAccountToDTO(mockAccount);
      
      expect(result).toEqual({
        id: mockAccount.id,
        name: mockAccount.account_name,
        accountNumber: mockAccount.account_number,
        bank: mockAccount.bank_name,
        type: mockAccount.account_type,
        balance: mockAccount.current_balance,
        status: 'Active',
        createdAt: mockAccount.created_at,
        updatedAt: mockAccount.updated_at,
      });
    });

    it('should map inactive account correctly', () => {
      const inactiveAccount = { ...mockAccount, is_active: false };
      const result = BankAccountService.mapAccountToDTO(inactiveAccount);
      
      expect(result.status).toBe('Inactive');
    });
  });

  describe('createAccount', () => {
    const createParams = {
      name: 'New Account',
      accountNumber: 'NEW123',
      bank: 'New Bank',
      type: 'checking' as const,
      balance: 2000,
      userId: 'user123'
    };

    it('should create a new account successfully', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAccount, error: null });

      const result = await BankAccountService.createAccount(createParams);

      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          account_name: createParams.name,
          account_number: createParams.accountNumber,
          bank_name: createParams.bank,
          account_type: createParams.type,
          initial_balance: createParams.balance,
          current_balance: createParams.balance,
          is_active: true,
          user_id: createParams.userId,
          account_code: expect.any(String)
        })
      ]);
      expect(result).toEqual(BankAccountService.mapAccountToDTO(mockAccount));
    });

    it('should throw error if account creation fails', async () => {
      const error = { message: 'Creation failed' };
      mockSupabase.single.mockResolvedValue({ data: null, error });

      await expect(BankAccountService.createAccount(createParams))
        .rejects
        .toThrow('Creation failed');
    });
  });

  describe('getAccounts', () => {
    const listParams = {
      userId: 'user123',
      page: 1,
      pageSize: 10,
    };

    it('should return paginated accounts', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [mockAccount],
        error: null,
        count: 1
      });

      const result = await BankAccountService.getAccounts(
        listParams.userId,
        listParams.page,
        listParams.pageSize
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', listParams.userId);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual({
        data: [BankAccountService.mapAccountToDTO(mockAccount)],
        count: 1
      });
    });

    it('should handle search parameter', async () => {
      const search = 'test';
      mockSupabase.range.mockResolvedValue({
        data: [mockAccount],
        error: null,
        count: 1
      });

      await BankAccountService.getAccounts(
        listParams.userId,
        listParams.page,
        listParams.pageSize,
        search
      );

      expect(mockSupabase.or).toHaveBeenCalledWith(
        `account_name.ilike.%${search}%,bank_name.ilike.%${search}%,account_number.ilike.%${search}%`
      );
    });

    it('should throw error if fetching accounts fails', async () => {
      const error = { message: 'Fetch failed' };
      mockSupabase.range.mockResolvedValue({ data: null, error });

      await expect(
        BankAccountService.getAccounts(
          listParams.userId,
          listParams.page,
          listParams.pageSize
        )
      ).rejects.toThrow('Fetch failed');
    });
  });

  describe('searchByNumber', () => {
    const searchParams = {
      accountNumber: 'ACC123',
      userId: 'user123'
    };

    it('should find account by number', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockAccount, error: null });

      const result = await BankAccountService.searchByNumber(
        searchParams.accountNumber,
        searchParams.userId
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('accounts');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('account_number', searchParams.accountNumber);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', searchParams.userId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(BankAccountService.mapAccountToDTO(mockAccount));
    });

    it('should throw error if account not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(
        BankAccountService.searchByNumber(searchParams.accountNumber, searchParams.userId)
      ).rejects.toThrow('Account not found');
    });
  });
}); 