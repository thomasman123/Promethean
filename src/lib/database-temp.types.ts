
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          account_id: string
          setter: string
          sales_rep: string | null
          contact_name: string
          phone: string | null
          email: string | null
          call_outcome: string | null
          show_outcome: string | null
          cash_collected: number | null
          total_sales_value: number | null
          pitched: boolean | null
          watched_assets: boolean | null
          lead_quality: number | null
          objections: Json | null
          date_booked_for: string
          date_booked: string
          created_at: string
          updated_at: string
          metadata: Json | null
          setter_user_id: string | null
          sales_rep_user_id: string | null
          setter_ghl_id: string | null
          sales_rep_ghl_id: string | null
          ghl_appointment_id: string | null
          ghl_source: string | null
          source_category: string | null
          specific_source: string | null
          // Existing contact attribution fields
          contact_source: string | null
          contact_utm_source: string | null
          contact_utm_medium: string | null
          contact_utm_campaign: string | null
          contact_utm_content: string | null
          contact_referrer: string | null
          contact_gclid: string | null
          contact_fbclid: string | null
          contact_campaign_id: string | null
          last_attribution_source: Json | null
          // Enhanced attribution fields
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          utm_id: string | null
          fbclid: string | null
          fbc: string | null
          fbp: string | null
          landing_url: string | null
          session_source: string | null
          medium_id: string | null
          user_agent: string | null
          ip_address: string | null
          attribution_data: Json | null
          last_attribution_data: Json | null
          lead_value: string | null
          lead_path: string | null
          business_type: string | null
        }
        Insert: {
          id?: string
          account_id: string
          setter: string
          sales_rep?: string | null
          contact_name: string
          phone?: string | null
          email?: string | null
          call_outcome?: string | null
          show_outcome?: string | null
          cash_collected?: number | null
          total_sales_value?: number | null
          pitched?: boolean | null
          watched_assets?: boolean | null
          lead_quality?: number | null
          objections?: Json | null
          date_booked_for: string
          date_booked?: string
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          setter_user_id?: string | null
          sales_rep_user_id?: string | null
          setter_ghl_id?: string | null
          sales_rep_ghl_id?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          source_category?: string | null
          specific_source?: string | null
          // Existing contact attribution fields
          contact_source?: string | null
          contact_utm_source?: string | null
          contact_utm_medium?: string | null
          contact_utm_campaign?: string | null
          contact_utm_content?: string | null
          contact_referrer?: string | null
          contact_gclid?: string | null
          contact_fbclid?: string | null
          contact_campaign_id?: string | null
          last_attribution_source?: Json | null
          // Enhanced attribution fields
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          utm_id?: string | null
          fbclid?: string | null
          fbc?: string | null
          fbp?: string | null
          landing_url?: string | null
          session_source?: string | null
          medium_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          attribution_data?: Json | null
          last_attribution_data?: Json | null
          lead_value?: string | null
          lead_path?: string | null
          business_type?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          setter?: string
          sales_rep?: string | null
          contact_name?: string
          phone?: string | null
          email?: string | null
          call_outcome?: string | null
          show_outcome?: string | null
          cash_collected?: number | null
          total_sales_value?: number | null
          pitched?: boolean | null
          watched_assets?: boolean | null
          lead_quality?: number | null
          objections?: Json | null
          date_booked_for?: string
          date_booked?: string
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          setter_user_id?: string | null
          sales_rep_user_id?: string | null
          setter_ghl_id?: string | null
          sales_rep_ghl_id?: string | null
          ghl_appointment_id?: string | null
          ghl_source?: string | null
          source_category?: string | null
          specific_source?: string | null
          // Existing contact attribution fields
          contact_source?: string | null
          contact_utm_source?: string | null
          contact_utm_medium?: string | null
          contact_utm_campaign?: string | null
          contact_utm_content?: string | null
          contact_referrer?: string | null
          contact_gclid?: string | null
          contact_fbclid?: string | null
          contact_campaign_id?: string | null
          last_attribution_source?: Json | null
          // Enhanced attribution fields
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          utm_id?: string | null
          fbclid?: string | null
          fbc?: string | null
          fbp?: string | null
          landing_url?: string | null
          session_source?: string | null
          medium_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          attribution_data?: Json | null
          last_attribution_data?: Json | null
          lead_value?: string | null
          lead_path?: string | null
          business_type?: string | null
        }
      }

      discoveries: {
        Row: {
          id: string
          account_id: string
          setter: string
          contact_name: string
          phone: string | null
          email: string | null
          date_booked_for: string
          date_booked: string
          sales_rep: string | null
          call_outcome: string | null
          show_outcome: string | null
          created_at: string
          updated_at: string
          linked_appointment_id: string | null
          setter_user_id: string | null
          setter_ghl_id: string | null
          ghl_source: string | null
          source_category: string | null
          specific_source: string | null
          // Existing contact attribution fields
          contact_source: string | null
          contact_utm_source: string | null
          contact_utm_medium: string | null
          contact_utm_campaign: string | null
          contact_utm_content: string | null
          contact_referrer: string | null
          contact_gclid: string | null
          contact_fbclid: string | null
          contact_campaign_id: string | null
          last_attribution_source: Json | null
          // Enhanced attribution fields
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          utm_id: string | null
          fbclid: string | null
          fbc: string | null
          fbp: string | null
          landing_url: string | null
          session_source: string | null
          medium_id: string | null
          user_agent: string | null
          ip_address: string | null
          attribution_data: Json | null
          last_attribution_data: Json | null
          lead_value: string | null
          lead_path: string | null
          business_type: string | null
        }
        Insert: {
          id?: string
          account_id: string
          setter: string
          contact_name: string
          phone?: string | null
          email?: string | null
          date_booked_for: string
          date_booked?: string
          sales_rep?: string | null
          call_outcome?: string | null
          show_outcome?: string | null
          created_at?: string
          updated_at?: string
          linked_appointment_id?: string | null
          setter_user_id?: string | null
          setter_ghl_id?: string | null
          ghl_source?: string | null
          source_category?: string | null
          specific_source?: string | null
          // Existing contact attribution fields
          contact_source?: string | null
          contact_utm_source?: string | null
          contact_utm_medium?: string | null
          contact_utm_campaign?: string | null
          contact_utm_content?: string | null
          contact_referrer?: string | null
          contact_gclid?: string | null
          contact_fbclid?: string | null
          contact_campaign_id?: string | null
          last_attribution_source?: Json | null
          // Enhanced attribution fields
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          utm_id?: string | null
          fbclid?: string | null
          fbc?: string | null
          fbp?: string | null
          landing_url?: string | null
          session_source?: string | null
          medium_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          attribution_data?: Json | null
          last_attribution_data?: Json | null
          lead_value?: string | null
          lead_path?: string | null
          business_type?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          setter?: string
          contact_name?: string
          phone?: string | null
          email?: string | null
          date_booked_for?: string
          date_booked?: string
          sales_rep?: string | null
          call_outcome?: string | null
          show_outcome?: string | null
          created_at?: string
          updated_at?: string
          linked_appointment_id?: string | null
          setter_user_id?: string | null
          setter_ghl_id?: string | null
          ghl_source?: string | null
          source_category?: string | null
          specific_source?: string | null
          // Existing contact attribution fields
          contact_source?: string | null
          contact_utm_source?: string | null
          contact_utm_medium?: string | null
          contact_utm_campaign?: string | null
          contact_utm_content?: string | null
          contact_referrer?: string | null
          contact_gclid?: string | null
          contact_fbclid?: string | null
          contact_campaign_id?: string | null
          last_attribution_source?: Json | null
          // Enhanced attribution fields
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          utm_id?: string | null
          fbclid?: string | null
          fbc?: string | null
          fbp?: string | null
          landing_url?: string | null
          session_source?: string | null
          medium_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
          attribution_data?: Json | null
          last_attribution_data?: Json | null
          lead_value?: string | null
          lead_path?: string | null
          business_type?: string | null
        }
      }

      // ... existing tables ...
    }
    Views: {
      // ... existing views ...
    }
    Functions: {
      // ... existing functions ...
      
      extract_attribution_from_contact: {
        Args: {
          contact_data: Json
        }
        Returns: {
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          utm_id: string | null
          fbclid: string | null
          fbc: string | null
          fbp: string | null
          landing_url: string | null
          session_source: string | null
          medium_id: string | null
          user_agent: string | null
          ip_address: string | null
          attribution_data: Json | null
          last_attribution_data: Json | null
          lead_value: string | null
          lead_path: string | null
          business_type: string | null
        }[]
      }
      
      classify_enhanced_attribution: {
        Args: {
          p_utm_source: string | null
          p_utm_medium: string | null
          p_utm_campaign: string | null
          p_session_source: string | null
          p_fbclid: string | null
          p_landing_url: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      // ... existing enums ...
    }
    CompositeTypes: {
      // ... existing composite types ...
    }
  }
}

// Enhanced attribution interfaces
export interface EnhancedAttribution {
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  utm_id?: string | null
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
  landing_url?: string | null
  session_source?: string | null
  medium_id?: string | null
  user_agent?: string | null
  ip_address?: string | null
  attribution_data?: Json | null
  last_attribution_data?: Json | null
  lead_value?: string | null
  lead_path?: string | null
  business_type?: string | null
}

export interface AttributionData {
  primary_source: string
  source_category: string
  specific_source?: string | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  attribution_type: 'paid_social' | 'paid_search' | 'email' | 'organic_social' | 'other' | 'unknown'
}

export interface GHLAttributionSource {
  sessionSource?: string
  url?: string
  campaign?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
  utmKeyword?: string | null
  utmMatchtype?: string | null
  referrer?: string | null
  fbclid?: string
  gclid?: string | null
  fbc?: string
  fbp?: string
  userAgent?: string
  ip?: string
  gaClientId?: string | null
  medium?: string
  mediumId?: string
  adName?: string | null
  adGroupId?: string | null
  adId?: string | null
  gbraid?: string | null
  wbraid?: string | null
  utm_id?: string
}

export interface GHLContact {
  id: string
  dateAdded: string
  tags: string[]
  type: string
  locationId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  country?: string
  source?: string
  timezone?: string
  assignedTo?: string
  customField?: Array<{
    id: string
    value: string
  }>
  attributionSource?: GHLAttributionSource
  lastAttributionSource?: GHLAttributionSource
}

