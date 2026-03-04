import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServerSupabase } from '@/lib/server-supabase';

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) return null;

  const supabase = getServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT!,
  process.env.WEB_PUSH_VAPID_PUBLIC_KEY!,
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coupleId, title, body, url } = await request.json();

    if (!coupleId || !title || !body) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data: me } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!me) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: partnerRows, error: partnerError } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .neq('user_id', user.id);

    if (partnerError) {
      return NextResponse.json({ error: partnerError.message }, { status: 500 });
    }

    const partnerIds = (partnerRows ?? []).map((row) => row.user_id);

    if (!partnerIds.length) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', partnerIds);

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon',
      badge: '/icon',
      data: {
        url: url || '/app',
      },
    });

    let sent = 0;

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          {
            TTL: 60,
            urgency: 'high',
          }
        );

        sent += 1;
      } catch (error: any) {
        const statusCode = error?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Push send failed' },
      { status: 500 }
    );
  }
}