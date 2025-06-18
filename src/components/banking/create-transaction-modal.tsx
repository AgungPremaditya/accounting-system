"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase/client';
import type { Account } from '@/types/database.types';

const formSchema = z.object({
  transaction_number: z.string().min(1, 'Transaction number is required'),
  transaction_date: z.date({
    required_error: "Please select a date",
  }),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  total_amount: z.number().min(0.01, 'Amount must be greater than 0'),
  account_id: z.string().min(1, 'Account is required'),
  transaction_type: z.enum(['Credit', 'Debit'], {
    required_error: 'Transaction type is required',
  }),
});

export type CreateTransactionFormData = z.infer<typeof formSchema>;

export interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTransactionFormData) => Promise<void>;
  getTransactionCount: (accountId: string, date: string) => Promise<number>;
}

export function CreateTransactionModal({ 
  open, 
  onOpenChange, 
  onSubmit,
  getTransactionCount 
}: CreateTransactionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Pick<Account, 'id' | 'account_name' | 'account_code'>[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('id, account_name, account_code')
          .eq('is_active', true)
          .order('account_name');

        if (error) throw error;
        setAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);
  
  const form = useForm<CreateTransactionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_number: '',
      transaction_date: new Date(),
      description: '',
      reference: '',
      total_amount: 0,
      account_id: '',
      transaction_type: 'Debit',
    },
  });

  const generateTransactionNumber = async (accountId: string, date: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account || !date) return '';

    const [year, month, day] = date.split('-');
    const mmddyyyy = `${month}${day}${year}`;
    const count = await getTransactionCount(accountId, date);
    const sequenceNumber = (count + 1).toString().padStart(3, '0');
    
    return `${account.account_code}-${mmddyyyy}-${sequenceNumber}`;
  };

  const accountId = form.watch('account_id');
  const transactionDate = form.watch('transaction_date');

  useEffect(() => {
    const updateTransactionNumber = async () => {
      if (accountId && transactionDate) {
        const newTransactionNumber = await generateTransactionNumber(accountId, transactionDate.toISOString().split('T')[0]);
        form.setValue('transaction_number', newTransactionNumber);
      }
    };
    updateTransactionNumber();
  }, [accountId, transactionDate, form, getTransactionCount, accounts]);

  const handleSubmit = async (data: CreateTransactionFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Transaction</DialogTitle>
          <DialogDescription>
            Add a new transaction to your ledger system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                        onSelect={field.onChange}
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
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAccounts}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingAccounts ? "Loading accounts..." : "Select account"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name}
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
            <div className="grid grid-cols-2 gap-4">
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Credit">Credit</SelectItem>
                        <SelectItem value="Debit">Debit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingAccounts}>
                {isSubmitting ? 'Creating...' : 'Create Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 