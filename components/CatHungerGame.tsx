"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type CatGameRow = {
  couple_id: string;
  next_hungry_at: string;
  scores: Record<string, number> | null;
  last_fed_at: string | null;
  last_fed_by: string | null;
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}h ${mm}m ${ss}s`;
  if (mm > 0) return `${mm}m ${ss}s`;
  return `${ss}s`;
}

const CALM_FRAMES = ["/cat/calm-1.png", "/cat/calm-2.png", "/cat/calm-3.png"];
const ANGRY_FRAMES = ["/cat/angry-1.png", "/cat/angry-2.png", "/cat/angry-3.png"];

export default function CatHungerGame({
  coupleId,
  userId,
  myName,
  partnerName,
}: {
  coupleId: string | null;
  userId: string | null;
  myName?: string;
  partnerName?: string;
}) {
  const catRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const hungerAudioRef = useRef<HTMLAudioElement | null>(null);
  const hungerSoundIndexRef = useRef(0);

  const [row, setRow] = useState<CatGameRow | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [frame, setFrame] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [drag, setDrag] = useState<null | {
    food: "egg" | "fish";
    x: number;
    y: number;
  }>(null);

  // keep a ref to drag so global listeners can read latest value
  const dragRef = useRef(drag);
  dragRef.current = drag;

  useEffect(() => { setMounted(true); }, []);

  const nextHungryAtMs = useMemo(() => {
    if (!row?.next_hungry_at) return null;
    return new Date(row.next_hungry_at).getTime();
  }, [row?.next_hungry_at]);

  const isHungry = useMemo(() => {
    if (!nextHungryAtMs) return false;
    return now >= nextHungryAtMs;
  }, [now, nextHungryAtMs]);

  const myScore = useMemo(() => {
    const scores = row?.scores ?? {};
    if (!userId) return 0;
    return Number(scores[userId] ?? 0);
  }, [row?.scores, userId]);

  const partnerScore = useMemo(() => {
    const scores = row?.scores ?? {};
    if (!userId) return 0;
    let sumOthers = 0;
    for (const [k, v] of Object.entries(scores)) {
      if (k !== userId) sumOthers += Number(v ?? 0);
    }
    return sumOthers;
  }, [row?.scores, userId]);

  async function fetchOrCreateRow() {
    if (!coupleId) return;
    const { data } = await supabase
      .from("cat_game")
      .select("*")
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (data) { setRow(data as CatGameRow); return; }

    const minMs = 15 * 60 * 1000;
    const maxMs = 180 * 60 * 1000;
    const addMs = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    const next = new Date(Date.now() + addMs).toISOString();

    const { data: inserted, error } = await supabase
      .from("cat_game")
      .insert({ couple_id: coupleId, next_hungry_at: next, scores: {} })
      .select("*")
      .single();

    if (error) { setMsg(error.message); return; }
    setRow(inserted as CatGameRow);
  }

  async function refreshRow() {
    if (!coupleId) return;
    const { data } = await supabase
      .from("cat_game")
      .select("*")
      .eq("couple_id", coupleId)
      .maybeSingle();
    if (data) setRow(data as CatGameRow);
  }

  // keep feed in a ref so the global pointerup listener always has the latest version
  const feedRef = useRef<(food: "egg" | "fish") => void>(() => {});

  async function feed(food: "egg" | "fish") {
    setMsg(null);
    if (!coupleId || !userId) return;
    const prevNext = row?.next_hungry_at;

    const { data, error } = await supabase.rpc("feed_cat", {
      p_couple_id: coupleId,
      p_food: food,
    });

    if (error) { setMsg(error.message); return; }

    const updated = data as CatGameRow;
    setRow(updated);

    if (prevNext && updated.next_hungry_at !== prevNext && updated.last_fed_by === userId) {
      setMsg("You fed him first! +1");
    } else if (updated.last_fed_by && updated.last_fed_by !== userId && isHungry) {
      setMsg("Too late — i fed him first.");
    } else if (!isHungry) {
      setMsg("Eren is getting fat chill.");
    }
  }

  // update ref on every render so the closure is always fresh
  feedRef.current = feed;

  // init
  useEffect(() => {
    fetchOrCreateRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  // clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // frame cycling — resets to 0 when hunger state changes
  useEffect(() => {
    setFrame(0);
    const t = setInterval(() => setFrame((f) => (f + 1) % 3), 1600);
    return () => clearInterval(t);
  }, [isHungry]);

  // cat hungry sound — alternates between two tracks while hungry
  useEffect(() => {
    if (!isHungry) {
      if (hungerAudioRef.current) {
        hungerAudioRef.current.pause();
        hungerAudioRef.current = null;
      }
      return;
    }

    const sounds = ['/sounds/cat-hungry-1.mp3', '/sounds/cat-hungry-2.mp3'];
    let stopped = false;

    function playNext() {
      if (stopped) return;
      const audio = new Audio(sounds[hungerSoundIndexRef.current % 2]);
      hungerAudioRef.current = audio;
      hungerSoundIndexRef.current += 1;
      audio.play().catch(() => {});
      audio.addEventListener('ended', playNext, { once: true });
    }

    playNext();

    return () => {
      stopped = true;
      if (hungerAudioRef.current) {
        hungerAudioRef.current.pause();
        hungerAudioRef.current = null;
      }
    };
  }, [isHungry]);

  // poll partner updates
  useEffect(() => {
    const t = setInterval(() => refreshRow(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  // update ghost position imperatively — avoids inline style prop
  useEffect(() => {
    const el = ghostRef.current;
    if (!el) return;
    if (!drag) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${drag.x - 28}px`;
    el.style.top = `${drag.y - 28}px`;
  }, [drag]);

  // global pointer listeners — only active while dragging
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;

      const catEl = catRef.current;
      if (catEl) {
        const r = catEl.getBoundingClientRect();
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        if (inside) {
          feedRef.current(currentDrag.food);
        }
      }
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag]);

  const catSrc = isHungry ? ANGRY_FRAMES[frame] : CALM_FRAMES[frame];
  const timeLeftMs = nextHungryAtMs ? nextHungryAtMs - now : null;

  function onFoodPointerDown(food: "egg" | "fish", e: React.PointerEvent) {
    e.preventDefault();
    setDrag({ food, x: e.clientX, y: e.clientY });
  }

  return (
    <section className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Eren snacking</h2>
        <div className="text-xs text-zinc-400 text-right">
          <span className="text-zinc-100 font-semibold">{myName || "You"}</span>{" "}
          <span className="font-bold text-zinc-100">{myScore}</span>
          {" · "}
          <span className="text-zinc-100 font-semibold">{partnerName || "Partner"}</span>{" "}
          <span className="font-bold text-zinc-100">{partnerScore}</span>
        </div>
      </div>

      {/* Cat */}
      <div
        ref={catRef}
        className={`relative mx-auto flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border p-4 transition-colors duration-500 ${
          isHungry
            ? "border-rose-400/40 bg-rose-500/10"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div className="relative h-[220px] w-[220px] select-none">
          <Image
            key={catSrc}
            src={catSrc}
            alt="Cat sticker"
            fill
            className="object-contain transition-opacity duration-300"
            priority
            draggable={false}
          />
        </div>

        <div className="mt-3 text-center">
          {!nextHungryAtMs ? (
            <p className="text-sm text-zinc-400">Loading timer…</p>
          ) : isHungry ? (
            <p className="text-sm font-semibold text-rose-300 animate-pulse">
              EREN is hungry! Feed him!
            </p>
          ) : (
            <p className="text-sm text-zinc-300">
              Eren will be hungry in:{" "}
              <span className="font-semibold text-zinc-50">
                {formatMs(timeLeftMs ?? 0)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="soft-divider" />

      {/* Food */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 text-center">
          Drag or tap to feed him.
        </p>

        <div className="flex items-center justify-center gap-6">
          {/* EGG */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              title="Feed egg"
              className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-[0.92] transition-transform touch-none select-none"
              onClick={() => !drag && feed("egg")}
              onPointerDown={(e) => onFoodPointerDown("egg", e)}
            >
              <div className="relative h-12 w-12">
                <Image
                  src="/cat/egg.png"
                  alt="Egg"
                  fill
                  className="object-contain"
                  draggable={false}
                />
              </div>
            </button>
            <span className="text-xs text-zinc-500">Egg</span>
          </div>

          {/* FISH */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              title="Feed fish"
              className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-[0.92] transition-transform touch-none select-none"
              onClick={() => !drag && feed("fish")}
              onPointerDown={(e) => onFoodPointerDown("fish", e)}
            >
              <div className="relative h-12 w-12">
                <Image
                  src="/cat/fish.png"
                  alt="Fish"
                  fill
                  className="object-contain"
                  draggable={false}
                />
              </div>
            </button>
            <span className="text-xs text-zinc-500">Sardine</span>
          </div>
        </div>

        {msg ? (
          <p
            className={`text-sm text-center ${
              msg.includes("first") && msg.includes("You")
                ? "text-green-400"
                : "text-rose-300"
            }`}
          >
            {msg}
          </p>
        ) : null}
      </div>

      {/* Drag ghost — portal to body so fixed positioning is never broken by parent transforms */}
      {mounted
        ? createPortal(
            <div
              ref={ghostRef}
              className="pointer-events-none fixed z-[9999] h-14 w-14"
            >
              {drag ? (
                <Image
                  src={drag.food === "egg" ? "/cat/egg.png" : "/cat/fish.png"}
                  alt="Dragging food"
                  fill
                  className="object-contain"
                  draggable={false}
                />
              ) : null}
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
