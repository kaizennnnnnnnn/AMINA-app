'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace('/app');
      }
    };
    check();
  }, [router]);

  async function handleSubmit() {
    try {
      setLoading(true);
      setMsg('');

      if (!email || !password) {
        setMsg('Unesi email i password.');
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Za lakše testiranje: u Supabase Auth ugasi email confirmation.
        // Onda odmah pokušaj login.
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          setMsg('Nalog je kreiran. Ako si uključio email potvrdu, prvo potvrdi email.');
          return;
        }

        router.replace('/app');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace('/app');
      }
    } catch (error: any) {
      setMsg(error.message || 'Greška.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <p className="text-sm text-zinc-400">Private couple app</p>
          <h1 className="text-3xl font-bold">Us</h1>
        </div>

        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-dark'}`}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
            <button
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-dark'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
          </div>

          <input
            className="input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-pink w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sačekaj...' : mode === 'signup' ? 'Create account' : 'Login'}
          </button>

          {msg ? <p className="text-sm text-pink-400">{msg}</p> : null}
        </div>
      </div>
    </main>
  );
}