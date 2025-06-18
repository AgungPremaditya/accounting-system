"use client"

import { useState, useEffect, useMemo } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CreateTransactionModal } from "@/components/banking/create-transaction-modal";
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
import { trpc } from '@/utils/trpc';
import type { Transaction } from '@/lib/services/transactionService';

interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const utils = trpc.useContext();

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
  } = trpc.transaction.list.useQuery(
    { 
      page: currentPage, 
      pageSize: PAGE_SIZE, 
      search: debouncedSearch 
    },
    {
      enabled: isMounted,
    }
  );

  const columns: Column<Transaction>[] = useMemo(
    () => [
      {
        header: 'Transaction Number',
        accessorKey: 'transactionNumber',
        className: 'font-medium',
      },
      {
        header: 'Date',
        accessorKey: 'date',
        cell: (row) => new Date(row.date).toLocaleDateString(),
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
        accessorKey: 'totalAmount',
        className: 'text-right',
        cell: (row) => (
          <span className={cn(
            "tabular-nums",
            row.totalAmount < 0 ? "text-red-500" : "text-green-500"
          )}>
            ${Math.abs(row.totalAmount).toLocaleString()}
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
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const handleCreateSuccess = () => {
    utils.transaction.list.invalidate();
    setIsCreateModalOpen(false);
  };

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

  if (error) {
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
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
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
          onSuccess={handleCreateSuccess}
        />
      )}
    </DashboardLayout>
  );
} 