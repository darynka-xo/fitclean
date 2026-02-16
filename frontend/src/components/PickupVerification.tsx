'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { QrCode, CheckCircle, X, Package, User, Phone, AlertCircle } from 'lucide-react';

interface PickupOrder {
  id: string;
  package_id: string;
  pickup_code: string;
  users: {
    username: string;
    phone: string;
  }[] | { username: string; phone: string; };
}

export default function PickupVerification() {
  const supabase = createClient();
  
  const [pickupCode, setPickupCode] = useState('');
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!pickupCode || pickupCode.length !== 4) {
      setError('Введите 4-значный код');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user's club
      const { data: user } = await supabase.auth.getUser();
      const clubId = user.user?.user_metadata?.club_id;

      if (!clubId) {
        setError('Клуб не определен');
        setLoading(false);
        return;
      }

      // Find order by pickup code
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          package_id,
          pickup_code,
          users!inner(username, phone)
        `)
        .eq('pickup_code', pickupCode)
        .eq('club_id', clubId)
        .eq('status_id', 3) // ready_for_pickup
        .single();

      if (fetchError) {
        setError('Код не найден или заказ не готов к выдаче');
        setLoading(false);
        return;
      }

      setOrder(orderData);
    } catch (err) {
      setError('Ошибка при проверке кода');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!order) return;

    setLoading(true);
    
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status_id: 4 }) // completed
        .eq('id', order.id);

      if (updateError) {
        setError('Ошибка при завершении заказа');
      } else {
        setSuccess(true);
        setOrder(null);
        setPickupCode('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError('Ошибка при завершении заказа');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOrder(null);
    setPickupCode('');
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="card p-6 h-full">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-400" size={32} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Заказ успешно выдан!
          </h2>
          <p className="text-gray-400 text-sm">
            Клиент может оценить качество обслуживания в боте
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4 h-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <QrCode className="text-blue-400" size={20} />
        </div>
        <h2 className="text-lg font-semibold text-white">
          Выдача заказа
        </h2>
      </div>

      {!order ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Код получения (4 цифры)
            </label>
            <input
              type="text"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[0.5em]
                         outline-none placeholder-gray-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/15 text-red-400 text-sm border border-red-500/30">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pickupCode.length !== 4}
            className="btn btn-primary w-full py-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Проверяем...
              </span>
            ) : (
              'Проверить код'
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Код получения</span>
              <span className="font-mono text-xl font-bold text-teal-400">{order.pickup_code}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-gray-500" />
              <span className="text-gray-400">Пакет:</span>
              <span className="text-white">{order.package_id}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-gray-500" />
              <span className="text-gray-400">Клиент:</span>
              <span className="text-white">{order.users.username}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-gray-500" />
              <span className="text-gray-400">Телефон:</span>
              <span className="text-white">{order.users.phone}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="btn btn-secondary flex-1"
            >
              <X size={16} />
              Отмена
            </button>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="flex-1 btn bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Выдаем...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  Выдать заказ
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
