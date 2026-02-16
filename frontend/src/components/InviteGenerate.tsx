"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Copy, Check, Link2, UserPlus } from "lucide-react";

interface Club {
  id: number;
  name: string;
}

const ROLES = [
  { value: "reception", label: "Ресепшен" },
  { value: "washer", label: "Исполнитель" },
];

export default function InviteGeneratorPage() {
  const supabase = createClient();

  // state
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<number>();
  const [role, setRole] = useState<string>();
  const [link, setLink] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // fetch clubs once
  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name")
        .order("name");
      if (error) {
        console.error(error);
        return;
      }
      setClubs(data as Club[]);
    };

    fetchClubs();
  }, [supabase]);

  // create invite
  const handleCreate = async () => {
    if (!clubId) return;
    setLoading(true);
    setLink(undefined);
    setCopied(false);

    const { data, error } = await supabase
      .from("invite_links")
      .insert({ club_id: clubId, role })
      .select("id")
      .single<{ id: string }>();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setLink(`${location.origin}/invite/${data.id}`);
  };

  // copy helper
  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-6 space-y-4 h-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <UserPlus className="text-purple-400" size={20} />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Пригласительная ссылка
        </h2>
      </div>

      <div className="space-y-3">
        {/* club select */}
        <select
          value={clubId ?? ""}
          onChange={(e) => setClubId(Number(e.target.value))}
          className="input cursor-pointer"
        >
          <option value="" disabled>
            Выбери клуб
          </option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id} className="bg-gray-900">
              {c.name}
            </option>
          ))}
        </select>

        {/* role select */}
        <select
          value={role ?? ''}
          onChange={(e) => setRole(e.target.value)}
          className="input cursor-pointer"
        >
          <option value="" disabled>
            Выбери роль
          </option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} className="bg-gray-900">
              {r.label}
            </option>
          ))}
        </select>

        <button
          disabled={loading || !clubId}
          onClick={handleCreate}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Генерируем...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Link2 size={18} />
              Сгенерировать ссылку
            </span>
          )}
        </button>
      </div>

      {link && (
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <span className="break-all text-teal-400 text-sm flex-1 font-mono">{link}</span>
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all ${
              copied 
                ? 'bg-green-500/20 text-green-400' 
                : 'hover:bg-gray-700 text-gray-400 hover:text-white'
            }`}
            title="Скопировать"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}
