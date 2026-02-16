"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Props {
  token: string;
  club: number;
  role: string;
}

/**
 * Клиентская форма регистрации под приглашением.
 * club и role зашиты через пропсы, юзер их не меняет.
 */
export default function ClientRegisterForm({ token, club, role }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    // 1. Создаём аккаунт
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/login`,
        data: {
          club_id: club,
          role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Отмечаем инвайт как использованный
    await supabase
      .from("invite_links")
      .update({ used_at: new Date() })
      .eq("id", token);

    // 3. К доске
    router.push("/board");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-900/80 backdrop-blur rounded-2xl p-8 shadow-xl space-y-6"
      >
        <h1 className="text-2xl font-bold text-center text-teal-400">
          Создание аккаунта
        </h1>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-gray-800 text-white placeholder-gray-500 px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-gray-800 text-white placeholder-gray-500 px-4 py-3 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 active:bg-teal-700 transition disabled:opacity-60"
        >
          {loading ? "Создание…" : "Создать аккаунт"}
        </button>
      </form>
    </main>
  );
}
