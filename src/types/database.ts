import type { CreateEditalInput, Edital, UpdateEditalInput } from './edital'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type UserPreferencesDatabaseRow = {
  user_id: string
  timezone: string
  default_reminders: Json
  created_at: string
  updated_at: string
}

// Contrato da migration versionada. Atualizar junto ao SQL; pode ser substituído por tipos gerados pelo CLI.
export type Database = {
  public: {
    Tables: {
      editais: {
        Row: Edital
        Insert: CreateEditalInput & { user_id: string }
        Update: UpdateEditalInput
        Relationships: []
      }
      user_preferences: {
        Row: UserPreferencesDatabaseRow
        Insert: Pick<UserPreferencesDatabaseRow, 'user_id'> & Partial<Omit<UserPreferencesDatabaseRow, 'user_id'>>
        Update: Partial<Omit<UserPreferencesDatabaseRow, 'user_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
