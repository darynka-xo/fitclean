-- Notification logs table for tracking sent notifications

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  notification_type varchar(50) NOT NULL,
  channel varchar(20) NOT NULL, -- 'telegram', 'whatsapp', 'both'
  message text NOT NULL,
  telegram_sent boolean DEFAULT false,
  whatsapp_sent boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Add face_id and pin_code fields to users table for locker authentication
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS face_id_data text, -- Encrypted face recognition data
  ADD COLUMN IF NOT EXISTS pin_code varchar(6), -- Hashed PIN code
  ADD COLUMN IF NOT EXISTS pin_set_at timestamptz;

-- Add locker_cell_id to orders for tracking which cell contains the order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS locker_device_id varchar(100),
  ADD COLUMN IF NOT EXISTS locker_cell_id varchar(100);

-- Index for locker queries
CREATE INDEX IF NOT EXISTS idx_orders_locker_cell ON orders(locker_device_id, locker_cell_id) WHERE locker_cell_id IS NOT NULL;

