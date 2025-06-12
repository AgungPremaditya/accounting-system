export type Account = {
  id: string
  account_name: string
  account_number: string
  bank_name: string
  account_type: 'checking' | 'savings' | 'investment'
  initial_balance: number
  current_balance: number
  is_active: boolean
  created_at: string
  updated_at: string
  user_id: string
  account_code: string
}

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
} 