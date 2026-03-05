import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServerSupabase } from '@/lib/server-supabase';

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT!,
  process.env.WEB_PUSH_VAPID_PUBLIC_KEY!,
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY!
);

export async function GET(request: Request) {
  // simple protection
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();

  const { data: due, error } = await supabase
    .from('letters')
    .select('id, couple_id, sender_id')
    .eq('mode', 'capsule')
    .not('unlock_at', 'is', null)
    .lte('unlock_at', new Date().toISOString())
    .is('unlock_notified_at', null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ ok: true, processed: 0 });

  const origin = new URL(request.url).origin;

  let processed = 0;

  for (const letter of due) {
    const { data: members } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', letter.couple_id);

    const memberIds = (members ?? []).map((m) => m.user_id);

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .in('user_id', memberIds);

    const iconUrl = `${origin}/api/push/avatar/${letter.sender_id}`;

    const payload = JSON.stringify({
      title: 'Time capsule unlocked',
      body: 'A time capsule is ready to open 🎁',
      icon: iconUrl,
      badge: `${origin}/icon`,
      data: { url: '/app' },
    });

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60, urgency: 'high' }
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }

    await supabase
      .from('letters')
      .update({ unlock_notified_at: new Date().toISOString() })
      .eq('id', letter.id);

    processed += 1;
  }

  return NextResponse.json({ ok: true, processed });
}