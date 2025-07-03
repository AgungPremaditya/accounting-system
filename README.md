# Ledger System

A comprehensive financial ledger and banking management system built with Next.js and TypeScript. This application provides double-entry bookkeeping, bank account management, transaction tracking, and real-time financial analytics.

## ✨ Features

### 🏦 Banking Management
- **Bank Account Management**: Create and manage multiple bank accounts (checking, savings, investment)
- **Account Search**: Search and filter bank accounts by number or name
- **Account Balance Tracking**: Real-time balance updates and history

### 💰 Transaction Management
- **Transaction Creation**: Create transactions between bank accounts with detailed information
- **Double-Entry Bookkeeping**: Automatic validation of double-entry accounting rules
- **Transaction Details**: View comprehensive transaction details including sender/receiver information
- **Transaction History**: Track all financial transactions with timestamps and references

### 📊 Dashboard & Analytics
- **Financial Overview**: Real-time dashboard with key financial metrics
- **Revenue & Expense Tracking**: Monitor income and expenses with visual charts
- **Cash Flow Analysis**: Visualize cash flow trends over time
- **Interactive Charts**: Revenue charts, expense breakdowns, and cash flow visualizations using Recharts

### 🔐 Security & Authentication
- **User Authentication**: Secure login/logout with Supabase Auth
- **Protected Routes**: Middleware-protected pages requiring authentication
- **User-Specific Data**: Each user can only access their own financial data

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Mode**: Theme switching support
- **Modern Components**: Built with shadcn/ui and Radix UI primitives
- **Smooth Animations**: Enhanced user experience with Framer Motion

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [Supabase](https://supabase.com/) with PostgreSQL
- **Authentication:** [Supabase Auth](https://supabase.com/auth)
- **API Layer:** [tRPC](https://trpc.io/) with [TanStack Query](https://tanstack.com/query/latest)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **Charts:** [Recharts](https://recharts.org/) for data visualization
- **Forms:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Font:** [Geist](https://vercel.com/font) (Sans and Mono)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm, yarn, or pnpm

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd ledger-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up the database:**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase

   # Initialize Supabase (if not already done)
   supabase init

   # Start local Supabase instance
   supabase start

   # Apply migrations
   supabase db push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── banking/           # Banking-related pages
│   │   ├── accounts/      # Bank account management
│   │   └── transactions/  # Transaction management
│   ├── dashboard/         # Dashboard page
│   └── ...               # Other pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── banking/          # Banking-related components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI components
├── server/               # Server-side code (tRPC)
│   ├── routers/          # API route handlers
│   └── ...              # Server utilities
├── lib/                  # Utility libraries
│   ├── services/         # Business logic services
│   └── supabase/         # Supabase client configuration
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

## 🎯 Key Features Explained

### Double-Entry Bookkeeping
The system implements proper double-entry accounting principles where every transaction has equal debits and credits, ensuring financial accuracy and balance.

### Bank Account Management
Users can create and manage multiple bank accounts with different types (checking, savings, investment) and track their balances in real-time.

### Transaction Workflow
1. Search for receiver account by account number
2. Enter transaction details (amount, description, date)
3. System automatically creates double-entry records
4. View transaction details and history

### Dashboard Analytics
- Real-time financial metrics and KPIs
- Visual charts showing revenue, expenses, and cash flow
- Monthly and yearly trend analysis
- Export capabilities for reports

## 🔧 Development Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🧪 Database Schema

The system uses Supabase with PostgreSQL and includes:
- **Users**: User authentication and profiles
- **Accounts**: Bank account information
- **Transactions**: Financial transaction records
- **Transaction Entries**: Double-entry bookkeeping entries

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [Recharts](https://recharts.org/) - React charting library

## 📞 Support

For support and questions, please open an issue on the GitHub repository or contact the development team.

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
