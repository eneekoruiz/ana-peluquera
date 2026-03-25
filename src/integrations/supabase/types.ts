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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          about_text_en: string | null
          about_text_es: string | null
          about_text_eu: string | null
          bookings_enabled: boolean | null
          id: string
          today_closed: boolean | null
          today_closed_date: string | null
          updated_at: string | null
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          about_text_en?: string | null
          about_text_es?: string | null
          about_text_eu?: string | null
          bookings_enabled?: boolean | null
          id?: string
          today_closed?: boolean | null
          today_closed_date?: string | null
          updated_at?: string | null
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          about_text_en?: string | null
          about_text_es?: string | null
          about_text_eu?: string | null
          bookings_enabled?: boolean | null
          id?: string
          today_closed?: boolean | null
          today_closed_date?: string | null
          updated_at?: string | null
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string | null
          end_time: string
          id: string
          reason: string | null
          start_time: string
        }
        Insert: {
          blocked_date: string
          created_at?: string | null
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
        }
        Update: {
          blocked_date?: string
          created_at?: string | null
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          client_email: string | null
          client_name: string
          client_phone: string
          created_at: string | null
          current_phase: string | null
          end_time: string
          id: string
          notes: string | null
          phase2_released: boolean | null
          service_id: string | null
          start_time: string
          status: string | null
        }
        Insert: {
          booking_date: string
          client_email?: string | null
          client_name: string
          client_phone: string
          created_at?: string | null
          current_phase?: string | null
          end_time: string
          id?: string
          notes?: string | null
          phase2_released?: boolean | null
          service_id?: string | null
          start_time: string
          status?: string | null
        }
        Update: {
          booking_date?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string | null
          current_phase?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          phase2_released?: boolean | null
          service_id?: string | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          sort_order: number | null
          title: string
          visible: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          sort_order?: number | null
          title: string
          visible?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          sort_order?: number | null
          title?: string
          visible?: boolean | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description_en: string | null
          description_es: string | null
          description_eu: string | null
          duration_min: number
          icon_name: string
          id: string
          label_en: string
          label_es: string
          label_eu: string
          phase1_min: number | null
          phase2_min: number | null
          phase3_min: number | null
          price_cents: number | null
          price_from: boolean | null
          slug: string
          sort_order: number | null
          visible: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description_en?: string | null
          description_es?: string | null
          description_eu?: string | null
          duration_min: number
          icon_name?: string
          id?: string
          label_en: string
          label_es: string
          label_eu: string
          phase1_min?: number | null
          phase2_min?: number | null
          phase3_min?: number | null
          price_cents?: number | null
          price_from?: boolean | null
          slug: string
          sort_order?: number | null
          visible?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description_en?: string | null
          description_es?: string | null
          description_eu?: string | null
          duration_min?: number
          icon_name?: string
          id?: string
          label_en?: string
          label_es?: string
          label_eu?: string
          phase1_min?: number | null
          phase2_min?: number | null
          phase3_min?: number | null
          price_cents?: number | null
          price_from?: boolean | null
          slug?: string
          sort_order?: number | null
          visible?: boolean | null
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
