export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_access: {
        Row: {
          account_id: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "account_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          description: string | null
          future_sync_enabled: boolean | null
          future_sync_started_at: string | null
          ghl_api_key: string | null
          ghl_auth_type: string | null
          ghl_location_id: string | null
          ghl_refresh_token: string | null
          ghl_token_expires_at: string | null
          ghl_webhook_id: string | null
          id: string
          is_active: boolean
          last_future_sync_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          future_sync_enabled?: boolean | null
          future_sync_started_at?: string | null
          ghl_api_key?: string | null
          ghl_auth_type?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          ghl_token_expires_at?: string | null
          ghl_webhook_id?: string | null
          id?: string
          is_active?: boolean
          last_future_sync_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          future_sync_enabled?: boolean | null
          future_sync_started_at?: string | null
          ghl_api_key?: string | null
          ghl_auth_type?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          ghl_token_expires_at?: string | null
          ghl_webhook_id?: string | null
          id?: string
          is_active?: boolean
          last_future_sync_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          account_id: string
          call_outcome: string | null
          cash_collected: number | null
          contact_name: string
          created_at: string
          date_booked: string
          date_booked_for: string
          email: string | null
          id: string
          lead_quality: number | null
          metadata: Json | null
          objections: Json | null
          phone: string | null
          pitched: boolean | null
          sales_rep: string | null
          sales_rep_user_id: string | null
          setter: string
          setter_user_id: string | null
          show_outcome: string | null
          total_sales_value: number | null
          updated_at: string
          watched_assets: boolean | null
        }
        Insert: {
          account_id: string
          call_outcome?: string | null
          cash_collected?: number | null
          contact_name: string
          created_at?: string
          date_booked?: string
          date_booked_for: string
          email?: string | null
          id?: string
          lead_quality?: number | null
          metadata?: Json | null
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          sales_rep_user_id?: string | null
          setter: string
          setter_user_id?: string | null
          show_outcome?: string | null
          total_sales_value?: number | null
          updated_at?: string
          watched_assets?: boolean | null
        }
        Update: {
          account_id?: string
          call_outcome?: string | null
          cash_collected?: number | null
          contact_name?: string
          created_at?: string
          date_booked?: string
          date_booked_for?: string
          email?: string | null
          id?: string
          lead_quality?: number | null
          metadata?: Json | null
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          sales_rep_user_id?: string | null
          setter?: string
          setter_user_id?: string | null
          show_outcome?: string | null
          total_sales_value?: number | null
          updated_at?: string
          watched_assets?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sales_rep_user_id_fkey"
            columns: ["sales_rep_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sales_rep_user_id_fkey"
            columns: ["sales_rep_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_mappings: {
        Row: {
          account_id: string
          calendar_description: string | null
          calendar_name: string
          created_at: string | null
          ghl_calendar_id: string
          id: string
          is_enabled: boolean | null
          target_table: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          calendar_description?: string | null
          calendar_name: string
          created_at?: string | null
          ghl_calendar_id: string
          id?: string
          is_enabled?: boolean | null
          target_table?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          calendar_description?: string | null
          calendar_name?: string
          created_at?: string | null
          ghl_calendar_id?: string
          id?: string
          is_enabled?: boolean | null
          target_table?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_views: {
        Row: {
          account_id: string
          compare_entities: Json | null
          compare_mode: boolean | null
          created_at: string
          created_by: string
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          notes: string | null
          scope: string
          updated_at: string
          widgets: Json
        }
        Insert: {
          account_id: string
          compare_entities?: Json | null
          compare_mode?: boolean | null
          created_at?: string
          created_by: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          notes?: string | null
          scope?: string
          updated_at?: string
          widgets?: Json
        }
        Update: {
          account_id?: string
          compare_entities?: Json | null
          compare_mode?: boolean | null
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          notes?: string | null
          scope?: string
          updated_at?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_views_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dials: {
        Row: {
          account_id: string | null
          answered: boolean | null
          call_recording_link: string | null
          contact_name: string
          created_at: string
          date_called: string
          duration: number | null
          email: string | null
          id: string
          meaningful_conversation: boolean | null
          phone: string
          setter: string
          setter_user_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          answered?: boolean | null
          call_recording_link?: string | null
          contact_name: string
          created_at?: string
          date_called?: string
          duration?: number | null
          email?: string | null
          id?: string
          meaningful_conversation?: boolean | null
          phone: string
          setter: string
          setter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          answered?: boolean | null
          call_recording_link?: string | null
          contact_name?: string
          created_at?: string
          date_called?: string
          duration?: number | null
          email?: string | null
          id?: string
          meaningful_conversation?: boolean | null
          phone?: string
          setter?: string
          setter_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dials_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dials_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discoveries: {
        Row: {
          account_id: string
          call_outcome: string | null
          call_sid: string | null
          contact_name: string
          created_at: string
          date_booked: string
          date_booked_for: string
          email: string | null
          id: string
          linked_appointment_id: string | null
          metadata: Json | null
          phone: string | null
          sales_rep: string | null
          sales_rep_user_id: string | null
          setter: string
          setter_user_id: string | null
          show_outcome: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          call_outcome?: string | null
          call_sid?: string | null
          contact_name: string
          created_at?: string
          date_booked?: string
          date_booked_for: string
          email?: string | null
          id?: string
          linked_appointment_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sales_rep?: string | null
          sales_rep_user_id?: string | null
          setter: string
          setter_user_id?: string | null
          show_outcome?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          call_outcome?: string | null
          call_sid?: string | null
          contact_name?: string
          created_at?: string
          date_booked?: string
          date_booked_for?: string
          email?: string | null
          id?: string
          linked_appointment_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sales_rep?: string | null
          sales_rep_user_id?: string | null
          setter?: string
          setter_user_id?: string | null
          show_outcome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discoveries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_linked_appointment_id_fkey"
            columns: ["linked_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_linked_appointment_id_fkey"
            columns: ["linked_appointment_id"]
            isOneToOne: false
            referencedRelation: "discovery_appointment_flow"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "discoveries_sales_rep_user_id_fkey"
            columns: ["sales_rep_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_sales_rep_user_id_fkey"
            columns: ["sales_rep_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "discoveries_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_setter_user_id_fkey"
            columns: ["setter_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          account_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_for_data: boolean
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_for_data?: boolean
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_for_data?: boolean
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          body_length: number | null
          created_at: string | null
          headers: Json | null
          id: string
          ip_address: string | null
          location_id: string | null
          metadata: Json | null
          method: string
          parsed_body: Json | null
          processing_duration_ms: number | null
          processing_error: string | null
          processing_status: string | null
          raw_body: string | null
          request_id: string | null
          response_status: number | null
          source: string | null
          timestamp: string | null
          url: string | null
          user_agent: string | null
          webhook_type: string | null
        }
        Insert: {
          body_length?: number | null
          created_at?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          location_id?: string | null
          metadata?: Json | null
          method?: string
          parsed_body?: Json | null
          processing_duration_ms?: number | null
          processing_error?: string | null
          processing_status?: string | null
          raw_body?: string | null
          request_id?: string | null
          response_status?: number | null
          source?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          webhook_type?: string | null
        }
        Update: {
          body_length?: number | null
          created_at?: string | null
          headers?: Json | null
          id?: string
          ip_address?: string | null
          location_id?: string | null
          metadata?: Json | null
          method?: string
          parsed_body?: Json | null
          processing_duration_ms?: number | null
          processing_error?: string | null
          processing_status?: string | null
          raw_body?: string | null
          request_id?: string | null
          response_status?: number | null
          source?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          webhook_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      discovery_appointment_flow: {
        Row: {
          account_id: string | null
          appointment_date: string | null
          appointment_id: string | null
          appointment_outcome: string | null
          appointment_sales_rep: string | null
          appointment_setter: string | null
          booked_user: string | null
          contact_name: string | null
          discovery_date: string | null
          discovery_id: string | null
          email: string | null
          linked_appointment_id: string | null
          phone: string | null
          show_outcome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discoveries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_linked_appointment_id_fkey"
            columns: ["linked_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discoveries_linked_appointment_id_fkey"
            columns: ["linked_appointment_id"]
            isOneToOne: false
            referencedRelation: "discovery_appointment_flow"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      team_members: {
        Row: {
          account_id: string | null
          created_for_data: boolean | null
          email: string | null
          full_name: string | null
          granted_at: string | null
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_access_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string }
        Returns: boolean
      }
      admin_clean_account_ghl_data: {
        Args: { target_account_id: string }
        Returns: undefined
      }
      admin_complete_account_cleanup: {
        Args: { target_account_id: string }
        Returns: undefined
      }
      convert_data_user_to_invited: {
        Args: { p_user_id: string; p_real_email: string }
        Returns: boolean
      }
      create_data_user_if_not_exists: {
        Args: {
          p_account_id: string
          p_name: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_email?: string
        }
        Returns: string
      }
      create_default_views: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: undefined
      }
      create_invitation: {
        Args: {
          p_account_id: string
          p_email: string
          p_full_name: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          accepted_at: string | null
          account_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          token: string
        }
      }
      execute_metrics_query: {
        Args: { query_sql: string; query_params?: Json }
        Returns: {
          result: Json
        }[]
      }
      execute_metrics_query_array: {
        Args: { query_sql: string; query_params?: Json }
        Returns: Json
      }
      get_user_accounts: {
        Args: { user_id: string }
        Returns: {
          account_id: string
          account_name: string
          account_description: string
          user_role: Database["public"]["Enums"]["user_role"]
          granted_at: string
        }[]
      }
      grant_account_access: {
        Args: {
          p_user_id: string
          p_account_id: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_granted_by_user_id?: string
        }
        Returns: {
          account_id: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
      }
      link_user_to_account_and_backfill: {
        Args: {
          p_account_id: string
          p_email: string
          p_full_name: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          user_id: string
          invited: boolean
        }[]
      }
      mark_discovery_not_booked: {
        Args: { discovery_id: string }
        Returns: boolean
      }
      revoke_account_access: {
        Args: { user_id: string; account_id: string }
        Returns: boolean
      }
      test_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          current_user_role: string
          user_exists_in_profiles: boolean
          user_role_in_profiles: string
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "moderator" | "sales_rep" | "setter"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["admin", "moderator", "sales_rep", "setter"],
    },
  },
} as const
