'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Truck, 
  Package, 
  CheckCircle, 
  MapPin, 
  RefreshCw,
  ArrowRight,
  Clock,
  Building2,
  AlertCircle
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  package_id: string;
  status_id: number;
  club_id: number;
  club_name?: string;
  user_phone?: string;
  created_at: string;
  locker_cell_number?: string;
}

interface Club {
  id: number;
  name: string;
  code: string;
}

type CourierMode = 'idle' | 'pickup' | 'delivery';

export default function CourierPage() {
  const [mode, setMode] = useState<CourierMode>('idle');
  const [dirtyItems, setDirtyItems] = useState<Order[]>([]);
  const [cleanItems, setCleanItems] = useState<Order[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visitStarted, setVisitStarted] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const response = await fetch(`${apiUrl}/clubs/`);
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
      }
    } catch (err) {
      console.error('Error fetching clubs:', err);
    }
  };

  const fetchDirtyItems = useCallback(async (clubId?: number) => {
    setLoading(true);
    try {
      const url = clubId 
        ? `${apiUrl}/courier/dirty-items?club_id=${clubId}`
        : `${apiUrl}/courier/dirty-items`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDirtyItems(data);
      }
    } catch (err) {
      console.error('Error fetching dirty items:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchCleanItems = useCallback(async (clubId?: number) => {
    setLoading(true);
    try {
      const url = clubId 
        ? `${apiUrl}/courier/clean-items?club_id=${clubId}`
        : `${apiUrl}/courier/clean-items`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCleanItems(data);
      }
    } catch (err) {
      console.error('Error fetching clean items:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const startVisit = async (clubId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/courier/start-visit/${clubId}`, {
        method: 'POST',
      });
      if (response.ok) {
        setVisitStarted(true);
        setSelectedClub(clubId);
        setMessage({ type: 'success', text: 'Визит начат' });
        // Fetch items for this club
        await fetchDirtyItems(clubId);
        await fetchCleanItems(clubId);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при начале визита' });
    } finally {
      setLoading(false);
    }
  };

  const pickupDirty = async (orderId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/courier/pickup-dirty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Заказ забран' });
        if (selectedClub) await fetchDirtyItems(selectedClub);
      } else {
        setMessage({ type: 'error', text: 'Ошибка при заборе заказа' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка соединения' });
    } finally {
      setLoading(false);
    }
  };

  const deliverClean = async (orderId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/courier/deliver-clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Заказ доставлен' });
        if (selectedClub) await fetchCleanItems(selectedClub);
      } else {
        setMessage({ type: 'error', text: 'Ошибка при доставке' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка соединения' });
    } finally {
      setLoading(false);
    }
  };

  const endVisit = async () => {
    if (selectedClub) {
      try {
        await fetch(`${apiUrl}/courier/end-visit/${selectedClub}`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Error ending visit:', err);
      }
    }
    setVisitStarted(false);
    setSelectedClub(null);
    setMode('idle');
    setDirtyItems([]);
    setCleanItems([]);
  };

  // Main menu
  if (mode === 'idle' && !visitStarted) {
    return (
      <main className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="glass border-b border-gray-800/50">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="animate-fade-in">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Курьер
              </h1>
              <p className="text-gray-400 mt-1">
                Выберите режим работы
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {message && (
            <div className={`mb-6 flex items-center gap-2 p-4 rounded-xl animate-fade-in ${
              message.type === 'success' 
                ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          {/* Club Selection */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="text-teal-400" size={20} />
              Выберите клуб для визита
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => startVisit(club.id)}
                  disabled={loading}
                  className="card card-hover p-4 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                      <MapPin className="text-teal-400" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{club.name}</p>
                      <p className="text-sm text-gray-400">{club.code}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-teal-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Начать визит <ArrowRight size={16} className="ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setMode('pickup');
                fetchDirtyItems();
              }}
              className="card card-hover p-6 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4">
                <Package className="text-blue-400" size={24} />
              </div>
              <h3 className="font-semibold text-white mb-1">Забор грязного</h3>
              <p className="text-sm text-gray-400">Просмотреть все заказы к забору</p>
            </button>

            <button
              onClick={() => {
                setMode('delivery');
                fetchCleanItems();
              }}
              className="card card-hover p-6 text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center mb-4">
                <Truck className="text-green-400" size={24} />
              </div>
              <h3 className="font-semibold text-white mb-1">Доставка чистого</h3>
              <p className="text-sm text-gray-400">Просмотреть заказы к доставке</p>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Active visit mode
  if (visitStarted && selectedClub) {
    const clubName = clubs.find(c => c.id === selectedClub)?.name || 'Клуб';

    return (
      <main className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="glass border-b border-gray-800/50">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 text-teal-400 text-sm mb-1">
                  <MapPin size={16} />
                  Активный визит
                </div>
                <h1 className="text-2xl font-bold text-white">{clubName}</h1>
              </div>
              <button
                onClick={endVisit}
                className="btn btn-secondary"
              >
                Завершить визит
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {message && (
            <div className={`mb-6 flex items-center gap-2 p-4 rounded-xl animate-fade-in ${
              message.type === 'success' 
                ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              {message.text}
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('pickup')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition ${
                mode === 'pickup' || mode === 'idle'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Package className="inline mr-2" size={18} />
              Забор ({dirtyItems.length})
            </button>
            <button
              onClick={() => setMode('delivery')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition ${
                mode === 'delivery'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Truck className="inline mr-2" size={18} />
              Доставка ({cleanItems.length})
            </button>
          </div>

          {/* Refresh button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                if (mode === 'delivery') fetchCleanItems(selectedClub);
                else fetchDirtyItems(selectedClub);
              }}
              disabled={loading}
              className="btn btn-secondary text-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (mode === 'pickup' || mode === 'idle') ? (
            <div className="space-y-3">
              {dirtyItems.length === 0 ? (
                <div className="card p-8 text-center">
                  <Package className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">Нет заказов для забора</p>
                </div>
              ) : (
                dirtyItems.map((item) => (
                  <div key={item.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <Package className="text-blue-400" size={24} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {item.order_number || item.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Пакет: {item.package_id || 'N/A'}
                          {item.locker_cell_number && ` • Ячейка: ${item.locker_cell_number}`}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => pickupDirty(item.id)}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      <CheckCircle size={18} />
                      Забрать
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {cleanItems.length === 0 ? (
                <div className="card p-8 text-center">
                  <Truck className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">Нет заказов для доставки</p>
                </div>
              ) : (
                cleanItems.map((item) => (
                  <div key={item.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center">
                        <Truck className="text-green-400" size={24} />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {item.order_number || item.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Пакет: {item.package_id || 'N/A'}
                          {item.locker_cell_number && ` • Ячейка: ${item.locker_cell_number}`}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deliverClean(item.id)}
                      disabled={loading}
                      className="btn bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    >
                      <CheckCircle size={18} />
                      Доставлено
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Pickup/Delivery mode without active visit (view all)
  return (
    <main className="min-h-screen bg-gradient-main">
      {/* Header */}
      <div className="glass border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-white">
                {mode === 'pickup' ? 'Все заказы к забору' : 'Все заказы к доставке'}
              </h1>
              <p className="text-gray-400 mt-1">
                {mode === 'pickup' ? dirtyItems.length : cleanItems.length} заказов
              </p>
            </div>
            <button
              onClick={() => setMode('idle')}
              className="btn btn-secondary"
            >
              Назад
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Refresh */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => mode === 'pickup' ? fetchDirtyItems() : fetchCleanItems()}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {(mode === 'pickup' ? dirtyItems : cleanItems).length === 0 ? (
              <div className="card p-8 text-center">
                {mode === 'pickup' ? (
                  <Package className="mx-auto mb-4 text-gray-600" size={48} />
                ) : (
                  <Truck className="mx-auto mb-4 text-gray-600" size={48} />
                )}
                <p className="text-gray-400">Нет заказов</p>
              </div>
            ) : (
              (mode === 'pickup' ? dirtyItems : cleanItems).map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${mode === 'pickup' ? 'bg-blue-500/15' : 'bg-green-500/15'} flex items-center justify-center`}>
                        {mode === 'pickup' ? (
                          <Package className="text-blue-400" size={24} />
                        ) : (
                          <Truck className="text-green-400" size={24} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {item.order_number || item.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Пакет: {item.package_id || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Клуб ID: {item.club_id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
