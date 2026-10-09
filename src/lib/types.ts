// Row shapes of the tables in supabase-setup.sql.

export type StaffRole = 'admin' | 'juf';
export type Role = StaffRole | 'student';
export type GameKind = 'theme' | 'standalone';

export interface StaffRow {
  user_id: string;
  role: StaffRole;
  email: string;
  display_name: string;
  created_at: string;
}

export interface ThemeRow {
  id: string;
  name: string;
  visible: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface ThemeItemOptions {
  exclude?: string[];
}

export interface ThemeItemRow {
  id: string;
  theme_id: string;
  word: string;
  picto_path: string;
  audio_path: string | null;
  options: ThemeItemOptions;
  sort: number;
  created_at: string;
}

export interface GameRow {
  key: string;
  kind: GameKind;
  available: boolean;
  visible: boolean;
  sort: number;
  settings: Record<string, unknown>;
}

export interface GameSetRow {
  id: string;
  game_key: string;
  name: string;
  visible: boolean;
  data: Record<string, unknown>;
  sort: number;
  created_at: string;
  updated_at: string;
}
