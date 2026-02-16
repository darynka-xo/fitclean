-- Medium Priority Features Migration
-- 1. Photo confirmation workflow
-- 2. Employee notification system
-- 3. Enhanced order ID structure

-- Create table for order photos (confirmation workflow)
CREATE TABLE IF NOT EXISTS "order_photos" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "uploaded_by" uuid NOT NULL, -- staff member who uploaded
  "photo_url" text NOT NULL,
  "photo_type" varchar(20) CHECK (photo_type IN ('received', 'processed', 'ready')) DEFAULT 'received',
  "description" text,
  "created_at" timestamp default now()
);

-- Add foreign key constraints for order photos
ALTER TABLE "order_photos" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;

-- Create table for employee notifications
CREATE TABLE IF NOT EXISTS "employee_notifications" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "recipient_id" uuid, -- null for broadcast notifications
  "club_id" bigint NOT NULL,
  "order_id" uuid,
  "notification_type" varchar(50) NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "priority" varchar(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  "created_at" timestamp default now(),
  "read_at" timestamp
);

-- Add foreign key constraints for notifications
ALTER TABLE "employee_notifications" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE;
ALTER TABLE "employee_notifications" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_order_photos_order_id ON order_photos(order_id);
CREATE INDEX idx_order_photos_type ON order_photos(photo_type);
CREATE INDEX idx_employee_notifications_recipient ON employee_notifications(recipient_id, is_read);
CREATE INDEX idx_employee_notifications_club ON employee_notifications(club_id, is_read);
CREATE INDEX idx_employee_notifications_created ON employee_notifications(created_at DESC);

-- Enhanced order ID structure
-- Add fields to track order creation details for enhanced ID generation
ALTER TABLE "orders" ADD COLUMN "order_number" varchar(20) UNIQUE;
ALTER TABLE "orders" ADD COLUMN "daily_sequence" integer;
ALTER TABLE "orders" ADD COLUMN "created_date" date DEFAULT CURRENT_DATE;

-- Create sequence for daily order numbering
CREATE SEQUENCE IF NOT EXISTS daily_order_seq;

-- Function to generate enhanced order ID: YYYYMMDD-CLUB-SEQ-PKG
CREATE OR REPLACE FUNCTION generate_enhanced_order_id(
  p_club_id bigint,
  p_package_id varchar,
  p_created_date date DEFAULT CURRENT_DATE
)
RETURNS varchar(20) AS $$
DECLARE
  club_code varchar(10);
  date_str varchar(8);
  sequence_num integer;
  order_id varchar(20);
BEGIN
  -- Get club code
  SELECT code INTO club_code FROM clubs WHERE id = p_club_id;
  IF club_code IS NULL THEN
    club_code := 'UNK';
  END IF;
  
  -- Format date as YYYYMMDD
  date_str := TO_CHAR(p_created_date, 'YYYYMMDD');
  
  -- Get next sequence number for this club and date
  SELECT COALESCE(MAX(daily_sequence), 0) + 1
  INTO sequence_num
  FROM orders 
  WHERE club_id = p_club_id 
    AND created_date = p_created_date;
  
  -- Generate order ID: YYYYMMDD-CLUB-SEQ
  order_id := date_str || '-' || UPPER(club_code) || '-' || LPAD(sequence_num::text, 3, '0');
  
  RETURN order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate enhanced order IDs
CREATE OR REPLACE FUNCTION auto_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate enhanced order number if not provided
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_enhanced_order_id(NEW.club_id, NEW.package_id, NEW.created_date);
    
    -- Set daily sequence number
    SELECT COALESCE(MAX(daily_sequence), 0) + 1
    INTO NEW.daily_sequence
    FROM orders 
    WHERE club_id = NEW.club_id 
      AND created_date = NEW.created_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto order number generation
DROP TRIGGER IF EXISTS trigger_auto_order_number ON orders;
CREATE TRIGGER trigger_auto_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_order_number();

-- Function to create notification when order status changes
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title varchar(255);
  notification_message text;
  notification_type varchar(50);
  priority_level varchar(20);
BEGIN
  -- Only create notification if status actually changed
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    
    -- Determine notification content based on new status
    CASE NEW.status_id
      WHEN 1 THEN -- pending
        notification_type := 'order_pending';
        notification_title := 'Новый заказ ожидает обработки';
        notification_message := 'Заказ ' || COALESCE(NEW.order_number, NEW.id::text) || ' создан и ожидает подтверждения оплаты';
        priority_level := 'medium';
      WHEN 2 THEN -- in_progress  
        notification_type := 'order_processing';
        notification_title := 'Заказ принят в работу';
        notification_message := 'Заказ ' || COALESCE(NEW.order_number, NEW.id::text) || ' начат в обработку';
        priority_level := 'medium';
      WHEN 3 THEN -- ready_for_pickup
        notification_type := 'order_ready';
        notification_title := 'Заказ готов к выдаче';
        notification_message := 'Заказ ' || COALESCE(NEW.order_number, NEW.id::text) || ' готов к выдаче. Код: ' || COALESCE(NEW.pickup_code, 'не назначен');
        priority_level := 'high';
      WHEN 4 THEN -- completed
        notification_type := 'order_completed';
        notification_title := 'Заказ завершен';
        notification_message := 'Заказ ' || COALESCE(NEW.order_number, NEW.id::text) || ' успешно завершен';
        priority_level := 'low';
      WHEN 5 THEN -- canceled
        notification_type := 'order_canceled';
        notification_title := 'Заказ отменен';
        notification_message := 'Заказ ' || COALESCE(NEW.order_number, NEW.id::text) || ' был отменен';
        priority_level := 'medium';
      ELSE
        RETURN NEW; -- Unknown status, skip notification
    END CASE;
    
    -- Insert notification for all staff in the club
    INSERT INTO employee_notifications (
      club_id, 
      order_id, 
      notification_type, 
      title, 
      message, 
      priority
    ) VALUES (
      NEW.club_id,
      NEW.id,
      notification_type,
      notification_title,
      notification_message,
      priority_level
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change notifications
DROP TRIGGER IF EXISTS trigger_notify_status_change ON orders;
CREATE TRIGGER trigger_notify_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_status_change();

-- Function to create notification when photo is uploaded
CREATE OR REPLACE FUNCTION notify_photo_upload()
RETURNS TRIGGER AS $$
DECLARE
  notification_title varchar(255);
  notification_message text;
  order_number varchar(20);
BEGIN
  -- Get order number
  SELECT COALESCE(o.order_number, o.id::text)
  INTO order_number
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  -- Create notification content based on photo type
  CASE NEW.photo_type
    WHEN 'received' THEN
      notification_title := 'Фото получения заказа';
      notification_message := 'Загружено фото получения для заказа ' || order_number;
    WHEN 'processed' THEN
      notification_title := 'Фото обработки заказа';
      notification_message := 'Загружено фото обработки для заказа ' || order_number;
    WHEN 'ready' THEN
      notification_title := 'Фото готового заказа';
      notification_message := 'Загружено фото готового заказа ' || order_number;
    ELSE
      notification_title := 'Фото заказа';
      notification_message := 'Загружено фото для заказа ' || order_number;
  END CASE;
  
  -- Insert notification
  INSERT INTO employee_notifications (
    club_id,
    order_id,
    notification_type,
    title,
    message,
    priority
  )
  SELECT 
    o.club_id,
    NEW.order_id,
    'photo_uploaded',
    notification_title,
    notification_message,
    'low'
  FROM orders o
  WHERE o.id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo upload notifications
DROP TRIGGER IF EXISTS trigger_notify_photo_upload ON order_photos;
CREATE TRIGGER trigger_notify_photo_upload
    AFTER INSERT ON order_photos
    FOR EACH ROW
    EXECUTE FUNCTION notify_photo_upload();

-- Create comprehensive view for order management with photos and notifications
CREATE OR REPLACE VIEW order_management_view AS
SELECT 
  o.id,
  o.order_number,
  o.daily_sequence,
  o.created_date,
  o.user_id,
  o.club_id,
  o.package_id,
  o.status_id,
  o.price,
  o.is_tariff_based,
  o.tariff_price,
  o.pickup_code,
  o.receipt_url,
  o.created_at,
  u.username,
  u.phone,
  u.subscription_id,
  st.name as subscription_type,
  dst.name as status_name,
  dst.code as status_code,
  c.name as club_name,
  c.code as club_code,
  cr.rating,
  cr.comment as rating_comment,
  cr.created_at as rating_date,
  -- Photo counts by type
  (SELECT COUNT(*) FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'received') as received_photos,
  (SELECT COUNT(*) FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'processed') as processed_photos,
  (SELECT COUNT(*) FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'ready') as ready_photos,
  -- Latest photo URLs
  (SELECT op.photo_url FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'received' ORDER BY op.created_at DESC LIMIT 1) as latest_received_photo,
  (SELECT op.photo_url FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'processed' ORDER BY op.created_at DESC LIMIT 1) as latest_processed_photo,
  (SELECT op.photo_url FROM order_photos op WHERE op.order_id = o.id AND op.photo_type = 'ready' ORDER BY op.created_at DESC LIMIT 1) as latest_ready_photo,
  -- Unread notification count for this order
  (SELECT COUNT(*) FROM employee_notifications en WHERE en.order_id = o.id AND en.is_read = false) as unread_notifications
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN dim_subscription_types st ON u.subscription_id = st.id
LEFT JOIN dim_status_types dst ON o.status_id = dst.id
LEFT JOIN clubs c ON o.club_id = c.id
LEFT JOIN client_ratings cr ON o.id = cr.order_id;

-- Update existing test data to have enhanced order numbers
-- First update the created_date
UPDATE orders SET created_date = created_at::date WHERE created_date IS NULL;

-- Then update order_number and daily_sequence using a subquery
WITH numbered_orders AS (
  SELECT 
    id,
    generate_enhanced_order_id(club_id, package_id, created_at::date) as new_order_number,
    ROW_NUMBER() OVER (PARTITION BY club_id, created_at::date ORDER BY created_at) as new_sequence
  FROM orders 
  WHERE order_number IS NULL
)
UPDATE orders 
SET 
  order_number = no.new_order_number,
  daily_sequence = no.new_sequence
FROM numbered_orders no
WHERE orders.id = no.id;
