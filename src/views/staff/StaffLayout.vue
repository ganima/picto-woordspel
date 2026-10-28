<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import LangSwitch from '@/components/LangSwitch.vue';
import { auth, isAdmin, signOut } from '@/lib/auth';
import { refresh } from '@/lib/offline';
import { saving } from '@/lib/staff';

const router = useRouter();
const route = useRoute();
// The theme detail page belongs to the themes tab.
const current = (name: string) => route.name === name || (name === 'staff-themes' && route.name === 'staff-theme');

// Back on the class screen, this device should show what was just changed.
onBeforeUnmount(() => void refresh());

const name = computed(() => auth.staff?.display_name || auth.staff?.email || auth.user?.email || '');

const tabs = computed(() => [
  { to: 'staff-themes', label: 'staff.nav.themes' },
  { to: 'staff-games', label: 'staff.nav.games' },
  ...(isAdmin() ? [{ to: 'staff-people', label: 'staff.nav.staff' }] : []),
  { to: 'staff-device', label: 'staff.nav.device' },
]);

async function out() {
  await signOut();
  await router.replace({ name: 'themes' });
}
</script>

<template>
  <div class="page">
    <header class="bar">
      <h1>{{ $t('app.title') }}</h1>
      <span v-if="auth.staff" class="tag" data-cy="role">{{ $t(`staff.roles.${auth.staff.role}`) }}</span>
      <span class="sp" />
      <LangSwitch />
      <RouterLink class="btn quiet" :to="{ name: 'themes' }"><AppIcon name="home" />{{ $t('staff.toClass') }}</RouterLink>
      <button type="button" class="btn" data-cy="sign-out" @click="out"><AppIcon name="out" />{{ $t('staff.signOut') }}</button>
    </header>
    <p class="hint status">
      <span data-cy="signed-in-as">{{ $t('staff.signedInAs', { name }) }}</span>
      <span v-if="saving.busy" data-cy="saving">{{ $t('staff.save.busy') }}</span>
      <span v-else-if="saving.error" class="flag" role="alert" data-cy="save-error">{{ $t('staff.save.error') }}</span>
    </p>

    <nav class="tabs" :aria-label="$t('app.title')">
      <RouterLink v-for="t in tabs" :key="t.to" :to="{ name: t.to }" class="btn quiet" :class="{ on: current(t.to) }" :data-cy="`tab-${t.to}`">
        {{ $t(t.label) }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs .on { background: var(--fg); border-color: var(--fg); color: var(--bg); }
.status { display: flex; gap: 6px 16px; flex-wrap: wrap; }
.flag { color: var(--hot); font-weight: 700; }
</style>
