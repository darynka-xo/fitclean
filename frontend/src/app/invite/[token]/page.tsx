import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ClientRegisterForm from "@/components/ClientRegisterForm";

interface InviteRow {
  id: string;
  club_id: number;
  role: string;
  expires_at: string;
  used_at: string | null;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Проверяем токен приглашения (RLS допускает публичное чтение valid‑инвайта)
  const { data: invite, error } = await supabase
    .from("invite_links")
    .select(
      "id, club_id, role, expires_at, used_at"
    )
    .eq("id", token)
    .single<InviteRow>();

  // 1.1 Нет токена или запрос упал
  if (error || !invite) notFound();

  const isExpired = new Date(invite.expires_at) < new Date();
  if (invite.used_at || isExpired) notFound();

  // 2. Если пользователь уже авторизован, отправляем его в рабочую зону
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/board");

  // 3. Рендерим форму регистрации, клуб / роль фиксированы
  return (
    <ClientRegisterForm
      token={invite.id}
      club={invite.club_id}
      role={invite.role}
    />
  );
}
