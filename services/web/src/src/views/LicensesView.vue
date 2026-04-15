<script setup>
import { computed, onMounted, ref } from 'vue';
import { getLicenses } from '../services/web-loan.api.js';

const loading = ref(false);
const content = ref({});
const previewImage = ref(null);

const normalizedItems = computed(() => {
  const list = Array.isArray(content.value.items) ? content.value.items : [];
  return list
    .map((item, index) => ({
      id: `${index}-${item?.title || ''}`,
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
      imageUrl: String(item?.imageUrl || '').trim(),
      verifyUrl: String(item?.verifyUrl || '').trim()
    }))
    .filter((item) => item.title || item.imageUrl);
});

const hasContent = computed(() => {
  return Boolean(String(content.value.heroTitle || '').trim() || String(content.value.heroDescription || '').trim() || normalizedItems.value.length);
});

const load = async () => {
  loading.value = true;
  try {
    const data = await getLicenses();
    content.value = typeof data.content === 'object' && data.content ? data.content : {};
  } catch {
    content.value = {};
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="licenses-page animate-in">
    <div v-if="loading" class="licenses-state-card">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else-if="!hasContent" class="licenses-state-card is-empty">
      <i class="fa-solid fa-certificate"></i>
      <p>محتوایی برای صفحه مجوزها ثبت نشده است</p>
    </div>

    <template v-else>
      <section class="licenses-hero">
        <div class="licenses-hero-badge">
          <i class="fa-solid fa-shield-halved"></i>
          <span>اعتبار و مجوزها</span>
        </div>
        <h1>{{ content.heroTitle || 'مجوزها و گواهی نامه ها' }}</h1>
        <p class="licenses-hero-desc">{{ content.heroDescription || 'در این بخش می توانید مجوزهای ثبت شده مجموعه را مشاهده کنید.' }}</p>
        <div class="licenses-hero-glow"></div>
      </section>

      <section class="licenses-grid">
        <article v-for="(item, idx) in normalizedItems" :key="item.id" class="license-card">
          <div class="license-card-number">{{ String(idx + 1).padStart(2, '0') }}</div>
          <div class="license-media">
            <button v-if="item.imageUrl" type="button" class="license-image-button" @click="previewImage = item">
              <img :src="item.imageUrl" :alt="item.title || 'license'" loading="lazy" />
            </button>
            <div v-else class="license-media-placeholder">
              <i class="fa-solid fa-certificate"></i>
            </div>
          </div>
          <div class="license-body">
            <h2>{{ item.title || 'بدون عنوان' }}</h2>
            <p v-if="item.description" class="license-desc">{{ item.description }}</p>
            <div class="license-card-footer">
              <a v-if="item.verifyUrl" class="license-verify-btn" :href="item.verifyUrl" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                استعلام مجوز
              </a>
            </div>
          </div>
        </article>
      </section>

      <Teleport to="body">
        <Transition name="license-preview-fade">
          <div v-if="previewImage?.imageUrl" class="license-preview-overlay" @click.self="previewImage = null">
            <div class="license-preview-dialog">
              <button type="button" class="license-preview-close" @click="previewImage = null">×</button>
              <img class="license-preview-image" :src="previewImage.imageUrl" :alt="previewImage.title || 'license preview'" />
              <div class="license-preview-caption">
                <strong>{{ previewImage.title || 'تصویر مجوز' }}</strong>
                <p v-if="previewImage.description">{{ previewImage.description }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>
  </div>
</template>

<style scoped src="./styles/LicensesView.css"></style>
