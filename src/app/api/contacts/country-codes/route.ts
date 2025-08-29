import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Extract country codes from phone numbers
    // Phone numbers should start with + followed by country code
    const { data, error } = await supabase.rpc('get_unique_country_codes', {
      p_account_id: accountId
    });

    if (error) {
      console.error('Error fetching country codes:', error);
      return NextResponse.json({ error: 'Failed to fetch country codes' }, { status: 500 });
    }

    // Transform the data to include country names and default timezones
    const countryCodeMappings = [
      { code: '+1', name: 'United States', flag: '🇺🇸', defaultTz: 'America/New_York' },
      { code: '+1', name: 'Canada', flag: '🇨🇦', defaultTz: 'America/Toronto' },
      { code: '+44', name: 'United Kingdom', flag: '🇬🇧', defaultTz: 'Europe/London' },
      { code: '+61', name: 'Australia', flag: '🇦🇺', defaultTz: 'Australia/Sydney' },
      { code: '+49', name: 'Germany', flag: '🇩🇪', defaultTz: 'Europe/Berlin' },
      { code: '+33', name: 'France', flag: '🇫🇷', defaultTz: 'Europe/Paris' },
      { code: '+81', name: 'Japan', flag: '🇯🇵', defaultTz: 'Asia/Tokyo' },
      { code: '+86', name: 'China', flag: '🇨🇳', defaultTz: 'Asia/Shanghai' },
      { code: '+91', name: 'India', flag: '🇮🇳', defaultTz: 'Asia/Kolkata' },
      { code: '+55', name: 'Brazil', flag: '🇧🇷', defaultTz: 'America/Sao_Paulo' },
    ];

    const enrichedCodes = (data || []).map((item: any) => {
      const mapping = countryCodeMappings.find(m => m.code === item.country_code);
      return {
        countryCode: item.country_code,
        count: item.contact_count,
        name: mapping?.name || 'Unknown',
        flag: mapping?.flag || '🌍',
        defaultTz: mapping?.defaultTz || 'UTC',
      };
    });

    return NextResponse.json({ countryCodes: enrichedCodes });

  } catch (error) {
    console.error('Country codes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 