"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, CheckCircle2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { trpc } from '@/utils/trpc';
import type { BankAccount } from '@/server/routers/bankAccount';
import type { CreateTransactionInput } from '@/server/routers/transaction';
import type { Transaction } from '@/lib/services/transactionService';

// Step 1: Search Receiver Account
const SearchReceiverStep = ({
  onNext,
  isSubmitting,
}: {
  onNext: (account: BankAccount) => void;
  isSubmitting: boolean;
}) => {
  const searchSchema = z.object({
    account_number: z.string().min(1, 'Account number is required'),
  });

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      account_number: '',
    },
  });

  const { mutate: searchAccount, error: searchError } = trpc.bankAccount.searchByNumber.useMutation({
    onSuccess: (account) => {
      onNext(account);
    },
  });

  const onSubmit = async (data: z.infer<typeof searchSchema>) => {
    await searchAccount({ accountNumber: data.account_number });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Search Receiver Account</DialogTitle>
        <DialogDescription>
          Enter the receiver&apos;s account number to create a transaction.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="account_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiver Account Number</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="Enter account number" {...field} />
                  </FormControl>
                  <Button type="submit" disabled={isSubmitting}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                {searchError && (
                  <p className="text-sm text-red-500">{searchError.message}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </>
  );
};

// Step 2: Transaction Details
const CreateStep = ({
  receiverAccount,
  onBack,
  onNext,
}: {
  receiverAccount: BankAccount;
  onBack: () => void;
  onNext: (data: Transaction) => void;
}) => {
  const { data: userAccounts, isLoading: isLoadingAccounts } = trpc.transaction.getUserAccounts.useQuery();

  const createSchema = z.object({
    sender_account_id: z.string().min(1, 'Sender account is required'),
    transaction_date: z.date({
      required_error: "Please select a date",
    }),
    description: z.string().min(1, 'Description is required'),
    reference: z.string().optional(),
    total_amount: z.number().min(0.01, 'Amount must be greater than 0'),
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      transaction_date: new Date(),
      description: '',
      reference: '',
      total_amount: 0,
    },
  });

  const { mutate: createTransaction, error: createError, isPending: isSubmitting } = trpc.transaction.create.useMutation({
    onSuccess: (data) => {
      onNext(data);
    },
  });

  const onSubmit = (data: z.infer<typeof createSchema>) => {
    const input: CreateTransactionInput = {
      ...data,
      receiver_account_id: receiverAccount.id,
      total_amount: data.total_amount,
    };
    createTransaction(input);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Transaction</DialogTitle>
        <DialogDescription>
          Create a transaction to {receiverAccount.name}.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="sender_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Account</FormLabel>
                <Select
                  disabled={isLoadingAccounts}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sender account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userAccounts?.data.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transaction_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Transaction description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Reference number or code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(Math.abs(parseFloat(e.target.value) || 0))}
                    className="text-red-600"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {createError && (
            <p className="text-sm text-red-500">{createError.message}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingAccounts}>
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

// Step 3: Success
const SuccessStep = ({
  amount,
  onClose,
  onCreateAnother,
}: {
  amount: number;
  onClose: () => void;
  onCreateAnother: () => void;
}) => (
  <>
    <DialogHeader>
      <DialogTitle>Transaction Created</DialogTitle>
      <DialogDescription>
        The transaction has been successfully created.
      </DialogDescription>
    </DialogHeader>
    <div className="flex flex-col items-center justify-center py-6">
      <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
      <p className="text-lg font-medium">Transaction Complete</p>
      <p className="text-sm text-muted-foreground">
        Amount: ${Math.abs(amount).toLocaleString()}
      </p>
    </div>
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={onCreateAnother}
      >
        Create Another
      </Button>
      <Button type="button" onClick={onClose}>
        Close
      </Button>
    </DialogFooter>
  </>
);

type Step = 'search' | 'create' | 'success';

export interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTransactionModal({ 
  open, 
  onOpenChange,
  onSuccess,
}: CreateTransactionModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('search');
  const [selectedReceiverAccount, setSelectedReceiverAccount] = useState<BankAccount | null>(null);
  const [transactionData, setTransactionData] = useState<Transaction | null>(null);

  const handleSearchComplete = (account: BankAccount) => {
    setSelectedReceiverAccount(account);
    setCurrentStep('create');
  };

  const handleCreateComplete = (data: Transaction) => {
    setTransactionData(data);
    setCurrentStep('success');
    onSuccess?.();
  };

  const handleCreateAnother = () => {
    setCurrentStep('search');
    setSelectedReceiverAccount(null);
    setTransactionData(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset everything after animation
    setTimeout(() => {
      setCurrentStep('search');
      setSelectedReceiverAccount(null);
      setTransactionData(null);
    }, 200);
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow closing if we're not in success step
    if (!open && currentStep !== 'success') {
      handleClose();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'search':
        return (
          <SearchReceiverStep
            onNext={handleSearchComplete}
            isSubmitting={false}
          />
        );
      case 'create':
        if (!selectedReceiverAccount) return null;
        return (
          <CreateStep
            receiverAccount={selectedReceiverAccount}
            onBack={() => setCurrentStep('search')}
            onNext={handleCreateComplete}
          />
        );
      case 'success':
        if (!transactionData) return null;
        return (
          <SuccessStep
            amount={transactionData.totalAmount}
            onClose={handleClose}
            onCreateAnother={handleCreateAnother}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
} 