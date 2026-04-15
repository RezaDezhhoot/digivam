<script setup>
import { onMounted, ref, computed } from 'vue';
import { API_BASE, brokerFetchJson, brokerAuthHeaders } from '../services/broker-auth.api.js';

const items = ref([]);
const loading = ref(false);
const search = ref('');
const expandedId = ref(null);

const filteredItems = computed(() => {
  if (!search.value.trim()) return items.value;
  const q = search.value.trim().toLowerCase();
  return items.value.filter((item) => item.title.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q));
});

const toggle = (id) => { expandedId.value = expandedId.value === id ? null : id; };

const load = async () => {
  loading.value = true;
  try {
    const data = await brokerFetchJson(`${API_BASE}/web/tutorials`, {
      headers: { ...brokerAuthHeaders(), 'Content-Type': 'application/json' }
    });
    items.value = data.items || [];
  } catch { /* ignore */ }
  finally { loading.value = false; }
};

onMounted(load);
</script>

<template>
  <div class="academy-page animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <div>
          <h1 class="page-title">آموزشگاه</h1>
          <p class="page-subtitle">آموزش‌های ویدیویی پلتفرم</p>
        </div>
      </div>
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input v-model="search" class="form-control search-input" placeholder="جستجو در آموزش‌ها..." />
      </div>
    </div>

    <div v-if="loading" class="spinner-overlay">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else-if="!filteredItems.length" class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <p>آموزشی یافت نشد</p>
    </div>

    <div v-else class="tutorial-list">
      <div v-for="item in filteredItems" :key="item.id" class="tutorial-card" :class="{ expanded: expandedId === item.id }">
        <button class="tutorial-header" @click="toggle(item.id)">
          <div class="tutorial-info">
            <i class="fa-solid fa-play-circle tutorial-icon"></i>
            <span class="tutorial-title">{{ item.title }}</span>
          </div>
          <i class="fa-solid fa-chevron-down tutorial-arrow" :class="{ 'rotated': expandedId === item.id }"></i>
        </button>
        <div v-if="expandedId === item.id" class="tutorial-body">
          <p v-if="item.description" class="tutorial-desc">{{ item.description }}</p>
          <video v-if="item.videoUrl" :src="item.videoUrl" controls class="tutorial-video"></video>
          <p v-else class="tutorial-no-video">ویدیویی برای این آموزش بارگذاری نشده</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./styles/BrokerAcademyView.css"></style>
