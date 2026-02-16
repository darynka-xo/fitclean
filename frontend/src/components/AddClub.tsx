'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Building2, Plus, CheckCircle, AlertCircle } from 'lucide-react';

export default function AddClubForm() {
  const supabase = createClient();
  const router   = useRouter();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg,  setMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase
      .from('clubs')
      .insert({ code: code.trim(), name: name.trim() });

    setLoading(false);

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Клуб успешно добавлен' });
      setCode('');
      setName('');
      router.refresh();
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-6 space-y-4 h-full"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
          <Building2 className="text-teal-400" size={20} />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Добавить клуб
        </h2>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Код (latin, 4-6 симв.)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          required
          className="input"
        />

        <input
          type="text"
          placeholder="Название клуба"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input"
        />
      </div>

      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          msg.type === 'success' 
            ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
            : 'bg-red-500/15 text-red-400 border border-red-500/30'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Сохраняем...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Plus size={18} />
            Добавить
          </span>
        )}
      </button>
    </form>
  );
}
