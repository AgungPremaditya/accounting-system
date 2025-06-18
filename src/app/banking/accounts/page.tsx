"use client"

import { useState, useEffect, useMemo } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CreateAccountModal } from "@/components/banking/create-account-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { trpc } from '@/utils/trpc';
import type { BankAccount } from '@/server/routers/bankAccount';
import type { CreateBankAccountInput } from '@/server/routers/bankAccount';
import { DataTable } from '@/components/ui/data-table';

const PAGE_SIZE = 5;

function maskAccountNumber(accountNumber: string): string {
  const lastFourDigits = accountNumber.slice(-4);
  const maskedLength = accountNumber.length - 4;
  return `${'*'.repeat(maskedLength)}${lastFourDigits}`;
}

export default function BankAccountsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const utils = trpc.useUtils();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    data: accountsData,
    isLoading,
    error,
  } = trpc.bankAccount.list.useQuery(
    { 
      page: currentPage, 
      pageSize: PAGE_SIZE,
      search: debouncedSearch 
    },
    {
      enabled: isMounted,
      staleTime: 5000,
    }
  );

  const { mutate: createAccount, isPending: isCreating } = trpc.bankAccount.create.useMutation({
    onSuccess: () => {
      utils.bankAccount.list.invalidate();
      setIsCreateModalOpen(false);
      toast.success('Bank account created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create bank account');
    },
  });

  const handleCreateAccount = async (data: CreateBankAccountInput) => {
    try {
      createAccount(data);
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error('Failed to create account:', error);
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Name',
      accessorKey: 'name' as keyof BankAccount,
      className: 'font-medium',
    },
    {
      header: 'Account Number',
      accessorKey: 'accountNumber' as keyof BankAccount,
      cell: (row: BankAccount) => maskAccountNumber(row.accountNumber),
    },
    {
      header: 'Bank',
      accessorKey: 'bank' as keyof BankAccount,
    },
    {
      header: 'Balance',
      accessorKey: 'balance' as keyof BankAccount,
      className: 'text-right',
      cell: (row: BankAccount) => `$${row.balance.toLocaleString()}`,
    },
    {
      header: 'Type',
      accessorKey: 'type' as keyof BankAccount,
      className: 'capitalize',
    },
    {
      header: 'Status',
      accessorKey: 'status' as keyof BankAccount,
      cell: (row: BankAccount) => (
        <Badge variant={row.status === "Active" ? "default" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id' as keyof BankAccount,
      className: 'text-right',
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
            <DropdownMenuItem>Edit Account</DropdownMenuItem>
            <DropdownMenuItem>View Transactions</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  if (!isMounted) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
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
            <CardTitle>Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={accountsData?.data || []}
              columns={columns}
              totalItems={accountsData?.count || 0}
              pageSize={PAGE_SIZE}
              currentPage={currentPage}
              isLoading={isLoading}
              searchPlaceholder="Search accounts..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onPageChange={setCurrentPage}
              emptyStateMessage="No bank accounts found. Add your first account to get started."
              loadingMessage="Loading accounts..."
              renderCustomHeader={() => (
                <Button onClick={() => setIsCreateModalOpen(true)} disabled={isCreating}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isCreating ? 'Creating...' : 'Add Account'}
                </Button>
              )}
            />
          </CardContent>
        </Card>
      </div>
      {isMounted && (
        <CreateAccountModal 
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateAccount}
        />
      )}
    </DashboardLayout>
  );
} 