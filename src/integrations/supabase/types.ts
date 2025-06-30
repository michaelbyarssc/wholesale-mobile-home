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
      customer_markups: {
        Row: {
          created_at: string
          id: string
          markup_percentage: number
          minimum_profit_per_home: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          markup_percentage?: number
          minimum_profit_per_home?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          markup_percentage?: number
          minimum_profit_per_home?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      invoices: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          due_date: string
          estimate_id: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          due_date?: string
          estimate_id?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          status?: string
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
          cost: number | null
          created_at: string
          description: string | null
          display_name: string | null
          exterior_image_url: string | null
          features: Json | null
          floor_plan_image_url: string | null
          id: string
          length_feet: number | null
          manufacturer: string
          minimum_profit: number
          model: string
          price: number
          series: string
          square_footage: number | null
          updated_at: string
          width_feet: number | null
        }
        Insert: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          exterior_image_url?: string | null
          features?: Json | null
          floor_plan_image_url?: string | null
          id?: string
          length_feet?: number | null
          manufacturer?: string
          minimum_profit?: number
          model: string
          price: number
          series: string
          square_footage?: number | null
          updated_at?: string
          width_feet?: number | null
        }
        Update: {
          active?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          exterior_image_url?: string | null
          features?: Json | null
          floor_plan_image_url?: string | null
          id?: string
          length_feet?: number | null
          manufacturer?: string
          minimum_profit?: number
          model?: string
          price?: number
          series?: string
          square_footage?: number | null
          updated_at?: string
          width_feet?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
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
          id: string
          name: string
          price: number
          requires_admin: boolean | null
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
          id?: string
          name: string
          price: number
          requires_admin?: boolean | null
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
          id?: string
          name?: string
          price?: number
          requires_admin?: boolean | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_estimate: {
        Args: { estimate_uuid: string }
        Returns: string
      }
      check_password_strength: {
        Args: { password: string }
        Returns: Json
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: boolean
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
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
