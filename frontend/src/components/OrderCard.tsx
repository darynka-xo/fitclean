'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, ReceiptText, Camera } from 'lucide-react';
import type { Tables } from '@/types/supabase';
import Link from 'next/link';
import OrderPhotos from './OrderPhotos';

/* типы ----------------------------------------------------------------- */
type Order = Tables<'orders'>;
type Status = Tables<'dim_status_types'>;
type Club = Tables<'clubs'>;

type OrderWithNames = Order & { status: Status; club: Club };

/* цвет для бейджа статуса по code */
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-500',
  in_progress: 'bg-amber-500',
  ready_for_pickup: 'bg-sky-600',
  completed: 'bg-emerald-600',
  canceled: 'bg-red-600'
};

export default function OrderCard({
  order,
  fixedSize,
}: {
  order: OrderWithNames;
  fixedSize?: { w: number; h: number };
}) {
  const [open, setOpen] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
  } = useSortable({
    id: order.id,
    data: { statusId: order.status_id },
    animateLayoutChanges: ({ isSorting, wasDragging }) =>
      isSorting || wasDragging,
  });

  /* вычисляем поля */
  const statusColor = STATUS_COLOR[order.status.code ?? ''] ?? 'bg-gray-700';
  const created = new Date(order.created_at ?? '').toLocaleDateString('ru-RU');
  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    visibility: isDragging ? 'hidden' : 'visible',      // ➊ прячем оригинал
  };

  /* если overlay получил fixedSize — добавляем width/height */
  const style = fixedSize
    ? { ...baseStyle, width: fixedSize.w, height: fixedSize.h } // ➋ держим точный размер
    : baseStyle;

  return (
    <>
      {/* ───── card ───── */}
      <article
        ref={setNodeRef}
        style={style}
        data-order={order.id}
        {...attributes}
        {...listeners}
        className="rounded-2xl p-4 flex flex-col gap-2 bg-gray-800/90 backdrop-blur
                   hover:bg-gradient-to-br hover:from-gray-800 hover:to-gray-700
                   shadow hover:shadow-lg transition cursor-grab active:cursor-grabbing select-none"

      >
        {/* верхняя строка */}
        <header className="flex justify-between items-center text-xs text-gray-400">
          <span className="font-semibold text-teal-400">
            {order.order_number || `#${order.id.slice(0, 8)}`}
          </span>
          <span>{created}</span>
        </header>

        {/* клуб */}
        <p className="text-sm font-medium text-gray-200">
          {order.club.code} · {order.club.name}
        </p>

        {/* статус‑бейдж */}
        <span className={`${statusColor} px-2 py-0.5 rounded-full text-xs text-white self-start`}>
          {order.status.name}
        </span>

        {/* цена + пакет */}
        <div className="flex justify-between items-center mt-1">
          <div className="flex flex-col">
            <p className="text-lg font-semibold">
              {order.price ? `₸${order.price}` : '—'}
            </p>
            {order.is_tariff_based && order.tariff_price && (
              <span className="text-xs text-green-400">подписка ₸{order.tariff_price}</span>
            )}
          </div>
          {order.package_id && (
            <span className="text-xs text-gray-400">пакет&nbsp;{order.package_id}</span>
          )}
        </div>

        {/* pickup code */}
        {order.pickup_code && (
          <div className="mt-2 p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-300">Код получения:</span>
              <span className="text-lg font-mono font-bold text-yellow-100">{order.pickup_code}</span>
            </div>
          </div>
        )}

        {/* действия */}
        <div className="mt-3 flex gap-2">
          {order.receipt_url && (
            <Link
              href={order.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-3 py-1
                         rounded-lg bg-teal-500 hover:bg-teal-600 active:bg-teal-700 transition"
            >
              <ReceiptText size={14} /> Чек
            </Link>
          )}
          
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowPhotos(true);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-3 py-1
                       rounded-lg bg-purple-500 hover:bg-purple-600 active:bg-purple-700 transition"
          >
            <Camera size={14} /> Фото
          </button>
        </div>
      </article>

      {/* Photo Modal - rendered via Portal to escape overflow:hidden */}
      {showPhotos && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setShowPhotos(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          {/* Modal - Full screen with small padding */}
          <div 
            className="absolute flex flex-col"
            style={{ 
              position: 'absolute',
              top: '20px', 
              left: '20px', 
              right: '20px', 
              bottom: '20px',
              zIndex: 10000
            }}
          >
            <div className="bg-gray-900 rounded-2xl flex flex-col h-full overflow-hidden border border-gray-700 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0 bg-gray-900">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Фото заказа {order.order_number || order.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {order.club.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowPhotos(false)}
                  className="p-3 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <OrderPhotos 
                  orderId={order.id} 
                  orderNumber={order.order_number || order.id.slice(0, 8)}
                  onClose={() => setShowPhotos(false)}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
