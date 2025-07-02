"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from '@/utils/trpc'

function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return "-"
  const lastFourDigits = accountNumber.slice(-4)
  const maskedLength = accountNumber.length - 4
  return `${'*'.repeat(maskedLength)}${lastFourDigits}`
}

export interface TransactionDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId: string
}

export function TransactionDetailsModal({
  open,
  onOpenChange,
  transactionId,
}: TransactionDetailsModalProps) {
  const { data: transaction, isLoading } = trpc.transaction.getById.useQuery(
    { id: transactionId },
    { enabled: open }
  )

  // Get account details for entries
  const senderEntry = transaction?.entries.find(entry => entry.debitAmount)
  const receiverEntry = transaction?.entries.find(entry => entry.creditAmount)

  // Fetch account details
  const { data: senderAccount } = trpc.bankAccount.getById.useQuery(
    { id: senderEntry?.accountId || "" },
    { enabled: !!senderEntry?.accountId }
  )

  const { data: receiverAccount } = trpc.bankAccount.getById.useQuery(
    { id: receiverEntry?.accountId || "" },
    { enabled: !!receiverEntry?.accountId }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            Loading transaction details...
          </div>
        ) : transaction ? (
          <div className="space-y-6">
            {/* Transaction Details Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Transaction Number</dt>
                    <dd className="text-sm font-medium">{transaction.transactionNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Date</dt>
                    <dd className="text-sm font-medium">
                      {format(new Date(transaction.date), "PPP")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Reference</dt>
                    <dd className="text-sm font-medium">{transaction.reference || "-"}</dd>
                  </div>
                  <div className="col-span-3">
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="text-sm font-medium">{transaction.description}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Sender Details Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Sender</CardTitle>
              </CardHeader>
              <CardContent>
                {senderAccount && (
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Bank Name</dt>
                      <dd className="text-sm font-medium">{senderAccount.bank}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Account Number</dt>
                      <dd className="text-sm font-medium font-mono">
                        {maskAccountNumber(senderAccount.accountNumber)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Account Name</dt>
                      <dd className="text-sm font-medium">{senderAccount.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Debit Amount</dt>
                      <dd className="text-sm font-medium text-red-500 tabular-nums">
                        ${senderEntry?.debitAmount?.toLocaleString() || "0"}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Receiver Details Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Receiver</CardTitle>
              </CardHeader>
              <CardContent>
                {receiverAccount && (
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Bank Name</dt>
                      <dd className="text-sm font-medium">{receiverAccount.bank}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Account Number</dt>
                      <dd className="text-sm font-medium font-mono">
                        {maskAccountNumber(receiverAccount.accountNumber)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Account Name</dt>
                      <dd className="text-sm font-medium">{receiverAccount.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Credit Amount</dt>
                      <dd className="text-sm font-medium text-green-500 tabular-nums">
                        ${receiverEntry?.creditAmount?.toLocaleString() || "0"}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-destructive">
            Transaction not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 