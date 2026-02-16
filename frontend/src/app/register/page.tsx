"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/** Страница регистрации (email + пароль + выбор клуба) */
export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();

  // local‑state формы
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  /** Сабмит формы регистрации */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    // 1) создаём аккаунт Supabase Auth
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/login`,
        data: {
          role: "none",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/board");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-900/80 backdrop-blur rounded-2xl p-8 shadow-xl space-y-6"
      >
        <h1 className="text-center text-2xl font-bold text-teal-400">Регистрация</h1>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-gray-800 text-white placeholder-gray-500 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-gray-800 text-white placeholder-gray-500 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 font-semibold rounded-xl bg-teal-500 hover:bg-teal-600 active:bg-teal-700 transition disabled:opacity-60"
        >
          {loading ? "Регистрируем..." : "Создать аккаунт"}
        </button>
      </form>
    </div>
  );
}
