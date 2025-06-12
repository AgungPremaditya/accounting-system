"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const formFields = [
  {
    id: "name",
    label: "Account Name",
    type: "text",
    placeholder: "Main Checking Account",
  },
  {
    id: "accountNumber",
    label: "Account Number",
    type: "text",
    placeholder: "XXXX-XXXX-XXXX-XXXX",
  },
  {
    id: "bank",
    label: "Bank Name",
    type: "text",
    placeholder: "Chase Bank",
  },
  {
    id: "type",
    label: "Account Type",
    type: "select",
    placeholder: "Select account type",
    options: [
      { value: "checking", label: "Checking" },
      { value: "savings", label: "Savings" },
      { value: "investment", label: "Investment" },
    ],
  },
  {
    id: "balance",
    label: "Initial Balance",
    type: "number",
    placeholder: "0.00",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
}

interface CreateAccountModalProps {
  onSubmit?: (data: {
    name: string
    accountNumber: string
    bank: string
    type: string
    balance: number
  }) => void
}

export function CreateAccountModal({ onSubmit }: CreateAccountModalProps) {
  const [open, setOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    name: "",
    accountNumber: "",
    bank: "",
    type: "",
    balance: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit({
        ...formData,
        balance: parseFloat(formData.balance) || 0,
      })
    }
    setOpen(false)
    setFormData({
      name: "",
      accountNumber: "",
      bank: "",
      type: "",
      balance: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <AnimatePresence>
        {open && (
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Bank Account</DialogTitle>
                <DialogDescription>
                  Add a new bank account to your ledger system.
                </DialogDescription>
              </DialogHeader>
              <motion.div
                className="grid gap-4 py-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {formFields.map((field) => (
                  <motion.div
                    key={field.id}
                    className="grid gap-2"
                    variants={itemVariants}
                  >
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {field.type === "select" ? (
                      <Select
                        value={formData[field.id as keyof typeof formData]}
                        onValueChange={(value) =>
                          setFormData({ ...formData, [field.id]: value })
                        }
                        required
                      >
                        <SelectTrigger id={field.id}>
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.id as keyof typeof formData]}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.id]: e.target.value })
                        }
                        required
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Account</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
} 