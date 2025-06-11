"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ExpenseChart } from "@/components/dashboard/expense-chart"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    changeType: "positive" as const,
    icon: DollarSign,
    description: "from last month",
  },
  {
    title: "Total Expenses",
    value: "$12,234.56",
    change: "-4.3%",
    changeType: "negative" as const,
    icon: TrendingDown,
    description: "from last month",
  },
  {
    title: "Net Profit",
    value: "$32,997.33",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: TrendingUp,
    description: "from last month",
  },
  {
    title: "Active Customers",
    value: "2,350",
    change: "+180",
    changeType: "positive" as const,
    icon: Users,
    description: "from last month",
  },
]

const recentTransactions = [
  {
    id: "1",
    description: "Payment from Acme Corp",
    amount: "+$2,500.00",
    type: "income",
    date: "2024-01-15",
    status: "completed",
  },
  {
    id: "2",
    description: "Office Supplies - Staples",
    amount: "-$156.78",
    type: "expense",
    date: "2024-01-14",
    status: "completed",
  },
  {
    id: "3",
    description: "Software Subscription",
    amount: "-$99.00",
    type: "expense",
    date: "2024-01-14",
    status: "pending",
  },
  {
    id: "4",
    description: "Consulting Services",
    amount: "+$1,200.00",
    type: "income",
    date: "2024-01-13",
    status: "completed",
  },
  {
    id: "5",
    description: "Internet Bill",
    amount: "-$89.99",
    type: "expense",
    date: "2024-01-12",
    status: "completed",
  },
]

const upcomingBills = [
  {
    id: "1",
    vendor: "Electric Company",
    amount: "$245.67",
    dueDate: "2024-01-20",
    status: "due",
  },
  {
    id: "2",
    vendor: "Insurance Premium",
    amount: "$1,200.00",
    dueDate: "2024-01-25",
    status: "upcoming",
  },
  {
    id: "3",
    vendor: "Rent Payment",
    amount: "$2,500.00",
    dueDate: "2024-02-01",
    status: "upcoming",
  },
]

export function DashboardContent() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">January 2024</Badge>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.changeType === "positive" ? (
                  <ArrowUpIcon className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.changeType === "positive" ? "text-green-500" : "text-red-500"}>
                  {stat.change}
                </span>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Current month expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseChart />
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowChart />
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transactions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        transaction.type === "income" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.amount}
                    </span>
                    {transaction.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bills */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Bills</CardTitle>
            <CardDescription>Bills due in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{bill.vendor}</p>
                    <p className="text-xs text-muted-foreground">Due {bill.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{bill.amount}</span>
                    {bill.status === "due" ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline" size="sm">
              View All Bills
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
