"use client"

import { useState, useEffect, useMemo } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CreateTransactionModal, type CreateTransactionFormData } from "@/components/banking/create-transaction-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { useDebounce } from '@/hooks/use-debounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface TransactionEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  entry_order: number;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_number: string;
  transaction_date: string;
  description: string;
  reference?: string;
  total_amount: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  entries: TransactionEntry[];
}

const PAGE_SIZE = 10;

// Mock data - Replace with API call
const mockTransactions: Transaction[] = [
  {
    id: "1",
    transaction_number: "MCK-03212024-001",
    transaction_date: "2024-03-21",
    description: "Client Payment - ABC Corp",
    reference: "INV-2024-001",
    total_amount: 15000.00,
    created_at: "2024-03-21T10:00:00Z",
    updated_at: "2024-03-21T10:00:00Z",
    entries: [
      {
        id: "entry-1",
        transaction_id: "1",
        account_id: "main",
        debit_amount: 15000.00,
        credit_amount: 0,
        description: "Received payment from ABC Corp",
        entry_order: 1,
        created_at: "2024-03-21T10:00:00Z",
      },
      {
        id: "entry-2",
        transaction_id: "1",
        account_id: "income",
        debit_amount: 0,
        credit_amount: 15000.00,
        description: "Revenue recognition",
        entry_order: 2,
        created_at: "2024-03-21T10:00:00Z",
      },
    ],
  },
];

const getTransactionCountForDay = async (accountId: string, date: string): Promise<number> => {
  // TODO: Replace with actual API call to count transactions for the given account and date
  // For now, return a mock count based on the transaction number format
  return mockTransactions.filter(t => 
    t.entries.some(e => e.account_id === accountId) && 
    t.transaction_date === date
  ).length;
};

export default function TransactionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    data: transactionsData,
    isLoading,
    error,
  } = useQuery<{ data: Transaction[]; count: number }>({
    queryKey: ['transactions', { page: currentPage, pageSize: PAGE_SIZE, search: debouncedSearch }],
    queryFn: () => ({
      data: mockTransactions,
      count: mockTransactions.length,
    }),
    enabled: isMounted,
  });

  const { mutate: createTransaction, isPending: isCreating } = useMutation({
    mutationFn: async (data: CreateTransactionFormData) => {
      // TODO: Replace with actual API call
      console.log('Creating transaction:', data);
      const isCredit = data.total_amount > 0;
      const absoluteAmount = Math.abs(data.total_amount);
      
      const newTransaction: Transaction = {
        id: `${Date.now()}`,
        transaction_number: data.transaction_number,
        transaction_date: data.transaction_date.toISOString().split('T')[0],
        description: data.description,
        reference: data.reference,
        total_amount: absoluteAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entries: [
          {
            id: `entry-${Date.now()}-1`,
            transaction_id: `${Date.now()}`,
            account_id: data.account_id,
            debit_amount: isCredit ? 0 : absoluteAmount,
            credit_amount: isCredit ? absoluteAmount : 0,
            description: data.description,
            entry_order: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: `entry-${Date.now()}-2`,
            transaction_id: `${Date.now()}`,
            account_id: 'auto-generated', // This will be handled by the backend
            debit_amount: isCredit ? absoluteAmount : 0,
            credit_amount: isCredit ? 0 : absoluteAmount,
            description: `Auto-generated offsetting entry for ${data.description}`,
            entry_order: 2,
            created_at: new Date().toISOString(),
          },
        ],
      };
      return newTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsCreateModalOpen(false);
      toast.success('Transaction created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    },
  });

  const handleCreateTransaction = async (data: CreateTransactionFormData) => {
    try {
      await createTransaction(data);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    }
  };

  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        header: 'Transaction Number',
        accessorKey: 'transaction_number',
        className: 'font-medium',
      },
      {
        header: 'Date',
        accessorKey: 'transaction_date',
      },
      {
        header: 'Description',
        accessorKey: 'description',
      },
      {
        header: 'Reference',
        accessorKey: 'reference',
      },
      {
        header: 'Amount',
        accessorKey: 'total_amount',
        className: 'text-right',
        cell: (row) => (
          <span className="tabular-nums">
            ${row.total_amount.toLocaleString()}
          </span>
        ),
      },
      {
        header: '',
        accessorKey: 'id',
        className: 'w-[50px]',
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Transaction</DropdownMenuItem>
              <DropdownMenuItem>View Entries</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Transaction
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  if (!isMounted) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                Loading...
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error instanceof Error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={transactionsData?.data || []}
              columns={columns}
              totalItems={transactionsData?.count || 0}
              pageSize={PAGE_SIZE}
              currentPage={currentPage}
              isLoading={isLoading}
              searchPlaceholder="Search transactions..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onPageChange={setCurrentPage}
              emptyStateMessage="No transactions found."
              loadingMessage="Loading transactions..."
              renderCustomHeader={() => (
                <Button onClick={() => setIsCreateModalOpen(true)} disabled={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? 'Creating...' : 'Add Transaction'}
                </Button>
              )}
            />
          </CardContent>
        </Card>
      </div>
      {isMounted && (
        <CreateTransactionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateTransaction}
          getTransactionCount={getTransactionCountForDay}
        />
      )}
    </DashboardLayout>
  );
} 