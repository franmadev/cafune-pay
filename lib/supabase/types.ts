// Generado manualmente desde supabase/schema.sql
// En producción: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── Enums ───────────────────────────────────────────────────────────────────

export type UserRole       = 'superadmin' | 'admin' | 'worker'
export type PaymentMethod  = 'cash' | 'card' | 'transfer' | 'mixed'
export type ReceiptStatus  = 'open' | 'completed' | 'voided'
export type PeriodStatus   = 'open' | 'closed' | 'paid'
export type CommissionType = 'percentage' | 'fixed'

// ─── Database ────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {

      // ── users ──────────────────────────────────────────────────────────────
      users: {
        Row: {
          id:         string
          email:      string
          role:       UserRole
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id:         string          // viene de auth.users
          email:      string
          role?:      UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?:     string
          role?:      UserRole
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      // ── workers ────────────────────────────────────────────────────────────
      workers: {
        Row: {
          id:        string
          user_id:   string | null
          full_name: string
          phone:     string | null
          email:     string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:       string
          user_id?:  string | null
          full_name: string
          phone?:    string | null
          email?:    string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?:  string | null
          full_name?: string
          phone?:    string | null
          email?:    string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'workers_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }

      // ── clients ────────────────────────────────────────────────────────────
      clients: {
        Row: {
          id:             string
          full_name:      string
          phone:          string | null
          email:          string | null
          notes:          string | null
          rut:            string | null
          hair_length_cm: number | null
          public_token:   string
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:            string
          full_name:      string
          phone?:         string | null
          email?:         string | null
          notes?:         string | null
          rut?:           string | null
          hair_length_cm?: number | null
          public_token?:  string
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          full_name?:     string
          phone?:         string | null
          email?:         string | null
          notes?:         string | null
          rut?:           string | null
          hair_length_cm?: number | null
          updated_at?:    string
        }
        Relationships: []
      }

      // ── client_hair_history ────────────────────────────────────────────────
      client_hair_history: {
        Row: {
          id:           string
          client_id:    string
          length_cm:    number
          recorded_at:  string
          receipt_id:   string | null
          service_name: string | null
          variant_name: string | null
        }
        Insert: {
          id?:          string
          client_id:    string
          length_cm:    number
          recorded_at?: string
          receipt_id?:  string | null
          service_name?: string | null
          variant_name?: string | null
        }
        Update: never
        Relationships: [
          { foreignKeyName: 'hair_history_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
          { foreignKeyName: 'hair_history_receipt_id_fkey'; columns: ['receipt_id']; referencedRelation: 'receipts'; referencedColumns: ['id'] }
        ]
      }

      // ── service_catalog ────────────────────────────────────────────────────
      service_catalog: {
        Row: {
          id:               string
          name:             string
          description:      string | null
          base_price:       number
          commission_type:  CommissionType  // 'percentage' | 'fixed'
          commission_value: number          // % o monto fijo según el tipo
          qr_code:          string | null
          is_active:        boolean
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id?:              string
          name:             string
          description?:     string | null
          base_price:       number
          commission_type:  CommissionType
          commission_value: number
          qr_code?:         string | null
          is_active?:       boolean
          created_at?:      string
          updated_at?:      string
        }
        Update: {
          name?:             string
          description?:      string | null
          base_price?:       number
          commission_type?:  CommissionType
          commission_value?: number
          qr_code?:          string | null
          is_active?:        boolean
          updated_at?:       string
        }
        Relationships: []
      }

      // ── product_catalog ────────────────────────────────────────────────────
      product_catalog: {
        Row: {
          id:         string
          name:       string
          barcode:    string | null
          price:      number
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          name:       string
          barcode?:   string | null
          price:      number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?:      string
          barcode?:   string | null
          price?:     number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }

      // ── service_variants ───────────────────────────────────────────────────
      service_variants: {
        Row: {
          id:              string
          service_id:      string
          name:            string
          price:           number
          is_active:       boolean
          sort_order:      number
          hair_length_min: number | null
          hair_length_max: number | null
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:              string
          service_id:       string
          name:             string
          price:            number
          is_active?:       boolean
          sort_order?:      number
          hair_length_min?: number | null
          hair_length_max?: number | null
          created_at?:      string
          updated_at?:      string
        }
        Update: {
          name?:            string
          price?:           number
          is_active?:       boolean
          sort_order?:      number
          hair_length_min?: number | null
          hair_length_max?: number | null
          updated_at?:      string
        }
        Relationships: [
          { foreignKeyName: 'service_variants_service_id_fkey'; columns: ['service_id']; referencedRelation: 'service_catalog'; referencedColumns: ['id'] }
        ]
      }

      // ── commission_rules ───────────────────────────────────────────────────
      commission_rules: {
        Row: {
          id:               string
          service_id:       string
          worker_id:        string | null
          commission_type:  CommissionType
          commission_value: number
          valid_from:       string
          valid_until:      string | null
          created_at:       string
        }
        Insert: {
          id?:               string
          service_id:        string
          worker_id?:        string | null
          commission_type?:  CommissionType
          commission_value:  number
          valid_from?:       string
          valid_until?:      string | null
          created_at?:       string
        }
        Update: {
          commission_type?:  CommissionType
          commission_value?: number
          valid_until?:      string | null
        }
        Relationships: [
          { foreignKeyName: 'commission_rules_service_id_fkey'; columns: ['service_id']; referencedRelation: 'service_catalog'; referencedColumns: ['id'] },
          { foreignKeyName: 'commission_rules_worker_id_fkey'; columns: ['worker_id']; referencedRelation: 'workers'; referencedColumns: ['id'] }
        ]
      }

      // ── receipts ───────────────────────────────────────────────────────────
      receipts: {
        Row: {
          id:             string
          client_id:      string | null
          worker_id:      string | null
          created_by:     string
          status:         ReceiptStatus
          payment_method: PaymentMethod
          notes:          string | null
          issued_at:      string
          total_services: number
          total_products: number
          total_amount:   number   // generado (STORED)
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:            string
          client_id?:     string | null
          worker_id?:     string | null
          created_by:     string
          status?:        ReceiptStatus
          payment_method?: PaymentMethod
          notes?:         string | null
          issued_at?:     string
          total_services?: number
          total_products?: number
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          client_id?:     string | null
          worker_id?:     string | null
          status?:        ReceiptStatus
          payment_method?: PaymentMethod
          notes?:         string | null
          total_services?: number
          total_products?: number
          updated_at?:    string
        }
        Relationships: [
          { foreignKeyName: 'receipts_client_id_fkey'; columns: ['client_id']; referencedRelation: 'clients'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipts_worker_id_fkey'; columns: ['worker_id']; referencedRelation: 'workers'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipts_created_by_fkey'; columns: ['created_by']; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }

      // ── receipt_services ───────────────────────────────────────────────────
      receipt_services: {
        Row: {
          id:               string
          receipt_id:       string
          service_id:       string
          worker_id:        string
          price_charged:    number
          commission_type:  CommissionType
          commission_value: number
          commission_amt:   number
          variant_id:       string | null
          variant_name:     string | null
          created_at:       string
        }
        Insert: {
          id?:              string
          receipt_id:       string
          service_id:       string
          worker_id:        string
          price_charged:    number
          commission_type:  CommissionType
          commission_value: number
          commission_amt:   number
          variant_id?:      string | null
          variant_name?:    string | null
          created_at?:      string
        }
        Update: never  // las líneas de servicio no se editan
        Relationships: [
          { foreignKeyName: 'receipt_services_receipt_id_fkey'; columns: ['receipt_id']; referencedRelation: 'receipts'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipt_services_service_id_fkey'; columns: ['service_id']; referencedRelation: 'service_catalog'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipt_services_worker_id_fkey'; columns: ['worker_id']; referencedRelation: 'workers'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipt_services_variant_id_fkey'; columns: ['variant_id']; referencedRelation: 'service_variants'; referencedColumns: ['id'] }
        ]
      }

      // ── receipt_products ───────────────────────────────────────────────────
      receipt_products: {
        Row: {
          id:         string
          receipt_id: string
          product_id: string
          quantity:   number
          unit_price: number
          subtotal:   number   // generado (STORED)
          created_at: string
        }
        Insert: {
          id?:        string
          receipt_id: string
          product_id: string
          quantity?:  number
          unit_price: number
          created_at?: string
        }
        Update: never  // las líneas de producto no se editan
        Relationships: [
          { foreignKeyName: 'receipt_products_receipt_id_fkey'; columns: ['receipt_id']; referencedRelation: 'receipts'; referencedColumns: ['id'] },
          { foreignKeyName: 'receipt_products_product_id_fkey'; columns: ['product_id']; referencedRelation: 'product_catalog'; referencedColumns: ['id'] }
        ]
      }

      // ── payroll_periods ────────────────────────────────────────────────────
      payroll_periods: {
        Row: {
          id:         string
          name:       string
          start_date: string
          end_date:   string
          status:     PeriodStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          name:       string
          start_date: string
          end_date:   string
          status?:    PeriodStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?:      string
          start_date?: string
          end_date?:  string
          status?:    PeriodStatus
          updated_at?: string
        }
        Relationships: []
      }

      // ── payroll_entries ────────────────────────────────────────────────────
      payroll_entries: {
        Row: {
          id:                 string
          period_id:          string
          worker_id:          string
          total_services_amt: number
          total_commission:   number
          is_paid:            boolean
          paid_at:            string | null
          notes:              string | null
          created_at:         string
          updated_at:         string
        }
        Insert: {
          id?:                string
          period_id:          string
          worker_id:          string
          total_services_amt?: number
          total_commission?:  number
          is_paid?:           boolean
          paid_at?:           string | null
          notes?:             string | null
          created_at?:        string
          updated_at?:        string
        }
        Update: {
          total_services_amt?: number
          total_commission?:  number
          is_paid?:           boolean
          paid_at?:           string | null
          notes?:             string | null
          updated_at?:        string
        }
        Relationships: [
          { foreignKeyName: 'payroll_entries_period_id_fkey'; columns: ['period_id']; referencedRelation: 'payroll_periods'; referencedColumns: ['id'] },
          { foreignKeyName: 'payroll_entries_worker_id_fkey'; columns: ['worker_id']; referencedRelation: 'workers'; referencedColumns: ['id'] }
        ]
      }

      // ── payroll_payments ───────────────────────────────────────────────────
      payroll_payments: {
        Row: {
          id:             string
          worker_id:      string
          date_from:      string
          date_to:        string
          net_amount:     number
          payment_method: 'cash' | 'transfer'
          paid_at:        string
          notes:          string | null
          created_at:     string
        }
        Insert: {
          id?:            string
          worker_id:      string
          date_from:      string
          date_to:        string
          net_amount:     number
          payment_method: 'cash' | 'transfer'
          paid_at?:       string
          notes?:         string | null
          created_at?:    string
        }
        Update: {
          payment_method?: 'cash' | 'transfer'
          paid_at?:        string
          notes?:          string | null
        }
        Relationships: [
          { foreignKeyName: 'payroll_payments_worker_id_fkey'; columns: ['worker_id']; referencedRelation: 'workers'; referencedColumns: ['id'] }
        ]
      }

      // ── app_settings ───────────────────────────────────────────────────────
      app_settings: {
        Row: {
          key:        string
          value:      string
          updated_at: string
        }
        Insert: {
          key:         string
          value:       string
          updated_at?: string
        }
        Update: {
          value?:      string
          updated_at?: string
        }
        Relationships: []
      }

      // ── audit_log ──────────────────────────────────────────────────────────
      audit_log: {
        Row: {
          id:          number
          table_name:  string
          record_id:   string
          action:      'INSERT' | 'UPDATE' | 'DELETE'
          changed_by:  string | null
          old_data:    Json | null
          new_data:    Json | null
          occurred_at: string
        }
        Insert: never  // solo lo escribe el trigger
        Update: never
        Relationships: []
      }
    }

    Views: { [_ in never]: never }

    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: UserRole
      }
      get_my_worker_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      resolve_commission: {
        Args: { p_service_id: string; p_worker_id: string; p_date?: string }
        Returns: number
      }
    }

    Enums: {
      user_role:      UserRole
      payment_method: PaymentMethod
      receipt_status: ReceiptStatus
      period_status:  PeriodStatus
    }

    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Helpers para tipos de filas ─────────────────────────────────────────────

type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type UserRow            = Tables<'users'>
export type WorkerRow          = Tables<'workers'>
export type ClientRow          = Tables<'clients'>
export type ServiceRow         = Tables<'service_catalog'>
export type ServiceVariantRow  = Tables<'service_variants'>
export type ProductRow         = Tables<'product_catalog'>
export type CommissionRuleRow  = Tables<'commission_rules'>
export type ReceiptRow         = Tables<'receipts'>
export type ReceiptServiceRow  = Tables<'receipt_services'>
export type ReceiptProductRow  = Tables<'receipt_products'>
export type PayrollPeriodRow   = Tables<'payroll_periods'>
export type PayrollEntryRow    = Tables<'payroll_entries'>
export type PayrollPaymentRow  = Tables<'payroll_payments'>

export type ServiceWithVariants = ServiceRow & {
  service_variants: ServiceVariantRow[]
}

// ─── Tipos compuestos (joins frecuentes) ─────────────────────────────────────

export type ReceiptWithLines = ReceiptRow & {
  receipt_services: (ReceiptServiceRow & {
    service_catalog: Pick<ServiceRow, 'id' | 'name'>
    workers:         Pick<WorkerRow,  'id' | 'full_name'>
  })[]
  receipt_products: (ReceiptProductRow & {
    product_catalog: Pick<ProductRow, 'id' | 'name'>
  })[]
  clients: Pick<ClientRow, 'id' | 'full_name' | 'phone'> | null
}

export type ClientHairHistoryRow = Tables<'client_hair_history'>

export type ServiceVariantDraft = {
  tempId:          string
  name:            string
  price:           number
  hair_length_min: number | null
  hair_length_max: number | null
}

export type WorkerCommissionSummary = {
  worker_id:        string
  full_name:        string
  total_ingresos:   number
  total_comisiones: number
  ingreso_salon:    number
}
