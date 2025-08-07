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
            foreignKeyName: "account_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
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
          objections: Json | null
          phone: string | null
          pitched: boolean | null
          sales_rep: string | null
          setter: string
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
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          setter: string
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
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          setter?: string
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
        ]
      }
      dials: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: []
      }
      discoveries: {
        Row: {
          account_id: string
          call_outcome: string | null
          contact_name: string
          created_at: string
          date_booked: string
          date_booked_for: string
          email: string | null
          id: string
          phone: string | null
          sales_rep: string | null
          setter: string
          show_outcome: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          call_outcome?: string | null
          contact_name: string
          created_at?: string
          date_booked?: string
          date_booked_for: string
          email?: string | null
          id?: string
          phone?: string | null
          sales_rep?: string | null
          setter: string
          show_outcome?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          call_outcome?: string | null
          contact_name?: string
          created_at?: string
          date_booked?: string
          date_booked_for?: string
          email?: string | null
          id?: string
          phone?: string | null
          sales_rep?: string | null
          setter?: string
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
        ]
      }
      calendar_mappings: {
        Row: {
          id: string
          account_id: string
          ghl_calendar_id: string
          calendar_name: string
          calendar_description: string | null
          is_enabled: boolean
          target_table: 'appointments' | 'discoveries'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          ghl_calendar_id: string
          calendar_name: string
          calendar_description?: string | null
          is_enabled?: boolean
          target_table?: 'appointments' | 'discoveries'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          ghl_calendar_id?: string
          calendar_name?: string
          calendar_description?: string | null
          is_enabled?: boolean
          target_table?: 'appointments' | 'discoveries'
          created_at?: string
          updated_at?: string
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
      ghl_connections: {
        Row: {
          id: string
          account_id: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          ghl_location_id: string | null
          ghl_company_id: string | null
          is_connected: boolean
          connection_status: 'disconnected' | 'connecting' | 'connected' | 'error'
          last_sync_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_company_id?: string | null
          is_connected?: boolean
          connection_status?: 'disconnected' | 'connecting' | 'connected' | 'error'
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_company_id?: string | null
          is_connected?: boolean
          connection_status?: 'disconnected' | 'connecting' | 'connected' | 'error'
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
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
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      revoke_account_access: {
        Args: { user_id: string; account_id: string }
        Returns: boolean
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
  public: {
    Enums: {
      user_role: ["admin", "moderator", "sales_rep", "setter"],
    },
  },
} as const
