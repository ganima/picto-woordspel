<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import LangSwitch from '@/components/LangSwitch.vue';
import { signIn } from '@/lib/auth';

const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref<'' | 'errCredentials' | 'errNotStaff' | 'errNetwork'>('');

const ERRORS = { credentials: 'errCredentials', not_staff: 'errNotStaff', network: 'errNetwork' } as const;

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    const res = await signIn(email.value, password.value);
    if (!res.ok) {
      error.value = ERRORS[res.reason];
      return;
    }
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/beheer') ? route.query.next : '/beheer';
    await router.replace(next);
  } catch (e) {
    console.warn(e);
    error.value = 'errNetwork';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="page login">
    <header class="bar">
      <RouterLink class="btn quiet" :to="{ name: 'themes' }"><AppIcon name="back" />{{ $t('login.toClass') }}</RouterLink>
      <span class="sp" />
      <LangSwitch />
    </header>

    <form class="panel" novalidate @submit.prevent="submit">
      <h1 class="title">{{ $t('login.title') }}</h1>
      <p class="hint">{{ $t('login.intro') }}</p>
      <div class="field">
        <label for="email">{{ $t('login.email') }}</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required data-cy="email" />
      </div>
      <div class="field">
        <label for="password">{{ $t('login.password') }}</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required data-cy="password" />
      </div>
      <p v-if="error" class="note err" role="alert" data-cy="login-error">{{ $t(`login.${error}`) }}</p>
      <div>
        <button type="submit" class="btn pri big" :disabled="busy || !email || !password" data-cy="submit">
          {{ busy ? $t('login.busy') : $t('login.submit') }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.login form { max-width: 480px; width: 100%; margin-inline: auto; }
.title { font-family: var(--font-display); font-weight: 800; font-size: clamp(26px, 5vw, 36px); margin: 0; }
</style>
