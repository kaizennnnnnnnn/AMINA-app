import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/server-supabase';

export async function GET(
  req: Request,
  context: { params: { userId: string } }
) {
  const userId = context.params.userId;
  const supabase = getServerSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('user_id', userId)
    .maybeSingle();

  // No avatar -> use app icon
  if (!profile?.avatar_path) {
    return NextResponse.redirect(new URL('/icon', req.url));
  }

  const { data: signed, error } = await supabase.storage
    .from('private-media')
    .createSignedUrl(profile.avatar_path, 60 * 60 * 24);

  if (error || !signed?.signedUrl) {
    return NextResponse.redirect(new URL('/icon', req.url));
  }

  const imgRes = await fetch(signed.signedUrl);
  if (!imgRes.ok) {
    return NextResponse.redirect(new URL('/icon', req.url));
  }

  const buf = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get('content-type') || 'image/png';

  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}