export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      client_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          code: string | null
          id: number
          name: string | null
        }
        Insert: {
          code?: string | null
          id?: never
          name?: string | null
        }
        Update: {
          code?: string | null
          id?: never
          name?: string | null
        }
        Relationships: []
      }
      dim_status_types: {
        Row: {
          code: string | null
          id: number
          name: string | null
        }
        Insert: {
          code?: string | null
          id: number
          name?: string | null
        }
        Update: {
          code?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      dim_subscription_types: {
        Row: {
          code: string | null
          id: number
          name: string | null
          price: number | null
        }
        Insert: {
          code?: string | null
          id: number
          name?: string | null
          price?: number | null
        }
        Update: {
          code?: string | null
          id?: number
          name?: string | null
          price?: number | null
        }
        Relationships: []
      }
      employee_notifications: {
        Row: {
          club_id: number
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          order_id: string | null
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          title: string
        }
        Insert: {
          club_id: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          order_id?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          title: string
        }
        Update: {
          club_id?: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          order_id?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "employee_notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "employee_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          club_id: number
          expires_at: string | null
          id: string
          role: string
          used_at: string | null
        }
        Insert: {
          club_id: number
          expires_at?: string | null
          id?: string
          role?: string
          used_at?: string | null
        }
        Update: {
          club_id?: number
          expires_at?: string | null
          id?: string
          role?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "invite_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
        ]
      }
      order_photos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_id: string
          photo_type: string | null
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id: string
          photo_type?: string | null
          photo_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string
          photo_type?: string | null
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          club_id: number | null
          created_at: string | null
          created_date: string | null
          daily_sequence: number | null
          id: string
          is_tariff_based: boolean | null
          order_number: string | null
          package_id: string | null
          pickup_code: string | null
          price: number | null
          receipt_url: string | null
          status_id: number | null
          tariff_price: number | null
          user_id: string | null
        }
        Insert: {
          club_id?: number | null
          created_at?: string | null
          created_date?: string | null
          daily_sequence?: number | null
          id?: string
          is_tariff_based?: boolean | null
          order_number?: string | null
          package_id?: string | null
          pickup_code?: string | null
          price?: number | null
          receipt_url?: string | null
          status_id?: number | null
          tariff_price?: number | null
          user_id?: string | null
        }
        Update: {
          club_id?: number | null
          created_at?: string | null
          created_date?: string | null
          daily_sequence?: number | null
          id?: string
          is_tariff_based?: boolean | null
          order_number?: string | null
          package_id?: string | null
          pickup_code?: string | null
          price?: number | null
          receipt_url?: string | null
          status_id?: number | null
          tariff_price?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "dim_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_history: {
        Row: {
          cleanliness_rating: number | null
          club_id: number
          comment: string | null
          created_at: string | null
          id: string
          improvement_suggestions: string | null
          order_id: string
          rating: number | null
          service_quality: number | null
          speed_rating: number | null
          staff_rating: number | null
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          cleanliness_rating?: number | null
          club_id: number
          comment?: string | null
          created_at?: string | null
          id?: string
          improvement_suggestions?: string | null
          order_id: string
          rating?: number | null
          service_quality?: number | null
          speed_rating?: number | null
          staff_rating?: number | null
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          cleanliness_rating?: number | null
          club_id?: number
          comment?: string | null
          created_at?: string | null
          id?: string
          improvement_suggestions?: string | null
          order_id?: string
          rating?: number | null
          service_quality?: number | null
          speed_rating?: number | null
          staff_rating?: number | null
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "satisfaction_history_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "satisfaction_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_management_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          chat_id: number
          context: Json | null
          id: string
          last_updated: string | null
          state: string
        }
        Insert: {
          chat_id: number
          context?: Json | null
          id?: string
          last_updated?: string | null
          state: string
        }
        Update: {
          chat_id?: number
          context?: Json | null
          id?: string
          last_updated?: string | null
          state?: string
        }
        Relationships: []
      }
      tariff_plans: {
        Row: {
          club_id: number
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_items_per_month: number | null
          monthly_fee: number | null
          name: string
          price_per_item: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          club_id: number
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_items_per_month?: number | null
          monthly_fee?: number | null
          name: string
          price_per_item?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          club_id?: number
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_items_per_month?: number | null
          monthly_fee?: number | null
          name?: string
          price_per_item?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariff_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "tariff_plans_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          club_id: number
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          last_reset_date: string | null
          monthly_limit: number | null
          start_date: string | null
          subscription_type_id: number
          tariff_plan_id: string | null
          updated_at: string | null
          used_this_month: number | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          club_id: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_reset_date?: string | null
          monthly_limit?: number | null
          start_date?: string | null
          subscription_type_id: number
          tariff_plan_id?: string | null
          updated_at?: string | null
          used_this_month?: number | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          club_id?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_reset_date?: string | null
          monthly_limit?: number | null
          start_date?: string | null
          subscription_type_id?: number
          tariff_plan_id?: string | null
          updated_at?: string | null
          used_this_month?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "user_subscriptions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "user_subscriptions_subscription_type_id_fkey"
            columns: ["subscription_type_id"]
            isOneToOne: false
            referencedRelation: "dim_subscription_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_tariff_plan_id_fkey"
            columns: ["tariff_plan_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["tariff_plan_id"]
          },
          {
            foreignKeyName: "user_subscriptions_tariff_plan_id_fkey"
            columns: ["tariff_plan_id"]
            isOneToOne: false
            referencedRelation: "tariff_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          chat_id: number | null
          club_id: number | null
          created_at: string | null
          id: string
          notify_on_pickup_ready: boolean | null
          notify_on_status_change: boolean | null
          phone: string | null
          subscription_date: string | null
          subscription_id: number | null
          username: string | null
        }
        Insert: {
          chat_id?: number | null
          club_id?: number | null
          created_at?: string | null
          id?: string
          notify_on_pickup_ready?: boolean | null
          notify_on_status_change?: boolean | null
          phone?: string | null
          subscription_date?: string | null
          subscription_id?: number | null
          username?: string | null
        }
        Update: {
          chat_id?: number | null
          club_id?: number | null
          created_at?: string | null
          id?: string
          notify_on_pickup_ready?: boolean | null
          notify_on_status_change?: boolean | null
          phone?: string | null
          subscription_date?: string | null
          subscription_id?: number | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "users_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "users_club_id_fkey1"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_club_id_fkey1"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "users_club_id_fkey1"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "users_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "dim_subscription_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_analytics: {
        Row: {
          club_id: number | null
          club_name: string | null
          created_at: string | null
          id: string | null
          is_tariff_based: boolean | null
          pickup_code: string | null
          price: number | null
          rating: number | null
          rating_comment: string | null
          rating_date: string | null
          status_id: number | null
          status_name: string | null
          subscription_id: number | null
          subscription_type: string | null
          tariff_price: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "dim_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "dim_subscription_types"
            referencedColumns: ["id"]
          },
        ]
      }
      order_management_view: {
        Row: {
          club_code: string | null
          club_id: number | null
          club_name: string | null
          created_at: string | null
          created_date: string | null
          daily_sequence: number | null
          id: string | null
          is_tariff_based: boolean | null
          latest_processed_photo: string | null
          latest_ready_photo: string | null
          latest_received_photo: string | null
          order_number: string | null
          package_id: string | null
          phone: string | null
          pickup_code: string | null
          price: number | null
          processed_photos: number | null
          rating: number | null
          rating_comment: string | null
          rating_date: string | null
          ready_photos: number | null
          receipt_url: string | null
          received_photos: number | null
          status_code: string | null
          status_id: number | null
          status_name: string | null
          subscription_id: number | null
          subscription_type: string | null
          tariff_price: number | null
          unread_notifications: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "tariff_analytics"
            referencedColumns: ["club_id"]
          },
          {
            foreignKeyName: "orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "dim_status_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "dim_subscription_types"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_analytics: {
        Row: {
          avg_cleanliness_rating: number | null
          avg_overall_rating: number | null
          avg_service_quality: number | null
          avg_speed_rating: number | null
          avg_staff_rating: number | null
          club_code: string | null
          club_id: number | null
          club_name: string | null
          five_star_count: number | null
          four_star_count: number | null
          one_star_count: number | null
          recommendation_percentage: number | null
          recommenders: number | null
          reviews_last_30_days: number | null
          reviews_last_7_days: number | null
          three_star_count: number | null
          total_reviews: number | null
          two_star_count: number | null
        }
        Relationships: []
      }
      tariff_analytics: {
        Row: {
          active_subscribers: number | null
          avg_items_per_user: number | null
          club_id: number | null
          club_name: string | null
          max_items_per_month: number | null
          monthly_fee: number | null
          monthly_revenue: number | null
          tariff_name: string | null
          tariff_plan_id: string | null
          total_items_processed: number | null
          users_at_limit: number | null
          utilization_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_tariff_eligibility: {
        Args: { p_club_id: number; p_user_id: string }
        Returns: {
          eligible: boolean
          monthly_limit: number
          needs_payment: boolean
          remaining_items: number
          subscription_type: string
          suggested_price: number
          used_this_month: number
        }[]
      }
      create_satisfaction_entry: {
        Args: {
          p_cleanliness_rating?: number
          p_club_id: number
          p_comment?: string
          p_improvement_suggestions?: string
          p_order_id: string
          p_rating: number
          p_service_quality?: number
          p_speed_rating?: number
          p_staff_rating?: number
          p_user_id: string
          p_would_recommend?: boolean
        }
        Returns: string
      }
      generate_enhanced_order_id: {
        Args: {
          p_club_id: number
          p_created_date?: string
          p_package_id: string
        }
        Returns: string
      }
      generate_pickup_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_subscription_usage: {
        Args: { p_club_id: number; p_increment?: number; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

