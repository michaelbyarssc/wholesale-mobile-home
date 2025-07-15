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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_conversions: {
        Row: {
          appointment_id: string | null
          created_at: string
          estimate_id: string | null
          funnel_step: string
          id: string
          metadata: Json | null
          mobile_home_id: string | null
          session_id: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          estimate_id?: string | null
          funnel_step: string
          id?: string
          metadata?: Json | null
          mobile_home_id?: string | null
          session_id: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          estimate_id?: string | null
          funnel_step?: string
          id?: string
          metadata?: Json | null
          mobile_home_id?: string | null
          session_id?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_conversions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_conversions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_conversions_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_conversions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          element_id: string | null
          element_text: string | null
          event_name: string
          event_type: string
          id: string
          page_path: string | null
          properties: Json | null
          session_id: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_name: string
          event_type: string
          id?: string
          page_path?: string | null
          properties?: Json | null
          session_id: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_name?: string
          event_type?: string
          id?: string
          page_path?: string | null
          properties?: Json | null
          session_id?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_mobile_home_views: {
        Row: {
          contact_clicked: boolean | null
          created_at: string
          features_clicked: Json | null
          id: string
          images_viewed: number | null
          mobile_home_id: string
          price_checked: boolean | null
          session_id: string
          time_spent: number | null
          user_id: string | null
          view_type: string
        }
        Insert: {
          contact_clicked?: boolean | null
          created_at?: string
          features_clicked?: Json | null
          id?: string
          images_viewed?: number | null
          mobile_home_id: string
          price_checked?: boolean | null
          session_id: string
          time_spent?: number | null
          user_id?: string | null
          view_type: string
        }
        Update: {
          contact_clicked?: boolean | null
          created_at?: string
          features_clicked?: Json | null
          id?: string
          images_viewed?: number | null
          mobile_home_id?: string
          price_checked?: boolean | null
          session_id?: string
          time_spent?: number | null
          user_id?: string | null
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_mobile_home_views_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_mobile_home_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_page_views: {
        Row: {
          created_at: string
          filters_applied: Json | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          scroll_depth: number | null
          search_query: string | null
          session_id: string
          time_on_page: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters_applied?: Json | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          search_query?: string | null
          session_id: string
          time_on_page?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters_applied?: Json | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          scroll_depth?: number | null
          search_query?: string | null
          session_id?: string
          time_on_page?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_searches: {
        Row: {
          clicked_mobile_home_id: string | null
          clicked_position: number | null
          created_at: string
          filters: Json | null
          id: string
          result_clicked: boolean | null
          results_count: number | null
          search_query: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          clicked_mobile_home_id?: string | null
          clicked_position?: number | null
          created_at?: string
          filters?: Json | null
          id?: string
          result_clicked?: boolean | null
          results_count?: number | null
          search_query?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          clicked_mobile_home_id?: string | null
          clicked_position?: number | null
          created_at?: string
          filters?: Json | null
          id?: string
          result_clicked?: boolean | null
          results_count?: number | null
          search_query?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_searches_clicked_mobile_home_id_fkey"
            columns: ["clicked_mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_searches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          ip_address: unknown | null
          os: string | null
          page_views: number | null
          referrer: string | null
          region: string | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          os?: string | null
          page_views?: number | null
          referrer?: string | null
          region?: string | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown | null
          os?: string | null
          page_views?: number | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      anonymous_chat_users: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_chat_users_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      appointment_notifications: {
        Row: {
          appointment_id: string
          created_at: string
          email_sent: boolean
          id: string
          notification_type: string
          scheduled_for: string | null
          sent_at: string | null
          sms_sent: boolean
        }
        Insert: {
          appointment_id: string
          created_at?: string
          email_sent?: boolean
          id?: string
          notification_type: string
          scheduled_for?: string | null
          sent_at?: string | null
          sms_sent?: boolean
        }
        Update: {
          appointment_id?: string
          created_at?: string
          email_sent?: boolean
          id?: string
          notification_type?: string
          scheduled_for?: string | null
          sent_at?: string | null
          sms_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots: {
        Row: {
          available: boolean
          created_at: string
          current_bookings: number
          date: string
          end_time: string
          id: string
          location_address: string | null
          location_type: string
          max_bookings: number
          mobile_home_id: string | null
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          current_bookings?: number
          date: string
          end_time: string
          id?: string
          location_address?: string | null
          location_type?: string
          max_bookings?: number
          mobile_home_id?: string | null
          notes?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          current_bookings?: number
          date?: string
          end_time?: string
          id?: string
          location_address?: string | null
          location_type?: string
          max_bookings?: number
          mobile_home_id?: string | null
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_templates: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          duration_minutes: number
          end_time: string
          id: string
          location_type: string
          max_bookings: number
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          duration_minutes?: number
          end_time: string
          id?: string
          location_type?: string
          max_bookings?: number
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          duration_minutes?: number
          end_time?: string
          id?: string
          location_type?: string
          max_bookings?: number
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          agent_id: string | null
          appointment_type: string
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          mobile_home_id: string | null
          notes: string | null
          party_size: number
          reminder_sent: boolean
          slot_id: string
          special_requests: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          appointment_type?: string
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          mobile_home_id?: string | null
          notes?: string | null
          party_size?: number
          reminder_sent?: boolean
          slot_id: string
          special_requests?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          appointment_type?: string
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          mobile_home_id?: string | null
          notes?: string | null
          party_size?: number
          reminder_sent?: boolean
          slot_id?: string
          special_requests?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_template_id: string
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          lead_id: string | null
          message_content: string | null
          message_subject: string | null
          metadata: Json | null
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          automation_template_id: string
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_subject?: string | null
          metadata?: Json | null
          scheduled_for: string
          status?: string
          updated_at?: string
        }
        Update: {
          automation_template_id?: string
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_subject?: string | null
          metadata?: Json | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_template_id_fkey"
            columns: ["automation_template_id"]
            isOneToOne: false
            referencedRelation: "automation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_message_templates: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string | null
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      automation_opt_outs: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          opt_out_type: string
          phone: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          opt_out_type: string
          phone?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          opt_out_type?: string
          phone?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_opt_outs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      automation_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_executions_per_lead: number | null
          message_template_id: string | null
          name: string
          target_audience: string
          trigger_conditions: Json | null
          trigger_delay_days: number | null
          trigger_delay_hours: number | null
          trigger_event: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_executions_per_lead?: number | null
          message_template_id?: string | null
          name: string
          target_audience: string
          trigger_conditions?: Json | null
          trigger_delay_days?: number | null
          trigger_delay_hours?: number | null
          trigger_event: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_executions_per_lead?: number | null
          message_template_id?: string | null
          name?: string
          target_audience?: string
          trigger_conditions?: Json | null
          trigger_delay_days?: number | null
          trigger_delay_hours?: number | null
          trigger_event?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_templates_message_template_id_fkey"
            columns: ["message_template_id"]
            isOneToOne: false
            referencedRelation: "automation_message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured: boolean
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          slug: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_mappings: {
        Row: {
          appointment_id: string
          calendar_connection_id: string
          created_at: string
          google_event_id: string
          id: string
          last_synced_at: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          calendar_connection_id: string
          created_at?: string
          google_event_id: string
          id?: string
          last_synced_at?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          calendar_connection_id?: string
          created_at?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_mappings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_mappings_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "user_calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          calendar_integration_id: string
          created_at: string
          delivery_id: string | null
          event_type: string
          external_event_id: string
          id: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          calendar_integration_id: string
          created_at?: string
          delivery_id?: string | null
          event_type: string
          external_event_id: string
          id?: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          calendar_integration_id?: string
          created_at?: string
          delivery_id?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_integration_id_fkey"
            columns: ["calendar_integration_id"]
            isOneToOne: false
            referencedRelation: "calendar_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          calendar_type: string
          created_at: string
          id: string
          last_sync: string | null
          refresh_token: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          calendar_type: string
          created_at?: string
          id?: string
          last_sync?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          calendar_type?: string
          created_at?: string
          id?: string
          last_sync?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_data_capture_settings: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          sender_type: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          agent_id: string | null
          created_at: string
          department: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          priority: string
          session_token: string
          started_at: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          department?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          session_token: string
          started_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          department?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string
          session_token?: string
          started_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          attachments: Json | null
          captured_data: Json | null
          chat_session_id: string | null
          chat_transcript: string | null
          completed_at: string | null
          confidence_scores: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          extraction_reviewed: boolean | null
          id: string
          interaction_type: string
          lead_id: string | null
          metadata: Json | null
          outcome: string | null
          page_source: string | null
          scheduled_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          captured_data?: Json | null
          chat_session_id?: string | null
          chat_transcript?: string | null
          completed_at?: string | null
          confidence_scores?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          extraction_reviewed?: boolean | null
          id?: string
          interaction_type: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          page_source?: string | null
          scheduled_at?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          captured_data?: Json | null
          chat_session_id?: string | null
          chat_transcript?: string | null
          completed_at?: string | null
          confidence_scores?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          extraction_reviewed?: boolean | null
          id?: string
          interaction_type?: string
          lead_id?: string | null
          metadata?: Json | null
          outcome?: string | null
          page_source?: string | null
          scheduled_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_markups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          markup_percentage: number
          minimum_profit_per_home: number
          super_admin_markup_percentage: number | null
          tier_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          markup_percentage?: number
          minimum_profit_per_home?: number
          super_admin_markup_percentage?: number | null
          tier_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          markup_percentage?: number
          minimum_profit_per_home?: number
          super_admin_markup_percentage?: number | null
          tier_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_tracking_sessions: {
        Row: {
          active: boolean
          created_at: string
          customer_user_id: string | null
          expires_at: string
          id: string
          last_viewed: string | null
          order_id: string
          session_token: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_user_id?: string | null
          expires_at?: string
          id?: string
          last_viewed?: string | null
          order_id: string
          session_token: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_user_id?: string | null
          expires_at?: string
          id?: string
          last_viewed?: string | null
          order_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tracking_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          actual_delivery_date: string | null
          actual_pickup_date: string | null
          company_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          crew_type: Database["public"]["Enums"]["delivery_crew_type"]
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_signature_url: string | null
          delivery_address: string
          delivery_cost: number | null
          delivery_number: string
          escort_required: boolean | null
          estimate_id: string | null
          factory_id: string | null
          factory_notification_date: string | null
          factory_ready_date: string | null
          id: string
          invoice_id: string | null
          mileage_cost: number | null
          mobile_home_id: string | null
          mobile_home_type: Database["public"]["Enums"]["mobile_home_type"]
          permit_cost: number | null
          permits_required: boolean | null
          pickup_address: string
          route_restrictions: string | null
          scheduled_delivery_date: string | null
          scheduled_pickup_date: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          total_delivery_cost: number | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_pickup_date?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          crew_type: Database["public"]["Enums"]["delivery_crew_type"]
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_signature_url?: string | null
          delivery_address: string
          delivery_cost?: number | null
          delivery_number: string
          escort_required?: boolean | null
          estimate_id?: string | null
          factory_id?: string | null
          factory_notification_date?: string | null
          factory_ready_date?: string | null
          id?: string
          invoice_id?: string | null
          mileage_cost?: number | null
          mobile_home_id?: string | null
          mobile_home_type: Database["public"]["Enums"]["mobile_home_type"]
          permit_cost?: number | null
          permits_required?: boolean | null
          pickup_address: string
          route_restrictions?: string | null
          scheduled_delivery_date?: string | null
          scheduled_pickup_date?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          total_delivery_cost?: number | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          actual_pickup_date?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          crew_type?: Database["public"]["Enums"]["delivery_crew_type"]
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_signature_url?: string | null
          delivery_address?: string
          delivery_cost?: number | null
          delivery_number?: string
          escort_required?: boolean | null
          estimate_id?: string | null
          factory_id?: string | null
          factory_notification_date?: string | null
          factory_ready_date?: string | null
          id?: string
          invoice_id?: string | null
          mileage_cost?: number | null
          mobile_home_id?: string | null
          mobile_home_type?: Database["public"]["Enums"]["mobile_home_type"]
          permit_cost?: number | null
          permits_required?: boolean | null
          pickup_address?: string
          route_restrictions?: string | null
          scheduled_delivery_date?: string | null
          scheduled_pickup_date?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          total_delivery_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_analytics: {
        Row: {
          average_speed: number | null
          company_id: string | null
          created_at: string
          customer_satisfaction_rating: number | null
          date: string
          delivery_efficiency_score: number | null
          delivery_id: string
          driver_id: string | null
          fuel_cost: number | null
          id: string
          on_time_delivery: boolean | null
          total_distance: number | null
          total_time_minutes: number | null
        }
        Insert: {
          average_speed?: number | null
          company_id?: string | null
          created_at?: string
          customer_satisfaction_rating?: number | null
          date: string
          delivery_efficiency_score?: number | null
          delivery_id: string
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          on_time_delivery?: boolean | null
          total_distance?: number | null
          total_time_minutes?: number | null
        }
        Update: {
          average_speed?: number | null
          company_id?: string | null
          created_at?: string
          customer_satisfaction_rating?: number | null
          date?: string
          delivery_efficiency_score?: number | null
          delivery_id?: string
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          on_time_delivery?: boolean | null
          total_distance?: number | null
          total_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_analytics_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_analytics_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          created_at: string
          delivery_id: string | null
          driver_id: string | null
          hours_logged: number | null
          id: string
          mileage_logged: number | null
          notes: string | null
          role: string
          started_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_id?: string | null
          driver_id?: string | null
          hours_logged?: number | null
          id?: string
          mileage_logged?: number | null
          notes?: string | null
          role?: string
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string
          delivery_id?: string | null
          driver_id?: string | null
          hours_logged?: number | null
          id?: string
          mileage_logged?: number | null
          notes?: string | null
          role?: string
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_checklist_completions: {
        Row: {
          checklist_id: string
          completed_at: string | null
          completed_items: Json
          created_at: string
          delivery_id: string
          driver_id: string
          id: string
          notes: string | null
        }
        Insert: {
          checklist_id: string
          completed_at?: string | null
          completed_items: Json
          created_at?: string
          delivery_id: string
          driver_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          checklist_id?: string
          completed_at?: string | null
          completed_items?: Json
          created_at?: string
          delivery_id?: string
          driver_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_checklist_completions_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "delivery_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklist_completions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklist_completions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_checklists: {
        Row: {
          active: boolean
          checklist_items: Json
          company_id: string | null
          created_at: string
          created_by: string | null
          delivery_type: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          checklist_items: Json
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          checklist_items?: Json
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_documents: {
        Row: {
          created_at: string
          delivery_id: string
          document_type: string
          document_url: string | null
          docusign_envelope_id: string | null
          id: string
          recipient_email: string
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          document_type: string
          document_url?: string | null
          docusign_envelope_id?: string | null
          id?: string
          recipient_email: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          document_type?: string
          document_url?: string | null
          docusign_envelope_id?: string | null
          id?: string
          recipient_email?: string
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_documents_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_gps_tracking: {
        Row: {
          accuracy_meters: number | null
          address: string | null
          battery_level: number | null
          delivery_id: string | null
          driver_id: string | null
          heading: number | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          speed_mph: number | null
          timestamp: string
        }
        Insert: {
          accuracy_meters?: number | null
          address?: string | null
          battery_level?: number | null
          delivery_id?: string | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          speed_mph?: number | null
          timestamp?: string
        }
        Update: {
          accuracy_meters?: number | null
          address?: string | null
          battery_level?: number | null
          delivery_id?: string | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          speed_mph?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_gps_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_gps_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_photos: {
        Row: {
          caption: string | null
          created_at: string
          delivery_id: string | null
          driver_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_type: string
          photo_url: string
          taken_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          delivery_id?: string | null
          driver_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type: string
          photo_url: string
          taken_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          delivery_id?: string | null
          driver_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_type?: string
          photo_url?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_photos_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_photos_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_pieces: {
        Row: {
          created_at: string
          delivery_date: string | null
          delivery_id: string
          dimensions: Json | null
          id: string
          mso_number: string | null
          order_id: string
          pickup_date: string | null
          piece_number: number
          piece_type: string
          status: string
          updated_at: string
          vin_number: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          delivery_id: string
          dimensions?: Json | null
          id?: string
          mso_number?: string | null
          order_id: string
          pickup_date?: string | null
          piece_number: number
          piece_type: string
          status?: string
          updated_at?: string
          vin_number?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          delivery_id?: string
          dimensions?: Json | null
          id?: string
          mso_number?: string | null
          order_id?: string
          pickup_date?: string | null
          piece_number?: number
          piece_type?: string
          status?: string
          updated_at?: string
          vin_number?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_pieces_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_pieces_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          delivery_id: string | null
          id: string
          new_status: Database["public"]["Enums"]["delivery_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["delivery_status"] | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["delivery_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delivery_id?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["delivery_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["delivery_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      docusign_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          template_id: string
          template_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          template_id: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          template_id?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_performance: {
        Row: {
          completion_rating: number | null
          created_at: string
          customer_rating: number | null
          delivery_id: string | null
          driver_id: string | null
          fuel_cost: number | null
          id: string
          notes: string | null
          on_time_delivery: boolean | null
          on_time_pickup: boolean | null
          total_hours: number | null
          total_mileage: number | null
        }
        Insert: {
          completion_rating?: number | null
          created_at?: string
          customer_rating?: number | null
          delivery_id?: string | null
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          notes?: string | null
          on_time_delivery?: boolean | null
          on_time_pickup?: boolean | null
          total_hours?: number | null
          total_mileage?: number | null
        }
        Update: {
          completion_rating?: number | null
          created_at?: string
          customer_rating?: number | null
          delivery_id?: string | null
          driver_id?: string | null
          fuel_cost?: number | null
          id?: string
          notes?: string | null
          on_time_delivery?: boolean | null
          on_time_pickup?: boolean | null
          total_hours?: number | null
          total_mileage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_performance_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_performance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicles: {
        Row: {
          active: boolean
          created_at: string
          dot_number: string | null
          driver_id: string | null
          id: string
          insurance_expiry: string | null
          insurance_policy: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          registration_expiry: string | null
          updated_at: string
          vehicle_type: string
          vin: string | null
          year: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          dot_number?: string | null
          driver_id?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          registration_expiry?: string | null
          updated_at?: string
          vehicle_type: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          dot_number?: string | null
          driver_id?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_policy?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          registration_expiry?: string | null
          updated_at?: string
          vehicle_type?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          cdl_class: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          email: string
          employee_id: string | null
          first_name: string
          hire_date: string
          hourly_rate: number | null
          id: string
          last_name: string
          license_expiry: string | null
          license_number: string | null
          phone: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          cdl_class?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          phone: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          cdl_class?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string | null
          docusign_envelope_id: string | null
          estimate_id: string
          id: string
          recipient_email: string
          signed_at: string | null
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url?: string | null
          docusign_envelope_id?: string | null
          estimate_id: string
          id?: string
          recipient_email: string
          signed_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string | null
          docusign_envelope_id?: string | null
          estimate_id?: string
          id?: string
          recipient_email?: string
          signed_at?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_documents_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          estimate_id: string
          id: string
          item_id: string | null
          item_type: string
          metadata: Json | null
          name: string
          quantity: number
          sku: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          estimate_id: string
          id?: string
          item_id?: string | null
          item_type: string
          metadata?: Json | null
          name: string
          quantity?: number
          sku?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          estimate_id?: string
          id?: string
          item_id?: string | null
          item_type?: string
          metadata?: Json | null
          name?: string
          quantity?: number
          sku?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          additional_requirements: string | null
          approval_token: string | null
          approved_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          id: string
          invoice_id: string | null
          mobile_home_id: string | null
          preferred_contact: string | null
          selected_home_options: Json | null
          selected_services: string[] | null
          status: string
          timeline: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_requirements?: string | null
          approval_token?: string | null
          approved_at?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          id?: string
          invoice_id?: string | null
          mobile_home_id?: string | null
          preferred_contact?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          status?: string
          timeline?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_requirements?: string | null
          approval_token?: string | null
          approved_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          id?: string
          invoice_id?: string | null
          mobile_home_id?: string | null
          preferred_contact?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          status?: string
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      factories: {
        Row: {
          city: string
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          state: string
          street_address: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          city: string
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          state: string
          street_address: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          city?: string
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          state?: string
          street_address?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "factories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_communications: {
        Row: {
          communication_type: string
          confidence_score: number | null
          content: string | null
          created_at: string
          delivery_id: string | null
          factory_id: string
          id: string
          order_id: string | null
          parsed_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          communication_type: string
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          delivery_id?: string | null
          factory_id: string
          id?: string
          order_id?: string | null
          parsed_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          communication_type?: string
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          delivery_id?: string | null
          factory_id?: string
          id?: string
          order_id?: string | null
          parsed_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_communications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_communications_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_email_parsing: {
        Row: {
          active: boolean
          created_at: string
          email_address: string
          factory_id: string
          id: string
          parsing_rules: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email_address: string
          factory_id: string
          id?: string
          parsing_rules: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email_address?: string
          factory_id?: string
          id?: string
          parsing_rules?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_email_parsing_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          factory_id: string
          id: string
          pdf_template_url: string | null
          template_content: string
          template_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          factory_id: string
          id?: string
          pdf_template_url?: string | null
          template_content: string
          template_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          factory_id?: string
          id?: string
          pdf_template_url?: string | null
          template_content?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_templates_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          category_id: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          category_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          category_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faqs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          follow_up_type: string
          id: string
          lead_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          follow_up_type: string
          id?: string
          lead_id?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          follow_up_type?: string
          id?: string
          lead_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_tracking_offline: {
        Row: {
          accuracy_meters: number | null
          battery_level: number | null
          created_at: string
          delivery_id: string | null
          driver_id: string
          heading: number | null
          id: string
          is_offline: boolean
          latitude: number
          longitude: number
          recorded_at: string
          speed_mph: number | null
          synced_at: string | null
        }
        Insert: {
          accuracy_meters?: number | null
          battery_level?: number | null
          created_at?: string
          delivery_id?: string | null
          driver_id: string
          heading?: number | null
          id?: string
          is_offline?: boolean
          latitude: number
          longitude: number
          recorded_at: string
          speed_mph?: number | null
          synced_at?: string | null
        }
        Update: {
          accuracy_meters?: number | null
          battery_level?: number | null
          created_at?: string
          delivery_id?: string | null
          driver_id?: string
          heading?: number | null
          id?: string
          is_offline?: boolean
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_mph?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_tracking_offline_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_tracking_offline_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      home_options: {
        Row: {
          active: boolean
          calculated_price: number | null
          cost_price: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          markup_percentage: number
          name: string
          price_per_sqft: number | null
          pricing_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          calculated_price?: number | null
          cost_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          markup_percentage?: number
          name: string
          price_per_sqft?: number | null
          pricing_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          calculated_price?: number | null
          cost_price?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          markup_percentage?: number
          name?: string
          price_per_sqft?: number | null
          pricing_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          additional_requirements: string | null
          balance_due: number | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          due_date: string
          estimate_id: string | null
          id: string
          invoice_number: string
          mobile_home_id: string | null
          paid_at: string | null
          preferred_contact: string | null
          quickbooks_id: string | null
          quickbooks_synced_at: string | null
          selected_home_options: Json | null
          selected_services: string[] | null
          status: string
          timeline: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_requirements?: string | null
          balance_due?: number | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          invoice_number: string
          mobile_home_id?: string | null
          paid_at?: string | null
          preferred_contact?: string | null
          quickbooks_id?: string | null
          quickbooks_synced_at?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          status?: string
          timeline?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_requirements?: string | null
          balance_due?: number | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          mobile_home_id?: string | null
          paid_at?: string | null
          preferred_contact?: string | null
          quickbooks_id?: string | null
          quickbooks_synced_at?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          status?: string
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string
          estimated_budget: number | null
          estimated_timeline: string | null
          first_name: string
          id: string
          interests: Json | null
          last_contacted_at: string | null
          last_name: string
          lead_score: number | null
          lead_source_id: string | null
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email: string
          estimated_budget?: number | null
          estimated_timeline?: string | null
          first_name: string
          id?: string
          interests?: Json | null
          last_contacted_at?: string | null
          last_name: string
          lead_score?: number | null
          lead_source_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string
          estimated_budget?: number | null
          estimated_timeline?: string | null
          first_name?: string
          id?: string
          interests?: Json | null
          last_contacted_at?: string | null
          last_name?: string
          lead_score?: number | null
          lead_source_id?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_home_factories: {
        Row: {
          created_at: string
          factory_id: string
          id: string
          mobile_home_id: string
          production_lead_time_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_id: string
          id?: string
          mobile_home_id: string
          production_lead_time_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_id?: string
          id?: string
          mobile_home_id?: string
          production_lead_time_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_home_factories_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_home_factories_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_home_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_type: string
          image_url: string
          mobile_home_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_type?: string
          image_url: string
          mobile_home_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_type?: string
          image_url?: string
          mobile_home_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_home_images_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_homes: {
        Row: {
          active: boolean
          bathrooms: number | null
          bedrooms: number | null
          company_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          display_name: string | null
          display_order: number
          exterior_image_url: string | null
          features: Json | null
          floor_plan_image_url: string | null
          id: string
          length_feet: number | null
          manufacturer: string
          minimum_profit: number
          model: string
          price: number
          retail_price: number | null
          series: string
          square_footage: number | null
          updated_at: string
          width_feet: number | null
        }
        Insert: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          display_order?: number
          exterior_image_url?: string | null
          features?: Json | null
          floor_plan_image_url?: string | null
          id?: string
          length_feet?: number | null
          manufacturer?: string
          minimum_profit?: number
          model: string
          price: number
          retail_price?: number | null
          series: string
          square_footage?: number | null
          updated_at?: string
          width_feet?: number | null
        }
        Update: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          company_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          display_order?: number
          exterior_image_url?: string | null
          features?: Json | null
          floor_plan_image_url?: string | null
          id?: string
          length_feet?: number | null
          manufacturer?: string
          minimum_profit?: number
          model?: string
          price?: number
          retail_price?: number | null
          series?: string
          square_footage?: number | null
          updated_at?: string
          width_feet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_homes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_campaigns: {
        Row: {
          campaign_type: string
          clicked_count: number | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          opened_count: number | null
          recipients_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_type?: string
          clicked_count?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          opened_count?: number | null
          recipients_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_type?: string
          clicked_count?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          opened_count?: number | null
          recipients_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          first_name: string | null
          id: string
          last_email_sent_at: string | null
          last_name: string | null
          phone: string | null
          preferences: Json | null
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          last_email_sent_at?: string | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          verification_token?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          content: string | null
          created_at: string
          delivery_id: string | null
          error_message: string | null
          id: string
          notification_rule_id: string | null
          notification_type: string
          order_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivery_id?: string | null
          error_message?: string | null
          id?: string
          notification_rule_id?: string | null
          notification_type: string
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivery_id?: string | null
          error_message?: string | null
          id?: string
          notification_rule_id?: string | null
          notification_type?: string
          order_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_notification_rule_id_fkey"
            columns: ["notification_rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          customer_activity_notifications: boolean | null
          email_notifications: boolean
          estimate_updates: boolean
          id: string
          inventory_updates: boolean
          notification_frequency: string
          price_updates: boolean
          push_notifications: boolean
          system_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_activity_notifications?: boolean | null
          email_notifications?: boolean
          estimate_updates?: boolean
          id?: string
          inventory_updates?: boolean
          notification_frequency?: string
          price_updates?: boolean
          push_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_activity_notifications?: boolean | null
          email_notifications?: boolean
          estimate_updates?: boolean
          id?: string
          inventory_updates?: boolean
          notification_frequency?: string
          price_updates?: boolean
          push_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          delay_minutes: number | null
          id: string
          notification_type: string
          recipients: Json | null
          rule_name: string
          template_content: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          id?: string
          notification_type: string
          recipients?: Json | null
          rule_name: string
          template_content: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          delay_minutes?: number | null
          id?: string
          notification_type?: string
          recipients?: Json | null
          rule_name?: string
          template_content?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_radius_limit: number | null
          estimate_id: string | null
          id: string
          mobile_home_id: string | null
          order_number: string
          payment_percentage_required: number | null
          payment_terms: string | null
          status: string
          total_value: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_radius_limit?: number | null
          estimate_id?: string | null
          id?: string
          mobile_home_id?: string | null
          order_number: string
          payment_percentage_required?: number | null
          payment_terms?: string | null
          status?: string
          total_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_radius_limit?: number | null
          estimate_id?: string | null
          id?: string
          mobile_home_id?: string | null
          order_number?: string
          payment_percentage_required?: number | null
          payment_terms?: string | null
          status?: string
          total_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          order_id: string
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          recorded_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id: string
          payment_date: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          assigned_admin_id: string | null
          created_at: string
          created_by: string | null
          denied: boolean
          denied_at: string | null
          denied_by: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_admin_id?: string | null
          created_at?: string
          created_by?: string | null
          denied?: boolean
          denied_at?: string | null
          denied_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_admin_id?: string | null
          created_at?: string
          created_by?: string | null
          denied?: boolean
          denied_at?: string | null
          denied_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          endpoint: string
          id: string
          subscription_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          endpoint: string
          id?: string
          subscription_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          endpoint?: string
          id?: string
          subscription_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recent_purchases: {
        Row: {
          active: boolean
          created_at: string
          customer_first_name: string
          customer_location: string
          display_until: string
          id: string
          mobile_home_manufacturer: string
          mobile_home_model: string
          purchase_amount: number | null
          purchase_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_first_name: string
          customer_location: string
          display_until?: string
          id?: string
          mobile_home_manufacturer: string
          mobile_home_model: string
          purchase_amount?: number | null
          purchase_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_first_name?: string
          customer_location?: string
          display_until?: string
          id?: string
          mobile_home_manufacturer?: string
          mobile_home_model?: string
          purchase_amount?: number | null
          purchase_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      repair_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_approved_at: string | null
          delivery_id: string
          delivery_piece_id: string | null
          estimated_cost: number | null
          factory_id: string | null
          factory_notified_at: string | null
          id: string
          issue_description: string
          order_id: string
          photos: Json | null
          priority: string
          repair_type: string | null
          reported_by: string
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_approved_at?: string | null
          delivery_id: string
          delivery_piece_id?: string | null
          estimated_cost?: number | null
          factory_id?: string | null
          factory_notified_at?: string | null
          id?: string
          issue_description: string
          order_id: string
          photos?: Json | null
          priority?: string
          repair_type?: string | null
          reported_by: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_approved_at?: string | null
          delivery_id?: string
          delivery_piece_id?: string | null
          estimated_cost?: number | null
          factory_id?: string | null
          factory_notified_at?: string | null
          id?: string
          issue_description?: string
          order_id?: string
          photos?: Json | null
          priority?: string
          repair_type?: string | null
          reported_by?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_requests_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_delivery_piece_id_fkey"
            columns: ["delivery_piece_id"]
            isOneToOne: false
            referencedRelation: "delivery_pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_generated: string | null
          recipients: Json
          report_config: Json
          report_name: string
          report_type: string
          schedule_cron: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_generated?: string | null
          recipients: Json
          report_config: Json
          report_name: string
          report_type: string
          schedule_cron?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_generated?: string | null
          recipients?: Json
          report_config?: Json
          report_name?: string
          report_type?: string
          schedule_cron?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string
          created_at: string
          helpful_votes: number
          id: string
          mobile_home_id: string
          rating: number
          title: string
          updated_at: string
          user_id: string
          verified_purchase: boolean
        }
        Insert: {
          content: string
          created_at?: string
          helpful_votes?: number
          id?: string
          mobile_home_id: string
          rating: number
          title: string
          updated_at?: string
          user_id: string
          verified_purchase?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          helpful_votes?: number
          id?: string
          mobile_home_id?: string
          rating?: number
          title?: string
          updated_at?: string
          user_id?: string
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_used_at: string
          name: string
          search_query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_used_at?: string
          name: string
          search_query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_used_at?: string
          name?: string
          search_query?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          result_count: number
          search_query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          result_count?: number
          search_query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          result_count?: number
          search_query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          applicable_manufacturers: Json | null
          applicable_series: Json | null
          conditional_pricing: Json | null
          conditions: Json | null
          cost: number | null
          created_at: string
          dependencies: Json | null
          description: string | null
          double_wide_price: number
          id: string
          name: string
          price: number
          requires_admin: boolean | null
          single_wide_price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applicable_manufacturers?: Json | null
          applicable_series?: Json | null
          conditional_pricing?: Json | null
          conditions?: Json | null
          cost?: number | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          double_wide_price?: number
          id?: string
          name: string
          price: number
          requires_admin?: boolean | null
          single_wide_price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applicable_manufacturers?: Json | null
          applicable_series?: Json | null
          conditional_pricing?: Json | null
          conditions?: Json | null
          cost?: number | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          double_wide_price?: number
          id?: string
          name?: string
          price?: number
          requires_admin?: boolean | null
          single_wide_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_calculations: {
        Row: {
          calculated_at: string
          delivery_city: string
          delivery_state: string
          delivery_zip: string
          distance_miles: number
          estimated_travel_time_minutes: number | null
          factory_id: string
          google_maps_response: Json | null
          id: string
        }
        Insert: {
          calculated_at?: string
          delivery_city: string
          delivery_state: string
          delivery_zip: string
          distance_miles: number
          estimated_travel_time_minutes?: number | null
          factory_id: string
          google_maps_response?: Json | null
          id?: string
        }
        Update: {
          calculated_at?: string
          delivery_city?: string
          delivery_state?: string
          delivery_zip?: string
          distance_miles?: number
          estimated_travel_time_minutes?: number | null
          factory_id?: string
          google_maps_response?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_calculations_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      social_proof_settings: {
        Row: {
          created_at: string
          customer_count: number
          homes_sold_count: number
          id: string
          recent_purchases_limit: number
          show_customer_count: boolean
          show_homes_sold: boolean
          show_recent_purchases: boolean
          show_testimonials: boolean
          testimonials_rotation_seconds: number
          updated_at: string
          years_in_business: number
        }
        Insert: {
          created_at?: string
          customer_count?: number
          homes_sold_count?: number
          id?: string
          recent_purchases_limit?: number
          show_customer_count?: boolean
          show_homes_sold?: boolean
          show_recent_purchases?: boolean
          show_testimonials?: boolean
          testimonials_rotation_seconds?: number
          updated_at?: string
          years_in_business?: number
        }
        Update: {
          created_at?: string
          customer_count?: number
          homes_sold_count?: number
          id?: string
          recent_purchases_limit?: number
          show_customer_count?: boolean
          show_homes_sold?: boolean
          show_recent_purchases?: boolean
          show_testimonials?: boolean
          testimonials_rotation_seconds?: number
          updated_at?: string
          years_in_business?: number
        }
        Relationships: []
      }
      super_admin_markups: {
        Row: {
          created_at: string
          id: string
          markup_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          markup_percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          markup_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          chat_session_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          chat_session_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          chat_session_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          customer_location: string | null
          customer_name: string
          featured: boolean
          id: string
          image_url: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          customer_location?: string | null
          customer_name: string
          featured?: boolean
          id?: string
          image_url?: string | null
          rating: number
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          customer_location?: string | null
          customer_name?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      transaction_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_notes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          title: string
          transaction_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          title: string
          transaction_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          title?: string
          transaction_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_notifications_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          recorded_by: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          recorded_by?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transaction_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["transaction_status"] | null
          id: string
          metadata: Json | null
          notes: string | null
          to_status: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["transaction_status"] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status: Database["public"]["Enums"]["transaction_status"]
          transaction_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["transaction_status"] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status?: Database["public"]["Enums"]["transaction_status"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_stage_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          additional_requirements: string | null
          assigned_admin_id: string | null
          attachment_urls: Json | null
          balance_due: number
          base_amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          estimate_expires_at: string | null
          estimate_id: string | null
          id: string
          internal_notes: string | null
          invoice_expires_at: string | null
          invoice_id: string | null
          mobile_home_id: string | null
          paid_amount: number
          preferred_contact: string | null
          priority: Database["public"]["Enums"]["transaction_priority"]
          quickbooks_id: string | null
          quickbooks_synced_at: string | null
          repair_category: string | null
          repair_completed_at: string | null
          repair_description: string | null
          repair_urgency: string | null
          scheduled_delivery_date: string | null
          selected_home_options: Json | null
          selected_services: string[] | null
          service_amount: number
          status: Database["public"]["Enums"]["transaction_status"]
          tax_amount: number
          timeline: string | null
          total_amount: number
          transaction_number: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          additional_requirements?: string | null
          assigned_admin_id?: string | null
          attachment_urls?: Json | null
          balance_due?: number
          base_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          estimate_expires_at?: string | null
          estimate_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_expires_at?: string | null
          invoice_id?: string | null
          mobile_home_id?: string | null
          paid_amount?: number
          preferred_contact?: string | null
          priority?: Database["public"]["Enums"]["transaction_priority"]
          quickbooks_id?: string | null
          quickbooks_synced_at?: string | null
          repair_category?: string | null
          repair_completed_at?: string | null
          repair_description?: string | null
          repair_urgency?: string | null
          scheduled_delivery_date?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          service_amount?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          tax_amount?: number
          timeline?: string | null
          total_amount?: number
          transaction_number: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          additional_requirements?: string | null
          assigned_admin_id?: string | null
          attachment_urls?: Json | null
          balance_due?: number
          base_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          estimate_expires_at?: string | null
          estimate_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_expires_at?: string | null
          invoice_id?: string | null
          mobile_home_id?: string | null
          paid_amount?: number
          preferred_contact?: string | null
          priority?: Database["public"]["Enums"]["transaction_priority"]
          quickbooks_id?: string | null
          quickbooks_synced_at?: string | null
          repair_category?: string | null
          repair_completed_at?: string | null
          repair_description?: string | null
          repair_urgency?: string | null
          scheduled_delivery_date?: string | null
          selected_home_options?: Json | null
          selected_services?: string[] | null
          service_amount?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          tax_amount?: number
          timeline?: string | null
          total_amount?: number
          transaction_number?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_calendar_connections: {
        Row: {
          access_token: string
          calendar_id: string
          calendar_name: string
          calendar_timezone: string | null
          created_at: string
          google_account_email: string
          id: string
          is_default_for_appointments: boolean
          is_primary: boolean
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id: string
          calendar_name: string
          calendar_timezone?: string | null
          created_at?: string
          google_account_email: string
          id?: string
          is_default_for_appointments?: boolean
          is_primary?: boolean
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          calendar_name?: string
          calendar_timezone?: string | null
          created_at?: string
          google_account_email?: string
          id?: string
          is_default_for_appointments?: boolean
          is_primary?: boolean
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_calendar_preferences: {
        Row: {
          auto_create_events: boolean
          check_availability: boolean
          created_at: string
          event_privacy: string
          event_title_template: string | null
          id: string
          include_customer_details: boolean
          include_mobile_home_details: boolean
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_create_events?: boolean
          check_availability?: boolean
          created_at?: string
          event_privacy?: string
          event_title_template?: string | null
          id?: string
          include_customer_details?: boolean
          include_mobile_home_details?: boolean
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_create_events?: boolean
          check_availability?: boolean
          created_at?: string
          event_privacy?: string
          event_title_template?: string | null
          id?: string
          include_customer_details?: boolean
          include_mobile_home_details?: boolean
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wishlists: {
        Row: {
          created_at: string
          id: string
          mobile_home_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mobile_home_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mobile_home_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wishlists_mobile_home_id_fkey"
            columns: ["mobile_home_id"]
            isOneToOne: false
            referencedRelation: "mobile_homes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_transaction_payment: {
        Args: {
          p_transaction_id: string
          p_amount: number
          p_payment_method?: string
          p_payment_reference?: string
          p_notes?: string
        }
        Returns: Json
      }
      approve_estimate: {
        Args: { estimate_uuid: string }
        Returns: Json
      }
      approve_transaction: {
        Args: { p_transaction_id: string; p_approved_by?: string }
        Returns: Json
      }
      bulk_approve_transactions: {
        Args: { p_transaction_ids: string[] }
        Returns: Json
      }
      calculate_delivery_eta: {
        Args: {
          delivery_id_param: string
          current_lat: number
          current_lng: number
        }
        Returns: string
      }
      check_expired_transactions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_password_strength: {
        Args: { password: string }
        Returns: Json
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_analytics_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_activity: {
        Args: {
          p_user_id: string
          p_actor_id: string
          p_action: string
          p_entity_type: string
          p_entity_id: string
          p_description: string
          p_metadata?: Json
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_category?: string
          p_data?: Json
          p_expires_hours?: number
        }
        Returns: string
      }
      create_order_from_estimate: {
        Args: { estimate_uuid: string }
        Returns: string
      }
      create_transaction_from_estimate: {
        Args: {
          p_estimate_id: string
          p_mobile_home_id: string
          p_customer_name: string
          p_customer_email: string
          p_customer_phone?: string
          p_delivery_address?: string
          p_selected_services?: string[]
          p_selected_home_options?: Json
          p_base_amount?: number
          p_service_amount?: number
          p_tax_amount?: number
          p_total_amount?: number
          p_preferred_contact?: string
          p_timeline?: string
          p_additional_requirements?: string
          p_transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: string
      }
      generate_appointment_confirmation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_chat_session_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_delivery_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_tracking_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_transaction_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unsubscribe_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_chat_lead_source: {
        Args: { page_path: string }
        Returns: string
      }
      get_popular_mobile_homes: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          mobile_home_id: string
          view_count: number
          total_time_spent: number
          avg_time_spent: number
          conversion_rate: number
        }[]
      }
      get_transaction_dashboard_data: {
        Args: { p_user_id?: string; p_date_range_days?: number }
        Returns: Json
      }
      increment_post_views: {
        Args: { post_id: string }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: boolean
      }
      process_automation_variables: {
        Args: {
          content: string
          lead_data?: Json
          appointment_data?: Json
          mobile_home_data?: Json
        }
        Returns: string
      }
      process_factory_email: {
        Args: {
          factory_id_param: string
          email_subject: string
          email_content: string
          sender_email: string
        }
        Returns: string
      }
      send_delivery_notifications: {
        Args: { delivery_id_param: string }
        Returns: Json
      }
      sync_offline_gps_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      transition_transaction_stage: {
        Args: {
          p_transaction_id: string
          p_new_status: Database["public"]["Enums"]["transaction_status"]
          p_notes?: string
        }
        Returns: Json
      }
      validate_email: {
        Args: { email: string }
        Returns: boolean
      }
      validate_password_complexity: {
        Args: { password: string }
        Returns: boolean
      }
      validate_phone: {
        Args: { phone: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "driver"
      delivery_crew_type:
        | "single_driver"
        | "double_wide_crew"
        | "triple_wide_crew"
      delivery_status:
        | "pending_payment"
        | "scheduled"
        | "factory_pickup_scheduled"
        | "factory_pickup_in_progress"
        | "factory_pickup_completed"
        | "in_transit"
        | "delivery_in_progress"
        | "delivered"
        | "completed"
        | "cancelled"
        | "delayed"
      driver_status: "available" | "on_delivery" | "off_duty" | "inactive"
      mobile_home_type: "single_wide" | "double_wide" | "triple_wide"
      transaction_priority: "low" | "medium" | "high" | "urgent"
      transaction_status:
        | "draft"
        | "estimate_submitted"
        | "estimate_approved"
        | "invoice_generated"
        | "payment_partial"
        | "payment_complete"
        | "delivery_scheduled"
        | "delivery_in_progress"
        | "delivery_complete"
        | "completed"
        | "cancelled"
        | "expired"
      transaction_type: "sale" | "repair" | "service" | "delivery_only"
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
      app_role: ["admin", "user", "super_admin", "driver"],
      delivery_crew_type: [
        "single_driver",
        "double_wide_crew",
        "triple_wide_crew",
      ],
      delivery_status: [
        "pending_payment",
        "scheduled",
        "factory_pickup_scheduled",
        "factory_pickup_in_progress",
        "factory_pickup_completed",
        "in_transit",
        "delivery_in_progress",
        "delivered",
        "completed",
        "cancelled",
        "delayed",
      ],
      driver_status: ["available", "on_delivery", "off_duty", "inactive"],
      mobile_home_type: ["single_wide", "double_wide", "triple_wide"],
      transaction_priority: ["low", "medium", "high", "urgent"],
      transaction_status: [
        "draft",
        "estimate_submitted",
        "estimate_approved",
        "invoice_generated",
        "payment_partial",
        "payment_complete",
        "delivery_scheduled",
        "delivery_in_progress",
        "delivery_complete",
        "completed",
        "cancelled",
        "expired",
      ],
      transaction_type: ["sale", "repair", "service", "delivery_only"],
    },
  },
} as const
