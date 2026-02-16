'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Camera, CheckCircle, Package, RotateCcw, AlertCircle } from 'lucide-react';
import type { Tables } from '@/types/supabase';

type Order = Tables<'orders'>;
type OrderPhoto = Tables<'order_photos'>;

type WorkflowMode = 'receive' | 'washing' | 'assembly' | null;

interface BagItem {
  order_id: string;
  package_id: string;
  order_number: string;
  status_id: number;
  photo_url?: string;
  received_at?: string;
}

export default function LaundryPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<WorkflowMode>(null);
  const [currentBag, setCurrentBag] = useState<BagItem | null>(null);
  const [bagList, setBagList] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch bags ready for current mode
  const fetchBags = useCallback(async (statusFilter: number) => {
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          id,
          package_id,
          order_number,
          status_id,
          created_at
        `)
        .eq('status_id', statusFilter)
        .order('created_at', { ascending: true })
        .limit(50);

      if (err) throw err;

      // Get photos for received orders
      const mappedData: BagItem[] = (data || []).map(order => ({
        order_id: order.id,
        package_id: order.package_id || '',
        order_number: order.order_number || '',
        status_id: order.status_id,
        photo_url: undefined,
        received_at: order.created_at
      }));

      if (statusFilter === 2) { // in_progress (received)
        const orderIds = mappedData.map(o => o.order_id);
        if (orderIds.length > 0) {
          const { data: photos } = await supabase
            .from('order_photos')
            .select('order_id, photo_url')
            .in('order_id', orderIds)
            .eq('photo_type', 'received')
            .order('created_at', { ascending: false });

          const photosMap = new Map(
            photos?.map(p => [p.order_id, p.photo_url]) || []
          );

          mappedData.forEach(order => {
            order.photo_url = photosMap.get(order.order_id);
          });
        }
      }

      setBagList(mappedData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching bags:', err);
      setError(err.message || 'Ошибка загрузки данных');
    }
  }, [supabase]);

  // Handle receiving dirty bags
  const handleReceiveBag = async (bag: BagItem) => {
    if (!bag) return;

    setCurrentBag(bag);
    setMode('receive');
    setPhotoPreview(null);
  };

  // Capture photo for received bag
  const handleTakePhoto = async () => {
    if (!currentBag) return;

    try {
      // Open camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use back camera on mobile/tablet

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload photo
        setLoading(true);
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) throw new Error('Не авторизован');

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `${user.user.id}_received_${timestamp}.jpg`;
          const storagePath = `order_photos/laundry/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('order_photos')
            .upload(storagePath, file, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('order_photos')
            .getPublicUrl(storagePath);

          // Save photo record
          const { error: dbError } = await supabase
            .from('order_photos')
            .insert({
              order_id: currentBag.order_id,
              uploaded_by: user.user.id,
              photo_url: publicUrl,
              photo_type: 'received',
              description: `Принято на стирку. Мешок: ${currentBag.package_id}`,
            });

          if (dbError) throw dbError;

          // Update bag with photo URL
          setCurrentBag({ ...currentBag, photo_url: publicUrl });
        } catch (err: any) {
          console.error('Photo upload error:', err);
          setError(err.message || 'Ошибка загрузки фото');
        } finally {
          setLoading(false);
        }
      };

      input.click();
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Ошибка доступа к камере');
    }
  };

  // Confirm bag received
  const handleConfirmReceived = async () => {
    if (!currentBag) return;

    // Photo is required
    if (!currentBag.photo_url && !photoPreview) {
      setError('Необходимо сделать фото мешка');
      return;
    }

    setLoading(true);
    try {
      // Update order status to "in_progress" (status_id = 2)
      const { data: order, error: err } = await supabase
        .from('orders')
        .update({ status_id: 2 })
        .eq('id', currentBag.order_id)
        .select('user_id')
        .single();

      if (err) throw err;

      // Send notification to customer
      if (order?.user_id) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              user_id: order.user_id,
              order_id: currentBag.order_id,
              notification_type: 'order_in_laundry',
              channel: 'both',
            }),
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
          // Don't fail the operation if notification fails
        }
      }

      // Reset and refresh
      setCurrentBag(null);
      setMode(null);
      setPhotoPreview(null);
      await fetchBags(1); // Refresh pending bags

      // Show success message briefly
      setTimeout(() => {
        setError(null);
      }, 2000);
    } catch (err: any) {
      console.error('Confirm receive error:', err);
      setError(err.message || 'Ошибка подтверждения приема');
    } finally {
      setLoading(false);
    }
  };

  // Mark bag as washed
  const handleMarkWashed = async (bag: BagItem) => {
    if (!confirm(`Отметить мешок ${bag.package_id} как постиранный?`)) return;

    setLoading(true);
    try {
      // Status stays "in_progress" but we track washing state
      // Could add a separate field or use order notes
      // For now, we'll just allow moving to assembly
      setCurrentBag(bag);
      setMode('assembly');
    } catch (err: any) {
      console.error('Mark washed error:', err);
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Confirm bag assembled
  const handleConfirmAssembled = async () => {
    if (!currentBag) return;

    setLoading(true);
    try {
      // Update status to "ready_for_pickup" (status_id = 3)
      const { data: order, error: err } = await supabase
        .from('orders')
        .update({ status_id: 3 })
        .eq('id', currentBag.order_id)
        .select('user_id')
        .single();

      if (err) throw err;

      // Send notification to customer
      if (order?.user_id) {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
          
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              user_id: order.user_id,
              order_id: currentBag.order_id,
              notification_type: 'order_ready',
              channel: 'both',
            }),
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
          // Don't fail the operation if notification fails
        }
      }

      // Reset
      setCurrentBag(null);
      setMode(null);
      await fetchBags(2); // Refresh in_progress bags

      setTimeout(() => {
        setError(null);
      }, 2000);
    } catch (err: any) {
      console.error('Confirm assembled error:', err);
      setError(err.message || 'Ошибка подтверждения сборки');
    } finally {
      setLoading(false);
    }
  };

  // Load bags based on mode
  useEffect(() => {
    if (mode === 'receive') {
      fetchBags(1); // pending
    } else if (mode === 'washing') {
      fetchBags(2); // in_progress
    } else if (mode === 'assembly') {
      fetchBags(2); // in_progress (washed)
    }
  }, [mode, fetchBags]);

  // Main workflow UI
  if (mode === null) {
    return (
      <main className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="glass border-b border-gray-800/50">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="animate-fade-in">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Прачечная
              </h1>
              <p className="text-gray-400 mt-1">
                Управление процессами стирки и сборки
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Receive Mode */}
            <button
              onClick={() => setMode('receive')}
              className="card card-hover p-8 text-left group animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-6 group-hover:bg-blue-500/25 transition-colors">
                <Package size={32} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Прием грязных</h2>
              <p className="text-gray-400 text-sm">Принять один комплект на стирку</p>
              <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
                <span>Начать</span>
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Washing Mode */}
            <button
              onClick={() => setMode('washing')}
              className="card card-hover p-8 text-left group animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 flex items-center justify-center mb-6 group-hover:bg-yellow-500/25 transition-colors">
                <RotateCcw size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Стирка</h2>
              <p className="text-gray-400 text-sm">Отметить как постирано</p>
              <div className="mt-4 flex items-center text-yellow-400 text-sm font-medium">
                <span>Начать</span>
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Assembly Mode */}
            <button
              onClick={() => setMode('assembly')}
              className="card card-hover p-8 text-left group animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mb-6 group-hover:bg-green-500/25 transition-colors">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Сборка</h2>
              <p className="text-gray-400 text-sm">Собрать готовый комплект</p>
              <div className="mt-4 flex items-center text-green-400 text-sm font-medium">
                <span>Начать</span>
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Receive workflow
  if (mode === 'receive' && !currentBag) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Прием грязных вещей</h1>
            <button
              onClick={() => setMode(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Назад
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div className="bg-gray-800 rounded-xl p-6 mb-4">
            <p className="text-gray-300 mb-4">Выберите мешок для приема:</p>
            {bagList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет мешков к приему</p>
            ) : (
              <div className="space-y-2">
                {bagList.map((bag) => (
                  <button
                    key={bag.order_id}
                    onClick={() => handleReceiveBag(bag)}
                    className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Мешок: {bag.package_id}</p>
                        <p className="text-gray-400 text-sm">Заказ: {bag.order_number || bag.order_id.slice(0, 8)}</p>
                      </div>
                      <Package size={24} className="text-blue-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Receive: Photo capture step
  if (mode === 'receive' && currentBag) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Прием мешка: {currentBag.package_id}
              </h2>
              <p className="text-gray-400 text-sm">Заказ: {currentBag.order_number || currentBag.order_id.slice(0, 8)}</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 flex items-center gap-2">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {/* Photo preview or instruction */}
            <div className="mb-6">
              {(photoPreview || currentBag.photo_url) ? (
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={photoPreview || currentBag.photo_url}
                    alt="Фото мешка"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                  <div className="text-center">
                    <Camera size={64} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">Фото еще не сделано</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleTakePhoto}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-semibold flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                {currentBag.photo_url || photoPreview ? 'Сделать другое фото' : 'Сделать фото'}
              </button>

              <button
                onClick={handleConfirmReceived}
                disabled={loading || (!currentBag.photo_url && !photoPreview)}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                {loading ? 'Сохранение...' : 'Принято на стирку'}
              </button>
            </div>

            <button
              onClick={() => {
                setCurrentBag(null);
                setPhotoPreview(null);
                setError(null);
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Отмена
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Washing workflow
  if (mode === 'washing') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Стирка</h1>
            <button
              onClick={() => setMode(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Назад
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">Выберите мешок для отметки как постиранный:</p>
            {bagList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет мешков в стирке</p>
            ) : (
              <div className="space-y-2">
                {bagList.map((bag) => (
                  <div
                    key={bag.order_id}
                    className="p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Мешок: {bag.package_id}</p>
                        <p className="text-gray-400 text-sm">Заказ: {bag.order_number || bag.order_id.slice(0, 8)}</p>
                      </div>
                      <button
                        onClick={() => handleMarkWashed(bag)}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white"
                      >
                        Постирано
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Assembly workflow
  if (mode === 'assembly' && !currentBag) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Сборка чистых вещей</h1>
            <button
              onClick={() => setMode(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Назад
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">Выберите мешок для сборки:</p>
            {bagList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Нет мешков к сборке</p>
            ) : (
              <div className="space-y-2">
                {bagList.map((bag) => (
                  <button
                    key={bag.order_id}
                    onClick={() => {
                      setCurrentBag(bag);
                      setMode('assembly');
                    }}
                    className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Мешок: {bag.package_id}</p>
                        <p className="text-gray-400 text-sm">Заказ: {bag.order_number || bag.order_id.slice(0, 8)}</p>
                      </div>
                      <CheckCircle size={24} className="text-green-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Assembly: Verification step
  if (mode === 'assembly' && currentBag) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                Сборка мешка: {currentBag.package_id}
              </h2>
              <p className="text-gray-400 text-sm">Заказ: {currentBag.order_number || currentBag.order_id.slice(0, 8)}</p>
            </div>

            {/* Show photo from receive */}
            {currentBag.photo_url && (
              <div className="mb-6">
                <p className="text-gray-300 mb-2 text-sm">Фото при приеме:</p>
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <img
                    src={currentBag.photo_url}
                    alt="Фото при приеме"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">Сверьте состав вещей по фото</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 flex items-center gap-2">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm">
                <strong>Важно:</strong> Убедитесь, что номер чистого мешка совпадает с номером грязного ({currentBag.package_id})
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleConfirmAssembled}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} />
                {loading ? 'Сохранение...' : 'Собран и упакован'}
              </button>
            </div>

            <button
              onClick={() => {
                setCurrentBag(null);
                setError(null);
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
            >
              Отмена
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

