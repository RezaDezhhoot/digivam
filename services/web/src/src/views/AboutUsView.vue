<script setup>
import { computed, onMounted, ref } from 'vue';
import { getAboutUs } from '../services/web-loan.api.js';

const content = ref({});
const loading = ref(false);

const hasContent = computed(() => {
  const value = content.value;
  return value && (value.heroTitle || value.description || value.mission || value.vision || value.values || value.contactInfo);
});

const splitContentLines = (value) =>
  String(value || '')
    .split(/\r?\n|•|●|▪|■/)
    .map((item) => item.trim())
    .filter(Boolean);

const descriptionParagraphs = computed(() => {
  const raw = String(content.value.description || '').trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(/\n\s*\n|\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
});

const valuesList = computed(() => splitContentLines(content.value.values));
const contactList = computed(() => splitContentLines(content.value.contactInfo));

const spotlightCards = computed(() => {
  const cards = [];

  if (content.value.mission) {
    cards.push({ title: 'ماموریت', text: content.value.mission, icon: 'fa-solid fa-compass-drafting' });
  }

  if (content.value.vision) {
    cards.push({ title: 'چشم‌انداز', text: content.value.vision, icon: 'fa-solid fa-binoculars' });
  }

  if (valuesList.value.length) {
    cards.push({ title: 'اولویت ما', text: valuesList.value[0], icon: 'fa-solid fa-seedling' });
  }

  return cards.slice(0, 3);
});

const principleLabels = ['شفافیت در تصمیم', 'هماهنگی در اجرا', 'اعتماد در تجربه', 'دقت در مسیر'];

const principleCards = computed(() => {
  const raw = Array.isArray(content.value.principleCards) ? content.value.principleCards : [];
  const dynamic = raw
    .filter((item) => item && (item.title || item.text))
    .map((item, index) => ({ title: item.title || '', text: item.text || '', index }));

  if (dynamic.length) {
    return dynamic;
  }

  if (valuesList.value.length) {
    return valuesList.value.map((text, index) => ({
      title: principleLabels[index] || `اصل ${index + 1}`,
      text,
      index
    }));
  }

  return [
    { title: 'شفافیت در تصمیم', text: 'اطلاعات باید روشن، قابل اتکا و قابل پیگیری باشد.', index: 0 },
    { title: 'هماهنگی در اجرا', text: 'از درخواست اولیه تا نهایی‌سازی، مسیر باید بدون گسست پیش برود.', index: 1 },
    { title: 'اعتماد در تجربه', text: 'کاربر باید در هر مرحله بداند چه چیزی در حال رخ دادن است.', index: 2 }
  ];
});

const promiseCards = computed(() => {
  const raw = Array.isArray(content.value.promiseCards) ? content.value.promiseCards : [];
  const dynamic = raw
    .filter((item) => item && (item.title || item.text))
    .map((item) => ({ title: item.title || '', text: item.text || '' }));

  if (dynamic.length) {
    return dynamic;
  }

  return [
    {
      title: 'مسیر ساده‌تر',
      text: 'فرآیندهای پیچیده وام و معامله را به مراحلی روشن، قابل فهم و قابل پیگیری تبدیل می‌کنیم.'
    },
    {
      title: 'همراهی واقعی',
      text: 'تعامل میان مشتری، کارگزار و تیم عملیاتی در یک تجربه منسجم و انسانی پیش می‌رود.'
    },
    {
      title: 'تصمیم دقیق‌تر',
      text: 'زیرساخت محصول برای کاهش ابهام، ثبت مستندات و اجرای قابل اتکا طراحی شده است.'
    }
  ];
});

const load = async () => {
  loading.value = true;
  try {
    const data = await getAboutUs();
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
  <div class="about-page animate-in">
    <div v-if="loading" class="about-state-card">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>در حال بارگذاری...</span>
    </div>

    <div v-else-if="!hasContent" class="about-state-card is-empty">
      <i class="fa-solid fa-inbox"></i>
      <p>محتوایی برای نمایش وجود ندارد</p>
    </div>

    <template v-else>
      <section class="about-hero">
        <div class="about-hero-grid">
          <div class="about-hero-copy">
            <div class="about-kicker">روایت دیجی وام</div>
            <h1 class="about-hero-title">{{ content.heroTitle || 'درباره ما' }}</h1>
            <p v-if="content.heroSubtitle" class="about-hero-subtitle">{{ content.heroSubtitle }}</p>
            <p v-else-if="descriptionParagraphs.length" class="about-hero-subtitle">{{ descriptionParagraphs[0] }}</p>

            <div class="about-hero-tags">
              <span class="about-tag">تجربه مالی شفاف</span>
              <span class="about-tag">همراهی عملیاتی</span>
              <span class="about-tag">مسیر قابل پیگیری</span>
            </div>
          </div>

          <div class="about-hero-panel">
            <div class="about-hero-panel-head">
              <span>چیزی که می‌سازیم</span>
              <strong>یک تجربه منظم و قابل اعتماد</strong>
            </div>

            <div class="about-spotlight-list">
              <article v-for="card in spotlightCards" :key="card.title" class="about-spotlight-card">
                <div class="about-spotlight-icon">
                  <i :class="card.icon"></i>
                </div>
                <div>
                  <h2>{{ card.title }}</h2>
                  <p>{{ card.text }}</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="about-story">
        <div class="about-section-head">
          <span>هویت برند</span>
          <h2>ما فقط یک صفحه معرفی نیستیم؛ یک مسیر روشن برای اجرا می‌سازیم</h2>
        </div>

        <div class="about-story-grid">
          <div class="about-story-text">
            <p v-for="(paragraph, index) in descriptionParagraphs" :key="`${paragraph}-${index}`">{{ paragraph }}</p>
          </div>

          <aside class="about-story-aside">
            <div class="about-aside-card accent-sand">
              <span>ماموریت</span>
              <strong>{{ content.mission || 'طراحی تجربه‌ای که در آن مسیر درخواست، بررسی و نهایی‌سازی بدون ابهام پیش برود.' }}</strong>
            </div>
            <div class="about-aside-card accent-sea">
              <span>چشم‌انداز</span>
              <strong>{{ content.vision || 'ساخت بستری که کیفیت تجربه و دقت اجرا را همزمان بالا ببرد.' }}</strong>
            </div>
          </aside>
        </div>
      </section>

      <section class="about-principles">
        <div class="about-section-head compact">
          <span>اصول راهنما</span>
          <h2>چطور فکر می‌کنیم و چطور اجرا می‌کنیم</h2>
        </div>

        <div class="about-principles-grid">
          <article v-for="item in principleCards" :key="item.title" class="about-principle-card">
            <div class="about-principle-index">0{{ item.index + 1 }}</div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </section>

      <section class="about-promise-strip">
        <article v-for="item in promiseCards" :key="item.title" class="about-promise-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </section>

      <section v-if="contactList.length || content.contactInfo" class="about-contact">
        <div class="about-section-head compact">
          <span>راه ارتباط</span>
          <h2>برای گفت‌وگو، پیگیری یا شروع همکاری در دسترس هستیم</h2>
        </div>

        <div class="about-contact-grid">
          <article v-for="(item, index) in contactList" :key="`${item}-${index}`" class="about-contact-card">
            <div class="about-contact-badge">{{ index + 1 }}</div>
            <p>{{ item }}</p>
          </article>
          <article v-if="!contactList.length && content.contactInfo" class="about-contact-card about-contact-card-full">
            <div class="about-contact-badge">1</div>
            <p>{{ content.contactInfo }}</p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped src="./styles/AboutUsView.css"></style>
