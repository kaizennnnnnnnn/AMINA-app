'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type JarItem = { id: string; url: string; label: string | null };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function cookiePath(r: number): string {
  const N = 14;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const jr = r * (0.88 + Math.random() * 0.22);
    pts.push([Math.cos(angle) * jr, Math.sin(angle) * jr]);
  }
  const segs: string[] = [`M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i + N - 1) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const t = 0.38;
    segs.push(`C ${(p1[0]+t*(p2[0]-p0[0])/3).toFixed(1)},${(p1[1]+t*(p2[1]-p0[1])/3).toFixed(1)} ${(p2[0]-t*(p3[0]-p1[0])/3).toFixed(1)},${(p2[1]-t*(p3[1]-p1[1])/3).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return segs.join(' ') + ' Z';
}

export default function CookieJarTab({
  coupleId, userId, myName, partnerName,
}: {
  coupleId: string | null;
  userId: string | null;
  myName: string;
  partnerName: string;
}) {
  const cookieLayerRef = useRef<SVGGElement>(null);
  const jarGroupRef    = useRef<SVGGElement>(null);
  const lidGroupRef    = useRef<SVGGElement>(null);
  const lidInnerRef    = useRef<SVGGElement>(null);
  const flyLayerRef    = useRef<SVGGElement>(null);
  const mountedRef     = useRef(true);

  const [view, setView]             = useState<'jar' | 'songs'>('jar');
  const [phase, setPhase]           = useState<'intro' | 'ready'>('intro');
  const [items, setItems]           = useState<JarItem[]>([]);
  const [myCnt, setMyCnt]           = useState(0);
  const [partnerCnt, setPartnerCnt] = useState(0);
  const [revealed, setRevealed]     = useState<JarItem | null>(null);
  const [newUrl, setNewUrl]         = useState('');
  const [newLabel, setNewLabel]     = useState('');
  const [saving, setSaving]         = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // ── load ──────────────────────────────────────────────────────
  async function loadData() {
    if (!coupleId) return;
    const [{ data: itms }, { data: pulls }] = await Promise.all([
      supabase.from('cookie_jar_items').select('id,url,label').eq('couple_id', coupleId).order('created_at'),
      supabase.from('cookie_pulls').select('user_id').eq('couple_id', coupleId),
    ]);
    setItems(itms ?? []);
    setMyCnt((pulls ?? []).filter((p: any) => p.user_id === userId).length);
    setPartnerCnt((pulls ?? []).filter((p: any) => p.user_id !== userId).length);
  }
  useEffect(() => { loadData(); }, [coupleId, userId]);

  // ── cookie jar physics animation ──────────────────────────────
  useEffect(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const cookieLayer = cookieLayerRef.current;
    const jarGroup    = jarGroupRef.current;
    const lidGroupEl  = lidGroupRef.current;
    const lidInner    = lidInnerRef.current;
    if (!cookieLayer || !jarGroup || !lidGroupEl || !lidInner) return;

    const C = {
      gravity: 1450, air: 0.0014, floorY: 533,
      cx: 400, openY: 129, neckY: 168, bHW: 97, nHW: 84,
      maxC: 15, spawnInt: 0.22, shakeDamp: 0.74, shakeK: 0.09,
    };
    type Cookie = { x:number;y:number;vx:number;vy:number;r:number;rot:number;vr:number;g:Element;settleScore:number;sleeping:boolean };

    let cookies: Cookie[] = [];
    let lastTs = 0, spawnT = 0, elapsed = 0, st = 'fill', stT = 0;
    let topClosed = false, shakeX = 0, shakeV = 0, spawned = 0, animId = 0;
    const lid = { x:940, y:24, rot:-16, tx:409, ty:114, ay:92 };

    const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v));
    const eio = (t:number) => t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    const innerHW = (y:number) => y<=C.neckY ? C.nHW+(C.bHW-C.nHW)*clamp((y-C.openY)/(C.neckY-C.openY),0,1) : C.bHW;

    function makeCookie(): Cookie {
      const r = rand(28, 38);
      const g = document.createElementNS(NS,'g');

      const body = document.createElementNS(NS,'path');
      body.setAttribute('d', cookiePath(r));
      body.setAttribute('fill','url(#cjCookieBase)');

      const edge = document.createElementNS(NS,'path');
      edge.setAttribute('d', cookiePath(r*0.94));
      edge.setAttribute('fill','none');
      edge.setAttribute('stroke','rgba(110,50,10,0.55)');
      edge.setAttribute('stroke-width', String(Math.max(1.6,r*0.09)));

      const hl = document.createElementNS(NS,'ellipse');
      hl.setAttribute('cx',(-r*0.22).toFixed(1)); hl.setAttribute('cy',(-r*0.26).toFixed(1));
      hl.setAttribute('rx',(r*0.38).toFixed(1)); hl.setAttribute('ry',(r*0.20).toFixed(1));
      hl.setAttribute('fill','rgba(255,225,150,0.28)');
      hl.setAttribute('transform',`rotate(-30,${-r*0.22},${-r*0.26})`);

      const numCracks = Math.floor(rand(1,3));
      for (let k=0;k<numCracks;k++) {
        const crack = document.createElementNS(NS,'path');
        const sx=rand(-r*.35,r*.35),sy=rand(-r*.35,r*.35),len=rand(r*.22,r*.48),ang=rand(0,Math.PI);
        const ex=sx+Math.cos(ang)*len,ey=sy+Math.sin(ang)*len;
        crack.setAttribute('d',`M ${sx.toFixed(1)},${sy.toFixed(1)} Q ${((sx+ex)/2+rand(-r*.07,r*.07)).toFixed(1)},${((sy+ey)/2+rand(-r*.07,r*.07)).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
        crack.setAttribute('fill','none'); crack.setAttribute('stroke','rgba(95,42,8,0.32)');
        crack.setAttribute('stroke-width',(0.7+Math.random()*0.5).toFixed(1)); crack.setAttribute('stroke-linecap','round');
        g.appendChild(crack);
      }

      const chipPts: {x:number;y:number;r:number}[] = [];
      for (let i=0;i<6;i++) {
        for (let a=0;a<22;a++) {
          const ang2=rand(0,Math.PI*2),dist=rand(r*.10,r*.50);
          const cx2=Math.cos(ang2)*dist,cy2=Math.sin(ang2)*dist,cr=rand(r*.08,r*.14);
          if (!chipPts.some(c=>(cx2-c.x)**2+(cy2-c.y)**2<(cr+c.r+r*.1)**2)) { chipPts.push({x:cx2,y:cy2,r:cr}); break; }
        }
      }

      for (let s=0;s<4;s++) {
        const sp=document.createElementNS(NS,'circle');
        const ang=rand(0,Math.PI*2),dist=rand(r*.1,r*.6);
        sp.setAttribute('cx',(Math.cos(ang)*dist).toFixed(1)); sp.setAttribute('cy',(Math.sin(ang)*dist).toFixed(1));
        sp.setAttribute('r',rand(0.6,1.4).toFixed(1)); sp.setAttribute('fill','rgba(255,240,200,0.55)');
        g.appendChild(sp);
      }

      g.appendChild(body); g.appendChild(edge); g.appendChild(hl);
      for (const ch of chipPts) {
        const c=document.createElementNS(NS,'ellipse');
        c.setAttribute('cx',ch.x.toFixed(1)); c.setAttribute('cy',ch.y.toFixed(1));
        c.setAttribute('rx',ch.r.toFixed(2)); c.setAttribute('ry',(ch.r*rand(.55,.85)).toFixed(2));
        c.setAttribute('fill',Math.random()>.5?'#3a1a08':'#201008');
        c.setAttribute('opacity',rand(.82,.97).toFixed(2));
        c.setAttribute('transform',`rotate(${rand(0,180).toFixed(0)},${ch.x.toFixed(1)},${ch.y.toFixed(1)})`);
        g.appendChild(c);
      }

      cookieLayer!.appendChild(g);
      return { x:C.cx+rand(-54,54), y:rand(-165,-80), vx:rand(-24,24), vy:rand(32,78), r, rot:rand(0,360), vr:rand(-10,10), g, settleScore:0, sleeping:false };
    }

    function jarCollide(c:Cookie) {
      const hw=innerHW(c.y);
      if (c.x<C.cx-hw+c.r){c.x=C.cx-hw+c.r;if(c.vx<0)c.vx*=-0.34;}
      else if(c.x>C.cx+hw-c.r){c.x=C.cx+hw-c.r;if(c.vx>0)c.vx*=-0.34;}
      if(c.y>C.floorY-c.r){c.y=C.floorY-c.r;if(c.vy>0){shakeV+=Math.min(c.vy*.0012,.18);c.vy*=-0.12;c.vx*=.94;}}
      if(topClosed&&c.y<C.openY+9+c.r){c.y=C.openY+9+c.r;if(c.vy<0)c.vy*=-0.12;}
    }

    function physics(dt:number) {
      for(const c of cookies){c.vy+=C.gravity*dt;c.vx*=1-C.air;c.vy*=1-C.air*.45;if(c.y<=C.openY+c.r){c.vr*=.94;c.rot+=c.vr*dt;}else c.vr=0;c.x+=c.vx*dt;c.y+=c.vy*dt;jarCollide(c);}
      for(let p=0;p<4;p++){
        for(let i=0;i<cookies.length;i++)for(let j=i+1;j<cookies.length;j++){
          const a=cookies[i],b=cookies[j],dx=b.x-a.x,dy=b.y-a.y,md=a.r+b.r,sq=dx*dx+dy*dy;
          if(sq<md*md&&sq>0){const d=Math.sqrt(sq),ov=(md-d)*.5,nx=dx/d,ny=dy/d;a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const imp=-1.14*rv*.5;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny;}}
        }
        for(const c of cookies){jarCollide(c);c.x=clamp(c.x,C.cx-innerHW(c.y)+c.r,C.cx+innerHW(c.y)-c.r);c.y=Math.min(c.y,C.floorY-c.r);}
      }
      for(const c of cookies){const spd=Math.hypot(c.vx,c.vy);c.settleScore=spd<18&&c.y>220?Math.min(c.settleScore+dt*2.2,1):Math.max(c.settleScore-dt*1.3,0);c.sleeping=c.settleScore>.95;}
    }

    function tick(ts:number) {
      if(!lastTs)lastTs=ts;
      const dt=Math.min((ts-lastTs)/1000,.022);lastTs=ts;
      if(st==='fill'){spawnT+=dt;elapsed+=dt;if(spawned<C.maxC&&spawnT>=C.spawnInt){spawnT=0;cookies.push(makeCookie());spawned++;}const settled=cookies.filter(c=>c.sleeping).length;if((spawned>=C.maxC&&cookies.every(c=>c.y>115)&&settled>C.maxC*.5&&elapsed>3.8)||(elapsed>7.4&&spawned>=C.maxC)){st='closing';stT=0;}}
      if(st==='closing'){stT+=dt;const e=eio(clamp(stT/.48,0,1));lid.x=940+(lid.tx-940)*e;lid.y=24+(lid.ay-24)*e;lid.rot=-16+20*e;if(stT>=.48){st='twist';stT=0;}}
      if(st==='twist'){stT+=dt;const t=clamp(stT/.82,0,1),e=eio(t);lid.x=lid.tx;lid.y=lid.ay+(lid.ty-lid.ay)*e+Math.sin(t*Math.PI*5)*(1-t)*1.2;lid.rot=4.8*(1-e)+Math.sin(t*Math.PI*3)*(1-t)*2.4;if(t>=1){topClosed=true;lid.y=lid.ty;lid.rot=0;st='sealed';setPhase('ready');}}
      if(st==='sealed'){lid.x=lid.tx;lid.y=lid.ty;lid.rot=0;}
      shakeV+=(-shakeX)*C.shakeK;shakeV*=C.shakeDamp;shakeX+=shakeV;
      jarGroup.setAttribute('transform',`translate(${shakeX.toFixed(2)} 0)`);
      lidGroupEl.setAttribute('transform',`translate(${(lid.x-400).toFixed(2)} ${(lid.y-114).toFixed(2)}) rotate(${lid.rot.toFixed(2)} 400 114)`);
      physics(dt);
      for(const c of cookies)c.g.setAttribute('transform',`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.rot.toFixed(1)})`);
      animId=requestAnimationFrame(tick);
    }

    animId=requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); while(cookieLayer.firstChild)cookieLayer.removeChild(cookieLayer.firstChild); };
  }, []);

  // ── cookie fly-out animation ───────────────────────────────────
  function spawnFlyingCookie(item: JarItem) {
    const NS = 'http://www.w3.org/2000/svg';
    const flyLayer = flyLayerRef.current;
    if (!flyLayer) return;

    const r = 32;
    const g = document.createElementNS(NS, 'g');

    const body = document.createElementNS(NS, 'path');
    body.setAttribute('d', cookiePath(r));
    body.setAttribute('fill', 'url(#cjCookieBase)');

    const edge = document.createElementNS(NS, 'path');
    edge.setAttribute('d', cookiePath(r * 0.93));
    edge.setAttribute('fill', 'none');
    edge.setAttribute('stroke', 'rgba(110,50,10,0.5)');
    edge.setAttribute('stroke-width', '2.5');

    const hl = document.createElementNS(NS, 'ellipse');
    hl.setAttribute('cx', (-r * 0.22).toFixed(1)); hl.setAttribute('cy', (-r * 0.26).toFixed(1));
    hl.setAttribute('rx', (r * 0.38).toFixed(1)); hl.setAttribute('ry', (r * 0.20).toFixed(1));
    hl.setAttribute('fill', 'rgba(255,225,150,0.32)');

    g.appendChild(body); g.appendChild(edge); g.appendChild(hl);

    for (let i = 0; i < 5; i++) {
      const chip = document.createElementNS(NS, 'ellipse');
      const ang = rand(0, Math.PI * 2), dist = rand(r * 0.1, r * 0.45);
      const cx = Math.cos(ang) * dist, cy = Math.sin(ang) * dist, cr = rand(r * 0.09, r * 0.14);
      chip.setAttribute('cx', cx.toFixed(1)); chip.setAttribute('cy', cy.toFixed(1));
      chip.setAttribute('rx', cr.toFixed(2)); chip.setAttribute('ry', (cr * rand(.55, .8)).toFixed(2));
      chip.setAttribute('fill', '#2a1008');
      chip.setAttribute('transform', `rotate(${rand(0, 180).toFixed(0)},${cx.toFixed(1)},${cy.toFixed(1)})`);
      g.appendChild(chip);
    }

    flyLayer.appendChild(g);

    const dir = Math.random() > 0.5 ? 1 : -1;
    const startX = 400, startY = 110;
    const endX = startX + dir * 220, endY = -30;
    const duration = 0.72;
    let elapsed = 0, lastTs = 0;

    const fly = (ts: number) => {
      if (!mountedRef.current) { try { flyLayer.removeChild(g); } catch {} return; }
      if (!lastTs) lastTs = ts;
      elapsed += (ts - lastTs) / 1000; lastTs = ts;
      const t = Math.min(elapsed / duration, 1);
      const et = 1 - (1 - t) * (1 - t);
      const x = startX + (endX - startX) * et;
      const y = startY + (endY - startY) * et - Math.sin(t * Math.PI) * 80;
      const scale = t < 0.12 ? 1 + t * 5 : 1.6 - (t - 0.12) * 0.7;
      const rot = et * 210 * dir;
      const opacity = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${Math.max(scale, 0.1).toFixed(2)})`);
      g.setAttribute('opacity', Math.max(0, opacity).toFixed(2));
      if (t < 1) { requestAnimationFrame(fly); }
      else { try { flyLayer.removeChild(g); } catch {} setRevealed(item); }
    };
    requestAnimationFrame(fly);
  }

  // ── pull ──────────────────────────────────────────────────────
  function pull() {
    if (phaseRef.current !== 'ready') return;
    const list = itemsRef.current;
    if (!list.length || !coupleId || !userId) return;
    const item = list[Math.floor(Math.random() * list.length)];
    setRevealed(null);
    setMyCnt(n => n + 1);
    spawnFlyingCookie(item);
    // fallback: show link after animation duration even if animation fails
    setTimeout(() => { if (mountedRef.current) setRevealed(item); }, 820);
    supabase.from('cookie_pulls').insert({ couple_id: coupleId, user_id: userId, item_id: item.id });
  }

  // ── add / delete song ─────────────────────────────────────────
  async function addSong() {
    if (!newUrl.trim() || !coupleId) return;
    setSaving(true);
    const { data } = await supabase
      .from('cookie_jar_items')
      .insert({ couple_id: coupleId, url: newUrl.trim(), label: newLabel.trim() || null })
      .select('id,url,label')
      .single();
    if (data) setItems(prev => [...prev, data as JarItem]);
    setNewUrl(''); setNewLabel('');
    setSaving(false);
  }

  async function deleteSong(id: string) {
    await supabase.from('cookie_jar_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <>
      {/* counters */}
      <section className="card">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-0.5">{myName}</p>
            <p className="text-2xl font-bold leading-none">{myCnt} 🍪</p>
          </div>
          <p className="text-sm font-semibold text-zinc-400">Cookie Jar</p>
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-0.5">{partnerName}</p>
            <p className="text-2xl font-bold leading-none">{partnerCnt} 🍪</p>
          </div>
        </div>
      </section>

      {/* jar + songs */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{view === 'jar' ? 'Pull a cookie' : 'Songs in jar'}</h2>
          <button
            type="button"
            className={`btn text-xs px-3 py-1.5 ${view === 'songs' ? 'btn-primary' : 'btn-dark'}`}
            onClick={() => setView(v => v === 'jar' ? 'songs' : 'jar')}
          >
            {view === 'songs' ? '← Back' : '🎵 Manage songs'}
          </button>
        </div>

        {/* ── JAR ──────────────────────────────────────────────── */}
        <div className={view === 'jar' ? '' : 'hidden'}>
          <div
            className={`select-none transition-transform ${phase === 'ready' && items.length > 0 ? 'cursor-pointer active:scale-[0.985]' : ''}`}
            onClick={pull}
          >
            <svg viewBox="0 0 800 700" className="w-full" overflow="visible" aria-label="Cookie jar">
              <defs>
                <linearGradient id="cjTable" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#654126" /><stop offset="100%" stopColor="#2f1b10" />
                </linearGradient>
                <linearGradient id="cjGlass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                  <stop offset="30%" stopColor="rgba(220,240,255,0.12)" />
                  <stop offset="100%" stopColor="rgba(180,210,255,0.08)" />
                </linearGradient>
                <linearGradient id="cjHL" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.40)" />
                  <stop offset="20%" stopColor="rgba(255,255,255,0.15)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="cjLid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eef3f8" /><stop offset="55%" stopColor="#b9c3d1" /><stop offset="100%" stopColor="#8994a6" />
                </linearGradient>
                <radialGradient id="cjCookieBase" cx="38%" cy="32%" r="72%">
                  <stop offset="0%"   stopColor="#ebc878" />
                  <stop offset="40%"  stopColor="#d09038" />
                  <stop offset="80%"  stopColor="#a86020" />
                  <stop offset="100%" stopColor="#8a4510" />
                </radialGradient>
                <filter id="cjJarShadow" x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(0,0,0,0.22)" />
                </filter>
                <filter id="cjLidShadow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(0,0,0,0.35)" />
                </filter>
              </defs>

              <rect width="800" height="700" fill="transparent" />
              <ellipse cx="400" cy="595" rx="220" ry="28" fill="rgba(0,0,0,0.18)" />
              <rect x="0" y="600" width="800" height="100" fill="url(#cjTable)" />
              <rect x="0" y="598" width="800" height="3" fill="rgba(255,255,255,0.06)" />

              <g ref={jarGroupRef} filter="url(#cjJarShadow)">
                <path d="M286 138 C286 121 297 109 314 106 L486 106 C503 109 514 121 514 138 L514 515 C514 539 498 556 474 556 L326 556 C302 556 286 539 286 515 Z" fill="rgba(214,234,255,0.09)" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
                <ellipse cx="400" cy="129" rx="101" ry="22" fill="rgba(26,33,55,0.62)" />
                <ellipse cx="400" cy="129" rx="101" ry="22" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="5" />
                <ellipse cx="400" cy="131" rx="88" ry="13" fill="rgba(255,255,255,0.06)" />
                <g ref={cookieLayerRef} />
                <path d="M286 138 C286 121 297 109 314 106 L486 106 C503 109 514 121 514 138 L514 515 C514 539 498 556 474 556 L326 556 C302 556 286 539 286 515 Z" fill="url(#cjGlass)" stroke="rgba(255,255,255,0.52)" strokeWidth="4"/>
                <path d="M318 118 C309 124 304 132 304 144 L304 514 C304 529 313 541 326 546" fill="none" stroke="url(#cjHL)" strokeWidth="12" strokeLinecap="round" opacity="0.72"/>
                <path d="M480 116 C491 123 496 132 496 144 L496 514 C496 530 488 541 474 547" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="7" strokeLinecap="round" opacity="0.8"/>
                <ellipse cx="400" cy="129" rx="101" ry="22" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="4" />
                <ellipse cx="400" cy="129" rx="90" ry="14" fill="rgba(10,15,30,0.08)" />
                <ellipse cx="400" cy="548" rx="78" ry="11" fill="rgba(255,255,255,0.10)" />
              </g>

              <g ref={lidGroupRef} filter="url(#cjLidShadow)">
                <g ref={lidInnerRef}>
                  <ellipse cx="400" cy="140" rx="108" ry="14" fill="rgba(0,0,0,0.14)" opacity="0.26"/>
                  <ellipse cx="400" cy="112" rx="112" ry="22" fill="rgba(255,255,255,0.10)" opacity="0.18"/>
                  <path d="M296 110 C296 99 309 90 326 88 L474 88 C491 90 504 99 504 110 L504 126 C504 137 491 145 474 147 L326 147 C309 145 296 137 296 126 Z" fill="url(#cjLid)" stroke="rgba(255,255,255,0.52)" strokeWidth="2.2"/>
                  <ellipse cx="400" cy="109" rx="112" ry="22" fill="url(#cjLid)" stroke="rgba(255,255,255,0.72)" strokeWidth="2.2"/>
                  <ellipse cx="400" cy="105" rx="84" ry="13" fill="rgba(255,255,255,0.28)" opacity="0.9"/>
                  <ellipse cx="400" cy="113" rx="99" ry="17" fill="none" stroke="rgba(130,145,165,0.42)" strokeWidth="2.4"/>
                  <ellipse cx="400" cy="127" rx="101" ry="14" fill="#566170" opacity="0.92"/>
                  <ellipse cx="400" cy="125" rx="93" ry="10" fill="rgba(30,38,52,0.30)" opacity="0.74"/>
                  <ellipse cx="400" cy="127" rx="101" ry="14" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="1.4"/>
                  <path d="M320 95 C336 91 357 88 400 88 C443 88 464 91 480 96" fill="none" stroke="rgba(255,255,255,0.40)" strokeWidth="5" strokeLinecap="round" opacity="0.68"/>
                  <g opacity="0.34">
                    {([
                      [326,93,42],[348,91,45],[370,90,46],
                      [392,89,47],[414,90,46],[436,91,45],[458,93,42],
                    ] as [number,number,number][]).map(([x,y,h],i)=>(
                      <rect key={i} x={x} y={y} width="6" height={h} rx="3" fill="rgba(87,97,112,0.50)" />
                    ))}
                  </g>
                  <ellipse cx="400" cy="95" rx="20" ry="7" fill="rgba(255,255,255,0.15)" opacity="0.5"/>
                </g>
              </g>

              {/* flying cookie layer — rendered above everything */}
              <g ref={flyLayerRef} />
            </svg>
          </div>

          {phase === 'intro' ? (
            <p className="text-center text-xs text-zinc-500 animate-pulse">Filling the jar…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">No songs yet — tap <strong>🎵 Manage songs</strong> to add some.</p>
          ) : revealed ? (
            <div className="space-y-2 pt-1">
              <a
                href={revealed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full text-center block"
              >
                🎵 {revealed.label ?? 'Listen now'}
              </a>
              <button type="button" className="btn btn-dark w-full text-xs" onClick={() => setRevealed(null)}>
                Pull another cookie
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-zinc-400 pt-1">
              {phase === 'ready' ? '🍪 Tap the jar to pull a cookie!' : ''}
            </p>
          )}
        </div>

        {/* ── SONGS ────────────────────────────────────────────── */}
        {view === 'songs' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <input
                className="input text-sm"
                placeholder="Song name (optional)"
                value={newLabel}
                onChange={e => setNewLabel(e.currentTarget.value)}
              />
              <input
                className="input text-sm"
                placeholder="URL (YouTube, Spotify…)"
                value={newUrl}
                onChange={e => setNewUrl(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && addSong()}
              />
              <button
                type="button"
                className="btn btn-primary w-full text-sm"
                onClick={addSong}
                disabled={saving || !newUrl.trim()}
              >
                {saving ? 'Adding…' : '+ Add to jar'}
              </button>
            </div>

            {items.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">{items.length} song{items.length !== 1 ? 's' : ''} in jar</p>
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <span className="text-base flex-shrink-0">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{item.label || 'Untitled'}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.url}</p>
                    </div>
                    <button
                      type="button"
                      className="text-zinc-600 hover:text-rose-400 text-xl leading-none flex-shrink-0"
                      onClick={() => deleteSong(item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500 py-2">No songs yet. Add the first one!</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
