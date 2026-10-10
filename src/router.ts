import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { initAuth, isAdmin, isStaff } from '@/lib/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** 'staff' = juf or admin, 'admin' = admin only. Unset = open to everyone (students). */
    access?: 'staff' | 'admin';
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'themes', component: () => import('@/views/student/ThemeMenu.vue') },
    {
      path: '/thema/:themeId',
      name: 'theme-games',
      component: () => import('@/views/student/GameMenu.vue'),
      props: true,
    },
    {
      path: '/thema/:themeId/:gameKey/:variant?',
      name: 'play',
      component: () => import('@/views/student/GamePlay.vue'),
      props: true,
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/beheer',
      component: () => import('@/views/staff/StaffLayout.vue'),
      meta: { access: 'staff' },
      children: [
        { path: '', redirect: { name: 'staff-themes' } },
        { path: 'themas', name: 'staff-themes', component: () => import('@/views/staff/StaffThemes.vue') },
        { path: 'spelletjes', name: 'staff-games', component: () => import('@/views/staff/StaffGames.vue') },
        {
          path: 'personeel',
          name: 'staff-people',
          component: () => import('@/views/staff/StaffPeople.vue'),
          meta: { access: 'admin' },
        },
        { path: 'toestel', name: 'staff-device', component: () => import('@/views/staff/DeviceSettings.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

/** Where a visitor may go; exported for unit tests. */
export function guard(to: Pick<RouteLocationNormalized, 'matched' | 'fullPath'>, staff: boolean, admin: boolean) {
  const needs = to.matched.map((r) => r.meta.access);
  if (needs.includes('admin') && !admin) {
    return staff ? { name: 'staff-themes' } : { name: 'login', query: { next: to.fullPath } };
  }
  if (needs.includes('staff') && !staff) {
    return { name: 'login', query: { next: to.fullPath } };
  }
  return true;
}

router.beforeEach(async (to) => {
  await initAuth();
  return guard(to, isStaff(), isAdmin());
});
