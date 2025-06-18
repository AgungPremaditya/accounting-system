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

export type Transaction = {
  id: string
  transaction_number: string
  transaction_date: string
  description: string
  reference: string | null
  total_amount: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TransactionEntry = {
  id: string
  transaction_id: string
  account_id: string
  debit_amount: number | null
  credit_amount: number | null
  description: string | null
  entry_order: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>>
      }
      transaction_entries: {
        Row: TransactionEntry
        Insert: Omit<TransactionEntry, 'id' | 'created_at'>
        Update: Partial<Omit<TransactionEntry, 'id' | 'created_at'>>
      }
    }
  }
} 