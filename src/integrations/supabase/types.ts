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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          actor_id: string | null
          alvo: string | null
          created_at: string
          dados: Json | null
          id: string
          tenant_id: string
        }
        Insert: {
          acao: string
          actor_id?: string | null
          alvo?: string | null
          created_at?: string
          dados?: Json | null
          id?: string
          tenant_id: string
        }
        Update: {
          acao?: string
          actor_id?: string | null
          alvo?: string | null
          created_at?: string
          dados?: Json | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          device_id: string | null
          gate: string | null
          id: string
          online: boolean
          operator_id: string | null
          resultado: Database["public"]["Enums"]["checkin_result"]
          tenant_id: string
          ticket_id: string
          timestamp: string
        }
        Insert: {
          device_id?: string | null
          gate?: string | null
          id?: string
          online?: boolean
          operator_id?: string | null
          resultado: Database["public"]["Enums"]["checkin_result"]
          tenant_id: string
          ticket_id: string
          timestamp?: string
        }
        Update: {
          device_id?: string | null
          gate?: string | null
          id?: string
          online?: boolean
          operator_id?: string | null
          resultado?: Database["public"]["Enums"]["checkin_result"]
          tenant_id?: string
          ticket_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          cpf: string | null
          created_at: string
          id: string
          order_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          cpf?: string | null
          created_at?: string
          id?: string
          order_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          cpf?: string | null
          created_at?: string
          id?: string
          order_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          ativo: boolean
          codigo: string
          combinavel: boolean
          event_id: string
          id: string
          limites: Json | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["coupon_type"]
          uso_total: number
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          combinavel?: boolean
          event_id: string
          id?: string
          limites?: Json | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["coupon_type"]
          uso_total?: number
          valor?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          combinavel?: boolean
          event_id?: string
          id?: string
          limites?: Json | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["coupon_type"]
          uso_total?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacidade_total: number
          created_at: string
          descricao: string | null
          fim: string
          geo: Json | null
          id: string
          imagem_url: string | null
          inicio: string
          local: string | null
          regras_limite: Json | null
          status: string
          tenant_id: string
          titulo: string
        }
        Insert: {
          capacidade_total: number
          created_at?: string
          descricao?: string | null
          fim: string
          geo?: Json | null
          id?: string
          imagem_url?: string | null
          inicio: string
          local?: string | null
          regras_limite?: Json | null
          status?: string
          tenant_id: string
          titulo: string
        }
        Update: {
          capacidade_total?: number
          created_at?: string
          descricao?: string | null
          fim?: string
          geo?: Json | null
          id?: string
          imagem_url?: string | null
          inicio?: string
          local?: string | null
          regras_limite?: Json | null
          status?: string
          tenant_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          fim_vendas: string | null
          id: string
          inicio_vendas: string | null
          nome: string
          preco: number
          qtd_total: number
          qtd_vendida: number
          tenant_id: string
          ticket_type_id: string
        }
        Insert: {
          fim_vendas?: string | null
          id?: string
          inicio_vendas?: string | null
          nome: string
          preco: number
          qtd_total: number
          qtd_vendida?: number
          tenant_id: string
          ticket_type_id: string
        }
        Update: {
          fim_vendas?: string | null
          id?: string
          inicio_vendas?: string | null
          nome?: string
          preco?: number
          qtd_total?: number
          qtd_vendida?: number
          tenant_id?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          event_id: string
          id: string
          lot_id: string
          order_id: string
          quantity: number
          tenant_id: string
          ticket_type_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          lot_id: string
          order_id: string
          quantity: number
          tenant_id: string
          ticket_type_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          lot_id?: string
          order_id?: string
          quantity?: number
          tenant_id?: string
          ticket_type_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string | null
          created_at: string
          event_id: string
          id: string
          payment_intent_id: string | null
          payment_provider: string | null
          status: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          payment_intent_id?: string | null
          payment_provider?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total?: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          payment_intent_id?: string | null
          payment_provider?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean
          provider: Database["public"]["Enums"]["payment_provider"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          provider: Database["public"]["Enums"]["payment_provider"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          provider?: Database["public"]["Enums"]["payment_provider"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revocations: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          tenant_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revocations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          capacidade: number
          event_id: string
          id: string
          nome: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          capacidade: number
          event_id: string
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          capacidade?: number
          event_id?: string
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          jwk_active_kid: string | null
          jwk_set: Json | null
          logo_url: string | null
          nome: string
          plano: string | null
          subdominio: string
        }
        Insert: {
          created_at?: string
          id?: string
          jwk_active_kid?: string | null
          jwk_set?: Json | null
          logo_url?: string | null
          nome: string
          plano?: string | null
          subdominio: string
        }
        Update: {
          created_at?: string
          id?: string
          jwk_active_kid?: string | null
          jwk_set?: Json | null
          logo_url?: string | null
          nome?: string
          plano?: string | null
          subdominio?: string
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          ativo: boolean
          event_id: string
          id: string
          max_por_pedido: number | null
          meia_elegivel: boolean
          nome: string
          preco: number
          sector_id: string
          taxa: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          event_id: string
          id?: string
          max_por_pedido?: number | null
          meia_elegivel?: boolean
          nome: string
          preco: number
          sector_id: string
          taxa?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          event_id?: string
          id?: string
          max_por_pedido?: number | null
          meia_elegivel?: boolean
          nome?: string
          preco?: number
          sector_id?: string
          taxa?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          cpf_titular: string
          id: string
          nome_titular: string
          order_id: string
          qr_kid: string | null
          qr_last_issued_at: string | null
          qr_nonce: string | null
          qr_version: number
          sector_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          ticket_type_id: string
        }
        Insert: {
          cpf_titular: string
          id?: string
          nome_titular: string
          order_id: string
          qr_kid?: string | null
          qr_last_issued_at?: string | null
          qr_nonce?: string | null
          qr_version?: number
          sector_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id: string
          ticket_type_id: string
        }
        Update: {
          cpf_titular?: string
          id?: string
          nome_titular?: string
          order_id?: string
          qr_kid?: string | null
          qr_last_issued_at?: string | null
          qr_nonce?: string | null
          qr_version?: number
          sector_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tenant_id?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          accepted_at: string | null
          from_user_id: string | null
          id: string
          status: string
          tenant_id: string
          ticket_id: string
          to_user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          from_user_id?: string | null
          id?: string
          status?: string
          tenant_id: string
          ticket_id: string
          to_user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          from_user_id?: string | null
          id?: string
          status?: string
          tenant_id?: string
          ticket_id?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["role_type"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["role_type"]
          tenant_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["role_type"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
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
          p_role: Database["public"]["Enums"]["role_type"]
          p_tenant: string
        }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { p_tenant: string }
        Returns: boolean
      }
      increment_lot_sold: {
        Args: { p_lot_id: string; p_quantity: number }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { p_tenant: string }
        Returns: boolean
      }
    }
    Enums: {
      checkin_result: "ok" | "duplicado" | "invalido" | "cancelado"
      coupon_type: "percentual" | "valor" | "cortesia"
      order_status: "rascunho" | "aguardando_pagto" | "pago" | "cancelado"
      payment_provider: "stripe" | "pagarme" | "mercadopago" | "pix_manual"
      role_type:
        | "admin_saas"
        | "organizer_admin"
        | "organizer_staff"
        | "checkin_operator"
        | "buyer"
      ticket_status: "emitido" | "transferido" | "cancelado" | "checkin"
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
      checkin_result: ["ok", "duplicado", "invalido", "cancelado"],
      coupon_type: ["percentual", "valor", "cortesia"],
      order_status: ["rascunho", "aguardando_pagto", "pago", "cancelado"],
      payment_provider: ["stripe", "pagarme", "mercadopago", "pix_manual"],
      role_type: [
        "admin_saas",
        "organizer_admin",
        "organizer_staff",
        "checkin_operator",
        "buyer",
      ],
      ticket_status: ["emitido", "transferido", "cancelado", "checkin"],
    },
  },
} as const
