INSERT INTO dim_subscription_types (id, code, name) VALUES
(1, 'none', 'Нет'),
(2, 'weekly', 'Недельная'),
(3, 'monthly', 'Месячная');

INSERT INTO dim_status_types (id, code, name) VALUES
(1, 'pending', 'Ожидание оплаты'),
(2, 'in_progress', 'Выполняется'),
(3, 'ready_for_pickup', 'Ждет получателя'),
(4, 'completed', 'Завершен'),
(5, 'canceled', 'Отменен');

INSERT INTO clubs (code, name) VALUES
('test', 'Testing Club'),
('fctd', 'Fight Club');
