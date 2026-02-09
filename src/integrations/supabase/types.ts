export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_checkpoints: {
        Row: {
          anti_bypass_enabled: boolean
          api_token: string | null
          checkpoint_order: number
          created_at: string
          id: string
          provider: string
          provider_url: string
          script_id: string
        }
        Insert: {
          anti_bypass_enabled?: boolean
          api_token?: string | null
          checkpoint_order?: number
          created_at?: string
          id?: string
          provider?: string
          provider_url?: string
          script_id: string
        }
        Update: {
          anti_bypass_enabled?: boolean
          api_token?: string | null
          checkpoint_order?: number
          created_at?: string
          id?: string
          provider?: string
          provider_url?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_checkpoints_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_key_settings: {
        Row: {
          checkpoint_count: number
          created_at: string
          custom_provider_url: string | null
          enabled: boolean
          id: string
          key_duration_hours: number
          linkvertise_enabled: boolean
          script_id: string
        }
        Insert: {
          checkpoint_count?: number
          created_at?: string
          custom_provider_url?: string | null
          enabled?: boolean
          id?: string
          key_duration_hours?: number
          linkvertise_enabled?: boolean
          script_id: string
        }
        Update: {
          checkpoint_count?: number
          created_at?: string
          custom_provider_url?: string | null
          enabled?: boolean
          id?: string
          key_duration_hours?: number
          linkvertise_enabled?: boolean
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_key_settings_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: true
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_scripts: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          downloads: number
          game_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          likes: number
          name: string
          script_content: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          game_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes?: number
          name: string
          script_content?: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          game_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          likes?: number
          name?: string
          script_content?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          amount: number
          api_key: string | null
          created_at: string
          id: string
          invoice_id: string | null
          marketplace_product_id: string | null
          order_id: string
          plan_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          api_key?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          marketplace_product_id?: string | null
          order_id: string
          plan_name: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          api_key?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          marketplace_product_id?: string | null
          order_id?: string
          plan_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_marketplace_product_id_fkey"
            columns: ["marketplace_product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          bot_token: string | null
          created_at: string
          guild_id: string | null
          id: string
          public_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_token?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          public_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_token?: string | null
          created_at?: string
          guild_id?: string | null
          id?: string
          public_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      key_system_providers: {
        Row: {
          created_at: string
          id: string
          key_duration_minutes: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_duration_minutes?: number
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_duration_minutes?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          downloads: number
          id: string
          image_url: string | null
          is_active: boolean
          is_advertised: boolean
          name: string
          price: number
          rating: number
          script_content: string | null
          script_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          downloads?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_advertised?: boolean
          name: string
          price?: number
          rating?: number
          script_content?: string | null
          script_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          downloads?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_advertised?: boolean
          name?: string
          price?: number
          rating?: number
          script_content?: string | null
          script_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_purchases: {
        Row: {
          created_at: string
          id: string
          price_paid: number
          product_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_paid?: number
          product_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_paid?: number
          product_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stats: {
        Row: {
          id: string
          stat_key: string
          stat_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          stat_key: string
          stat_value?: number
          updated_at?: string
        }
        Update: {
          id?: string
          stat_key?: string
          stat_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          created_at: string
          discord_id: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean
          key_creation_count: number
          obfuscation_count: number
          script_creation_count: number
          subscription_expires_at: string | null
          subscription_plan: string
          subscription_started_at: string | null
          tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          key_creation_count?: number
          obfuscation_count?: number
          script_creation_count?: number
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          key_creation_count?: number
          obfuscation_count?: number
          script_creation_count?: number
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      provider_checkpoints: {
        Row: {
          anti_bypass_enabled: boolean
          api_token: string | null
          checkpoint_order: number
          checkpoint_type: string
          created_at: string
          id: string
          provider_id: string
          provider_type: string
          provider_url: string
          url: string
        }
        Insert: {
          anti_bypass_enabled?: boolean
          api_token?: string | null
          checkpoint_order?: number
          checkpoint_type?: string
          created_at?: string
          id?: string
          provider_id: string
          provider_type?: string
          provider_url?: string
          url?: string
        }
        Update: {
          anti_bypass_enabled?: boolean
          api_token?: string | null
          checkpoint_order?: number
          checkpoint_type?: string
          created_at?: string
          id?: string
          provider_id?: string
          provider_type?: string
          provider_url?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_checkpoints_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "key_system_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      script_executions: {
        Row: {
          country: string | null
          created_at: string
          executed_at: string
          executor_ip: string | null
          executor_type: string | null
          hwid: string | null
          id: string
          ip_address: string | null
          key_id: string | null
          roblox_username: string | null
          script_id: string | null
          success: boolean
        }
        Insert: {
          country?: string | null
          created_at?: string
          executed_at?: string
          executor_ip?: string | null
          executor_type?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          roblox_username?: string | null
          script_id?: string | null
          success?: boolean
        }
        Update: {
          country?: string | null
          created_at?: string
          executed_at?: string
          executor_ip?: string | null
          executor_type?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          roblox_username?: string | null
          script_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "script_executions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "script_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_executions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_keys: {
        Row: {
          created_at: string
          discord_id: string | null
          duration_type: string | null
          expires_at: string | null
          hwid: string | null
          id: string
          is_banned: boolean
          key_format: string | null
          key_value: string
          note: string | null
          script_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          duration_type?: string | null
          expires_at?: string | null
          hwid?: string | null
          id?: string
          is_banned?: boolean
          key_format?: string | null
          key_value?: string
          note?: string | null
          script_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          duration_type?: string | null
          expires_at?: string | null
          hwid?: string | null
          id?: string
          is_banned?: boolean
          key_format?: string | null
          key_value?: string
          note?: string | null
          script_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_keys_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_views: {
        Row: {
          can_view_source: boolean
          created_at: string
          id: string
          script_id: string | null
          viewer_ip: string | null
        }
        Insert: {
          can_view_source?: boolean
          created_at?: string
          id?: string
          script_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          can_view_source?: boolean
          created_at?: string
          id?: string
          script_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_views_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          allowed_ips: string[] | null
          anti_debug_enabled: boolean
          anti_tamper_enabled: boolean
          content: string
          created_at: string
          creator_ip: string | null
          discord_webhook_enabled: boolean
          discord_webhook_url: string | null
          enable_spy_warnings: boolean
          execution_count: number
          hwid_lock_enabled: boolean
          id: string
          key_provider_id: string | null
          loader_token: string | null
          name: string
          secure_core_enabled: boolean
          share_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_ips?: string[] | null
          anti_debug_enabled?: boolean
          anti_tamper_enabled?: boolean
          content: string
          created_at?: string
          creator_ip?: string | null
          discord_webhook_enabled?: boolean
          discord_webhook_url?: string | null
          enable_spy_warnings?: boolean
          execution_count?: number
          hwid_lock_enabled?: boolean
          id?: string
          key_provider_id?: string | null
          loader_token?: string | null
          name: string
          secure_core_enabled?: boolean
          share_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_ips?: string[] | null
          anti_debug_enabled?: boolean
          anti_tamper_enabled?: boolean
          content?: string
          created_at?: string
          creator_ip?: string | null
          discord_webhook_enabled?: boolean
          discord_webhook_url?: string | null
          enable_spy_warnings?: boolean
          execution_count?: number
          hwid_lock_enabled?: boolean
          id?: string
          key_provider_id?: string | null
          loader_token?: string | null
          name?: string
          secure_core_enabled?: boolean
          share_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          script_id: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          script_id?: string | null
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          script_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_codes: {
        Row: {
          code: string
          created_at: string
          duration_days: number
          id: string
          is_used: boolean
          plan_name: string
          price: number
          redeemed_at: string | null
          redeemed_by: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          duration_days?: number
          id?: string
          is_used?: boolean
          plan_name: string
          price?: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_used?: boolean
          plan_name?: string
          price?: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          display_name: string
          features: Json | null
          id: string
          key_creation_limit: number
          max_scripts: number
          name: string
          obfuscation_limit: number
          price: number
          script_limit: number
        }
        Insert: {
          created_at?: string
          display_name: string
          features?: Json | null
          id?: string
          key_creation_limit?: number
          max_scripts?: number
          name: string
          obfuscation_limit?: number
          price?: number
          script_limit?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          features?: Json | null
          id?: string
          key_creation_limit?: number
          max_scripts?: number
          name?: string
          obfuscation_limit?: number
          price?: number
          script_limit?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_approved: boolean
          plan_purchased: string | null
          rating: number
          review_text: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          plan_purchased?: string | null
          rating?: number
          review_text: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          plan_purchased?: string | null
          rating?: number
          review_text?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      websocket_sessions: {
        Row: {
          connected_at: string
          disconnected_at: string | null
          executor: string | null
          hwid: string | null
          id: string
          ip_address: string | null
          is_connected: boolean
          last_heartbeat: string
          script_id: string | null
          status: string
          username: string | null
        }
        Insert: {
          connected_at?: string
          disconnected_at?: string | null
          executor?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_connected?: boolean
          last_heartbeat?: string
          script_id?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          connected_at?: string
          disconnected_at?: string | null
          executor?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string | null
          is_connected?: boolean
          last_heartbeat?: string
          script_id?: string | null
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "websocket_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_usage_limit: {
        Args: { p_limit_type: string; p_user_id: string }
        Returns: Json
      }
      deduct_tokens: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_usage: {
        Args: { p_usage_type: string; p_user_id: string }
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
