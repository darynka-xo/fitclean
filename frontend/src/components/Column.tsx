import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type { Tables } from '@/types/supabase';
import OrderCard from './OrderCard';

type Order  = Tables<'orders'>;
type Status = Tables<'dim_status_types'>;
type Club   = Tables<'clubs'>;

type OrderWithNames = Order & { status: Status; club: Club };

export default function Column({
  status,
  orders,
}: {
  status: Status;
  orders: OrderWithNames[];
}) {
  const { setNodeRef } = useDroppable({
    id: status.id.toString(),
    data: { statusId: status.id },
  });

  /* если у статуса есть код‑цвет — оттеняем шапку, иначе серый */
  const headerConfig: Record<string, { bg: string; accent: string; glow: string }> = {
    pending: { bg: 'bg-gray-800', accent: 'bg-gray-500', glow: 'shadow-gray-500/20' },
    in_progress: { bg: 'bg-amber-900/50', accent: 'bg-amber-500', glow: 'shadow-amber-500/20' },
    ready_for_pickup: { bg: 'bg-sky-900/50', accent: 'bg-sky-500', glow: 'shadow-sky-500/20' },
    completed: { bg: 'bg-emerald-900/50', accent: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
    canceled: { bg: 'bg-red-900/50', accent: 'bg-red-500', glow: 'shadow-red-500/20' },
  };

  const config = headerConfig[status.code ?? ''] || { bg: 'bg-gray-800', accent: 'bg-gray-500', glow: '' };

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col card overflow-hidden ${config.glow} shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      {/* Enhanced header with count */}
      <div className={`${config.bg} px-4 py-4 border-b border-gray-700/50`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${config.accent}`}></div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
              {status.name}
            </h2>
          </div>
          <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Improved scrollable area */}
      <SortableContext
        items={orders.map((o) => o.id)}
        strategy={rectSortingStrategy}
      >
        <div className="flex flex-col gap-3 p-4 min-h-[400px] max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-center">Заказов нет</p>
              <p className="text-xs text-center mt-1">Перетащите заказы сюда</p>
            </div>
          ) : (
            orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
