"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Download, MoreHorizontal, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const transactions = [
  {
    id: "TRX-001",
    date: "2024-03-21",
    description: "Client Payment - ABC Corp",
    account: "Main Checking Account",
    type: "Credit",
    amount: 15000.00,
    category: "Income",
    status: "Completed",
  },
  {
    id: "TRX-002",
    date: "2024-03-20",
    description: "Office Supplies - Staples",
    account: "Main Checking Account",
    type: "Debit",
    amount: 245.67,
    category: "Expenses",
    status: "Completed",
  },
  {
    id: "TRX-003",
    date: "2024-03-20",
    description: "Monthly Rent Payment",
    account: "Main Checking Account",
    type: "Debit",
    amount: 3500.00,
    category: "Rent",
    status: "Completed",
  },
  {
    id: "TRX-004",
    date: "2024-03-19",
    description: "Transfer to Savings",
    account: "Business Savings",
    type: "Credit",
    amount: 10000.00,
    category: "Transfer",
    status: "Completed",
  },
  {
    id: "TRX-005",
    date: "2024-03-19",
    description: "Transfer from Checking",
    account: "Main Checking Account",
    type: "Debit",
    amount: 10000.00,
    category: "Transfer",
    status: "Completed",
  },
  {
    id: "TRX-006",
    date: "2024-03-18",
    description: "Payroll Payment",
    account: "Payroll Account",
    type: "Debit",
    amount: 25678.90,
    category: "Payroll",
    status: "Pending",
  },
]

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Reconcile
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search transactions..." className="pl-10" />
          </div>
          <div className="flex flex-1 items-center gap-4">
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Checking Account</SelectItem>
                <SelectItem value="savings">Business Savings</SelectItem>
                <SelectItem value="payroll">Payroll Account</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="font-medium">
                    {transaction.description}
                  </TableCell>
                  <TableCell>{transaction.account}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell 
                    className={cn(
                      "text-right tabular-nums",
                      transaction.type === "Credit" ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {transaction.type === "Credit" ? "+" : "-"}$
                    {transaction.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === "Completed" ? "default" : "secondary"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem>Add Note</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Transaction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
} 