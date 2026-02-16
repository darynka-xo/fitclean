'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Camera, Upload, X, Eye, ChevronLeft, ChevronRight, Trash2, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface OrderPhoto {
  id: string;
  photo_url: string;
  photo_type: 'received' | 'processed' | 'ready';
  description: string | null;
  created_at: string;
}

interface OrderPhotosProps {
  orderId: string;
  orderNumber: string;
  onClose?: () => void;
}

export default function OrderPhotos({ orderId, orderNumber, onClose }: OrderPhotosProps) {
  const supabase = createClient();
  
  const [photos, setPhotos] = useState<OrderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'received' | 'processed' | 'ready'>('received');
  const [description, setDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const photoTypeLabels = {
    received: 'Получение',
    processed: 'Обработка',
    ready: 'Готов'
  };

  const photoTypeColors = {
    received: 'bg-blue-500',
    processed: 'bg-yellow-500',
    ready: 'bg-green-500'
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchPhotos();
  }, [orderId]);

  const fetchPhotos = async () => {
    try {
      // Use backend API instead of direct Supabase
      const response = await fetch(`${apiUrl}/photos/order/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data || []);
      } else {
        // Fallback to Supabase
        const { data, error } = await supabase
          .from('order_photos')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPhotos(data || []);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploading(true);
    
    try {
      // Upload to Supabase Storage
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}_${selectedType}_${timestamp}.${fileExt}`;
      const storagePath = `order-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order_photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Ошибка загрузки в хранилище');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('order_photos')
        .getPublicUrl(storagePath);

      const photoUrl = urlData.publicUrl;

      // Create photo record via backend API
      const response = await fetch(`${apiUrl}/photos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          photo_url: photoUrl,
          photo_type: selectedType,
          description: description.trim() || `Загружено: ${file.name}`
        }),
      });

      if (response.ok) {
        await fetchPhotos();
        setDescription('');
        setShowUploadForm(false);
        event.target.value = '';
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка сохранения');
      }
      
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      alert(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm('Удалить это фото?')) return;

    try {
      const urlParts = photoUrl.split('/');
      const storagePath = urlParts.slice(-2).join('/');

      await supabase.storage
        .from('order_photos')
        .remove([storagePath]);

      const { error } = await supabase
        .from('order_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      await fetchPhotos();
      if (selectedPhotoIndex !== null && selectedPhotoIndex >= photos.length - 1) {
        setSelectedPhotoIndex(photos.length > 1 ? photos.length - 2 : null);
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Ошибка удаления фото');
    }
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;
    
    if (direction === 'prev' && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (direction === 'next' && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  // Full-screen photo viewer
  if (selectedPhotoIndex !== null && photos[selectedPhotoIndex]) {
    const photo = photos[selectedPhotoIndex];
    return (
      <div className="fixed inset-0 bg-black z-[60] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs text-white ${photoTypeColors[photo.photo_type]}`}>
              {photoTypeLabels[photo.photo_type]}
            </span>
            <span className="text-white/70 text-sm">
              {selectedPhotoIndex + 1} / {photos.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deletePhoto(photo.id, photo.photo_url)}
              className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 transition"
              title="Удалить"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={() => setSelectedPhotoIndex(null)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {/* Previous button */}
          {selectedPhotoIndex > 0 && (
            <button
              onClick={() => navigatePhoto('prev')}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Image container */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={photo.photo_url}
              alt={`${photoTypeLabels[photo.photo_type]} фото`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Next button */}
          {selectedPhotoIndex < photos.length - 1 && (
            <button
              onClick={() => navigatePhoto('next')}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>

        {/* Description */}
        {photo.description && (
          <div className="p-4 bg-black/50 text-center">
            <p className="text-white/80">{photo.description}</p>
          </div>
        )}

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="p-4 bg-black/70 overflow-x-auto">
            <div className="flex gap-2 justify-center">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                    idx === selectedPhotoIndex ? 'border-teal-400' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={p.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Camera size={18} className="text-purple-400" />
          <span>{photos.length} фото</span>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="btn btn-primary text-sm py-2"
        >
          <Upload size={16} />
          Загрузить
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card p-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Тип фото</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="input"
              >
                <option value="received">Получение заказа</option>
                <option value="processed">Обработка заказа</option>
                <option value="ready">Готов к выдаче</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Описание (опционально)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Добавьте описание..."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Выберите фото</label>
            <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-teal-500 hover:bg-teal-500/5 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-teal-400">Загружаем...</span>
                </>
              ) : (
                <>
                  <Upload className="text-gray-400" size={24} />
                  <span className="text-gray-400">Нажмите для выбора или перетащите файл</span>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        /* Empty state */
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="text-gray-600" size={32} />
          </div>
          <p className="text-gray-400">Фото пока не загружены</p>
          <p className="text-gray-500 text-sm mt-1">Нажмите "Загрузить" чтобы добавить фото</p>
        </div>
      ) : (
        /* Photo Grid - larger thumbnails */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhotoIndex(index)}
              className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-teal-400 transition-all hover:scale-[1.02]"
            >
              <img
                src={photo.photo_url}
                alt={`${photoTypeLabels[photo.photo_type]} фото`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
              </div>
              
              {/* Photo Type Badge */}
              <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs text-white ${photoTypeColors[photo.photo_type]}`}>
                {photoTypeLabels[photo.photo_type]}
              </div>

              {/* Description indicator */}
              {photo.description && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.description}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
