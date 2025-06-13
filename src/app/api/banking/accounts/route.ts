import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const { data: account, error } = await supabase
      .from('accounts')
      .insert([
        {
          account_name: name,
          account_number: accountNumber,
          bank_name: bank,
          account_type: type,
          initial_balance: balance,
          current_balance: balance,
          is_active: true,
          user_id: user.id,
          account_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
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

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('accounts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Add search filter if search term is provided
    if (search) {
      query = query.or(`account_name.ilike.%${search}%,bank_name.ilike.%${search}%,account_number.ilike.%${search}%`);
    }

    // Get paginated data with search filter and count
    const { data: accounts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: accounts.map(account => ({
        id: account.id,
        name: account.account_name,
        accountNumber: account.account_number,
        bank: account.bank_name,
        type: account.account_type,
        balance: account.current_balance,
        status: account.is_active ? 'Active' : 'Inactive',
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      })),
      count: count || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 