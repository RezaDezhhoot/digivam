<script setup>
import { onMounted, ref, computed } from 'vue';
import { getWebTutorials } from '../services/web-loan.api.js';

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
    const data = await getWebTutorials();
    items.value = data.items || [];
  } catch { /* ignore */ }
  finally { loading.value = false; }
};

onMounted(load);
</script>

<template>
  <div class="academy-page animate-in">
    <div class="academy-header">
      <div class="academy-header-icon"><i class="fa-solid fa-graduation-cap"></i></div>
      <h1 class="academy-title">آموزشگاه</h1>
      <p class="academy-subtitle">ویدیوهای آموزشی پلتفرم را مشاهده و یاد بگیرید</p>
      <div class="academy-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="search" class="form-control" placeholder="جستجو در آموزش‌ها..." />
      </div>
    </div>

    <div v-if="loading" class="academy-spinner">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else-if="!filteredItems.length" class="academy-empty">
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

<style scoped src="./styles/CustomerAcademyView.css"></style>
