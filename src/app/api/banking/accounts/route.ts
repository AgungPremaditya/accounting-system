import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { BankAccountService } from '@/lib/services/bankAccountService';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, accountNumber, bank, type, balance } = await request.json();

    const account = await BankAccountService.createAccount({
      name,
      accountNumber,
      bank,
      type,
      balance,
      userId: user.id,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view bank accounts' },
        { status: 401 }
      );
    }

    const result = await BankAccountService.getAccounts(user.id, page, pageSize, search);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 