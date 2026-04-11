<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Select2Input from '../components/Select2Input.vue';
import { getFacilities, getSettings, updateSettings } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const tabs = [
  { key: 'general', label: 'عمومی', icon: 'fa-solid fa-sliders' },
  { key: 'maintenance', label: 'دسترسی', icon: 'fa-solid fa-screwdriver-wrench' },
  { key: 'home', label: 'خانه', icon: 'fa-solid fa-house' },
  { key: 'footer', label: 'فوتر', icon: 'fa-solid fa-table-columns' },
  { key: 'seo', label: 'سئو', icon: 'fa-solid fa-magnifying-glass-chart' }
];

const loading = ref(false);
const saving = ref(false);
const activeTab = ref('general');
const previewUrl = ref('');
const featuredFacilityOptions = ref([]);
const form = ref(createInitialForm());

function createInitialForm() {
  return {
    siteName: '',
    siteDescription: '',
    maintenanceMessage: 'در حال بروزرسانی هستیم، بعدا مراجعه کنید',
    webPanelMaintenance: false,
    customerPanelMaintenance: false,
    brokerPanelMaintenance: false,
    decreaseValidity: 0,
    loanAdminConfirm1: false,
    loanAdminConfirm2: false,
    siteLogoUrl: '',
    siteLogoFile: null,
    featuredFacilityId: '',
    homeFeatureCards: createEmptyCards(),
    footerContent: createEmptyFooter(),
    defaultMetaTitle: '',
    defaultMetaDescription: '',
    defaultMetaKeywords: '',
    homeMetaTitle: '',
    homeMetaDescription: '',
    homeMetaKeywords: '',
    marketMetaTitle: '',
    marketMetaDescription: '',
    marketMetaKeywords: ''
  };
}

function createEmptyCards() {
  return [
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' }
  ];
}

function createEmptyFooter() {
  return {
    aboutTitle: '',
    aboutText: '',
    socialTitle: '',
    socialLinks: [{ label: '', url: '' }],
    supportTitle: '',
    supportLinks: [{ label: '', url: '' }],
    copyrightText: ''
  };
}

const normalizeCards = (cards) => {
  const normalized = Array.isArray(cards)
    ? cards.map((item) => ({
        title: String(item?.title || ''),
        description: String(item?.description || '')
      }))
    : [];

  while (normalized.length < 3) {
    normalized.push({ title: '', description: '' });
  }

  return normalized;
};

const normalizeLinks = (links) => {
  const normalized = Array.isArray(links)
    ? links.map((item) => ({
        label: String(item?.label || ''),
        url: String(item?.url || '')
      }))
    : [];

  return normalized.length ? normalized : [{ label: '', url: '' }];
};

const currentPreview = computed(() => previewUrl.value || form.value.siteLogoUrl || '');

const clearPreview = () => {
  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
};

const buildFacilityLabel = (item) => {
  const parts = [item?.title, item?.loanType?.name, item?.broker?.name].filter(Boolean);
  return parts.join(' | ');
};

const loadFacilityOptions = async () => {
  try {
    const published = await getFacilities('?status=published&limit=200');
    featuredFacilityOptions.value = (published.items || []).map((item) => ({
      id: item.id,
      name: buildFacilityLabel(item)
    }));
  } catch {
    const fallback = await getFacilities('?limit=200');
    featuredFacilityOptions.value = (fallback.items || []).map((item) => ({
      id: item.id,
      name: buildFacilityLabel(item)
    }));
  }
};

const applySettings = (settings) => {
  clearPreview();
  form.value = {
    siteName: settings.siteName || '',
    siteDescription: settings.siteDescription || '',
    maintenanceMessage: settings.maintenanceMessage || 'در حال بروزرسانی هستیم، بعدا مراجعه کنید',
    webPanelMaintenance: Boolean(settings.webPanelMaintenance),
    customerPanelMaintenance: Boolean(settings.customerPanelMaintenance),
    brokerPanelMaintenance: Boolean(settings.brokerPanelMaintenance),
    decreaseValidity: Number(settings.decreaseValidity || 0),
    loanAdminConfirm1: Boolean(settings.loanAdminConfirm1),
    loanAdminConfirm2: Boolean(settings.loanAdminConfirm2),
    siteLogoUrl: settings.siteLogoUrl || '',
    siteLogoFile: null,
    featuredFacilityId: settings.featuredFacilityId || '',
    homeFeatureCards: normalizeCards(settings.homeFeatureCards),
    footerContent: {
      aboutTitle: settings.footerContent?.aboutTitle || '',
      aboutText: settings.footerContent?.aboutText || '',
      socialTitle: settings.footerContent?.socialTitle || '',
      socialLinks: normalizeLinks(settings.footerContent?.socialLinks),
      supportTitle: settings.footerContent?.supportTitle || '',
      supportLinks: normalizeLinks(settings.footerContent?.supportLinks),
      copyrightText: settings.footerContent?.copyrightText || ''
    },
    defaultMetaTitle: settings.defaultMetaTitle || '',
    defaultMetaDescription: settings.defaultMetaDescription || '',
    defaultMetaKeywords: settings.defaultMetaKeywords || '',
    homeMetaTitle: settings.homeMetaTitle || '',
    homeMetaDescription: settings.homeMetaDescription || '',
    homeMetaKeywords: settings.homeMetaKeywords || '',
    marketMetaTitle: settings.marketMetaTitle || '',
    marketMetaDescription: settings.marketMetaDescription || '',
    marketMetaKeywords: settings.marketMetaKeywords || ''
  };
};

const load = async () => {
  loading.value = true;
  try {
    const [settingsData] = await Promise.all([getSettings(), loadFacilityOptions()]);
    applySettings(settingsData.settings || {});
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const handleLogoChange = (event) => {
  clearPreview();
  const [file] = event.target.files || [];
  form.value.siteLogoFile = file || null;
  if (file) {
    previewUrl.value = URL.createObjectURL(file);
  }
};

const addLink = (field) => {
  form.value.footerContent[field].push({ label: '', url: '' });
};

const removeLink = (field, index) => {
  if (form.value.footerContent[field].length === 1) {
    form.value.footerContent[field][0] = { label: '', url: '' };
    return;
  }
  form.value.footerContent[field].splice(index, 1);
};

const submit = async () => {
  saving.value = true;
  try {
    const payload = new FormData();
    payload.append('siteName', form.value.siteName);
    payload.append('siteDescription', form.value.siteDescription || '');
    payload.append('maintenanceMessage', form.value.maintenanceMessage || '');
    payload.append('webPanelMaintenance', form.value.webPanelMaintenance ? '1' : '0');
    payload.append('customerPanelMaintenance', form.value.customerPanelMaintenance ? '1' : '0');
    payload.append('brokerPanelMaintenance', form.value.brokerPanelMaintenance ? '1' : '0');
    payload.append('decreaseValidity', String(form.value.decreaseValidity || 0));
    payload.append('loanAdminConfirm1', form.value.loanAdminConfirm1 ? '1' : '0');
    payload.append('loanAdminConfirm2', form.value.loanAdminConfirm2 ? '1' : '0');
    payload.append('featuredFacilityId', form.value.featuredFacilityId ? String(form.value.featuredFacilityId) : '');
    payload.append('homeFeatureCards', JSON.stringify(form.value.homeFeatureCards));
    payload.append('footerContent', JSON.stringify(form.value.footerContent));
    payload.append('defaultMetaTitle', form.value.defaultMetaTitle || '');
    payload.append('defaultMetaDescription', form.value.defaultMetaDescription || '');
    payload.append('defaultMetaKeywords', form.value.defaultMetaKeywords || '');
    payload.append('homeMetaTitle', form.value.homeMetaTitle || '');
    payload.append('homeMetaDescription', form.value.homeMetaDescription || '');
    payload.append('homeMetaKeywords', form.value.homeMetaKeywords || '');
    payload.append('marketMetaTitle', form.value.marketMetaTitle || '');
    payload.append('marketMetaDescription', form.value.marketMetaDescription || '');
    payload.append('marketMetaKeywords', form.value.marketMetaKeywords || '');
    if (form.value.siteLogoFile) {
      payload.append('siteLogo', form.value.siteLogoFile);
    }
    const data = await updateSettings(payload);
    applySettings(data.settings || {});
    toast.success(data.message || 'تنظیمات ذخیره شد');
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

onMounted(load);
onBeforeUnmount(clearPreview);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-gear"></i></div>
        <div>
          <h1 class="page-title">تنظیمات سایت</h1>
          <p class="page-subtitle">مدیریت محتوای صفحه اصلی، فوتر، سئو و وام ویژه از یک صفحه تب‌بندی‌شده</p>
        </div>
      </div>
      <button class="btn btn-primary" :disabled="saving || loading" @click="submit">
        <i class="fa-solid fa-floppy-disk me-1"></i>
        {{ saving ? 'ذخیره...' : 'ثبت تغییرات' }}
      </button>
    </div>

    <div class="card card-body settings-shell">
      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری...</span>
      </div>

      <template v-else>
        <div class="settings-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="settings-tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <i :class="tab.icon"></i>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <div class="settings-grid">
          <section v-if="activeTab === 'general'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">اطلاعات پایه سایت</h2>
                <p class="settings-section-subtitle">نام، توضیح، لوگو و سیاست‌های تایید وام از این بخش کنترل می‌شوند.</p>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-required"><i class="fa-solid fa-heading me-1"></i> نام سایت</label>
                <input v-model="form.siteName" class="form-control" maxlength="35" />
              </div>

              <div class="col-12 col-lg-6">
                <label class="form-label form-label-required"><i class="fa-solid fa-coins me-1"></i> کاهش اعتبار</label>
                <div class="input-group">
                  <input v-model="form.decreaseValidity" class="form-control" type="number" min="0" />
                  <span class="input-group-text">تومان</span>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional"><i class="fa-solid fa-image me-1"></i> لوگوی سایت</label>
                <input class="form-control" type="file" accept="image/*" @change="handleLogoChange" />
              </div>

              <div class="col-12 col-lg-6">
                <div class="logo-preview-box">
                  <img v-if="currentPreview" :src="currentPreview" alt="لوگو" class="logo-preview-img" />
                  <div v-else class="logo-placeholder">
                    <i class="fa-solid fa-camera"></i>
                    <span>پیش نمایش لوگو</span>
                  </div>
                </div>
              </div>

              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-align-right me-1"></i> توضیحات سایت</label>
                <textarea v-model="form.siteDescription" class="form-control" rows="3"></textarea>
              </div>

              <div class="col-12 col-lg-6">
                <label class="toggle-card">
                  <input v-model="form.loanAdminConfirm1" type="checkbox" class="toggle-input" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span>تایید اول مدیریت برای وام</span>
                </label>
              </div>

              <div class="col-12 col-lg-6">
                <label class="toggle-card">
                  <input v-model="form.loanAdminConfirm2" type="checkbox" class="toggle-input" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span>تایید دوم مدیریت برای وام</span>
                </label>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'home'" class="settings-section-card">
            <div class="settings-section-head settings-section-head-split">
              <div>
                <h2 class="settings-section-title">صفحه اصلی</h2>
                <p class="settings-section-subtitle">وام ویژه امروز و متن سه باکس معرفی صفحه اصلی را از اینجا تنظیم کنید.</p>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12">
                <label class="form-label form-label-optional">پیشنهاد ویژه امروز</label>
                <Select2Input
                  v-model="form.featuredFacilityId"
                  :options="featuredFacilityOptions"
                  :number="true"
                  placeholder="اگر خالی بماند، وام با بیشترین بازدید نمایش داده می‌شود"
                />
                <p class="helper-text">در صورت خالی بودن این فیلد، سایت به صورت خودکار پربازدیدترین وام منتشرشده را نمایش می‌دهد.</p>
              </div>

              <div v-for="(card, index) in form.homeFeatureCards" :key="index" class="col-12">
                <div class="inline-card-editor">
                  <div class="inline-card-editor-head">
                    <h3>باکس {{ index + 1 }}</h3>
                  </div>
                  <div class="row g-3">
                    <div class="col-12 col-lg-4">
                      <label class="form-label form-label-optional">عنوان</label>
                      <input v-model="card.title" class="form-control" maxlength="120" />
                    </div>
                    <div class="col-12 col-lg-8">
                      <label class="form-label form-label-optional">توضیح</label>
                      <textarea v-model="card.description" class="form-control" rows="2" maxlength="500"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'footer'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">فوتر سایت</h2>
                <p class="settings-section-subtitle">تمام متن‌ها و لینک‌های نمایش‌داده‌شده در فوتر سایت از این تب خوانده می‌شوند.</p>
              </div>
            </div>

            <div class="row g-4">
              <div class="col-12">
                <label class="form-label form-label-optional">عنوان بخش معرفی</label>
                <input v-model="form.footerContent.aboutTitle" class="form-control" maxlength="120" />
              </div>

              <div class="col-12">
                <label class="form-label form-label-optional">متن معرفی</label>
                <textarea v-model="form.footerContent.aboutText" class="form-control" rows="4" maxlength="1200"></textarea>
              </div>

              <div class="col-12 col-xl-6">
                <div class="inline-card-editor">
                  <div class="inline-card-editor-head">
                    <h3>ما را دنبال کنید</h3>
                    <button type="button" class="btn btn-sm btn-outline-primary" @click="addLink('socialLinks')">
                      <i class="fa-solid fa-plus me-1"></i>
                      افزودن لینک
                    </button>
                  </div>

                  <div class="mb-3">
                    <label class="form-label form-label-optional">عنوان این بخش</label>
                    <input v-model="form.footerContent.socialTitle" class="form-control" maxlength="120" />
                  </div>

                  <div v-for="(item, index) in form.footerContent.socialLinks" :key="`social-${index}`" class="link-editor-row">
                    <input v-model="item.label" class="form-control" maxlength="80" placeholder="متن لینک" />
                    <input v-model="item.url" class="form-control" maxlength="255" placeholder="https://..." />
                    <button type="button" class="btn btn-light link-editor-remove" @click="removeLink('socialLinks', index)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-xl-6">
                <div class="inline-card-editor">
                  <div class="inline-card-editor-head">
                    <h3>پشتیبانی</h3>
                    <button type="button" class="btn btn-sm btn-outline-primary" @click="addLink('supportLinks')">
                      <i class="fa-solid fa-plus me-1"></i>
                      افزودن لینک
                    </button>
                  </div>

                  <div class="mb-3">
                    <label class="form-label form-label-optional">عنوان این بخش</label>
                    <input v-model="form.footerContent.supportTitle" class="form-control" maxlength="120" />
                  </div>

                  <div v-for="(item, index) in form.footerContent.supportLinks" :key="`support-${index}`" class="link-editor-row">
                    <input v-model="item.label" class="form-control" maxlength="80" placeholder="متن لینک" />
                    <input v-model="item.url" class="form-control" maxlength="255" placeholder="https://... یا tel:..." />
                    <button type="button" class="btn btn-light link-editor-remove" @click="removeLink('supportLinks', index)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12">
                <label class="form-label form-label-optional">متن کپی‌رایت</label>
                <textarea v-model="form.footerContent.copyrightText" class="form-control" rows="2" maxlength="500"></textarea>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'seo'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">تنظیمات سئو</h2>
                <p class="settings-section-subtitle">مقادیر پیش‌فرض، صفحه اصلی و بازار وام را جداگانه مدیریت کنید.</p>
              </div>
            </div>

            <div class="seo-sections">
              <div class="inline-card-editor">
                <div class="inline-card-editor-head">
                  <h3>سئوی پیش‌فرض</h3>
                </div>
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label form-label-optional">عنوان متا</label>
                    <input v-model="form.defaultMetaTitle" class="form-control" maxlength="255" />
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">توضیحات متا</label>
                    <textarea v-model="form.defaultMetaDescription" class="form-control" rows="3" maxlength="1000"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">کلیدواژه‌ها</label>
                    <textarea v-model="form.defaultMetaKeywords" class="form-control" rows="2" maxlength="1000"></textarea>
                  </div>
                </div>
              </div>

              <div class="inline-card-editor">
                <div class="inline-card-editor-head">
                  <h3>سئوی صفحه اصلی</h3>
                </div>
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label form-label-optional">عنوان متا</label>
                    <input v-model="form.homeMetaTitle" class="form-control" maxlength="255" />
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">توضیحات متا</label>
                    <textarea v-model="form.homeMetaDescription" class="form-control" rows="3" maxlength="1000"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">کلیدواژه‌ها</label>
                    <textarea v-model="form.homeMetaKeywords" class="form-control" rows="2" maxlength="1000"></textarea>
                  </div>
                </div>
              </div>

              <div class="inline-card-editor">
                <div class="inline-card-editor-head">
                  <h3>سئوی بازار وام</h3>
                </div>
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label form-label-optional">عنوان متا</label>
                    <input v-model="form.marketMetaTitle" class="form-control" maxlength="255" />
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">توضیحات متا</label>
                    <textarea v-model="form.marketMetaDescription" class="form-control" rows="3" maxlength="1000"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-optional">کلیدواژه‌ها</label>
                    <textarea v-model="form.marketMetaKeywords" class="form-control" rows="2" maxlength="1000"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'maintenance'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">دسترسی سرویس‌ها</h2>
                <p class="settings-section-subtitle">وب‌سایت، پنل مشتری و پنل کارگزار را می‌توانید مستقل از هم موقتا با پاسخ 503 از دسترس خارج کنید.</p>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-comment-dots me-1"></i> پیام زمان بروزرسانی</label>
                <textarea v-model="form.maintenanceMessage" class="form-control" rows="3" maxlength="500"></textarea>
                <p class="helper-text">این متن در پاسخ 503 و صفحه خطای پنل‌ها نمایش داده می‌شود.</p>
              </div>

              <div class="col-12 col-lg-4">
                <label class="toggle-card toggle-card-danger">
                  <input v-model="form.webPanelMaintenance" type="checkbox" class="toggle-input" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span>خروج وب‌سایت از دسترس</span>
                </label>
              </div>

              <div class="col-12 col-lg-4">
                <label class="toggle-card toggle-card-danger">
                  <input v-model="form.customerPanelMaintenance" type="checkbox" class="toggle-input" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span>خروج پنل مشتری از دسترس</span>
                </label>
              </div>

              <div class="col-12 col-lg-4">
                <label class="toggle-card toggle-card-danger">
                  <input v-model="form.brokerPanelMaintenance" type="checkbox" class="toggle-input" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span>خروج پنل کارگزار از دسترس</span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-header-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--admin-primary-light);
  color: var(--admin-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--admin-muted);
  margin: 2px 0 0;
}

.settings-shell {
  display: grid;
  gap: 18px;
}

.settings-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-tab {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  color: var(--admin-text);
  border-radius: 14px;
  padding: 11px 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  transition: 0.2s ease;
}

.settings-tab.active {
  background: var(--admin-primary);
  border-color: var(--admin-primary);
  color: #fff;
  box-shadow: 0 16px 26px rgba(53, 98, 241, 0.16);
}

.settings-grid {
  display: grid;
  gap: 18px;
}

.settings-section-card {
  border: 1px solid var(--admin-border);
  border-radius: 18px;
  background: var(--admin-surface-soft);
  padding: 18px;
}

.helper-text {
  margin: 8px 0 0;
  color: var(--admin-muted);
  font-size: 12px;
}

.settings-section-head {
  margin-bottom: 16px;
}

.settings-section-head-split {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.settings-section-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
}

.toggle-card-danger {
  border-color: rgba(185, 28, 28, 0.14);
  background: linear-gradient(180deg, rgba(255, 245, 245, 0.94), rgba(255, 250, 250, 0.98));
}

.settings-section-subtitle {
  margin: 0;
  color: var(--admin-muted);
  font-size: 13px;
}

.logo-preview-box {
  min-height: 180px;
  border: 2px dashed var(--admin-border);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-surface-soft);
  overflow: hidden;
}

.logo-preview-img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--admin-muted);
}

.logo-placeholder i {
  font-size: 28px;
  opacity: 0.4;
}

.toggle-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: var(--admin-surface);
  cursor: pointer;
  transition: border-color 0.2s;
}

.toggle-card:has(.toggle-input:checked) {
  border-color: var(--admin-primary);
}

.toggle-input {
  display: none;
}

.toggle-track {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--admin-border);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  right: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-input:checked + .toggle-track {
  background: var(--admin-primary);
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  transform: translateX(-18px);
}

.helper-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--admin-muted);
}

.inline-card-editor {
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  background: var(--admin-surface);
  padding: 16px;
}

.inline-card-editor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.inline-card-editor-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.link-editor-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr auto;
  gap: 10px;
  margin-bottom: 10px;
}

.link-editor-row:last-child {
  margin-bottom: 0;
}

.link-editor-remove {
  min-width: 44px;
}

.seo-sections {
  display: grid;
  gap: 16px;
}

@media (max-width: 767px) {
  .settings-tab {
    flex: 1 1 calc(50% - 10px);
    justify-content: center;
  }

  .link-editor-row {
    grid-template-columns: 1fr;
  }

  .link-editor-remove {
    width: 100%;
  }
}
</style>