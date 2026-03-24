'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PHOTO_PROMPTS } from '@/lib/default-prompts';
import CatHungerGame from "@/components/CatHungerGame";
import CookieJarTab from "@/components/CookieJarTab";
type Question = {
  id: string;
  asked_by: string;
  question_text: string;
  answer_text: string | null;
  created_at: string;
};

type Nudge = {
  id: string;
  sender_id: string;
  nudge_type: 'thinking' | 'heart' | 'kiss';
  created_at: string;
};

type Moment = {
  id: string;
  user_id: string;
  kind: 'day' | 'memory';
  caption: string | null;
  storage_path: string;
  created_at: string;
  file_url?: string | null;
};

type CustomPrompt = {
  id: string;
  created_by: string;
  prompt_text: string;
  created_at: string;
};

type Letter = {
  id: string;
  sender_id: string;
  mode: 'normal' | 'capsule';
  content_kind: 'text' | 'image' | 'audio';
  text_content: string | null;
  storage_path: string | null;
  unlock_at: string | null;
  created_at: string;
  file_url?: string | null;
};

type BucketItem = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string;
};

type SentenceGame = {
  id: string;
  created_by: string;
  starter_text: string;
  finish_text: string | null;
  created_at: string;
};

type AppOpen = {
  opened_on: string;
};
type AccentColor = 'default' | 'white' | 'pink' | 'purple' | 'red' | 'sage' | 'sky' | 'peach';
type BtnColor = 'pink' | 'purple' | 'red' | 'sage' | 'sky' | 'peach';

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  updated_at: string;
  avatar_url?: string | null;
};

type CoupleSettings = {
  couple_id: string;
  couple_nickname: string | null;
  relationship_start_date: string | null;
  accent_color: AccentColor;
  updated_by: string | null;
  updated_at: string;
};
export default function AppPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [savedInviteCode, setSavedInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState<'today' | 'moments' | 'letters' | 'play' | 'cat' | 'us' | 'jar'>('today');
  const [msg, setMsg] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [sentenceGames, setSentenceGames] = useState<SentenceGame[]>([]);
  const [appOpens, setAppOpens] = useState<AppOpen[]>([]);
  const [memberCount, setMemberCount] = useState(1);

  const [questionText, setQuestionText] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState<Record<string, string>>({});
  const [photoPrompt, setPhotoPrompt] = useState(
    DEFAULT_PHOTO_PROMPTS[Math.floor(Math.random() * DEFAULT_PHOTO_PROMPTS.length)]
  );
  const [customPromptText, setCustomPromptText] = useState('');

  const [momentCaption, setMomentCaption] = useState('');
  const [momentKind, setMomentKind] = useState<'day' | 'memory'>('day');
  const [momentFile, setMomentFile] = useState<File | null>(null);

  const [letterMode, setLetterMode] = useState<'normal' | 'capsule'>('normal');
  const [letterKind, setLetterKind] = useState<'text' | 'image' | 'audio'>('text');
  const [letterText, setLetterText] = useState('');
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [unlockAt, setUnlockAt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [starterText, setStarterText] = useState('');
  const [finishText, setFinishText] = useState<Record<string, string>>({});

  const [bucketText, setBucketText] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [myName, setMyName] = useState('');
  const [coupleNickname, setCoupleNickname] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState('');
  const [accentColor, setAccentColor] = useState<AccentColor>('default');
  const [btnColor, setBtnColor] = useState<BtnColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('btnColor') as BtnColor) || 'pink';
    }
    return 'pink';
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('secretClickCount') || '0', 10);
    }
    return 0;
  });
  const [secretClicking, setSecretClicking] = useState(false);
  const [navHearts, setNavHearts] = useState<{ id: number; forTab: string }[]>([]);

  function handleNavClick(newTab: typeof tab) {
    setTab(newTab);
    new Audio('/sounds/nav-click.mp3').play().catch(() => {});
    const id = Date.now() + Math.random();
    setNavHearts(prev => [...prev, { id, forTab: newTab }]);
    setTimeout(() => setNavHearts(prev => prev.filter(h => h.id !== id)), 1000);
  }

  function isBusy(action: string) {
  return busyAction === action;
}
  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  useEffect(() => {
    // 'default' maps to the CSS [data-bg="dark"] selector
    document.documentElement.dataset.bg = accentColor === 'default' ? 'dark' : accentColor;
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.btn = btnColor;
    localStorage.setItem('btnColor', btnColor);
  }, [btnColor]);
  useEffect(() => {
  if (!avatarFile) {
    setAvatarPreviewUrl('');
    return;
  }

  const localUrl = URL.createObjectURL(avatarFile);
  setAvatarPreviewUrl(localUrl);

  return () => URL.revokeObjectURL(localUrl);
}, [avatarFile]);
  async function init() {
    try {
      setLoading(true);
      setMsg('');

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);

      const { data: membershipRows } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .limit(1);

      const existingCoupleId = membershipRows?.[0]?.couple_id ?? null;
      setCoupleId(existingCoupleId);

      if (!existingCoupleId) {
        setLoading(false);
        return;
      }

      await supabase.from('app_opens').upsert(
        {
          couple_id: existingCoupleId,
          user_id: user.id,
          opened_on: new Date().toISOString().slice(0, 10),
        },
        {
          onConflict: 'couple_id,user_id,opened_on',
        }
      );

      const [
        coupleRes,
        membersRes,
        questionsRes,
        nudgesRes,
        momentsRes,
        promptsRes,
        lettersRes,
        bucketRes,
        sentenceRes,
        opensRes,
      ] = await Promise.all([
        supabase.from('couples').select('invite_code').eq('id', existingCoupleId).single(),
        supabase.from('couple_members').select('user_id').eq('couple_id', existingCoupleId),
        supabase
          .from('questions')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('nudges')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('moments')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('custom_prompts')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('letters')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('bucket_items')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('sentence_games')
          .select('*')
          .eq('couple_id', existingCoupleId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('app_opens')
          .select('opened_on')
          .eq('couple_id', existingCoupleId)
          .order('opened_on', { ascending: false })
          .limit(60),
      ]);

      setSavedInviteCode(coupleRes.data?.invite_code ?? '');
      setMemberCount(membersRes.data?.length ?? 1);
      const memberIds = (membersRes.data ?? []).map((row) => row.user_id);

let rawProfiles: Profile[] = [];
if (memberIds.length) {
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', memberIds);

  rawProfiles = (profileRows ?? []) as Profile[];
}

const { data: coupleSettingsRow } = await supabase
  .from('couple_settings')
  .select('*')
  .eq('couple_id', existingCoupleId)
  .maybeSingle();

const profilesWithUrls = await attachProfileAvatarUrls(rawProfiles);

const myProfileRow =
  profilesWithUrls.find((profile) => profile.user_id === user.id) ?? null;

const partnerProfileRow =
  profilesWithUrls.find((profile) => profile.user_id !== user.id) ?? null;

setMyProfile(myProfileRow);
setPartnerProfile(partnerProfileRow);
setMyName(myProfileRow?.display_name ?? '');
setCoupleNickname(coupleSettingsRow?.couple_nickname ?? '');
setRelationshipStartDate(coupleSettingsRow?.relationship_start_date ?? '');
setAccentColor((coupleSettingsRow?.accent_color as AccentColor) ?? 'default');
      setQuestions((questionsRes.data ?? []) as Question[]);
      setNudges((nudgesRes.data ?? []) as Nudge[]);
      setCustomPrompts((promptsRes.data ?? []) as CustomPrompt[]);
      setBucketItems((bucketRes.data ?? []) as BucketItem[]);
      setSentenceGames((sentenceRes.data ?? []) as SentenceGame[]);
      setAppOpens((opensRes.data ?? []) as AppOpen[]);

      const momentsWithUrls = await attachSignedUrls((momentsRes.data ?? []) as Moment[]);
      const lettersWithUrls = await attachSignedUrls((lettersRes.data ?? []) as Letter[]);

      setMoments(momentsWithUrls);
      setLetters(lettersWithUrls);
    } catch (error: any) {
      setMsg(error.message || 'Failed to load app data.');
    } finally {
      setLoading(false);
    }
  }

  async function attachSignedUrls<T extends { storage_path?: string | null }>(rows: T[]) {
    const result = await Promise.all(
      rows.map(async (row) => {
        if (!row.storage_path) {
          return { ...row, file_url: null };
        }

        const { data } = await supabase.storage
  .from('private-media')
  .createSignedUrl(row.storage_path, 60 * 60 * 24);
        return {
          ...row,
          file_url: data?.signedUrl ?? null,
        };
      })
    );

    return result;
  }
  function makeFileId() {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function getAccentButtonClass() {
  return 'btn-accent';
}

function getAccentChipClass() {
  return 'chip-themed';
}

function getInitial(value: string | null | undefined, fallback: string) {
  const source = (value || fallback).trim();
  return source ? source.charAt(0).toUpperCase() : fallback;
}

async function attachProfileAvatarUrls(rows: Profile[]) {
  const result = await Promise.all(
    rows.map(async (row) => {
      if (!row.avatar_path) {
        return { ...row, avatar_url: null };
      }

      const { data } = await supabase.storage
        .from('private-media')
        .createSignedUrl(row.avatar_path, 60 * 60 * 24);

      return {
        ...row,
        avatar_url: data?.signedUrl ?? null,
      };
    })
  );

  return result;
}
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function enablePushNotifications() {
  try {
    setBusyAction('enablePush');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMsg('Push notifications are not supported on this device.');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      setMsg('Notification permission was not granted.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
    }

    const token = await getAccessToken();

    if (!token) {
      setMsg('Please log in again.');
      return;
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not enable push notifications.');
    }

    setPushEnabled(true);
    setMsg('Push notifications enabled.');
  } catch (error: any) {
    setMsg(error.message || 'Could not enable push notifications.');
  } finally {
    setBusyAction(null);
  }
}

async function sendPushEvent(payload: {
  coupleId: string;
  title: string;
  body: string;
  url?: string;
  senderId?: string;
}) {
  try {
    const token = await getAccessToken();
    if (!token) return;

    await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // silent fail so the main action still succeeds
  }
}
function getBestRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

function clearRecordedAudio() {
  if (recordedAudioUrl) {
    URL.revokeObjectURL(recordedAudioUrl);
  }

  setRecordedAudioUrl('');
  setLetterFile(null);
}

async function startRecording() {
  try {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setMsg('Microphone recording works only on HTTPS or localhost.');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg('This browser does not support microphone recording.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    recordedChunksRef.current = [];

    const mimeType = getBestRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });

      const extension = finalMimeType.includes('mp4')
        ? 'm4a'
        : finalMimeType.includes('ogg')
        ? 'ogg'
        : 'webm';

      const file = new File([blob], `voice-note.${extension}`, {
        type: finalMimeType,
      });

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }

      setLetterFile(file);
      setRecordedAudioUrl(URL.createObjectURL(file));
      setIsRecording(false);
      setMsg('Voice note recorded. Tap Send.');

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };

    clearRecordedAudio();
    recorder.start();
    setIsRecording(true);
    setMsg('Recording...');
  } catch (error) {
    setMsg('Microphone permission was denied or unavailable.');
  }
}

function stopRecording() {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
    mediaRecorderRef.current.stop();
    return;
  }

  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  setIsRecording(false);
}
function getMimeTypeFromFile(file: File) {
  if (file.type) return file.type;

  const name = file.name.toLowerCase();

  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.webm')) return 'audio/webm';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  if (name.endsWith('.oga')) return 'audio/ogg';
  if (name.endsWith('.aac')) return 'audio/aac';
  if (name.endsWith('.3gp')) return 'audio/3gpp';

  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';

  return 'application/octet-stream';
}

function getMimeTypeFromPath(path: string | null | undefined) {
  if (!path) return undefined;

  const lower = path.toLowerCase();

  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.oga')) return 'audio/ogg';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';

  return undefined;
}
  async function uploadFile(file: File, folder: string) {
    if (!coupleId) throw new Error('Missing couple id');

    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${makeFileId()}.${ext}`;
    const path = `${coupleId}/${folder}/${fileName}`;

    const { error } = await supabase.storage.from('private-media').upload(path, file, {
  upsert: false,
  contentType: file.type || undefined,
});

    if (error) throw error;

    return path;
  }
async function deleteStoredFile(path: string | null | undefined) {
  if (!path) return;

  const { error } = await supabase.storage.from('private-media').remove([path]);

  if (error) {
    throw error;
  }
}
  async function createSpace() {
  try {
    setBusyAction('createSpace');
    setMsg('');
    const { data, error } = await supabase.rpc('create_couple_space');
    if (error) throw error;

    const row = data?.[0];
    setSavedInviteCode(row?.invite_code ?? '');
    setCoupleId(row?.couple_id ?? null);
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not create private space.');
  } finally {
    setBusyAction(null);
  }
}

  async function joinSpace() {
  try {
    setBusyAction('joinSpace');
    setMsg('');
    if (!joinCode.trim()) {
      setMsg('Enter an invite code.');
      return;
    }

    const { data, error } = await supabase.rpc('join_couple_by_code', {
      p_code: joinCode,
    });

    if (error) throw error;

    setCoupleId(data ?? null);
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not join private space.');
  } finally {
    setBusyAction(null);
  }
}

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function playSecretVoice() {
    setSecretClickCount((c) => {
      const next = c + 1;
      localStorage.setItem('secretClickCount', String(next));
      return next;
    });
    setSecretClicking(true);
    setTimeout(() => setSecretClicking(false), 150);
    const idx = Math.floor(Math.random() * 5) + 1;
    const audio = new Audio(`/voice/v${idx}.mp3`);
    audio.play();
  }

  async function askQuestion() {
  try {
    setBusyAction('askQuestion');
    if (!coupleId || !userId || !questionText.trim()) return;

    const { error } = await supabase.from('questions').insert({
      couple_id: coupleId,
      asked_by: userId,
      question_text: questionText.trim(),
    });

    if (error) throw error;
    await sendPushEvent({
  coupleId,
  title: 'New question',
  body: 'You got a new random question.',
  url: '/app',
});
    setQuestionText('');
    setMsg('Question sent.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not send question.');
  } finally {
    setBusyAction(null);
  }
}

  async function answerQuestionById(id: string) {
  try {
    setBusyAction(`answer-${id}`);
    const answer = (questionAnswer[id] || '').trim();
    
    if (!answer) return;

    const { error } = await supabase
      .from('questions')
      .update({
        answer_text: answer,
        answered_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    if (coupleId) {
  await sendPushEvent({
    coupleId,
    title: 'Question answered',
    body: 'Your question got a reply.',
    url: '/app',
  });
}
    setQuestionAnswer((prev) => ({ ...prev, [id]: '' }));
    setMsg('Answer sent.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not send answer.');
  } finally {
    setBusyAction(null);
  }
}

  async function sendNudge(type: 'thinking' | 'heart' | 'kiss') {
    try {
      if (!coupleId || !userId) return;

      const { error } = await supabase.from('nudges').insert({
        couple_id: coupleId,
        sender_id: userId,
        nudge_type: type,
      });

      if (error) throw error;
      const map: Record<string, string> = {
  thinking: 'Thinking of you 💭',
  heart: 'I lovee youu ❤️',
  kiss: 'Kiss sent 😘',
};

await sendPushEvent({
  coupleId,
  senderId: userId,
  title: 'Tiny love note',
  body: map[type] || 'You got a love note 💕',
  url: '/app',
});
      setRefreshKey((x) => x + 1);
    } catch (error: any) {
      setMsg(error.message || 'Could not send nudge.');
    }
  }

  async function addCustomPrompt() {
    try {
      if (!coupleId || !userId || !customPromptText.trim()) return;

      const { error } = await supabase.from('custom_prompts').insert({
        couple_id: coupleId,
        created_by: userId,
        prompt_text: customPromptText.trim(),
      });

      if (error) throw error;

      setCustomPromptText('');
      setRefreshKey((x) => x + 1);
    } catch (error: any) {
      setMsg(error.message || 'Could not save custom prompt.');
    }
  }

  async function uploadMoment(kindOverride?: 'day' | 'memory') {
  try {
    setBusyAction('uploadMoment');
    if (!coupleId || !userId || !momentFile) {
      setMsg('Choose a photo first.');
      return;
    }

    const path = await uploadFile(momentFile, 'moments');

    const { error } = await supabase.from('moments').insert({
      couple_id: coupleId,
      user_id: userId,
      kind: kindOverride ?? momentKind,
      caption: momentCaption.trim() || null,
      storage_path: path,
    });

    if (error) throw error;
    await sendPushEvent({
  coupleId,
  senderId: userId,
  title: 'New photo',
  body: (kindOverride ?? momentKind) === 'day' ? 'Photo of the day 📸' : 'New memory added 📌',
  url: '/app',
});
    setMomentCaption('');
    setMomentFile(null);
    setMomentKind('day');
    setMsg('Photo uploaded.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not upload photo.');
  } finally {
    setBusyAction(null);
  }
}
  async function deleteMoment(moment: Moment) {
  try {
    setBusyAction(`delete-moment-${moment.id}`);

    if (!userId) return;

    if (moment.user_id !== userId) {
      setMsg('You can only delete your own photos.');
      return;
    }

    if (moment.storage_path) {
      await deleteStoredFile(moment.storage_path);
    }

    const { error } = await supabase.from('moments').delete().eq('id', moment.id);

    if (error) throw error;
    
    setMsg('Photo deleted.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not delete photo.');
  } finally {
    setBusyAction(null);
  }
}
  async function sendLetter() {
  try {
    setBusyAction('sendLetter');
    if (!coupleId || !userId) return;

    let storagePath: string | null = null;

    if (letterKind !== 'text') {
      if (!letterFile) {
        setMsg(letterKind === 'audio' ? 'Record audio first.' : 'Choose a file first.');
        return;
      }

      storagePath = await uploadFile(letterFile, 'letters');
    }

    if (letterKind === 'text' && !letterText.trim()) {
      setMsg('Enter a message.');
      return;
    }

    if (letterMode === 'capsule' && !unlockAt) {
      setMsg('Choose an unlock time.');
      return;
    }

    const { error } = await supabase.from('letters').insert({
      couple_id: coupleId,
      sender_id: userId,
      mode: letterMode,
      content_kind: letterKind,
      text_content: letterKind === 'text' ? letterText.trim() : null,
      storage_path: storagePath,
      unlock_at: letterMode === 'capsule' ? new Date(unlockAt).toISOString() : null,
    });

    if (error) throw error;
    const pushBody =
  letterKind === 'audio'
    ? 'You got a new voice note.'
    : letterKind === 'image'
    ? 'You got a new photo message.'
    : 'You got a new message.';

await sendPushEvent({
  coupleId,
  title: 'New message',
  body: pushBody,
  url: '/app',
});
    setLetterText('');
    setUnlockAt('');
    setLetterMode('normal');
    setLetterKind('text');
    clearRecordedAudio();
    setMsg('Sent.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not send message.');
  } finally {
    setBusyAction(null);
  }
}
async function saveProfileSettings() {
  try {
    setBusyAction('saveSettings');

    if (!userId || !coupleId) return;

    let nextAvatarPath = myProfile?.avatar_path ?? null;

    if (avatarFile) {
      const uploadedPath = await uploadFile(avatarFile, 'profiles');

      if (nextAvatarPath && nextAvatarPath !== uploadedPath) {
        try {
          await deleteStoredFile(nextAvatarPath);
        } catch {
          // ignore old avatar cleanup failure
        }
      }

      nextAvatarPath = uploadedPath;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        display_name: myName.trim() || null,
        avatar_path: nextAvatarPath,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (profileError) throw profileError;

    const { error: settingsError } = await supabase.from('couple_settings').upsert(
      {
        couple_id: coupleId,
        couple_nickname: coupleNickname.trim() || null,
        relationship_start_date: relationshipStartDate || null,
        accent_color: accentColor,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'couple_id',
      }
    );

    if (settingsError) throw settingsError;

    setAvatarFile(null);
    setMsg('Profile settings saved.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not save profile settings.');
  } finally {
    setBusyAction(null);
  }
}
async function deleteLetter(letter: Letter) {
  try {
    setBusyAction(`delete-letter-${letter.id}`);

    if (!userId) return;

    if (letter.sender_id !== userId) {
      setMsg('You can only delete your own messages.');
      return;
    }

    if (letter.storage_path) {
      await deleteStoredFile(letter.storage_path);
    }

    const { error } = await supabase.from('letters').delete().eq('id', letter.id);

    if (error) throw error;
    
    setMsg('Message deleted.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not delete message.');
  } finally {
    setBusyAction(null);
  }
}
  async function addBucketItem() {
  try {
    setBusyAction('addBucketItem');
    if (!coupleId || !userId || !bucketText.trim()) return;

    const { error } = await supabase.from('bucket_items').insert({
      couple_id: coupleId,
      created_by: userId,
      title: bucketText.trim(),
    });

    if (error) throw error;
    await sendPushEvent({
  coupleId,
  senderId: userId,
  title: 'Bucket list',
  body: `New idea: "${bucketText.trim()}"`,
  url: '/app',
});
    setBucketText('');
    setMsg('Bucket list updated.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not add bucket list item.');
  } finally {
    setBusyAction(null);
  }
}

  async function deleteBucketItem(id: string) {
    try {
      setBusyAction(`delete-bucket-${id}`);
      const { error } = await supabase.from('bucket_items').delete().eq('id', id);
      if (error) throw error;
      setRefreshKey((x) => x + 1);
    } catch (error: any) {
      setMsg(error.message || 'Could not delete item.');
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleBucketItem(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from('bucket_items')
        .update({ is_done: !current })
        .eq('id', id);

      if (error) throw error;
      if (coupleId && userId) {
  await sendPushEvent({
    coupleId,
    senderId: userId,
    title: 'Bucket list updated',
    body: current ? 'Marked as not done ⬜' : 'Marked as done ✅',
    url: '/app',
  });
}
      setRefreshKey((x) => x + 1);
    } catch (error: any) {
      setMsg(error.message || 'Could not update bucket list item.');
    }
  }

  async function addSentenceStarter() {
  try {
    setBusyAction('addSentenceStarter');
    if (!coupleId || !userId || !starterText.trim()) return;

    const { error } = await supabase.from('sentence_games').insert({
      couple_id: coupleId,
      created_by: userId,
      starter_text: starterText.trim(),
    });

    if (error) throw error;

    setStarterText('');
    setMsg('Sentence starter sent.');
    setRefreshKey((x) => x + 1);
  } catch (error: any) {
    setMsg(error.message || 'Could not start sentence game.');
  } finally {
    setBusyAction(null);
  }
}

  async function finishSentenceById(id: string) {
    try {
      if (!userId) return;

      const value = (finishText[id] || '').trim();
      if (!value) return;

      const { error } = await supabase
        .from('sentence_games')
        .update({
          finish_text: value,
          finished_by: userId,
          finished_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setFinishText((prev) => ({ ...prev, [id]: '' }));
      setRefreshKey((x) => x + 1);
    } catch (error: any) {
      setMsg(error.message || 'Could not finish sentence.');
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setMsg('This browser does not support notifications.');
      return;
    }

    const result = await Notification.requestPermission();
    setMsg(
      result === 'granted'
        ? 'Permission granted. The next step is real server-side push notifications.'
        : 'Notifications were not allowed.'
    );
  }

  const visibleLetters = useMemo(() => {
    return letters.filter((letter) => {
      if (letter.mode === 'normal') return true;
      if (!letter.unlock_at) return true;
      if (letter.sender_id === userId) return true;
      return new Date(letter.unlock_at) <= new Date();
    });
  }, [letters, userId]);

  const nudgeCount = nudges.length;
  const heartCount = nudges.filter((n) => n.nudge_type === 'heart').length;
  const kissCount = nudges.filter((n) => n.nudge_type === 'kiss').length;
  const thinkingCount = nudges.filter((n) => n.nudge_type === 'thinking').length;

  const streak = useMemo(() => {
    const uniqueDays = [...new Set(appOpens.map((x) => x.opened_on))].sort().reverse();
    if (!uniqueDays.length) return 0;

    let count = 0;
    const current = new Date();

    while (true) {
      const key = current.toISOString().slice(0, 10);
      if (uniqueDays.includes(key)) {
        count += 1;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }

    return count;
  }, [appOpens]);

  const openQuestionsForMe = questions.filter(
    (q) => !q.answer_text && q.asked_by !== userId
  );

  if (loading) {
  return (
    <main className="app-shell text-white px-4 py-6">
      <div className="app-container">
        <div className="card">
          <p className="section-title">Loading...</p>
          <p className="section-subtitle mt-2">Preparing your private space.</p>
        </div>
      </div>
    </main>
  );
}

  if (!coupleId) {
    return (
      <main className="app-shell text-white px-4 py-6">
        <div className="app-container space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Welcome</p>
              <h1 className="text-2xl font-bold">Create your private space</h1>
            </div>
            <button className="btn btn-dark" onClick={logout}>
              Logout
            </button>
          </div>

          <div className="card space-y-3">
            <p className="text-sm text-zinc-300">
              Create a private space and send the invite code.
            </p>
            <button
  className={`btn ... ${getAccentButtonClass()}`}
  onClick={createSpace}
  disabled={isBusy('createSpace')}
>
  {isBusy('createSpace') ? 'Creating...' : 'Create private space'}
</button>
            {savedInviteCode ? (
              <p className="text-sm text-zinc-400">
                Your invite code: <span className="font-bold text-white">{savedInviteCode}</span>
              </p>
            ) : null}
          </div>

          <div className="card space-y-3">
            <p className="text-sm text-zinc-300">
              If you already have a code, enter it here.
            </p>
            <input
              aria-label="Invite code"
              className="input"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.currentTarget.value)}
            />
            <button
  className="btn btn-primary w-full"
  onClick={joinSpace}
  disabled={isBusy('joinSpace')}
>
  {isBusy('joinSpace') ? 'Joining...' : 'Join'}
</button>
          </div>

          {msg ? <p className="text-sm text-pink-400">{msg}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell text-white px-4 py-4 pb-24">
      <div className="app-container space-y-4">
        <header className="card">
  <div className="flex items-start justify-between gap-3">
    <div className="space-y-3">
      <div className={`header-chip ${getAccentChipClass()}`}>
        Our place 
      </div>

      <div>
        <h1 className="app-title">{coupleNickname.trim() || 'Us'}</h1>
        <p className="app-subtitle">
          Invite code: {savedInviteCode || '...'} · Members: {memberCount}/2
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
            {avatarPreviewUrl || myProfile?.avatar_url ? (
              <img
                src={avatarPreviewUrl || myProfile?.avatar_url || ''}
                alt="Your avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-200">
                {getInitial(myName || myProfile?.display_name, 'Y')}
              </div>
            )}
          </div>

          <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
            {partnerProfile?.avatar_url ? (
              <img
                src={partnerProfile.avatar_url}
                alt="Partner avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-200">
                {getInitial(partnerProfile?.display_name, 'P')}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          {relationshipStartDate
            ? `Since ${new Date(`${relationshipStartDate}T00:00:00`).toLocaleDateString()}`
            : 'Add your date in settings'}
        </p>
      </div>
    </div>

    <div className="flex flex-col items-center gap-1">
      <button type="button" className="btn btn-dark" onClick={logout}>
        Logout
      </button>
      <button
        type="button"
        onClick={playSecretVoice}
        className={`mt-[2px] bg-transparent border-0 p-0 cursor-pointer transition-transform duration-150 ${secretClicking ? 'scale-90' : 'scale-100'}`}
      >
        <img
          src="/secret-button.png"
          alt="secret"
          className="h-10 w-10 rounded-full object-cover"
        />
      </button>
      <p className="text-xs text-zinc-500">{secretClickCount}</p>
    </div>
  </div>
</header>

        <div key={tab} className="tab-page space-y-4">
        {tab === 'today' && (
          <>
            <section className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Daily streak</h2>
                <span className="text-xl font-bold">{streak} 🔥</span>
              </div>
              <p className="text-sm text-zinc-400">
                Days spent here.
              </p>
              <button
  className="btn btn-dark w-full"
  onClick={enablePushNotifications}
  disabled={isBusy('enablePush') || pushEnabled}
>
  {pushEnabled
    ? 'Notifications enabled'
    : isBusy('enablePush')
    ? 'Enabling...'
    : 'Enable notifications'}
</button>
            </section>

            <section className="card space-y-3">
              <h2 className="section-title">Tiny love note</h2>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className="btn btn-dark" onClick={() => sendNudge('thinking')}>
                  Thinking of you
                </button>
                <button type="button" className="btn btn-dark" onClick={() => sendNudge('heart')}>
                  ❤️
                </button>
                <button type="button" className="btn btn-dark" onClick={() => sendNudge('kiss')}>
                  Pegasus
                </button>
              </div>
              <p className="text-sm text-zinc-400">
                Total: {nudgeCount} · ❤️ {heartCount} · 😘 {kissCount} · 💭 {thinkingCount}
              </p>
              <div className="space-y-3 pt-2">
  <h3 className="section-title">
    Upload today's photo
  </h3>

  <input
    aria-label="Photo caption for today's prompt"
    className="input"
    placeholder="Optional caption"
    value={momentCaption}
    onChange={(e) => setMomentCaption(e.currentTarget.value)}
  />

  <input
    aria-label="Choose photo for today's prompt"
    className="input"
    type="file"
    accept="image/*"
    onChange={(e) => setMomentFile(e.currentTarget.files?.[0] ?? null)}
  />

  <button
  type="button"
  className={`btn ... ${getAccentButtonClass()}`}
  onClick={() => uploadMoment('day')}
  disabled={isBusy('uploadMoment')}
>
  {isBusy('uploadMoment') ? 'Uploading...' : "Upload today's photo"}
</button>
</div>
            </section>

            <section className="card space-y-3">
              <h2 className="section-title">Random question</h2>
              <input
                aria-label="Ask a random question"
                className="input"
                placeholder="Ask a random question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.currentTarget.value)}
              />
              <button
  className="btn btn-primary w-full"
  onClick={askQuestion}
  disabled={isBusy('askQuestion')}
>
  {isBusy('askQuestion') ? 'Sending...' : 'Send question'}
</button>

              <div className="space-y-3 pt-2">
                {openQuestionsForMe.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-zinc-800 p-3">
                    <p className="text-sm text-zinc-300">{q.question_text}</p>
                    <textarea
                      aria-label="Write your answer"
                      className="input mt-2 min-h-[90px]"
                      placeholder="Write your answer..."
                      value={questionAnswer[q.id] || ''}
                      onChange={(e) => {
  const value = e.currentTarget.value;
  setQuestionAnswer((prev) => ({
    ...prev,
    [q.id]: value,
  }));
}}
                    />
                    <button
  className={`btn ... ${getAccentButtonClass()}`}
  onClick={() => answerQuestionById(q.id)}
  disabled={isBusy(`answer-${q.id}`)}
>
  {isBusy(`answer-${q.id}`) ? 'Sending...' : 'Send answer'}
</button>
                  </div>
                ))}
                {!openQuestionsForMe.length && (
                  <div className="empty-state">
  <span className="empty-state-title">No unanswered questions</span>
  <span className="empty-state-text">You are all caught up for now.</span>
</div>
                )}
              </div>
              
              <div className="space-y-3 pt-2">
  <h3 className="text-sm font-semibold text-zinc-300">
    Recent questions & answers
  </h3>

  {questions.slice(0, 10).map((q) => (
    <div key={`history-${q.id}`} className="rounded-2xl border border-zinc-800 p-3">
      <p className="text-sm text-white">{q.question_text}</p>

      {q.answer_text ? (
        <p className="mt-2 text-sm text-pink-300">{q.answer_text}</p>
      ) : (
        <p className="empty-state">Waiting for answer...</p>
      )}
    </div>
  ))}

  {!questions.length && (
    <div className="empty-state">
  <span className="empty-state-title">No questions yet</span>
  <span className="empty-state-text">Ask the first random question.</span>
</div>
  )}
</div>
            </section>

            <section className="card space-y-3">
              <h2 className="text-lg font-semibold">Daily photo challenge</h2>
              <p className="rounded-2xl bg-zinc-900 p-3 text-sm">{photoPrompt}</p>
              <button
                className="btn btn-dark w-full"
                onClick={() =>
                  setPhotoPrompt(
                    DEFAULT_PHOTO_PROMPTS[Math.floor(Math.random() * DEFAULT_PHOTO_PROMPTS.length)]
                  )
                }
              >
                Give me another prompt
              </button>

              <input
                aria-label="Write your own custom photo prompt"
                className="input"
                placeholder="Write your own custom prompt..."
                value={customPromptText}
                onChange={(e) => setCustomPromptText(e.currentTarget.value)}
              />
              <button className="btn btn-primary w-full" onClick={addCustomPrompt}>
                Save custom prompt
              </button>

              <div className="space-y-2 pt-2">
  {customPrompts.length ? (
    customPrompts.slice(0, 5).map((p) => (
      <div key={p.id} className="rounded-2xl border border-zinc-800 p-3 text-sm">
        {p.prompt_text}
      </div>
    ))
  ) : (
    <div className="empty-state">
      <span className="empty-state-title">No saved prompts yet</span>
      <span className="empty-state-text">Save a custom photo idea and it will appear here.</span>
    </div>
  )}
</div>
            </section>
          </>
        )}

        {tab === 'moments' && (
          <>
            <section className="card space-y-3">
              <h2 className="section-title">Photo of the day / Memory</h2>

              <select
                aria-label="Choose photo category"
                className="input"
                value={momentKind}
                onChange={(e) =>
                  setMomentKind(e.currentTarget.value as 'day' | 'memory')
                }
              >
                <option value="day">Photo of the day</option>
                <option value="memory">Polaroid memory</option>
              </select>

              <input
                aria-label="Photo caption"
                className="input"
                placeholder="Caption (optional)"
                value={momentCaption}
                onChange={(e) => setMomentCaption(e.currentTarget.value)}
              />

              <input
                aria-label="Choose photo file"
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setMomentFile(e.currentTarget.files?.[0] ?? null)}
              />

              <button
  className={`btn ... ${getAccentButtonClass()}`}
  onClick={() => uploadMoment()}
  disabled={isBusy('uploadMoment')}
>
  {isBusy('uploadMoment') ? 'Uploading...' : 'Upload photo'}
</button>
            </section>

            <section className="card space-y-3">
              <h2 className="text-lg font-semibold">Polaroid wall</h2>
              {moments.length ? (
  <div className="grid grid-cols-2 gap-3">
    {moments.map((m) => (
      <div key={m.id} className="rounded-2xl border border-zinc-800 p-2">
        <div className="media-frame">
          {m.file_url ? (
            <img
              src={m.file_url}
              alt="moment"
              className="h-40 w-full object-cover"
            />
          ) : (
            <div className="h-40 w-full bg-zinc-900" />
          )}
        </div>

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">{m.kind}</p>

            {m.user_id === userId ? (
              <button
                className="btn btn-dark px-3 py-2 text-xs"
                onClick={() => deleteMoment(m)}
                disabled={isBusy(`delete-moment-${m.id}`)}
              >
                {isBusy(`delete-moment-${m.id}`) ? 'Deleting...' : 'Delete'}
              </button>
            ) : null}
          </div>

          {m.caption ? <p className="text-sm">{m.caption}</p> : null}
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="empty-state">
    <span className="empty-state-title">No memories yet</span>
    <span className="empty-state-text">Upload your first photo to start our shared wall.</span>
  </div>
)}
            </section>
          </>
        )}

        {tab === 'letters' && (
          <>
            <section className="card space-y-3">
              <h2 className="section-title">Normal message / Time capsule</h2>

              <select
                aria-label="Choose message mode"
                className="input"
                value={letterMode}
                onChange={(e) =>
                  setLetterMode(e.currentTarget.value as 'normal' | 'capsule')
                }
              >
                <option value="normal">Normal</option>
                <option value="capsule">Time capsule</option>
              </select>

              <select
                aria-label="Choose message content type"
                className="input"
                value={letterKind}
                onChange={(e) =>
                  setLetterKind(e.currentTarget.value as 'text' | 'image' | 'audio')
                }
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
              </select>

              {letterKind === 'text' ? (
  <textarea
    aria-label="Write your message"
    className="input min-h-[110px]"
    placeholder="Write your message..."
    value={letterText}
    onChange={(e) => setLetterText(e.currentTarget.value)}
  />
) : letterKind === 'image' ? (
  <input
    aria-label="Choose image file"
    className="input"
    type="file"
    accept="image/*"
    onChange={(e) => setLetterFile(e.currentTarget.files?.[0] ?? null)}
  />
) : (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        className="btn btn-dark"
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? 'Stop recording' : 'Start recording'}
      </button>

      <button
        type="button"
        className="btn btn-dark"
        onClick={clearRecordedAudio}
        disabled={!recordedAudioUrl}
      >
        Clear
      </button>
    </div>

    {recordedAudioUrl ? (
      <audio controls preload="metadata" className="w-full" src={recordedAudioUrl}>
        Your browser does not support audio playback.
      </audio>
    ) : (
      <div className="empty-state">
  <span className="empty-state-title">No voice note yet</span>
  <span className="empty-state-text">Tap start recording to create one.</span>
</div>
    )}
  </div>
)}

              {letterMode === 'capsule' ? (
                <input
                  aria-label="Choose unlock date and time"
                  className="input"
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.currentTarget.value)}
                />
              ) : null}

              <button
  className="btn btn-primary w-full"
  onClick={sendLetter}
  disabled={isBusy('sendLetter')}
>
  {isBusy('sendLetter') ? 'Sending...' : 'Send'}
</button>
            </section>

            <section className="card space-y-3">
              <h2 className="section-title">Inbox</h2>
              <div className="space-y-3">
  {visibleLetters.length ? (
    visibleLetters.map((l) => (
      <div key={l.id} className="rounded-2xl border border-zinc-800 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs text-zinc-500">
            <span>{l.mode === 'capsule' ? 'Time capsule' : 'Normal'}</span>
            {l.created_at ? (
              <span className="block">Sent: {new Date(l.created_at).toLocaleString()}</span>
            ) : null}
          </div>

          {l.sender_id === userId ? (
            <button
              className="btn btn-dark px-3 py-2 text-xs"
              onClick={() => deleteLetter(l)}
              disabled={isBusy(`delete-letter-${l.id}`)}
            >
              {isBusy(`delete-letter-${l.id}`) ? 'Deleting...' : 'Delete'}
            </button>
          ) : null}
        </div>

        {l.content_kind === 'text' && l.text_content ? (
          <p className="text-sm">{l.text_content}</p>
        ) : null}

        {l.content_kind === 'image' && l.file_url ? (
          <img
            src={l.file_url}
            alt="letter media"
            className="w-full rounded-xl object-cover"
          />
        ) : null}

        {l.content_kind === 'audio' && l.file_url ? (
          <div className="space-y-2">
            <audio
              key={l.file_url}
              controls
              preload="metadata"
              className="w-full"
              src={l.file_url}
            >
              Your browser does not support audio playback.
            </audio>

            <a
              href={l.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pink-300 underline"
            >
              Open audio directly
            </a>
          </div>
        ) : null}

        {l.mode === 'capsule' && l.unlock_at ? (
          <p className="mt-2 text-xs text-zinc-500">
            Unlocks: {new Date(l.unlock_at).toLocaleString()}
          </p>
        ) : null}
      </div>
    ))
  ) : (
    <div className="empty-state">
      <span className="empty-state-title">Your inbox is empty</span>
      <span className="empty-state-text">Send a message, photo, or voice note to see it here.</span>
    </div>
  )}
</div>
            </section>
          </>
        )}

        {tab === 'play' && (
          <>
            <section className="card space-y-3">
              <h2 className="section-title">Finish my sentence</h2>
              <input
                aria-label="Start a sentence game"
                className="input"
                placeholder="Example: My favorite thing is when you..."
                value={starterText}
                onChange={(e) => setStarterText(e.currentTarget.value)}
              />
              <button
  className={`btn ... ${getAccentButtonClass()}`}
  onClick={addSentenceStarter}
  disabled={isBusy('addSentenceStarter')}
>
  {isBusy('addSentenceStarter') ? 'Sending...' : 'Send starter'}
</button>
            </section>

            <section className="card space-y-3">
              <h2 className="section-title">Open sentence games</h2>
              <div className="space-y-3">
  {sentenceGames.length ? (
    sentenceGames.map((g) => (
      <div key={g.id} className="rounded-2xl border border-zinc-800 p-3">
        <p className="text-sm">{g.starter_text}</p>

        {g.finish_text ? (
          <p className="mt-2 text-sm text-pink-300">{g.finish_text}</p>
        ) : g.created_by !== userId ? (
          <>
            <input
              aria-label="Finish the sentence"
              className="input mt-2"
              placeholder="Finish the sentence..."
              value={finishText[g.id] || ''}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setFinishText((prev) => ({
                  ...prev,
                  [g.id]: value,
                }));
              }}
            />
            <button
              className="btn btn-primary mt-2 w-full"
              onClick={() => finishSentenceById(g.id)}
            >
              Finish sentence
            </button>
          </>
        ) : (
          <div className="empty-state mt-2">
            <span className="empty-state-title">Waiting for a reply</span>
            <span className="empty-state-text">Your partner is still working on this one.</span>
          </div>
        )}
      </div>
    ))
  ) : (
    <div className="empty-state">
      <span className="empty-state-title">No sentence games yet</span>
      <span className="empty-state-text">Send the first starter to begin.</span>
    </div>
  )}
</div>
            </section>
          </>
        )}

        {tab === 'cat' && (
          <CatHungerGame
            coupleId={coupleId}
            userId={userId}
            myName={myName || myProfile?.display_name || undefined}
            partnerName={partnerProfile?.display_name || undefined}
          />
        )}

        {tab === 'us' && (
        <>
          <section className="card space-y-3">
            <h2 className="section-title">Bucket list</h2>

            <input
              aria-label="Add a bucket list item"
              className="input"
              placeholder="Add something you want to do together..."
              value={bucketText}
              onChange={(e) => setBucketText(e.currentTarget.value)}
            />
            <button
  className="btn btn-primary w-full"
  onClick={addBucketItem}
  disabled={isBusy('addBucketItem')}
>
  {isBusy('addBucketItem') ? 'Adding...' : 'Add'}
</button>

            <div className="space-y-2 pt-2">
  {bucketItems.length ? (
    bucketItems.map((item) => (
      <div
        key={item.id}
        className="flex w-full items-center gap-2 rounded-2xl border border-zinc-800 p-3"
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-between text-left gap-2"
          onClick={() => toggleBucketItem(item.id, item.is_done)}
        >
          <span className={item.is_done ? 'line-through text-zinc-500 text-sm' : 'text-sm'}>
            {item.title}
          </span>
          <span className="shrink-0">{item.is_done ? '✅' : '⬜'}</span>
        </button>
        <button
          type="button"
          title="Delete item"
          className="shrink-0 text-zinc-600 hover:text-rose-400 transition-colors text-lg leading-none px-1"
          onClick={() => deleteBucketItem(item.id)}
          disabled={isBusy(`delete-bucket-${item.id}`)}
        >
          {isBusy(`delete-bucket-${item.id}`) ? '·' : '×'}
        </button>
      </div>
    ))
  ) : (
    <div className="empty-state">
      <span className="empty-state-title">No bucket list items yet</span>
      <span className="empty-state-text">Put something you want us to do.</span>
    </div>
  )}
</div>

          </section>
          <section className="card space-y-4">
  <div>
    <h2 className="section-title">Profile & settings</h2>
    <p className="section-subtitle mt-1">
      Personalize your shared space.
    </p>
  </div>

  <div className="flex items-center gap-3">
    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      {avatarPreviewUrl || myProfile?.avatar_url ? (
        <img
          src={avatarPreviewUrl || myProfile?.avatar_url || ''}
          alt="Your avatar preview"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-200">
          {getInitial(myName || myProfile?.display_name, 'Y')}
        </div>
      )}
    </div>

    <div className="flex-1 space-y-2">
      <p className="text-sm text-zinc-300">Your in-app avatar</p>
      <input
        aria-label="Choose avatar image"
        className="input"
        type="file"
        accept="image/*"
        onChange={(e) => setAvatarFile(e.currentTarget.files?.[0] ?? null)}
      />
    </div>
  </div>

  <div className="space-y-2">
    <label className="text-sm text-zinc-300">Your name</label>
    <input
      aria-label="Your name"
      className="input"
      placeholder="Enter your name"
      value={myName}
      onChange={(e) => setMyName(e.currentTarget.value)}
    />
  </div>

  <div className="space-y-2">
    <label className="text-sm text-zinc-300">Partner name</label>
    <div className="input flex items-center text-zinc-300">
      {partnerProfile?.display_name?.trim()
        ? partnerProfile.display_name
        : 'Your partner has not added their name yet.'}
    </div>
  </div>

  <div className="soft-divider" />

  <div className="space-y-2">
    <label className="text-sm text-zinc-300">Couple nickname</label>
    <input
      aria-label="Couple nickname"
      className="input"
      placeholder="What should your shared space be called?"
      value={coupleNickname}
      onChange={(e) => setCoupleNickname(e.currentTarget.value)}
    />
  </div>

  <div className="space-y-2">
    <label className="text-sm text-zinc-300">Relationship start date</label>
    <input
      aria-label="Relationship start date"
      className="input"
      type="date"
      value={relationshipStartDate}
      onChange={(e) => setRelationshipStartDate(e.currentTarget.value)}
    />
  </div>

  <div className="space-y-3">
    <p className="text-sm text-zinc-300">Background color</p>
    <div className="themed-divider" />
    <div className="grid grid-cols-4 gap-2">
      {(
        [
          { value: 'default', label: 'Black'  },
          { value: 'white',   label: 'White'  },
          { value: 'pink',    label: 'Rose'   },
          { value: 'purple',  label: 'Violet' },
          { value: 'red',     label: 'Red'    },
          { value: 'sage',    label: 'Green'  },
          { value: 'sky',     label: 'Blue'   },
          { value: 'peach',   label: 'Peach'  },
        ] as { value: AccentColor; label: string }[]
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`color-swatch-btn${accentColor === value ? ' active' : ''}`}
          onClick={() => setAccentColor(value)}
        >
          <span className={`color-swatch swatch-${value}`} />
          <span className="text-xs text-zinc-400">{label}</span>
        </button>
      ))}
    </div>
  </div>

  <div className="space-y-3">
    <p className="text-sm text-zinc-300">Button color</p>
    <div className="themed-divider" />
    <div className="grid grid-cols-3 gap-2">
      {(
        [
          { value: 'pink',   label: 'Rose'   },
          { value: 'purple', label: 'Violet' },
          { value: 'red',    label: 'Red'    },
          { value: 'sage',   label: 'Sage'   },
          { value: 'sky',    label: 'Sky'    },
          { value: 'peach',  label: 'Peach'  },
        ] as { value: BtnColor; label: string }[]
      ).map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`color-swatch-btn${btnColor === value ? ' active' : ''}`}
          onClick={() => setBtnColor(value)}
        >
          <span className={`color-swatch swatch-btn-${value}`} />
          <span className="text-xs text-zinc-400">{label}</span>
        </button>
      ))}
    </div>
  </div>

  <button
    className={`btn w-full ${getAccentButtonClass()}`}
    onClick={saveProfileSettings}
    disabled={isBusy('saveSettings')}
  >
    {isBusy('saveSettings') ? 'Saving...' : 'Save settings'}
  </button>
</section>
        </>
        )}

        {tab === 'jar' && (
          <CookieJarTab
            coupleId={coupleId}
            userId={userId}
            myName={myName || myProfile?.display_name || 'You'}
            partnerName={partnerProfile?.display_name || 'Partner'}
          />
        )}

        </div>

        {msg ? (
  <div
    className={`status-box ${
      msg.toLowerCase().includes('could not') ||
      msg.toLowerCase().includes('failed') ||
      msg.toLowerCase().includes('not allowed') ||
      msg.toLowerCase().includes('denied') ||
      msg.toLowerCase().includes('error')
        ? 'status-error'
        : msg.toLowerCase().includes('sent') ||
          msg.toLowerCase().includes('uploaded') ||
          msg.toLowerCase().includes('recorded') ||
          msg.toLowerCase().includes('granted')
        ? 'status-success'
        : 'status-info'
    }`}
  >
    {msg}
  </div>
) : null}
      </div>

      <nav className="bottom-nav fixed bottom-0 left-0 right-0 px-3 py-3">
        <div className="mx-auto grid max-w-md grid-cols-7 gap-1">
          {(
            [
              { id: 'today',   label: 'Today'  },
              { id: 'moments', label: 'Photos' },
              { id: 'letters', label: 'Mail'   },
              { id: 'play',    label: 'Play'   },
              { id: 'cat',     label: '🐱'     },
              { id: 'us',      label: 'Asevin' },
              { id: 'jar',     label: '🍪'     },
            ] as const
          ).map(({ id: navId, label }) => (
            <button
              key={navId}
              type="button"
              className={`btn nav-btn relative overflow-visible ${tab === navId ? 'btn-primary' : 'btn-dark'}`}
              onClick={() => handleNavClick(navId)}
            >
              {label}
              {navHearts.filter(h => h.forTab === navId).map(h => (
                <div key={h.id} className="nav-heart-burst-inner">
                  {(['❤️','💕','🩷','💗','💖','✨','💝'] as const).map((emoji, i) => (
                    <span key={i} className="nav-heart">{emoji}</span>
                  ))}
                </div>
              ))}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}