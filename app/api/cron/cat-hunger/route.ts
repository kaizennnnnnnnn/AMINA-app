import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServerSupabase } from '@/lib/server-supabase';

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT!,
  process.env.WEB_PUSH_VAPID_PUBLIC_KEY!,
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  // Validate secret key
  const key = req.nextUrl.searchParams.get('key');
  if (!key || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServerSupabase();
  const now = new Date().toISOString();

  // 1. Find all couples where cat is currently hungry
  const { data: hungryRows, error: catError } = await db
    .from('cat_game')
    .select('couple_id, next_hungry_at')
    .lte('next_hungry_at', now);

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  if (!hungryRows?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no hungry cats' });
  }

  const coupleIds = hungryRows.map((r) => r.couple_id);

  // 2. Load couple_settings to check which couples haven't been notified yet for this episode
  const { data: settingsRows } = await db
    .from('couple_settings')
    .select('couple_id, cat_hungry_notified_at')
    .in('couple_id', coupleIds);

  const settingsMap = new Map(
    (settingsRows ?? []).map((s) => [s.couple_id, s.cat_hungry_notified_at as string | null])
  );

  // 3. Filter to couples that still need a notification
  //    (notified_at is null OR notified_at is before next_hungry_at)
  const toNotify = hungryRows.filter((r) => {
    const notifiedAt = settingsMap.get(r.couple_id);
    if (!notifiedAt) return true;
    return new Date(notifiedAt) < new Date(r.next_hungry_at);
  });

  if (!toNotify.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'already notified' });
  }

  // 4. Get all members for these couples
  const notifyCoupleIds = toNotify.map((r) => r.couple_id);

  const { data: memberRows } = await db
    .from('couple_members')
    .select('couple_id, user_id')
    .in('couple_id', notifyCoupleIds);

  if (!memberRows?.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no members' });
  }

  const allUserIds = [...new Set(memberRows.map((m) => m.user_id))];

  // 5. Get push subscriptions for all those users
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', allUserIds);

  // Build a map: user_id → subscriptions
  const subsByUser = new Map<string, typeof subs>();
  for (const sub of subs ?? []) {
    if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, []);
    subsByUser.get(sub.user_id)!.push(sub);
  }

  // Build: coupleId → [user_ids]
  const membersByCouple = new Map<string, string[]>();
  for (const m of memberRows) {
    if (!membersByCouple.has(m.couple_id)) membersByCouple.set(m.couple_id, []);
    membersByCouple.get(m.couple_id)!.push(m.user_id);
  }

  const payload = JSON.stringify({
    title: 'Eren is hungry! 🐱',
    body: 'Hurry up and feed him before he gets angry!',
    data: { url: '/app' },
  });

  let sent = 0;

  // 6. Send notifications and mark as notified
  for (const { couple_id } of toNotify) {
    const userIds = membersByCouple.get(couple_id) ?? [];

    for (const uid of userIds) {
      const userSubs = subsByUser.get(uid) ?? [];
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 300, urgency: 'high' }
          );
          sent++;
        } catch (err: any) {
          // Clean up expired subscriptions
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await db.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
    }

    // 7. Mark this couple as notified
    await db
      .from('couple_settings')
      .upsert(
        {
          couple_id,
          cat_hungry_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'couple_id' }
      );
  }

  return NextResponse.json({ ok: true, sent });
}
