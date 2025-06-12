export interface BankAccount {
  id: string
  name: string
  accountNumber: string
  bank: string
  type: string
  balance: number
  createdAt: string
  updatedAt: string
}

export interface CreateBankAccountDTO {
  name: string
  accountNumber: string
  bank: string
  type: string
  balance: number
}

export async function createBankAccount(data: CreateBankAccountDTO): Promise<BankAccount> {
  const response = await fetch('/api/banking/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create bank account')
  }

  return response.json()
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const response = await fetch('/api/banking/accounts')

  if (!response.ok) {
    throw new Error('Failed to fetch bank accounts')
  }

  return response.json()
} 