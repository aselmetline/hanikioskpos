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
      cash_box_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          credit_balance: number
          id: string
          name: string
          phone: string | null
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          id?: string
          name: string
          phone?: string | null
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_balance?: number
          id?: string
          name?: string
          phone?: string | null
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          low_stock_alert: number
          name: string
          name_ar: string
          price: number
          stock: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_alert?: number
          name: string
          name_ar: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_alert?: number
          name?: string
          name_ar?: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          cost: number
          id: string
          product_id: string | null
          product_name: string
          purchase_id: string
          quantity: number
          total: number
        }
        Insert: {
          cost: number
          id?: string
          product_id?: string | null
          product_name: string
          purchase_id: string
          quantity?: number
          total?: number
        }
        Update: {
          cost?: number
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          discount: number
          id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total: number
        }
        Insert: {
          discount?: number
          id?: string
          price: number
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          total?: number
        }
        Update: {
          discount?: number
          id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          payment_method: string
          subtotal: number
          tax: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          payment_method?: string
          subtotal?: number
          tax?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          payment_method?: string
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_add_sales: boolean | null
          auto_deduct_expenses: boolean | null
          auto_deduct_purchases: boolean | null
          business_type: string | null
          commercial_register: string | null
          created_at: string
          currency: string | null
          id: string
          kiosk_name: string | null
          kiosk_name_fr: string | null
          logo_url: string | null
          low_stock_threshold: number | null
          points_per_dinar: number | null
          printer_enabled: boolean | null
          printer_ip: string | null
          printer_width: string | null
          store_address_area: string | null
          store_address_city: string | null
          store_address_street: string | null
          store_email: string | null
          store_notes: string | null
          store_phone: string | null
          tax_enabled: boolean | null
          tax_rate: number | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          auto_add_sales?: boolean | null
          auto_deduct_expenses?: boolean | null
          auto_deduct_purchases?: boolean | null
          business_type?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kiosk_name?: string | null
          kiosk_name_fr?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          points_per_dinar?: number | null
          printer_enabled?: boolean | null
          printer_ip?: string | null
          printer_width?: string | null
          store_address_area?: string | null
          store_address_city?: string | null
          store_address_street?: string | null
          store_email?: string | null
          store_notes?: string | null
          store_phone?: string | null
          tax_enabled?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          auto_add_sales?: boolean | null
          auto_deduct_expenses?: boolean | null
          auto_deduct_purchases?: boolean | null
          business_type?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          kiosk_name?: string | null
          kiosk_name_fr?: string | null
          logo_url?: string | null
          low_stock_threshold?: number | null
          points_per_dinar?: number | null
          printer_enabled?: boolean | null
          printer_ip?: string | null
          printer_width?: string | null
          store_address_area?: string | null
          store_address_city?: string | null
          store_address_street?: string | null
          store_email?: string | null
          store_notes?: string | null
          store_phone?: string | null
          tax_enabled?: boolean | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
