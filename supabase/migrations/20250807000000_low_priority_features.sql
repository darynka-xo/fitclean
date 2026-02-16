-- Low Priority Features Migration
-- 1. Satisfaction history dashboard
-- 2. Advanced tariff checks

-- Create table for detailed satisfaction tracking
CREATE TABLE IF NOT EXISTS "satisfaction_history" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "club_id" bigint NOT NULL,
  "rating" integer CHECK (rating >= 1 AND rating <= 5),
  "comment" text,
  "service_quality" integer CHECK (service_quality >= 1 AND service_quality <= 5),
  "speed_rating" integer CHECK (speed_rating >= 1 AND speed_rating <= 5),
  "cleanliness_rating" integer CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  "staff_rating" integer CHECK (staff_rating >= 1 AND staff_rating <= 5),
  "would_recommend" boolean,
  "improvement_suggestions" text,
  "created_at" timestamp default now()
);

-- Add foreign key constraints for satisfaction history
ALTER TABLE "satisfaction_history" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "satisfaction_history" ADD FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;
ALTER TABLE "satisfaction_history" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE;

-- Create indexes for satisfaction analytics
CREATE INDEX idx_satisfaction_history_user_id ON satisfaction_history(user_id);
CREATE INDEX idx_satisfaction_history_club_id ON satisfaction_history(club_id);
CREATE INDEX idx_satisfaction_history_rating ON satisfaction_history(rating);
CREATE INDEX idx_satisfaction_history_created_at ON satisfaction_history(created_at DESC);

-- Create table for advanced tariff management
CREATE TABLE IF NOT EXISTS "tariff_plans" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "club_id" bigint NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "price_per_item" decimal(10,2),
  "monthly_fee" decimal(10,2),
  "max_items_per_month" integer,
  "discount_percentage" decimal(5,2) DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "valid_from" date DEFAULT CURRENT_DATE,
  "valid_until" date,
  "created_at" timestamp default now(),
  "updated_at" timestamp default now()
);

-- Add foreign key constraint for tariff plans
ALTER TABLE "tariff_plans" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE;

-- Create table for user subscription details
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
  "id" uuid PRIMARY KEY default gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "tariff_plan_id" uuid,
  "subscription_type_id" integer NOT NULL,
  "club_id" bigint NOT NULL,
  "start_date" date DEFAULT CURRENT_DATE,
  "end_date" date,
  "monthly_limit" integer DEFAULT 0,
  "used_this_month" integer DEFAULT 0,
  "last_reset_date" date DEFAULT CURRENT_DATE,
  "auto_renew" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp default now(),
  "updated_at" timestamp default now()
);

-- Add foreign key constraints for user subscriptions
ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("tariff_plan_id") REFERENCES "tariff_plans" ("id") ON DELETE SET NULL;
ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("subscription_type_id") REFERENCES "dim_subscription_types" ("id");
ALTER TABLE "user_subscriptions" ADD FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE;

-- Create indexes for subscription management
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_club_id ON user_subscriptions(club_id);
CREATE INDEX idx_user_subscriptions_active ON user_subscriptions(is_active, end_date);

-- Create comprehensive satisfaction analytics view
CREATE OR REPLACE VIEW satisfaction_analytics AS
SELECT 
  c.id as club_id,
  c.name as club_name,
  c.code as club_code,
  -- Overall satisfaction metrics
  COUNT(sh.*) as total_reviews,
  AVG(sh.rating) as avg_overall_rating,
  AVG(sh.service_quality) as avg_service_quality,
  AVG(sh.speed_rating) as avg_speed_rating,
  AVG(sh.cleanliness_rating) as avg_cleanliness_rating,
  AVG(sh.staff_rating) as avg_staff_rating,
  -- Recommendation metrics
  COUNT(CASE WHEN sh.would_recommend = true THEN 1 END) as recommenders,
  (COUNT(CASE WHEN sh.would_recommend = true THEN 1 END)::float / NULLIF(COUNT(sh.*), 0)) * 100 as recommendation_percentage,
  -- Rating distribution
  COUNT(CASE WHEN sh.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN sh.rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN sh.rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN sh.rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN sh.rating = 1 THEN 1 END) as one_star_count,
  -- Time-based metrics
  COUNT(CASE WHEN sh.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as reviews_last_30_days,
  COUNT(CASE WHEN sh.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as reviews_last_7_days
FROM clubs c
LEFT JOIN satisfaction_history sh ON c.id = sh.club_id
GROUP BY c.id, c.name, c.code;

-- Create advanced tariff analytics view
CREATE OR REPLACE VIEW tariff_analytics AS
SELECT 
  c.id as club_id,
  c.name as club_name,
  tp.id as tariff_plan_id,
  tp.name as tariff_name,
  tp.monthly_fee,
  tp.max_items_per_month,
  COUNT(us.id) as active_subscribers,
  SUM(us.used_this_month) as total_items_processed,
  AVG(us.used_this_month) as avg_items_per_user,
  SUM(tp.monthly_fee) as monthly_revenue,
  COUNT(CASE WHEN us.used_this_month >= tp.max_items_per_month THEN 1 END) as users_at_limit,
  (COUNT(CASE WHEN us.used_this_month >= tp.max_items_per_month THEN 1 END)::float / NULLIF(COUNT(us.id), 0)) * 100 as utilization_percentage
FROM clubs c
LEFT JOIN tariff_plans tp ON c.id = tp.club_id AND tp.is_active = true
LEFT JOIN user_subscriptions us ON tp.id = us.tariff_plan_id AND us.is_active = true
GROUP BY c.id, c.name, tp.id, tp.name, tp.monthly_fee, tp.max_items_per_month;

-- Function to check tariff limits and eligibility
CREATE OR REPLACE FUNCTION check_tariff_eligibility(
  p_user_id uuid,
  p_club_id bigint
)
RETURNS TABLE (
  eligible boolean,
  subscription_type varchar,
  monthly_limit integer,
  used_this_month integer,
  remaining_items integer,
  needs_payment boolean,
  suggested_price decimal
) AS $$
DECLARE
  user_subscription RECORD;
  tariff_plan RECORD;
BEGIN
  -- Get user's current subscription
  SELECT us.*, tp.name as plan_name, tp.monthly_fee, tp.max_items_per_month, tp.price_per_item, st.name as sub_type_name
  INTO user_subscription
  FROM user_subscriptions us
  LEFT JOIN tariff_plans tp ON us.tariff_plan_id = tp.id
  LEFT JOIN dim_subscription_types st ON us.subscription_type_id = st.id
  WHERE us.user_id = p_user_id 
    AND us.club_id = p_club_id 
    AND us.is_active = true
    AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE);

  IF user_subscription IS NULL THEN
    -- No active subscription, needs payment
    RETURN QUERY SELECT 
      false::boolean,
      'none'::varchar,
      0::integer,
      0::integer,
      0::integer,
      true::boolean,
      1000.00::decimal; -- Default price
  ELSE
    -- Check if monthly limit is reached
    IF user_subscription.max_items_per_month IS NOT NULL AND 
       user_subscription.used_this_month >= user_subscription.max_items_per_month THEN
      -- Limit reached, suggest pay-per-use
      RETURN QUERY SELECT 
        false::boolean,
        user_subscription.sub_type_name::varchar,
        user_subscription.max_items_per_month::integer,
        user_subscription.used_this_month::integer,
        0::integer,
        true::boolean,
        COALESCE(user_subscription.price_per_item, 1000.00)::decimal;
    ELSE
      -- Within limits, eligible for tariff-based service
      RETURN QUERY SELECT 
        true::boolean,
        user_subscription.sub_type_name::varchar,
        COALESCE(user_subscription.max_items_per_month, 999)::integer,
        user_subscription.used_this_month::integer,
        GREATEST(0, COALESCE(user_subscription.max_items_per_month, 999) - user_subscription.used_this_month)::integer,
        false::boolean,
        0.00::decimal;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription usage
CREATE OR REPLACE FUNCTION update_subscription_usage(
  p_user_id uuid,
  p_club_id bigint,
  p_increment integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  current_month date;
  subscription_record RECORD;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::date;
  
  -- Get current subscription
  SELECT * INTO subscription_record
  FROM user_subscriptions
  WHERE user_id = p_user_id 
    AND club_id = p_club_id 
    AND is_active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);

  IF subscription_record IS NULL THEN
    RETURN false;
  END IF;

  -- Reset monthly counter if it's a new month
  IF subscription_record.last_reset_date < current_month THEN
    UPDATE user_subscriptions
    SET used_this_month = p_increment,
        last_reset_date = current_month,
        updated_at = now()
    WHERE id = subscription_record.id;
  ELSE
    -- Increment usage
    UPDATE user_subscriptions
    SET used_this_month = used_this_month + p_increment,
        updated_at = now()
    WHERE id = subscription_record.id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to create detailed satisfaction entry
CREATE OR REPLACE FUNCTION create_satisfaction_entry(
  p_user_id uuid,
  p_order_id uuid,
  p_club_id bigint,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_service_quality integer DEFAULT NULL,
  p_speed_rating integer DEFAULT NULL,
  p_cleanliness_rating integer DEFAULT NULL,
  p_staff_rating integer DEFAULT NULL,
  p_would_recommend boolean DEFAULT NULL,
  p_improvement_suggestions text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  satisfaction_id uuid;
BEGIN
  INSERT INTO satisfaction_history (
    user_id,
    order_id,
    club_id,
    rating,
    comment,
    service_quality,
    speed_rating,
    cleanliness_rating,
    staff_rating,
    would_recommend,
    improvement_suggestions
  ) VALUES (
    p_user_id,
    p_order_id,
    p_club_id,
    p_rating,
    p_comment,
    p_service_quality,
    p_speed_rating,
    p_cleanliness_rating,
    p_staff_rating,
    p_would_recommend,
    p_improvement_suggestions
  ) RETURNING id INTO satisfaction_id;

  RETURN satisfaction_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default tariff plans for existing clubs
INSERT INTO tariff_plans (club_id, name, description, monthly_fee, max_items_per_month, price_per_item) 
SELECT 
  id,
  'Базовый план',
  'Стандартный тарифный план для регулярных клиентов',
  1500.00,
  10,
  200.00
FROM clubs
WHERE NOT EXISTS (
  SELECT 1 FROM tariff_plans WHERE club_id = clubs.id
);

INSERT INTO tariff_plans (club_id, name, description, monthly_fee, max_items_per_month, price_per_item)
SELECT 
  id,
  'Премиум план',
  'Расширенный тарифный план с увеличенным лимитом',
  2500.00,
  20,
  150.00
FROM clubs
WHERE NOT EXISTS (
  SELECT 1 FROM tariff_plans WHERE club_id = clubs.id AND name = 'Премиум план'
);

-- Create user subscriptions for existing users with subscriptions
INSERT INTO user_subscriptions (user_id, subscription_type_id, club_id, monthly_limit, tariff_plan_id)
SELECT 
  u.id,
  u.subscription_id,
  u.club_id,
  CASE 
    WHEN u.subscription_id = 2 THEN 8  -- Weekly: 8 items per month
    WHEN u.subscription_id = 3 THEN 15 -- Monthly: 15 items per month
    ELSE 0
  END,
  tp.id
FROM users u
JOIN tariff_plans tp ON u.club_id = tp.club_id AND tp.name = 'Базовый план'
WHERE u.subscription_id > 1
AND NOT EXISTS (
  SELECT 1 FROM user_subscriptions WHERE user_id = u.id
);
