import { supabase } from './supabase';
import type { ThemeItemRow, ThemeRow } from './types';

export interface ThemeSummary {
  theme: ThemeRow;
  count: number;
  /** Picto of the first item, shown on the menu tile. */
  coverPath: string | null;
}

/**
 * Visible themes with their item counts, in menu order. The explicit visible filter matters for
 * signed-in staff, whose access rules also let them read hidden themes.
 */
export async function fetchVisibleThemes(): Promise<ThemeSummary[]> {
  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .eq('visible', true)
    .order('sort')
    .order('created_at');
  if (error) throw error;
  if (!themes.length) return [];

  const { data: items, error: itemsError } = await supabase
    .from('theme_items')
    .select('theme_id, picto_path, sort')
    .in(
      'theme_id',
      themes.map((t) => t.id),
    )
    .order('sort')
    .order('created_at');
  if (itemsError) throw itemsError;

  return (themes as ThemeRow[]).map((theme) => {
    const own = (items as Pick<ThemeItemRow, 'theme_id' | 'picto_path'>[]).filter((i) => i.theme_id === theme.id);
    return { theme, count: own.length, coverPath: own[0]?.picto_path ?? null };
  });
}
