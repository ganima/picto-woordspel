<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import LangSwitch from '@/components/LangSwitch.vue';
import { auth, isAdmin, signOut } from '@/lib/auth';

const router = useRouter();

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
    <p class="hint" data-cy="signed-in-as">{{ $t('staff.signedInAs', { name }) }}</p>

    <nav class="tabs" :aria-label="$t('app.title')">
      <RouterLink v-for="t in tabs" :key="t.to" :to="{ name: t.to }" class="btn quiet" :data-cy="`tab-${t.to}`">
        {{ $t(t.label) }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tabs .router-link-active { background: var(--fg); border-color: var(--fg); color: var(--bg); }
</style>
