-- Customer notification system for status changes

-- Function to send customer notifications via bot when status changes
CREATE OR REPLACE FUNCTION notify_customer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_chat_id bigint;
  order_number_text varchar;
  pickup_code_text varchar;
BEGIN
  -- Only notify customers for certain status changes
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.status_id IN (2, 3, 4) THEN
    
    -- Get customer chat ID
    SELECT u.chat_id INTO customer_chat_id
    FROM users u
    WHERE u.id = NEW.user_id;
    
    -- Get order details
    order_number_text := COALESCE(NEW.order_number, NEW.id::text);
    pickup_code_text := COALESCE(NEW.pickup_code, '');
    
    -- Insert customer notification based on status
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
      CASE NEW.status_id
        WHEN 2 THEN 'customer_in_progress'
        WHEN 3 THEN 'customer_ready'
        WHEN 4 THEN 'customer_completed'
      END,
      CASE NEW.status_id
        WHEN 2 THEN 'Отправить клиенту: На стирке'
        WHEN 3 THEN 'Отправить клиенту: Готов к выдаче'
        WHEN 4 THEN 'Отправить клиенту: Выдано'
      END,
      CASE NEW.status_id
        WHEN 2 THEN '💦 Мы приступили к стирке Вашей спортивной формы, все по-плану.'
        WHEN 3 THEN '✨ Ваша спортивная форма уже ожидает Вас в тренажерном зале! Код: ' || pickup_code_text
        WHEN 4 THEN '✅ Ваша спортивная форма выдана! Пожалуйста, оцените качество от 1 до 5 ⭐'
      END,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer notifications
DROP TRIGGER IF EXISTS trigger_notify_customer ON orders;
CREATE TRIGGER trigger_notify_customer
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_status_change();
