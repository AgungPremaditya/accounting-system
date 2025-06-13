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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBankAccounts, createBankAccount, type CreateBankAccountInput, type BankAccount, type PaginatedResponse } from '@/services/bankAccounts';
import { DataTable } from '@/components/ui/data-table';
import { useDebounce } from '@/hooks/use-debounce';

const PAGE_SIZE = 5;

export default function BankAccountsPage() {
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
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [debouncedSearch]);

  const {
    data: accountsData,
    isLoading,
    error,
  } = useQuery<PaginatedResponse<BankAccount>>({
    queryKey: ['bankAccounts', { page: currentPage, pageSize: PAGE_SIZE, search: debouncedSearch }],
    queryFn: () => getBankAccounts({ 
      page: currentPage, 
      pageSize: PAGE_SIZE,
      search: debouncedSearch 
    }),
    staleTime: 5000,
    refetchOnWindowFocus: false,
    enabled: isMounted,
  });

  const { mutate: createAccount, isPending: isCreating } = useMutation({
    mutationFn: createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setIsCreateModalOpen(false);
      toast.success('Bank account created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create bank account');
    },
  });

  const handleCreateAccount = async (data: CreateBankAccountInput) => {
    try {
      await createAccount(data);
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