'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    DndContext,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay
} from '@dnd-kit/core';
import OrderCard from '@/components/OrderCard';
import type { Tables } from '@/types/supabase';
import Column from '@/components/Column';

/* ─────────────── типы ─────────────── */
type Order = Tables<'orders'>;
type Status = Tables<'dim_status_types'>;
type Club = Tables<'clubs'>
type OrderWithNames = Order & {
    status: Status;
    club: Club;
};

/* ─────────────── страница ─────────────── */
export default function BoardPage() {
    const supabase = useMemo(() => createClient(), []);
    const sensors = useSensors(useSensor(PointerSensor));

    const [statuses, setStatuses] = useState<Status[]>([]);
    const [orders, setOrders] = useState<OrderWithNames[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeOrder, setActiveOrder] = useState<OrderWithNames | null>(null);
    const [dragRect, setDragRect] = useState<DOMRect | null>(null);



    // 3. orders
    const fetchOrders = useCallback(async () => {
        // 1. user
        const { data: u } = await supabase.auth.getUser();
        const clubId = u.user?.user_metadata?.club_id as number | undefined;


        let q = supabase
            .from('orders')
            .select(`
  id,
  order_number,
  daily_sequence,
  price,
  receipt_url,
  created_at,
  status_id,
  club_id,
  package_id,
  pickup_code,
  is_tariff_based,
  tariff_price,
  status:dim_status_types(id, name, code),
  club:clubs(id, name, code)
`)
        /* фильтр только если clubId задан и не 0 */
        if (clubId && clubId !== 0) q = q.eq('club_id', clubId);

        q.overrideTypes<Array<OrderWithNames>, { merge: true }>();


        const { data: o, error } = await q;
        if (error) console.error(error);

        setOrders(o as []);
        setLoading(false);
    }, [supabase]);     

    /* ---------- загрузка данных (user → statuses → orders) ---------- */
    useEffect(() => {
        (async () => {
            const { data: s } = await supabase
                .from('dim_status_types')
                .select('*')
                .order('id');
            setStatuses(s as Status[]);

            await fetchOrders();

           const intervalId = setInterval(fetchOrders, 60_000);

           return () => clearInterval(intervalId);
        })();
    }, [supabase, fetchOrders]);


    /* ---------- группируем заказы по статусу ---------- */
    const grouped = useMemo(() => {
        const map: Record<number, OrderWithNames[]> = {};
        statuses.forEach((s) => (map[s.id] = []));
        orders.forEach?.((o) => {
            if (o.status_id !== null && map[o.status_id]) {
                map[o.status_id].push(o);
            }
        });
        return map;
    }, [orders, statuses]);

    /* ---------- drag‑end ---------- */
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const orderId = active.id as string;

        /* шесть строк, которые решают всё 👇 */
        const destStatusId =
            /** 1) если попали в контейнер‑колонку */
            over.data?.current?.statusId ??
            /** 2) если попали на карточку другой колонки */
            (over.id !== orderId
                ? (over.data?.current?.statusId as number | undefined)
                : undefined);

        if (destStatusId === undefined) return;

        const order = orders.find((o) => o.id === orderId);
        if (!order || order.status_id === destStatusId) return;

        // локально сразу меняем, чтобы UI откликался
        setOrders((prev) =>
            prev.map((o) =>
                o.id === orderId ? { ...o, status_id: destStatusId } : o,
            ),
        );

        // запрос к БД: если RLS не пускает — вернётся ошибка
        const { error } = await supabase
            .from('orders')
            .update({ status_id: destStatusId })
            .eq('id', orderId);

        if (error) {
            // откатываем
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? order : o)),
            );
            alert(error.message);
        }
        fetchOrders()
    };

    /* ---------- UI ---------- */
    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-main">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Загрузка заказов...</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-main">
            {/* Header */}
            <div className="glass border-b border-gray-800/50">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="animate-fade-in">
                            <h1 className="text-2xl lg:text-3xl font-bold text-white">
                                Управление заказами
                            </h1>
                            <p className="text-gray-400 mt-1">
                                Перетаскивайте заказы между этапами обработки
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="glass rounded-xl px-5 py-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                                <div className="text-xs text-gray-400 uppercase tracking-wider">Всего заказов</div>
                                <div className="text-2xl font-bold gradient-text">{orders.length}</div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                                <span>Система активна</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={(e) => {
                    const id = e.active.id as string;
                    const el = document.querySelector(`[data-order='${id}']`) as HTMLElement | null;
                    setDragRect(el?.getBoundingClientRect() ?? null);
                    setActiveOrder(orders.find(o => o.id === id) ?? null);
                }}
                onDragEnd={handleDragEnd}
                onDragCancel={() => { setActiveOrder(null); setDragRect(null); }}
            >
                {/* Improved responsive layout */}
                <div className="max-w-7xl mx-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {statuses.map((s) => (
                            <Column key={s.id} status={s} orders={grouped[s.id] ?? []} />
                        ))}
                    </div>
                </div>

                {/* Enhanced drag overlay */}
                <DragOverlay
                    dropAnimation={{
                        duration: 250,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                >
                    {activeOrder && (
                        <div className="transform rotate-2 scale-105 shadow-2xl">
                            <OrderCard
                                order={activeOrder}
                                fixedSize={
                                    dragRect ? { w: dragRect.width, h: dragRect.height } : undefined
                                }
                            />
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </main>
    );
}
