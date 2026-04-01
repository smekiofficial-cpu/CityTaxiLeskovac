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
      daily_reports: {
        Row: {
          avg_fare: number
          cancelled_rides: number
          completed_rides: number
          created_at: string
          id: string
          report_date: string
          total_drivers: number
          total_revenue: number
          total_rides: number
        }
        Insert: {
          avg_fare?: number
          cancelled_rides?: number
          completed_rides?: number
          created_at?: string
          id?: string
          report_date: string
          total_drivers?: number
          total_revenue?: number
          total_rides?: number
        }
        Update: {
          avg_fare?: number
          cancelled_rides?: number
          completed_rides?: number
          created_at?: string
          id?: string
          report_date?: string
          total_drivers?: number
          total_revenue?: number
          total_rides?: number
        }
        Relationships: []
      }
      dispatcher_credentials: {
        Row: {
          created_at: string
          id: string
          initial_password: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_password: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_password?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_shifts: {
        Row: {
          card_earnings: number
          cash_earnings: number
          completed_rides: number
          driver_id: string
          duration_minutes: number
          ended_at: string | null
          id: string
          started_at: string
          total_earnings: number
          total_rides: number
        }
        Insert: {
          card_earnings?: number
          cash_earnings?: number
          completed_rides?: number
          driver_id: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          total_earnings?: number
          total_rides?: number
        }
        Update: {
          card_earnings?: number
          cash_earnings?: number
          completed_rides?: number
          driver_id?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          total_earnings?: number
          total_rides?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          completed_at: string | null
          created_at: string
          destination_address: string | null
          fare: number | null
          id: string
          notes: string | null
          payment_method: string | null
          pickup_address: string
          status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          fare?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          pickup_address: string
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string | null
          fare?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          pickup_address?: string
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rides_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      taxi_zones: {
        Row: {
          center_lat: number
          center_lng: number
          color: string
          created_at: string
          id: number
          landmark: string
          name: string
          radius: number
        }
        Insert: {
          center_lat: number
          center_lng: number
          color?: string
          created_at?: string
          id?: number
          landmark: string
          name: string
          radius?: number
        }
        Update: {
          center_lat?: number
          center_lng?: number
          color?: string
          created_at?: string
          id?: number
          landmark?: string
          name?: string
          radius?: number
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
      vehicle_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string
          created_at: string
          current_driver_id: string | null
          id: string
          is_active: boolean
          model: string
          registration: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          current_driver_id?: string | null
          id?: string
          is_active?: boolean
          model: string
          registration: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          current_driver_id?: string | null
          id?: string
          is_active?: boolean
          model?: string
          registration?: string
          updated_at?: string
        }
        Relationships: []
      }
      zone_queue: {
        Row: {
          driver_id: string
          entered_at: string
          id: string
          position: number
          vehicle_id: string
          zone_id: number
        }
        Insert: {
          driver_id: string
          entered_at?: string
          id?: string
          position?: number
          vehicle_id: string
          zone_id: number
        }
        Update: {
          driver_id?: string
          entered_at?: string
          id?: string
          position?: number
          vehicle_id?: string
          zone_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "zone_queue_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_queue_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taxi_zones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_assigned_driver_for_ride: {
        Args: { _ride_id: string }
        Returns: boolean
      }
      is_assigned_driver_for_vehicle: {
        Args: { _vehicle_id: string }
        Returns: boolean
      }
      is_dispatcher: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "dispatcher" | "driver" | "admin" | "customer"
      driver_status: "available" | "busy" | "offline"
      ride_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      app_role: ["dispatcher", "driver", "admin", "customer"],
      driver_status: ["available", "busy", "offline"],
      ride_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
