-- High Priority Features Migration
-- 1. 4-digit pickup codes
-- 2. Tariff-based client logic  
-- 3. Client rating system

-- Add pickup code to orders table
ALTER TABLE "orders" ADD COLUMN "pickup_code" varchar(4);

-- Create index for fast pickup code lookups
CREATE INDEX idx_orders_pickup_code ON orders(pickup_code) WHERE pickup_code IS NOT NULL;

-- Add pricing fields for tariff logic
ALTER TABLE "orders" ADD COLUMN "is_tariff_based" boolean DEFAULT false;
ALTER TABLE "orders" ADD COLUMN "tariff_price" float;

-- Update subscription types to include pricing
UPDATE dim_subscription_types SET price = 0 WHERE code = 'none';
UPDATE dim_subscription_types SET price = 500 WHERE code = 'weekly';
UPDATE dim_subscription_types SET price = 1500 WHERE code = 'monthly';

-- Create client ratings table
CREATE TABLE IF NOT EXISTS "client_ratings" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "order_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "rating" integer CHECK (rating >= 1 AND rating <= 5),
  "comment" text,
  "created_at" timestamp default now()
);

-- Add foreign key constraints for ratings
ALTER TABLE "client_ratings" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;
ALTER TABLE "client_ratings" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

-- Create index for rating queries
CREATE INDEX idx_client_ratings_user_id ON client_ratings(user_id);
CREATE INDEX idx_client_ratings_order_id ON client_ratings(order_id);

-- Add notification preferences to users
ALTER TABLE "users" ADD COLUMN "notify_on_status_change" boolean DEFAULT true;
ALTER TABLE "users" ADD COLUMN "notify_on_pickup_ready" boolean DEFAULT true;

-- Create function to generate 4-digit pickup codes
CREATE OR REPLACE FUNCTION generate_pickup_code()
RETURNS varchar(4) AS $$
DECLARE
    code varchar(4);
    exists_check boolean;
BEGIN
    LOOP
        -- Generate random 4-digit code
        code := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
        
        -- Check if code already exists in active orders
        SELECT EXISTS(
            SELECT 1 FROM orders 
            WHERE pickup_code = code 
            AND status_id IN (1, 2, 3) -- pending, in_progress, ready_for_pickup
        ) INTO exists_check;
        
        -- Exit loop if code is unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-assign pickup codes when order reaches "ready_for_pickup" status
CREATE OR REPLACE FUNCTION auto_assign_pickup_code()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to ready_for_pickup (status_id = 3) and no pickup code exists
    IF NEW.status_id = 3 AND (OLD.pickup_code IS NULL OR OLD.pickup_code = '') THEN
        NEW.pickup_code := generate_pickup_code();
    END IF;
    
    -- Clear pickup code when order is completed or cancelled
    IF NEW.status_id IN (4, 5) THEN -- completed or cancelled
        NEW.pickup_code := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto pickup code assignment
DROP TRIGGER IF EXISTS trigger_auto_pickup_code ON orders;
CREATE TRIGGER trigger_auto_pickup_code
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_pickup_code();

-- Create view for order analytics with ratings
CREATE OR REPLACE VIEW order_analytics AS
SELECT 
    o.id,
    o.user_id,
    o.club_id,
    o.status_id,
    o.is_tariff_based,
    o.price,
    o.tariff_price,
    o.pickup_code,
    o.created_at,
    u.username,
    u.subscription_id,
    st.name as subscription_type,
    dst.name as status_name,
    c.name as club_name,
    cr.rating,
    cr.comment as rating_comment,
    cr.created_at as rating_date
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN dim_subscription_types st ON u.subscription_id = st.id
LEFT JOIN dim_status_types dst ON o.status_id = dst.id
LEFT JOIN clubs c ON o.club_id = c.id
LEFT JOIN client_ratings cr ON o.id = cr.order_id;

-- Insert some sample data for testing
INSERT INTO orders (user_id, package_id, club_id, status_id, is_tariff_based, price, tariff_price) 
SELECT 
    u.id,
    'TEST-PKG',
    u.club_id,
    3, -- ready_for_pickup status
    CASE WHEN u.subscription_id > 1 THEN true ELSE false END,
    CASE WHEN u.subscription_id = 1 THEN 1000 ELSE 0 END,
    CASE WHEN u.subscription_id > 1 THEN st.price ELSE NULL END
FROM users u
LEFT JOIN dim_subscription_types st ON u.subscription_id = st.id
LIMIT 1;
