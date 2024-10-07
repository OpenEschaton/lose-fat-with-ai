import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import axios from 'axios';
import { NextResponse } from 'next/server';

import type { modelRow } from '@/types/utils';

const astriaApiKey = process.env.ASTRIA_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('MISSING NEXT_PUBLIC_SUPABASE_URL!');
}

if (!supabaseServiceRoleKey) {
  throw new Error('MISSING SUPABASE_SERVICE_ROLE_KEY!');
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient<Database>(
    supabaseUrl as string,
    supabaseServiceRoleKey as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  // Add this before attempting to delete the user
  const { error: creditsError } = await supabaseAdmin
    .from('credits')
    .delete()
    .eq('user_id', session.user.id);

  if (creditsError) {
    console.error('Error deleting credits:', creditsError);
    return NextResponse.json(
      { error: 'Failed to delete user credits', details: creditsError.message },
      { status: 500 },
    );
  }

  // Get all models for the user
  const { data: userModels, error: modelsError } = await supabaseAdmin
    .from('models')
    .select('modelId')
    .eq('user_id', session.user.id);

  if (modelsError) {
    console.error('Error fetching user models:', modelsError);
    return NextResponse.json(
      { error: 'Failed to fetch user models', details: modelsError.message },
      { status: 500 },
    );
  }

  const DOMAIN = 'https://api.astria.ai';

  const deleteModelPromises = userModels.map((model: Pick<modelRow, 'modelId'>) =>
    axios.delete(`${DOMAIN}/tunes/${model.modelId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${astriaApiKey}`,
      },
    }),
  );

  const deleteResults = await Promise.allSettled(deleteModelPromises);

  const errors = deleteResults
    .filter((result) => result.status === 'rejected')
    .map((result) => (result as PromiseRejectedResult).reason);

  if (errors.length > 0) {
    console.warn('Errors occurred while deleting models:', errors);
  }

  // Now attempt to delete the user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(session.user.id);

  if (deleteError) {
    console.error('Error deleting user:', deleteError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url));
}
