# FinScope - Stock Portfolio Tracker

A modern web application built with Next.js that allows users to track their stock portfolio, view real-time analytics, and calculate investment returns using CAGR and XIRR metrics.

## Features

- **User Authentication** - Secure signup/login with Supabase Auth
- **Portfolio Tracking** - Add and manage stock transactions
- **Real-time Stock Prices** - Fetch live prices from Yahoo Finance API
- **Advanced Analytics**
  - Portfolio allocation pie chart
  - Total portfolio value and gains/losses
  - CAGR (Compound Annual Growth Rate) for single purchases
  - XIRR (Extended Internal Rate of Return) for SIP-style investments
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Stock Data**: Yahoo Finance API

## Project Structure

```
finpilot/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── portfolio/add/page.tsx
│   │   ├── api/
│   │   │   ├── stocks/[ticker]/route.ts
│   │   │   └── portfolio/
│   │   │       ├── route.ts
│   │   │       └── analytics/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   ├── portfolio/
│   │   └── ui/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── utils/
│   │   └── types.ts
│   └── middleware.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Supabase account and project ([supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd finpilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up Supabase**

   a. Create a new project at [supabase.com](https://supabase.com)

   b. In your Supabase project, go to **SQL Editor** and run the migration:
   ```bash
   # Copy content from supabase/migrations/001_initial_schema.sql
   # and paste it into the SQL Editor, then click "Run"
   ```

   c. Get your Supabase credentials:
   - Go to **Project Settings** → **API**
   - Copy the `Project URL` and `anon/public` key

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### First Time Setup

1. **Sign Up** - Create a new account at `/signup`
2. **Log In** - Sign in with your credentials
3. **Add Transactions** - Click "Add Transaction" to add your stock purchases
4. **View Dashboard** - See your portfolio analytics, pie chart, and holdings

### Adding Transactions

When adding a transaction, provide:
- **Ticker Symbol** - Stock symbol (e.g., AAPL, GOOGL)
- **Quantity** - Number of shares (supports fractional shares)
- **Purchase Price** - Price per share in USD
- **Purchase Date & Time** - When you bought the stock

### Understanding Metrics

- **CAGR** - Used for single purchase transactions
- **XIRR** - Used for multiple purchases (SIP-style)
- **Overall XIRR** - Annualized return for your entire portfolio

## Database Schema

### portfolio_transactions

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| ticker | TEXT | Stock ticker symbol |
| quantity | NUMERIC | Number of shares |
| price | NUMERIC | Purchase price per share |
| purchased_at | TIMESTAMPTZ | Purchase date and time |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record update timestamp |

## API Endpoints

### Authentication
- Handled by Supabase Auth

### Portfolio
- `GET /api/portfolio` - Get all transactions
- `POST /api/portfolio` - Create new transaction
- `DELETE /api/portfolio?id={id}` - Delete transaction

### Analytics
- `GET /api/portfolio/analytics` - Get portfolio analytics with CAGR/XIRR

### Stock Prices
- `GET /api/stocks/{ticker}` - Get current stock price

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
4. Deploy

### Deploy to Other Platforms

This Next.js app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Troubleshooting

### Database Connection Issues
- Verify your Supabase credentials in `.env.local`
- Ensure the database migration was run successfully
- Check that Row Level Security (RLS) policies are enabled

### Stock Price Errors
- Yahoo Finance API is free but may have rate limits
- Ensure ticker symbols are valid and properly formatted
- Check your internet connection

### Authentication Issues
- Clear browser cookies and try again
- Verify Supabase project is active
- Check that authentication is enabled in Supabase

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## Acknowledgments

- Stock price data provided by Yahoo Finance
- Authentication and database by Supabase
- Built with Next.js and React

## Support

For issues or questions, please open an issue in the GitHub repository.