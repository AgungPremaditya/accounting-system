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
    const supabase = await createServerSupabase();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 