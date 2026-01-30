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
          anti_bypass_enabled: boolean | null
          api_token: string | null
          callback_token: string | null
          checkpoint_order: number
          created_at: string
          id: string
          provider: string
          provider_url: string
          script_id: string
          updated_at: string
        }
        Insert: {
          anti_bypass_enabled?: boolean | null
          api_token?: string | null
          callback_token?: string | null
          checkpoint_order?: number
          created_at?: string
          id?: string
          provider: string
          provider_url: string
          script_id: string
          updated_at?: string
        }
        Update: {
          anti_bypass_enabled?: boolean | null
          api_token?: string | null
          callback_token?: string | null
          checkpoint_order?: number
          created_at?: string
          id?: string
          provider?: string
          provider_url?: string
          script_id?: string
          updated_at?: string
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
      ad_key_sessions: {
        Row: {
          checkpoint_started_at: string | null
          completed_at: string | null
          created_at: string
          current_step: number
          generated_key: string | null
          hwid: string | null
          id: string
          ip_address: string
          key_expires_at: string | null
          last_activity_at: string | null
          pending_checkpoint_id: string | null
          script_id: string
          session_token: string
          step1_completed_at: string | null
          step2_completed_at: string | null
          step3_completed_at: string | null
          total_steps: number
        }
        Insert: {
          checkpoint_started_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          generated_key?: string | null
          hwid?: string | null
          id?: string
          ip_address: string
          key_expires_at?: string | null
          last_activity_at?: string | null
          pending_checkpoint_id?: string | null
          script_id: string
          session_token?: string
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          step3_completed_at?: string | null
          total_steps?: number
        }
        Update: {
          checkpoint_started_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          generated_key?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string
          key_expires_at?: string | null
          last_activity_at?: string | null
          pending_checkpoint_id?: string | null
          script_id?: string
          session_token?: string
          step1_completed_at?: string | null
          step2_completed_at?: string | null
          step3_completed_at?: string | null
          total_steps?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_key_sessions_pending_checkpoint_id_fkey"
            columns: ["pending_checkpoint_id"]
            isOneToOne: false
            referencedRelation: "ad_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_key_sessions_script_id_fkey"
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
          linkvertise_enabled: boolean | null
          script_id: string
          updated_at: string
        }
        Insert: {
          checkpoint_count?: number
          created_at?: string
          custom_provider_url?: string | null
          enabled?: boolean
          id?: string
          key_duration_hours?: number
          linkvertise_enabled?: boolean | null
          script_id: string
          updated_at?: string
        }
        Update: {
          checkpoint_count?: number
          created_at?: string
          custom_provider_url?: string | null
          enabled?: boolean
          id?: string
          key_duration_hours?: number
          linkvertise_enabled?: boolean | null
          script_id?: string
          updated_at?: string
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
      api_requests: {
        Row: {
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          key_id: string | null
          method: string
          response_time_ms: number | null
          script_id: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          method?: string
          response_time_ms?: number | null
          script_id?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          key_id?: string | null
          method?: string
          response_time_ms?: number | null
          script_id?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_requests_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "script_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_requests_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
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
          downloads: number | null
          game_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          script_content: string
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          game_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          script_content: string
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          game_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          script_content?: string
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      delivery_sessions: {
        Row: {
          chunk_count: number
          context_hash: string
          created_at: string
          delivered_chunks: Json
          game_id: string
          hwid_hash: string
          id: string
          key_id: string | null
          last_activity: string
          place_id: string
          script_id: string
          session_token: string
        }
        Insert: {
          chunk_count: number
          context_hash: string
          created_at?: string
          delivered_chunks?: Json
          game_id?: string
          hwid_hash: string
          id?: string
          key_id?: string | null
          last_activity?: string
          place_id?: string
          script_id: string
          session_token: string
        }
        Update: {
          chunk_count?: number
          context_hash?: string
          created_at?: string
          delivered_chunks?: Json
          game_id?: string
          hwid_hash?: string
          id?: string
          key_id?: string | null
          last_activity?: string
          place_id?: string
          script_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_sessions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "script_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          allow_user_hwid_reset: boolean | null
          api_key: string
          bot_token: string | null
          buyer_role_id: string | null
          created_at: string
          guild_id: string
          hwid_reset_cooldown_hours: number | null
          id: string
          log_channel_id: string | null
          manager_role_id: string | null
          public_key: string | null
          script_id: string | null
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          allow_user_hwid_reset?: boolean | null
          api_key: string
          bot_token?: string | null
          buyer_role_id?: string | null
          created_at?: string
          guild_id: string
          hwid_reset_cooldown_hours?: number | null
          id?: string
          log_channel_id?: string | null
          manager_role_id?: string | null
          public_key?: string | null
          script_id?: string | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          allow_user_hwid_reset?: boolean | null
          api_key?: string
          bot_token?: string | null
          buyer_role_id?: string | null
          created_at?: string
          guild_id?: string
          hwid_reset_cooldown_hours?: number | null
          id?: string
          log_channel_id?: string | null
          manager_role_id?: string | null
          public_key?: string | null
          script_id?: string | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_servers_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          downloads: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_advertised: boolean | null
          name: string
          price: number
          rating: number | null
          script_content: string | null
          script_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_advertised?: boolean | null
          name: string
          price?: number
          rating?: number | null
          script_content?: string | null
          script_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          downloads?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_advertised?: boolean | null
          name?: string
          price?: number
          rating?: number | null
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
          amount: number
          id: string
          license_key: string
          product_id: string
          purchased_at: string
          script_content: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          id?: string
          license_key?: string
          product_id: string
          purchased_at?: string
          script_content?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          license_key?: string
          product_id?: string
          purchased_at?: string
          script_content?: string | null
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
      obfuscated_loaders: {
        Row: {
          created_at: string
          id: string
          loader_code: string
          luraph_job_id: string | null
          script_hash: string
          script_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          loader_code: string
          luraph_job_id?: string | null
          script_hash: string
          script_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          loader_code?: string
          luraph_job_id?: string | null
          script_hash?: string
          script_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obfuscated_loaders_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: true
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
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
          is_admin: boolean | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          id: string
          promo_code_id: string | null
          used_at: string | null
          user_email: string
        }
        Insert: {
          id?: string
          promo_code_id?: string | null
          used_at?: string | null
          user_email: string
        }
        Update: {
          id?: string
          promo_code_id?: string | null
          used_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_percent: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempts: number
          blocked_until: string | null
          endpoint: string
          first_attempt_at: string
          id: string
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          endpoint: string
          first_attempt_at?: string
          id?: string
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          endpoint?: string
          first_attempt_at?: string
          id?: string
          identifier?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          created_at: string
          discount_percent: number | null
          duration_days: number | null
          id: string
          payment_method: string | null
          plan_name: string
          promo_code: string | null
          status: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          discount_percent?: number | null
          duration_days?: number | null
          id?: string
          payment_method?: string | null
          plan_name: string
          promo_code?: string | null
          status?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          discount_percent?: number | null
          duration_days?: number | null
          id?: string
          payment_method?: string | null
          plan_name?: string
          promo_code?: string | null
          status?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      script_assets: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          id: string
          name: string
          script_id: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          file_type: string
          id?: string
          name: string
          script_id: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          script_id?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_assets_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_executions: {
        Row: {
          country: string | null
          executed_at: string
          executor_ip: string | null
          executor_type: string | null
          hwid: string | null
          id: string
          key_id: string | null
          roblox_user_id: string | null
          roblox_username: string | null
          script_id: string
        }
        Insert: {
          country?: string | null
          executed_at?: string
          executor_ip?: string | null
          executor_type?: string | null
          hwid?: string | null
          id?: string
          key_id?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          script_id: string
        }
        Update: {
          country?: string | null
          executed_at?: string
          executor_ip?: string | null
          executor_type?: string | null
          hwid?: string | null
          id?: string
          key_id?: string | null
          roblox_user_id?: string | null
          roblox_username?: string | null
          script_id?: string
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
          discord_avatar_url: string | null
          discord_id: string | null
          duration_type: string | null
          execution_count: number | null
          expires_at: string | null
          hwid: string | null
          hwid_reset_count: number | null
          id: string
          is_banned: boolean
          key_format: string | null
          key_value: string
          last_hwid_reset: string | null
          last_warning_at: string | null
          note: string | null
          script_id: string
          used_at: string | null
          warning_count: number | null
        }
        Insert: {
          created_at?: string
          discord_avatar_url?: string | null
          discord_id?: string | null
          duration_type?: string | null
          execution_count?: number | null
          expires_at?: string | null
          hwid?: string | null
          hwid_reset_count?: number | null
          id?: string
          is_banned?: boolean
          key_format?: string | null
          key_value?: string
          last_hwid_reset?: string | null
          last_warning_at?: string | null
          note?: string | null
          script_id: string
          used_at?: string | null
          warning_count?: number | null
        }
        Update: {
          created_at?: string
          discord_avatar_url?: string | null
          discord_id?: string | null
          duration_type?: string | null
          execution_count?: number | null
          expires_at?: string | null
          hwid?: string | null
          hwid_reset_count?: number | null
          id?: string
          is_banned?: boolean
          key_format?: string | null
          key_value?: string
          last_hwid_reset?: string | null
          last_warning_at?: string | null
          note?: string | null
          script_id?: string
          used_at?: string | null
          warning_count?: number | null
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
          can_view_source: boolean | null
          created_at: string
          id: string
          script_id: string
          viewer_ip: string
        }
        Insert: {
          can_view_source?: boolean | null
          created_at?: string
          id?: string
          script_id: string
          viewer_ip: string
        }
        Update: {
          can_view_source?: boolean | null
          created_at?: string
          id?: string
          script_id?: string
          viewer_ip?: string
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
          anti_debug_enabled: boolean | null
          anti_tamper_enabled: boolean | null
          content: string
          created_at: string
          creator_ip: string | null
          disable_validation_gui: boolean | null
          discord_webhook_enabled: boolean | null
          discord_webhook_url: string | null
          enable_spy_warnings: boolean | null
          execution_count: number | null
          hwid_lock_enabled: boolean | null
          id: string
          last_execution_at: string | null
          loader_token: string
          max_warnings: number | null
          name: string
          secure_core_enabled: boolean | null
          share_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_ips?: string[] | null
          anti_debug_enabled?: boolean | null
          anti_tamper_enabled?: boolean | null
          content: string
          created_at?: string
          creator_ip?: string | null
          disable_validation_gui?: boolean | null
          discord_webhook_enabled?: boolean | null
          discord_webhook_url?: string | null
          enable_spy_warnings?: boolean | null
          execution_count?: number | null
          hwid_lock_enabled?: boolean | null
          id?: string
          last_execution_at?: string | null
          loader_token: string
          max_warnings?: number | null
          name: string
          secure_core_enabled?: boolean | null
          share_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_ips?: string[] | null
          anti_debug_enabled?: boolean | null
          anti_tamper_enabled?: boolean | null
          content?: string
          created_at?: string
          creator_ip?: string | null
          disable_validation_gui?: boolean | null
          discord_webhook_enabled?: boolean | null
          discord_webhook_url?: string | null
          enable_spy_warnings?: boolean | null
          execution_count?: number | null
          hwid_lock_enabled?: boolean | null
          id?: string
          last_execution_at?: string | null
          loader_token?: string
          max_warnings?: number | null
          name?: string
          secure_core_enabled?: boolean | null
          share_code?: string
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
          key_id: string | null
          script_id: string | null
          severity: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          key_id?: string | null
          script_id?: string | null
          severity?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          key_id?: string | null
          script_id?: string | null
          severity?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      subscription_codes: {
        Row: {
          code: string
          created_at: string | null
          duration_days: number
          id: string
          is_used: boolean | null
          plan_name: string
          price: number
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string | null
          duration_days: number
          id?: string
          is_used?: boolean | null
          plan_name: string
          price: number
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          duration_days?: number
          id?: string
          is_used?: boolean | null
          plan_name?: string
          price?: number
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
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
          created_at: string
          id: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
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
      used_nonces: {
        Row: {
          id: string
          ip_address: string | null
          nonce: string
          script_id: string
          session_key: string
          timestamp: number
          used_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          nonce: string
          script_id: string
          session_key: string
          timestamp: number
          used_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          nonce?: string
          script_id?: string
          session_key?: string
          timestamp?: number
          used_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          response_code: number | null
          script_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          response_code?: number | null
          script_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          response_code?: number | null
          script_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      websocket_sessions: {
        Row: {
          connected_at: string
          created_at: string
          disconnected_at: string | null
          executor: string | null
          hwid: string | null
          id: string
          ip_address: string
          is_connected: boolean
          key_id: string | null
          kick_reason: string | null
          kicked_by: string | null
          last_heartbeat: string
          metadata: Json | null
          script_id: string
          session_token: string
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          executor?: string | null
          hwid?: string | null
          id?: string
          ip_address: string
          is_connected?: boolean
          key_id?: string | null
          kick_reason?: string | null
          kicked_by?: string | null
          last_heartbeat?: string
          metadata?: Json | null
          script_id: string
          session_token?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          executor?: string | null
          hwid?: string | null
          id?: string
          ip_address?: string
          is_connected?: boolean
          key_id?: string | null
          kick_reason?: string | null
          kicked_by?: string | null
          last_heartbeat?: string
          metadata?: Json | null
          script_id?: string
          session_token?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "websocket_sessions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "script_keys"
            referencedColumns: ["id"]
          },
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
      cleanup_stale_websocket_sessions: { Args: never; Returns: undefined }
      generate_api_key: { Args: never; Returns: string }
      get_api_stats: {
        Args: never
        Returns: {
          avg_response_time_ms: number
          error_count: number
          requests_1h: number
          requests_24h: number
          total_requests: number
          unique_ips: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
