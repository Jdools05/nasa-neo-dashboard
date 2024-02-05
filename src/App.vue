<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <v-main>
      <Navbar @toggle="isDark = !isDark" :is-dark-mode="isDark"/>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue';
import { ref } from 'vue';

let isDark = ref(true);
</script>
