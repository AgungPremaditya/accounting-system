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
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Search } from "lucide-react"

const accounts = [
  {
    id: 1,
    name: "Main Checking Account",
    accountNumber: "****1234",
    bank: "Chase Bank",
    balance: 45231.89,
    type: "Checking",
    status: "Active",
  },
  {
    id: 2,
    name: "Business Savings",
    accountNumber: "****5678",
    bank: "Bank of America",
    balance: 128750.42,
    type: "Savings",
    status: "Active",
  },
  {
    id: 3,
    name: "Investment Account",
    accountNumber: "****9012",
    bank: "Wells Fargo",
    balance: 375000.00,
    type: "Investment",
    status: "Active",
  },
  {
    id: 4,
    name: "Payroll Account",
    accountNumber: "****3456",
    bank: "Chase Bank",
    balance: 25000.00,
    type: "Checking",
    status: "Active",
  },
  {
    id: 5,
    name: "Tax Reserve",
    accountNumber: "****7890",
    bank: "Bank of America",
    balance: 50000.00,
    type: "Savings",
    status: "Inactive",
  },
]

export default function BankAccountsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Bank Accounts</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search accounts..." className="pl-10" />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>{account.bank}</TableCell>
                  <TableCell className="text-right">
                    ${account.balance.toLocaleString()}
                  </TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={account.status === "Active" ? "default" : "secondary"}
                    >
                      {account.status}
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
                        <DropdownMenuItem>Edit Account</DropdownMenuItem>
                        <DropdownMenuItem>View Transactions</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Account
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