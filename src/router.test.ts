import { describe, expect, it, vi } from 'vitest';

// The guard is pure; keep the real Supabase client and auth listeners out of the test.
vi.mock('@/lib/auth', () => ({ initAuth: async () => {}, isStaff: () => false, isAdmin: () => false }));

const { guard } = await import('./router');

const route = (fullPath: string, ...access: (undefined | 'staff' | 'admin')[]) => ({
  fullPath,
  matched: access.map((a) => ({ meta: { access: a } })) as never,
});

describe('route guard', () => {
  it('lets anyone open student screens', () => {
    expect(guard(route('/'), false, false)).toBe(true);
  });

  it('sends visitors of staff screens to the login, remembering where they wanted to go', () => {
    expect(guard(route('/beheer/themas', 'staff', undefined), false, false)).toEqual({
      name: 'login',
      query: { next: '/beheer/themas' },
    });
  });

  it('lets a juf into staff screens but not admin screens', () => {
    expect(guard(route('/beheer/themas', 'staff', undefined), true, false)).toBe(true);
    expect(guard(route('/beheer/personeel', 'staff', 'admin'), true, false)).toEqual({ name: 'staff-themes' });
  });

  it('lets an admin in everywhere', () => {
    expect(guard(route('/beheer/personeel', 'staff', 'admin'), true, true)).toBe(true);
  });
});
