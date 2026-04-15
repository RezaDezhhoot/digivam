<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import Select2Input from '../components/Select2Input.vue';
import { getFacilities, getSettings, updateSettings } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const tabs = [
  { key: 'general', label: 'عمومی', icon: 'fa-solid fa-sliders' },
  { key: 'maintenance', label: 'دسترسی', icon: 'fa-solid fa-screwdriver-wrench' },
  { key: 'home', label: 'خانه', icon: 'fa-solid fa-house' },
  { key: 'footer', label: 'فوتر', icon: 'fa-solid fa-table-columns' },
  { key: 'seo', label: 'سئو', icon: 'fa-solid fa-magnifying-glass-chart' },
  { key: 'about', label: 'درباره ما', icon: 'fa-solid fa-circle-info' },
  { key: 'licenses', label: 'مجوزها', icon: 'fa-solid fa-certificate' },
  { key: 'welcome', label: 'پیام خوش‌آمدگویی', icon: 'fa-solid fa-hand' }
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
    marketMetaKeywords: '',
    aboutUsContent: { heroTitle: '', heroSubtitle: '', description: '', mission: '', vision: '', values: '', contactInfo: '', promiseCards: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }], principleCards: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }] },
    welcomeMessageCustomer: '',
    welcomeMessageBroker: '',
    licensesContent: { heroTitle: '', heroDescription: '', items: [{ title: '', description: '', imageUrl: '', verifyUrl: '', imageFile: null, imagePreview: '' }] }
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

const normalizeCardList = (cards, min = 3) => {
  const list = Array.isArray(cards)
    ? cards.map((item) => ({ title: String(item?.title || ''), text: String(item?.text || '') }))
    : [];
  while (list.length < min) {
    list.push({ title: '', text: '' });
  }
  return list;
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

const normalizeLicenseItems = (items) => {
  const list = Array.isArray(items)
    ? items.map((item) => ({
        title: String(item?.title || ''),
        description: String(item?.description || ''),
        imageUrl: String(item?.imageUrl || ''),
        verifyUrl: String(item?.verifyUrl || ''),
        imageFile: null,
        imagePreview: ''
      }))
    : [];
  return list.length ? list : [{ title: '', description: '', imageUrl: '', verifyUrl: '', imageFile: null, imagePreview: '' }];
};

const currentPreview = computed(() => previewUrl.value || form.value.siteLogoUrl || '');

const clearPreview = () => {
  if (previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
};

const clearLicenseItemPreview = (item) => {
  if (item?.imagePreview && item.imagePreview.startsWith('blob:')) {
    URL.revokeObjectURL(item.imagePreview);
  }
};

const clearLicensePreviews = () => {
  (form.value.licensesContent?.items || []).forEach(clearLicenseItemPreview);
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
  clearLicensePreviews();
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
    marketMetaKeywords: settings.marketMetaKeywords || '',
    aboutUsContent: {
      heroTitle: settings.aboutUsContent?.heroTitle || '',
      heroSubtitle: settings.aboutUsContent?.heroSubtitle || '',
      description: settings.aboutUsContent?.description || '',
      mission: settings.aboutUsContent?.mission || '',
      vision: settings.aboutUsContent?.vision || '',
      values: settings.aboutUsContent?.values || '',
      contactInfo: settings.aboutUsContent?.contactInfo || '',
      promiseCards: normalizeCardList(settings.aboutUsContent?.promiseCards, 3),
      principleCards: normalizeCardList(settings.aboutUsContent?.principleCards, 3)
    },
    welcomeMessageCustomer: settings.welcomeMessageCustomer || '',
    welcomeMessageBroker: settings.welcomeMessageBroker || '',
    licensesContent: {
      heroTitle: settings.licensesContent?.heroTitle || '',
      heroDescription: settings.licensesContent?.heroDescription || '',
      items: normalizeLicenseItems(settings.licensesContent?.items)
    }
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

const handleLicenseImageChange = (index, event) => {
  const item = form.value.licensesContent.items[index];
  if (!item) return;

  clearLicenseItemPreview(item);

  const [file] = event.target.files || [];
  item.imageFile = file || null;
  item.imagePreview = file ? URL.createObjectURL(file) : '';
};

const resolveLicenseImagePreview = (item) => item?.imagePreview || item?.imageUrl || '';

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

const addAboutCard = (field) => {
  form.value.aboutUsContent[field].push({ title: '', text: '' });
};

const removeAboutCard = (field, index) => {
  if (form.value.aboutUsContent[field].length <= 1) {
    form.value.aboutUsContent[field][0] = { title: '', text: '' };
    return;
  }
  form.value.aboutUsContent[field].splice(index, 1);
};

const addLicenseItem = () => {
  form.value.licensesContent.items.push({
    title: '',
    description: '',
    imageUrl: '',
    verifyUrl: '',
    imageFile: null,
    imagePreview: ''
  });
};

const removeLicenseItem = (index) => {
  if (form.value.licensesContent.items.length <= 1) {
    clearLicenseItemPreview(form.value.licensesContent.items[0]);
    form.value.licensesContent.items[0] = { title: '', description: '', imageUrl: '', verifyUrl: '', imageFile: null, imagePreview: '' };
    return;
  }
  clearLicenseItemPreview(form.value.licensesContent.items[index]);
  form.value.licensesContent.items.splice(index, 1);
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
    payload.append('aboutUsContent', JSON.stringify(form.value.aboutUsContent));
    payload.append('welcomeMessageCustomer', form.value.welcomeMessageCustomer || '');
    payload.append('welcomeMessageBroker', form.value.welcomeMessageBroker || '');
    const licensesImageIndexes = [];
    const licensesContentPayload = {
      heroTitle: String(form.value.licensesContent.heroTitle || '').trim(),
      heroDescription: String(form.value.licensesContent.heroDescription || '').trim(),
      items: form.value.licensesContent.items.map((item, index) => {
        if (item.imageFile) {
          payload.append('licensesImages', item.imageFile);
          licensesImageIndexes.push(index);
        }

        return {
          title: String(item.title || '').trim(),
          description: String(item.description || '').trim(),
          imageUrl: String(item.imageUrl || '').trim(),
          verifyUrl: String(item.verifyUrl || '').trim()
        };
      })
    };
    payload.append('licensesContent', JSON.stringify(licensesContentPayload));
    payload.append('licensesImageIndexes', JSON.stringify(licensesImageIndexes));
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
onBeforeUnmount(() => {
  clearPreview();
  clearLicensePreviews();
});
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
                <small v-if="Number(form.decreaseValidity)" class="text-muted d-block mt-1">{{ formatMoney(form.decreaseValidity) }}</small>
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

              <!-- <div class="col-12 col-lg-6">
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
              </div> -->
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

          <section v-if="activeTab === 'about'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">درباره ما</h2>
                <p class="settings-section-subtitle">محتوای ساختاریافته صفحه درباره ما در وب‌سایت</p>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional"><i class="fa-solid fa-heading me-1"></i> عنوان اصلی</label>
                <input v-model="form.aboutUsContent.heroTitle" class="form-control" maxlength="200" placeholder="مثلا: درباره دیجی وام" />
              </div>
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional"><i class="fa-solid fa-quote-right me-1"></i> زیرعنوان</label>
                <input v-model="form.aboutUsContent.heroSubtitle" class="form-control" maxlength="500" placeholder="یک جمله کوتاه معرفی..." />
              </div>
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-align-right me-1"></i> توضیحات کلی</label>
                <textarea v-model="form.aboutUsContent.description" class="form-control" rows="4" maxlength="5000" placeholder="درباره مجموعه بنویسید..."></textarea>
              </div>
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional"><i class="fa-solid fa-bullseye me-1"></i> ماموریت ما</label>
                <textarea v-model="form.aboutUsContent.mission" class="form-control" rows="3" maxlength="3000" placeholder="ماموریت سازمان..."></textarea>
              </div>
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional"><i class="fa-solid fa-eye me-1"></i> چشم‌انداز</label>
                <textarea v-model="form.aboutUsContent.vision" class="form-control" rows="3" maxlength="3000" placeholder="چشم‌انداز آینده..."></textarea>
              </div>
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-gem me-1"></i> ارزش‌های ما</label>
                <textarea v-model="form.aboutUsContent.values" class="form-control" rows="3" maxlength="3000" placeholder="ارزش‌ها و اصول کلیدی مجموعه..."></textarea>
              </div>
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-phone me-1"></i> اطلاعات تماس</label>
                <textarea v-model="form.aboutUsContent.contactInfo" class="form-control" rows="3" maxlength="2000" placeholder="آدرس، تلفن، ایمیل و..."></textarea>
              </div>

              <div class="col-12 mt-4">
                <h3 class="settings-section-title" style="font-size: 16px;">
                  <i class="fa-solid fa-stars me-1"></i> باکس‌های وعده‌ها (مسیر ساده‌تر، همراهی واقعی، ...)
                </h3>
                <p class="settings-section-subtitle">خالی بگذارید تا مقادیر پیش‌فرض نمایش داده شود.</p>
              </div>
              <div v-for="(card, ci) in form.aboutUsContent.promiseCards" :key="'promise-' + ci" class="col-12">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge bg-secondary">{{ ci + 1 }}</span>
                  <input v-model="card.title" class="form-control form-control-sm" maxlength="100" placeholder="عنوان باکس..." />
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeAboutCard('promiseCards', ci)" title="حذف">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
                <textarea v-model="card.text" class="form-control form-control-sm" rows="2" maxlength="500" placeholder="متن باکس..."></textarea>
              </div>
              <div class="col-12">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="addAboutCard('promiseCards')">
                  <i class="fa-solid fa-plus me-1"></i> افزودن باکس وعده
                </button>
              </div>

              <div class="col-12 mt-4">
                <h3 class="settings-section-title" style="font-size: 16px;">
                  <i class="fa-solid fa-lightbulb me-1"></i> باکس‌های اصول راهنما (چطور فکر می‌کنیم و چطور اجرا می‌کنیم)
                </h3>
                <p class="settings-section-subtitle">خالی بگذارید تا از ارزش‌های بالا یا مقادیر پیش‌فرض استفاده شود.</p>
              </div>
              <div v-for="(card, ci) in form.aboutUsContent.principleCards" :key="'principle-' + ci" class="col-12">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="badge bg-secondary">{{ ci + 1 }}</span>
                  <input v-model="card.title" class="form-control form-control-sm" maxlength="100" placeholder="عنوان اصل..." />
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeAboutCard('principleCards', ci)" title="حذف">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
                <textarea v-model="card.text" class="form-control form-control-sm" rows="2" maxlength="500" placeholder="توضیح اصل..."></textarea>
              </div>
              <div class="col-12">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="addAboutCard('principleCards')">
                  <i class="fa-solid fa-plus me-1"></i> افزودن اصل راهنما
                </button>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'licenses'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">صفحه مجوزها</h2>
                <p class="settings-section-subtitle">عنوان، توضیح و کارت های مجوز صفحه عمومی وب سایت را مدیریت کنید.</p>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-optional">عنوان اصلی صفحه</label>
                <input v-model="form.licensesContent.heroTitle" class="form-control" maxlength="200" placeholder="مجوزها و گواهی نامه ها" />
              </div>
              <div class="col-12">
                <label class="form-label form-label-optional">توضیحات اصلی</label>
                <textarea v-model="form.licensesContent.heroDescription" class="form-control" rows="3" maxlength="2000" placeholder="توضیح کوتاه درباره اعتبار مجوزها..."></textarea>
              </div>

              <div class="col-12 d-flex justify-content-between align-items-center mt-2">
                <h3 class="settings-section-title" style="font-size: 16px; margin: 0;">کارت های مجوز</h3>
                <button type="button" class="btn btn-sm btn-outline-primary" @click="addLicenseItem">
                  <i class="fa-solid fa-plus me-1"></i> افزودن مجوز
                </button>
              </div>

              <div v-for="(item, index) in form.licensesContent.items" :key="`license-${index}`" class="col-12">
                <div class="inline-card-editor">
                  <div class="inline-card-editor-head">
                    <h3>مجوز {{ index + 1 }}</h3>
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeLicenseItem(index)">
                      <i class="fa-solid fa-trash-can me-1"></i> حذف
                    </button>
                  </div>

                  <div class="row g-3">
                    <div class="col-12 col-lg-4">
                      <label class="form-label form-label-optional">عنوان مجوز</label>
                      <input v-model="item.title" class="form-control" maxlength="200" placeholder="مثلا: پروانه کسب" />
                    </div>
                    <div class="col-12 col-lg-4">
                      <label class="form-label form-label-optional">تصویر مجوز</label>
                      <input type="file" class="form-control" accept="image/*" @change="handleLicenseImageChange(index, $event)" />
                    </div>
                    <div class="col-12 col-lg-4">
                      <label class="form-label form-label-optional">لینک استعلام</label>
                      <input v-model="item.verifyUrl" class="form-control" maxlength="1000" placeholder="https://..." />
                    </div>
                    <div class="col-12">
                      <label class="form-label form-label-optional">توضیحات مجوز</label>
                      <textarea v-model="item.description" class="form-control" rows="2" maxlength="1000" placeholder="توضیح کوتاه درباره این مجوز..."></textarea>
                    </div>
                    <div class="col-12">
                      <div class="license-image-preview-box">
                        <img v-if="resolveLicenseImagePreview(item)" :src="resolveLicenseImagePreview(item)" :alt="item.title || 'مجوز'" class="license-image-preview" />
                        <span v-else class="license-image-placeholder">هنوز تصویری انتخاب نشده است</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'welcome'" class="settings-section-card">
            <div class="settings-section-head">
              <div>
                <h2 class="settings-section-title">پیام خوش‌آمدگویی</h2>
                <p class="settings-section-subtitle">پیامی که پس از اولین ثبت‌نام مشتری یا کارگزار به صورت اعلان برای آن‌ها ارسال می‌شود.</p>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-user me-1"></i> پیام خوش‌آمدگویی مشتری</label>
                <textarea v-model="form.welcomeMessageCustomer" class="form-control" rows="4" maxlength="2000" placeholder="متن پیام خوش‌آمدگویی برای مشتریان جدید..."></textarea>
              </div>
              <div class="col-12">
                <label class="form-label form-label-optional"><i class="fa-solid fa-user-tie me-1"></i> پیام خوش‌آمدگویی کارگزار</label>
                <textarea v-model="form.welcomeMessageBroker" class="form-control" rows="4" maxlength="2000" placeholder="متن پیام خوش‌آمدگویی برای کارگزاران جدید..."></textarea>
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

<style scoped src="./styles/SettingsView.css"></style>