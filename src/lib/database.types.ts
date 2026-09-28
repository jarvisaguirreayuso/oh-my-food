export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      dish_reviews: {
        Row: {
          comment: string | null
          created_at: string
          dish_id: string
          execution: number
          id: string
          idea: number
          photo_url: string | null
          updated_at: string
          visit_id: string
          would_repeat: boolean
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dish_id: string
          execution: number
          id?: string
          idea: number
          photo_url?: string | null
          updated_at?: string
          visit_id: string
          would_repeat: boolean
        }
        Update: {
          comment?: string | null
          created_at?: string
          dish_id?: string
          execution?: number
          id?: string
          idea?: number
          photo_url?: string | null
          updated_at?: string
          visit_id?: string
          would_repeat?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dish_reviews_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_reviews_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          name_normalized: string | null
          photo_url: string | null
          place_id: string
          price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          name_normalized?: string | null
          photo_url?: string | null
          place_id: string
          price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          name_normalized?: string | null
          photo_url?: string | null
          place_id?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dishes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      place_list_items: {
        Row: {
          added_at: string
          list_id: string
          place_id: string
        }
        Insert: {
          added_at?: string
          list_id: string
          place_id: string
        }
        Update: {
          added_at?: string
          list_id?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "place_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_list_items_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      place_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_lists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          name_normalized: string | null
          type: Database["public"]["Enums"]["place_type"]
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          name_normalized?: string | null
          type?: Database["public"]["Enums"]["place_type"]
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          name_normalized?: string | null
          type?: Database["public"]["Enums"]["place_type"]
        }
        Relationships: [
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_settings: {
        Row: {
          default_audience: Database["public"]["Enums"]["audience"]
          updated_at: string
          user_id: string
        }
        Insert: {
          default_audience?: Database["public"]["Enums"]["audience"]
          updated_at?: string
          user_id: string
        }
        Update: {
          default_audience?: Database["public"]["Enums"]["audience"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          note: string | null
          place_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          note?: string | null
          place_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          note?: string | null
          place_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          audience: Database["public"]["Enums"]["audience"]
          created_at: string
          id: string
          place_comment: string | null
          place_id: string
          place_rating: number | null
          pools_publicly: boolean | null
          updated_at: string
          user_id: string
          visited_on: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"]
          created_at?: string
          id?: string
          place_comment?: string | null
          place_id: string
          place_rating?: number | null
          pools_publicly?: boolean | null
          updated_at?: string
          user_id: string
          visited_on?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"]
          created_at?: string
          id?: string
          place_comment?: string | null
          place_id?: string
          place_rating?: number | null
          pools_publicly?: boolean | null
          updated_at?: string
          user_id?: string
          visited_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _period_step: { Args: { p_granularity: string }; Returns: string }
      dish_general_scores: {
        Args: { p_dish_ids: string[] }
        Returns: {
          avg_execution: number
          avg_idea: number
          dish_id: string
          n: number
          repeat_pct: number
        }[]
      }
      dish_rankings_for_place: {
        Args: { p_order_by?: string; p_place_id: string }
        Returns: {
          dish_id: string
          dish_name: string
          recent_n: number
          recent_repeat_pct: number
          recent_score: number
          trend_delta: number
          trend_status: string
        }[]
      }
      dish_stats: {
        Args: { p_dish_id: string }
        Returns: {
          historical_execution: number
          historical_idea: number
          historical_n: number
          historical_repeat_pct: number
          recent_execution: number
          recent_idea: number
          recent_n: number
          recent_repeat_pct: number
        }[]
      }
      dish_timeseries: {
        Args: {
          p_dish_id: string
          p_from: string
          p_granularity: string
          p_to: string
        }
        Returns: {
          avg_execution: number
          avg_idea: number
          moving_avg_execution: number
          moving_avg_idea: number
          moving_avg_repeat_pct: number
          n: number
          period_start: string
          repeat_pct: number
        }[]
      }
      dish_trend: {
        Args: { p_dish_id: string }
        Returns: {
          current_avg: number
          current_n: number
          delta: number
          previous_avg: number
          previous_n: number
          status: string
        }[]
      }
      normalize_text: { Args: { input: string }; Returns: string }
      place_general_scores: {
        Args: { p_place_ids: string[] }
        Returns: {
          avg_rating: number
          n: number
          place_id: string
        }[]
      }
      place_stats: {
        Args: { p_place_id: string }
        Returns: {
          historical_avg: number
          historical_n: number
          recent_avg: number
          recent_n: number
        }[]
      }
      place_timeseries: {
        Args: {
          p_from: string
          p_granularity: string
          p_place_id: string
          p_to: string
        }
        Returns: {
          avg_rating: number
          moving_avg_3: number
          n: number
          period_start: string
        }[]
      }
      place_trend: {
        Args: { p_place_id: string }
        Returns: {
          current_avg: number
          current_n: number
          delta: number
          previous_avg: number
          previous_n: number
          status: string
        }[]
      }
      save_visit: {
        Args: {
          p_audience?: Database["public"]["Enums"]["audience"]
          p_dishes?: Json
          p_place_comment: string
          p_place_id: string
          p_place_rating: number
          p_visited_on: string
        }
        Returns: string
      }
      search_places: {
        Args: { p_lat?: number; p_lng?: number; p_query?: string }
        Returns: {
          address: string
          distance_km: number
          id: string
          lat: number
          lng: number
          name: string
          similarity: number
          type: Database["public"]["Enums"]["place_type"]
        }[]
      }
      search_similar_dishes: {
        Args: { p_place_id: string; p_query: string }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
      set_dish_photo: {
        Args: { p_dish_id: string; p_photo_url: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trend_delta_threshold: { Args: never; Returns: number }
      trend_min_n: { Args: never; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      audience: "public" | "followers" | "mutuals" | "private"
      place_type:
        | "restaurant"
        | "food_stall"
        | "food_truck"
        | "market_stall"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      audience: ["public", "followers", "mutuals", "private"],
      place_type: [
        "restaurant",
        "food_stall",
        "food_truck",
        "market_stall",
        "other",
      ],
    },
  },
} as const

