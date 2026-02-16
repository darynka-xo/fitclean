'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) { setError(error.message); return; }

    router.push('/board');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-main px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-teal-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
            <Sparkles size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FitClean</h1>
          <p className="text-gray-400 mt-2">Система управления прачечной</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          autoComplete="on"
          className="card p-8 space-y-6 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">Добро пожаловать</h2>
            <p className="text-gray-400 text-sm mt-1">Войдите в свой аккаунт</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="email"
                name='email'
                placeholder="Email"
                autoComplete='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input pl-12"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="password"
                name='password'
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input pl-12"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Входим...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Войти
                <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Современная система управления прачечной для фитнес-клубов
        </p>
      </div>
    </main>
  );
}
