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
          is_agency: boolean | null
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
          is_agency?: boolean | null
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
          is_agency?: boolean | null
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
          campaign_attribution_id: string | null
          cash_collected: number | null
          contact_name: string
          created_at: string
          date_booked: string
          date_booked_for: string
          email: string | null
          ghl_appointment_id: string | null
          ghl_source: string | null
          id: string
          lead_quality: number | null
          metadata: Json | null
          objections: Json | null
          phone: string | null
          pitched: boolean | null
          sales_rep: string | null
          sales_rep_ghl_id: string | null
          sales_rep_user_id: string | null
          setter: string
          setter_ghl_id: string | null
          setter_user_id: string | null
          show_outcome: string | null
          source_category: string | null
          specific_source: string | null
          total_sales_value: number | null
          updated_at: string
          watched_assets: boolean | null
        }
        Insert: {
          account_id: string
          call_outcome?: string | null
          campaign_attribution_id?: string | null
          cash_collected?: number | null
          contact_name: string
          created_at?: string
          date_booked?: string
          date_booked_for: string
          email?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          id?: string
          lead_quality?: number | null
          metadata?: Json | null
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          sales_rep_ghl_id?: string | null
          sales_rep_user_id?: string | null
          setter: string
          setter_ghl_id?: string | null
          setter_user_id?: string | null
          show_outcome?: string | null
          source_category?: string | null
          specific_source?: string | null
          total_sales_value?: number | null
          updated_at?: string
          watched_assets?: boolean | null
        }
        Update: {
          account_id?: string
          call_outcome?: string | null
          campaign_attribution_id?: string | null
          cash_collected?: number | null
          contact_name?: string
          created_at?: string
          date_booked?: string
          date_booked_for?: string
          email?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          id?: string
          lead_quality?: number | null
          metadata?: Json | null
          objections?: Json | null
          phone?: string | null
          pitched?: boolean | null
          sales_rep?: string | null
          sales_rep_ghl_id?: string | null
          sales_rep_user_id?: string | null
          setter?: string
          setter_ghl_id?: string | null
          setter_user_id?: string | null
          show_outcome?: string | null
          source_category?: string | null
          specific_source?: string | null
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
            foreignKeyName: "appointments_campaign_attribution_id_fkey"
            columns: ["campaign_attribution_id"]
            isOneToOne: false
            referencedRelation: "campaign_attribution"
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
          {
            foreignKeyName: "appointments_source_category_fkey"
            columns: ["source_category"]
            isOneToOne: false
            referencedRelation: "source_categories"
            referencedColumns: ["name"]
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
      campaign_attribution: {
        Row: {
          account_id: string
          ad_id: string | null
          ad_name: string | null
          ad_set_id: string | null
          ad_set_name: string | null
          campaign_id: string
          campaign_name: string | null
          created_at: string | null
          id: string
          platform: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          account_id: string
          ad_id?: string | null
          ad_name?: string | null
          ad_set_id?: string | null
          ad_set_name?: string | null
          campaign_id: string
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          platform: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          account_id?: string
          ad_id?: string | null
          ad_name?: string | null
          ad_set_id?: string | null
          ad_set_name?: string | null
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string | null
          id?: string
          platform?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_attribution_account_id_fkey"
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
          sales_rep_ghl_id: string | null
          setter: string
          setter_ghl_id: string | null
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
          sales_rep_ghl_id?: string | null
          setter: string
          setter_ghl_id?: string | null
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
          sales_rep_ghl_id?: string | null
          setter?: string
          setter_ghl_id?: string | null
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
          campaign_attribution_id: string | null
          contact_name: string
          created_at: string
          date_booked: string
          date_booked_for: string
          email: string | null
          ghl_appointment_id: string | null
          ghl_source: string | null
          id: string
          lead_quality: number | null
          linked_appointment_id: string | null
          metadata: Json | null
          phone: string | null
          sales_rep: string | null
          sales_rep_ghl_id: string | null
          sales_rep_user_id: string | null
          setter: string
          setter_ghl_id: string | null
          setter_user_id: string | null
          show_outcome: string | null
          source_category: string | null
          specific_source: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          call_outcome?: string | null
          call_sid?: string | null
          campaign_attribution_id?: string | null
          contact_name: string
          created_at?: string
          date_booked?: string
          date_booked_for: string
          email?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          id?: string
          lead_quality?: number | null
          linked_appointment_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sales_rep?: string | null
          sales_rep_ghl_id?: string | null
          sales_rep_user_id?: string | null
          setter: string
          setter_ghl_id?: string | null
          setter_user_id?: string | null
          show_outcome?: string | null
          source_category?: string | null
          specific_source?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          call_outcome?: string | null
          call_sid?: string | null
          campaign_attribution_id?: string | null
          contact_name?: string
          created_at?: string
          date_booked?: string
          date_booked_for?: string
          email?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          id?: string
          lead_quality?: number | null
          linked_appointment_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sales_rep?: string | null
          sales_rep_ghl_id?: string | null
          sales_rep_user_id?: string | null
          setter?: string
          setter_ghl_id?: string | null
          setter_user_id?: string | null
          show_outcome?: string | null
          source_category?: string | null
          specific_source?: string | null
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
            foreignKeyName: "discoveries_campaign_attribution_id_fkey"
            columns: ["campaign_attribution_id"]
            isOneToOne: false
            referencedRelation: "campaign_attribution"
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
          {
            foreignKeyName: "discoveries_source_category_fkey"
            columns: ["source_category"]
            isOneToOne: false
            referencedRelation: "source_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      ghl_source_mappings: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          ghl_source: string
          id: string
          is_active: boolean | null
          source_category: string
          specific_source: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          ghl_source: string
          id?: string
          is_active?: boolean | null
          source_category: string
          specific_source?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          ghl_source?: string
          id?: string
          is_active?: boolean | null
          source_category?: string
          specific_source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_source_mappings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_source_mappings_source_category_fkey"
            columns: ["source_category"]
            isOneToOne: false
            referencedRelation: "source_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      ghl_users: {
        Row: {
          account_id: string
          activity_count: number | null
          app_user_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          ghl_user_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_invited: boolean | null
          last_name: string | null
          last_seen_at: string | null
          name: string
          phone: string | null
          primary_role: string | null
          roles: string[] | null
          sales_rep_activity_count: number | null
          setter_activity_count: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          activity_count?: number | null
          app_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          ghl_user_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_invited?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          name: string
          phone?: string | null
          primary_role?: string | null
          roles?: string[] | null
          sales_rep_activity_count?: number | null
          setter_activity_count?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          activity_count?: number | null
          app_user_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          ghl_user_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_invited?: boolean | null
          last_name?: string | null
          last_seen_at?: string | null
          name?: string
          phone?: string | null
          primary_role?: string | null
          roles?: string[] | null
          sales_rep_activity_count?: number | null
          setter_activity_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
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
      pending_users: {
        Row: {
          account_id: string
          created_at: string | null
          email: string | null
          first_name: string | null
          first_seen_at: string | null
          ghl_user_id: string
          id: string
          invite_accepted: boolean | null
          invite_sent: boolean | null
          invited_at: string | null
          invited_by: string | null
          last_name: string | null
          last_seen_at: string | null
          name: string
          permissions: Json | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          first_seen_at?: string | null
          ghl_user_id: string
          id?: string
          invite_accepted?: boolean | null
          invite_sent?: boolean | null
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          name: string
          permissions?: Json | null
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          first_seen_at?: string | null
          ghl_user_id?: string
          id?: string
          invite_accepted?: boolean | null
          invite_sent?: boolean | null
          invited_at?: string | null
          invited_by?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          name?: string
          permissions?: Json | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_account_id_fkey"
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
      source_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
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
      dashboard_candidates: {
        Row: {
          account_id: string | null
          activity_count: number | null
          candidate_role: string | null
          email: string | null
          ghl_user_id: string | null
          id: string | null
          is_app_user: boolean | null
          is_invited: boolean | null
          name: string | null
          primary_role: string | null
        }
        Insert: {
          account_id?: string | null
          activity_count?: number | null
          candidate_role?: never
          email?: string | null
          ghl_user_id?: string | null
          id?: string | null
          is_app_user?: never
          is_invited?: boolean | null
          name?: string | null
          primary_role?: string | null
        }
        Update: {
          account_id?: string | null
          activity_count?: number | null
          candidate_role?: never
          email?: string | null
          ghl_user_id?: string | null
          id?: string | null
          is_app_user?: never
          is_invited?: boolean | null
          name?: string | null
          primary_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghl_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      pending_users_with_stats: {
        Row: {
          account_id: string | null
          appointment_count: number | null
          created_at: string | null
          dial_count: number | null
          discovery_count: number | null
          email: string | null
          first_name: string | null
          first_seen_at: string | null
          ghl_user_id: string | null
          id: string | null
          invite_accepted: boolean | null
          invite_sent: boolean | null
          invited_at: string | null
          invited_by: string | null
          invited_by_email: string | null
          invited_by_name: string | null
          last_name: string | null
          last_seen_at: string | null
          name: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      source_attribution_summary: {
        Row: {
          account_id: string | null
          source_category: string | null
          specific_source: string | null
          total_appointments: number | null
          total_revenue: number | null
          won_appointments: number | null
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
            foreignKeyName: "appointments_source_category_fkey"
            columns: ["source_category"]
            isOneToOne: false
            referencedRelation: "source_categories"
            referencedColumns: ["name"]
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
      backfill_user_data_on_invitation: {
        Args: {
          p_account_id: string
          p_ghl_user_id: string
          p_app_user_id: string
        }
        Returns: {
          appointments_updated: number
          discoveries_updated: number
          dials_updated: number
        }[]
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
      get_unmapped_sources: {
        Args: { p_account_id: string }
        Returns: {
          ghl_source: string
        }[]
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
      invite_pending_user: {
        Args: { p_pending_user_id: string; p_invited_by?: string }
        Returns: boolean
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
      sync_ghl_users_from_existing_data: {
        Args: { p_account_id: string }
        Returns: number
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
      toggle_account_agency_status: {
        Args: { p_account_id: string; p_is_agency: boolean }
        Returns: boolean
      }
      update_ghl_user_roles: {
        Args: { p_account_id: string; p_ghl_user_id: string }
        Returns: undefined
      }
      update_ghl_user_roles_with_context: {
        Args: {
          p_account_id: string
          p_ghl_user_id: string
          p_current_role?: string
        }
        Returns: undefined
      }
      upsert_ghl_user: {
        Args: {
          p_account_id: string
          p_ghl_user_id: string
          p_name: string
          p_email?: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_primary_role?: string
        }
        Returns: string
      }
      upsert_pending_user: {
        Args: {
          p_account_id: string
          p_ghl_user_id: string
          p_name: string
          p_email?: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_role?: string
          p_permissions?: Json
        }
        Returns: string
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
