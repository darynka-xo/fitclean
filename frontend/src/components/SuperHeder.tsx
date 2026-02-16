// components/GlobalSuperHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import NotificationCenter from './NotificationCenter';

const link =
  'px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition';

export default function GlobalSuperHeader() {
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);

  /* один запрос на клиенте — какая роль у пользователя */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setRole(user?.app_metadata.role ?? null);
    });
  }, [supabase]);

  /* если не супер — вообще не рендерим */
  if (role !== 'super') return null;

  /* меню видно на любой странице */
  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between bg-gray-900/90 backdrop-blur px-6 py-3 shadow">
      <div className="flex gap-2">
        <Link href="/board" className={link}>Заказы</Link>
        <Link href="/admin" className={link}>Управление</Link>
        <Link href="/admin/analytics" className={link}>Аналитика</Link>
        <Link href="/bot-test" className={link}>🤖&nbsp;Бот</Link>
        <Link href="/admin/users" className={link}>Админы&nbsp;клубов</Link>
      </div>
      <NotificationCenter />
    </nav>
  );
}
