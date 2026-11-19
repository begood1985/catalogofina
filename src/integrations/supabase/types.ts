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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      discount_tiers: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          percent: number
          product_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty: number
          percent: number
          product_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          percent?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          boxes: number
          discount_percent: number
          id: string
          line_total: number
          name: string
          order_id: string
          price_on_request: boolean
          product_id: string | null
          quantity: number
          sku: string
          unit_price: number
          weight_kg: number | null
        }
        Insert: {
          boxes: number
          discount_percent?: number
          id?: string
          line_total: number
          name: string
          order_id: string
          price_on_request?: boolean
          product_id?: string | null
          quantity: number
          sku: string
          unit_price: number
          weight_kg?: number | null
        }
        Update: {
          boxes?: number
          discount_percent?: number
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          price_on_request?: boolean
          product_id?: string | null
          quantity?: number
          sku?: string
          unit_price?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          code: string
          created_at: string
          customer_name: string
          discount_total: number
          document: string | null
          has_unpriced_items: boolean
          id: string
          notes: string | null
          payment_method: string
          status: string
          subtotal: number
          total: number
          total_boxes: number
          total_units: number
          total_weight_kg: number | null
          whatsapp: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_name: string
          discount_total?: number
          document?: string | null
          has_unpriced_items?: boolean
          id?: string
          notes?: string | null
          payment_method: string
          status?: string
          subtotal: number
          total: number
          total_boxes: number
          total_units: number
          total_weight_kg?: number | null
          whatsapp: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_name?: string
          discount_total?: number
          document?: string | null
          has_unpriced_items?: boolean
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          total_boxes?: number
          total_units?: number
          total_weight_kg?: number | null
          whatsapp?: string
        }
        Relationships: []
      }
      price_tiers: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          description: string
          external_ref: string | null
          id: string
          image_url: string | null
          name: string
          needs_review: boolean
          retail_price: number | null
          sku: string
          stock: number | null
          units_per_box: number
          updated_at: string
          weight_kg: number | null
          wholesale_min_qty: number
          wholesale_price: number | null
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          external_ref?: string | null
          id?: string
          image_url?: string | null
          name: string
          needs_review?: boolean
          retail_price?: number | null
          sku: string
          stock?: number | null
          units_per_box?: number
          updated_at?: string
          weight_kg?: number | null
          wholesale_min_qty?: number
          wholesale_price?: number | null
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          description?: string
          external_ref?: string | null
          id?: string
          image_url?: string | null
          name?: string
          needs_review?: boolean
          retail_price?: number | null
          sku?: string
          stock?: number | null
          units_per_box?: number
          updated_at?: string
          weight_kg?: number | null
          wholesale_min_qty?: number
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          brand_name: string
          id: number
          min_order_value: number
          payment_methods: string[]
          tagline: string
          updated_at: string
          whatsapp_phone: string
        }
        Insert: {
          brand_name?: string
          id?: number
          min_order_value?: number
          payment_methods?: string[]
          tagline?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Update: {
          brand_name?: string
          id?: number
          min_order_value?: number
          payment_methods?: string[]
          tagline?: string
          updated_at?: string
          whatsapp_phone?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      finasub_submit_quote: {
        Args: { payload: Json }
        Returns: Json
      }
      finasub_get_quote: {
        Args: { quote_id: string }
        Returns: Json
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
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const