<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import ContractTemplatePreview from '../components/ContractTemplatePreview.vue';
import RichTextEditor from '../components/RichTextEditor.vue';
import { createLoanType, deleteLoanType, getLoanTypes, updateLoanType } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const typeOptions = [
  { value: 'banking', label: 'بانکی' },
  { value: 'none_banking', label: 'غیر بانکی' }
];

const contractVariableGroups = [
  {
    title: 'متغیرهای سیستمی',
    description: 'برای هدر قرارداد و اطلاعات عمومی سند',
    items: [
      { label: 'شماره قرارداد', token: '{{contract.number}}' },
      { label: 'تاریخ', token: '{{general.date}}' },
      { label: 'ساعت', token: '{{general.time}}' }
    ]
  },
  {
    title: 'اطلاعات کارگزار',
    description: 'متغیرهای شخصی کارگزار که بعدا با اطلاعات واقعی جایگزین می شوند',
    items: [
      { label: 'نام کارگزار', token: '{{broker.name}}' },
      { label: 'شماره کارگزار', token: '{{broker.phone}}' },
      { label: 'شماره ملی کارگزار', token: '{{broker.national_code}}' },
      { label: 'تاریخ تولد کارگزار', token: '{{broker.birthdate}}' },
      { label: 'آدرس کارگزار', token: '{{broker.address}}' }
    ]
  },
  {
    title: 'اطلاعات مشتری',
    description: 'برای متن بدنه و بخش امضا قابل استفاده است',
    items: [
      { label: 'نام مشتری', token: '{{customer.name}}' },
      { label: 'شماره مشتری', token: '{{customer.phone}}' },
      { label: 'ایمیل مشتری', token: '{{customer.email}}' }
    ]
  },
  {
    title: 'اطلاعات پرونده معامله',
    description: 'اطلاعات مالی و وضعیت مرحله‌ای پرونده که هنگام ساخت قرارداد جایگزین می‌شوند',
    items: [
      { label: 'شناسه معامله', token: '{{deal.id}}' },
      { label: 'وضعیت معامله', token: '{{deal.status}}' },
      { label: 'مرحله معامله', token: '{{deal.step}}' },
      { label: 'صف اقدام', token: '{{deal.act_by}}' },
      { label: 'مبلغ معامله', token: '{{deal.amount}}' },
      { label: 'تعداد اقساط', token: '{{deal.installments}}' },
      { label: 'نرخ سود', token: '{{deal.profit}}' },
      { label: 'قسط ماهانه', token: '{{deal.monthly_installment_amount}}' },
      { label: 'سود کل', token: '{{deal.total_profit}}' },
      { label: 'جمع بازپرداخت', token: '{{deal.total_amount}}' }
    ]
  },
  {
    title: 'اطلاعات امتیاز وام',
    description: 'متغیرهای مرتبط با فیلدهای خود امتیاز وام',
    items: [
      { label: 'عنوان امتیاز', token: '{{facility.title}}' },
      { label: 'نوع امتیاز', token: '{{facility.type}}' },
      { label: 'زیرنوع امتیاز', token: '{{facility.sub_type}}' },
      { label: 'حداقل مبلغ', token: '{{facility.min_amount}}' },
      { label: 'حداکثر مبلغ', token: '{{facility.max_amount}}' },
      { label: 'عنوان اعتبارسنجی', token: '{{facility.validation_title}}' },
      { label: 'مهلت برداشت', token: '{{facility.withdraw_dead_line}}' }
    ]
  },
  {
    title: 'اطلاعات پرداخت',
    description: 'متغیرهای مربوط به روش‌های پرداخت تعیین‌شده در معامله',
    items: [
      { label: 'خلاصه روش‌های پرداخت', token: '{{payment.summary}}' },
      { label: 'تعداد روش‌های پرداخت', token: '{{payment.count}}' },
      { label: 'جمع کل پرداخت', token: '{{payment.total}}' }
    ]
  }
];

const createDefaultContractTemplate = (fallbackTitle = '') => ({
  page: { size: 'A4' },
  header: {
    title: fallbackTitle,
    dateText: '{{general.date}}',
    contractNumberText: '{{contract.number}}',
    showLogo: true
  },
  bodyHtml: '',
  footer: {
    customerSignatureLabel: 'محل امضا مشتری',
    brokerSignatureLabel: 'محل امضا کارگزار',
    note: ''
  }
});

const normalizeContractTemplate = (value, fallbackTitle = '') => {
  const defaults = createDefaultContractTemplate(fallbackTitle);
  const source = value && typeof value === 'object' ? value : {};
  const header = source.header && typeof source.header === 'object' ? source.header : {};
  const footer = source.footer && typeof source.footer === 'object' ? source.footer : {};

  return {
    page: { size: 'A4' },
    header: {
      title: String(header.title || defaults.header.title).trim(),
      dateText: String(header.dateText || defaults.header.dateText).trim(),
      contractNumberText: String(header.contractNumberText || defaults.header.contractNumberText).trim(),
      showLogo: header.showLogo !== false
    },
    bodyHtml: String(source.bodyHtml || '').trim(),
    footer: {
      customerSignatureLabel: String(footer.customerSignatureLabel || defaults.footer.customerSignatureLabel).trim(),
      brokerSignatureLabel: String(footer.brokerSignatureLabel || defaults.footer.brokerSignatureLabel).trim(),
      note: String(footer.note || '').trim()
    }
  };
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const createEmptyForm = () => ({
  id: null,
  title: '',
  type: 'banking',
  body: '',
  logoFile: null,
  bannerFile: null,
  contractBackgroundFile: null,
  logoUrl: '',
  bannerUrl: '',
  contractBackgroundUrl: '',
  contractTemplate: createDefaultContractTemplate()
});

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const activeTab = ref('basic');
const contractEditorRef = ref(null);
const form = ref(createEmptyForm());

const configuredContracts = computed(() => items.value.filter((item) => item.hasContractTemplate).length);
const currentContractConfigured = computed(
  () => Boolean(stripHtml(form.value.contractTemplate.bodyHtml) || form.value.contractBackgroundUrl)
);

const setPreview = (key, file) => {
  if (!file) {
    return;
  }

  form.value[key] = URL.createObjectURL(file);
};

const onLogoChange = (event) => {
  form.value.logoFile = event.target.files?.[0] || null;
  if (form.value.logoFile) {
    setPreview('logoUrl', form.value.logoFile);
  }
};

const onBannerChange = (event) => {
  form.value.bannerFile = event.target.files?.[0] || null;
  if (form.value.bannerFile) {
    setPreview('bannerUrl', form.value.bannerFile);
  }
};

const onContractBackgroundChange = (event) => {
  form.value.contractBackgroundFile = event.target.files?.[0] || null;
  if (form.value.contractBackgroundFile) {
    setPreview('contractBackgroundUrl', form.value.contractBackgroundFile);
  }
};

const resetForm = () => {
  form.value = createEmptyForm();
  activeTab.value = 'basic';
};

const buildFormData = () => {
  const data = new FormData();
  data.append('title', form.value.title);
  data.append('type', form.value.type);
  data.append('body', form.value.body || '');
  data.append('contractTemplate', JSON.stringify(form.value.contractTemplate));

  if (form.value.logoFile) {
    data.append('logo', form.value.logoFile);
  }

  if (form.value.bannerFile) {
    data.append('banner', form.value.bannerFile);
  }

  if (form.value.contractBackgroundFile) {
    data.append('contractBackground', form.value.contractBackgroundFile);
  }

  return data;
};

const load = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }

    const query = `?${params.toString()}`;
    const data = await getLoanTypes(query);

    items.value = (data.items || []).map((item) => ({
      ...item,
      contractTemplate: normalizeContractTemplate(item.contractTemplate, item.title)
    }));
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load();
};

const submit = async () => {
  saving.value = true;
  try {
    const payload = buildFormData();

    if (form.value.id) {
      await updateLoanType(form.value.id, payload);
      toast.success('نوع وام بروزرسانی شد');
    } else {
      await createLoanType(payload);
      toast.success('نوع وام جدید ثبت شد');
    }

    resetForm();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const editItem = (item, nextTab = 'basic') => {
  form.value = {
    id: item.id,
    title: item.title || '',
    type: item.type || 'banking',
    body: item.body || '',
    logoFile: null,
    bannerFile: null,
    contractBackgroundFile: null,
    logoUrl: item.logoUrl || '',
    bannerUrl: item.bannerUrl || '',
    contractBackgroundUrl: item.contractBackgroundUrl || '',
    contractTemplate: normalizeContractTemplate(item.contractTemplate, item.title)
  };
  activeTab.value = nextTab;
};

const previewItem = (item) => editItem(item, 'preview');

const insertContractVariable = (token) => {
  activeTab.value = 'contract';
  contractEditorRef.value?.insertVariable(token);
};

const insertContractTable = () => {
  activeTab.value = 'contract';
  contractEditorRef.value?.insertTable();
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف نوع وام', text: 'آیا از حذف این نوع وام مطمئن هستید؟' });
  if (!ok) {
    return;
  }

  try {
    await deleteLoanType(id);
    if (form.value.id === id) {
      resetForm();
    }
    toast.success('نوع وام حذف شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
};

onMounted(load);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-layer-group"></i></div>
        <div>
          <h1 class="page-title">مدیریت انواع وام</h1>
          <p class="page-subtitle">ثبت، ویرایش و طراحی قرارداد A4 برای انواع وام بانکی و غیر بانکی</p>
        </div>
      </div>

      <div class="page-header-tools">
        <span class="page-header-badge">
          <i class="fa-solid fa-file-contract me-1"></i>
          {{ configuredContracts }} قرارداد تنظیم شده از {{ total }} مورد
        </span>

        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو در عنوان یا توضیحات..." @keyup.enter="applyFilters" />
        </div>
      </div>
    </div>

    <div class="card card-body mb-3 builder-card">
      <div class="builder-tabs">
        <button type="button" class="builder-tab" :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">
          <i class="fa-solid fa-circle-info me-1"></i> اطلاعات پایه
        </button>
        <button type="button" class="builder-tab" :class="{ active: activeTab === 'contract' }" @click="activeTab = 'contract'">
          <i class="fa-solid fa-file-contract me-1"></i> سازنده قرارداد
        </button>
        <button type="button" class="builder-tab" :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">
          <i class="fa-solid fa-eye me-1"></i> پیش‌نمایش A4
        </button>
      </div>

      <div v-show="activeTab === 'basic'" class="builder-panel">
        <div class="row g-3">
          <div class="col-12 col-lg-4">
            <label class="form-label form-label-required"><i class="fa-solid fa-signature me-1"></i> عنوان</label>
            <input v-model="form.title" class="form-control" maxlength="255" placeholder="مثلا بانک ملی" />
          </div>
          <div class="col-12 col-lg-4">
            <label class="form-label form-label-required"><i class="fa-solid fa-tags me-1"></i> نوع تسهیلات</label>
            <select v-model="form.type" class="form-select">
              <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="col-12 col-lg-4">
            <label class="form-label form-label-optional"><i class="fa-solid fa-image me-1"></i> لوگو</label>
            <input type="file" accept="image/*" class="form-control" @change="onLogoChange" />
          </div>
          <div class="col-12">
            <label class="form-label form-label-optional"><i class="fa-solid fa-align-right me-1"></i> توضیحات نوع وام</label>
            <textarea v-model="form.body" class="form-control" rows="3" maxlength="10000" placeholder="توضیحات نوع وام"></textarea>
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-optional"><i class="fa-solid fa-panorama me-1"></i> بنر</label>
            <input type="file" accept="image/*" class="form-control" @change="onBannerChange" />
          </div>
          <div class="col-12 col-lg-6">
            <div class="preview-grid">
              <div class="preview-card">
                <div class="preview-card-title">پیش‌نمایش لوگو</div>
                <div v-if="form.logoUrl" class="preview-frame"><img :src="form.logoUrl" alt="logo" class="preview-image preview-logo" /></div>
                <div v-else class="preview-empty">بدون لوگو</div>
              </div>
              <div class="preview-card">
                <div class="preview-card-title">پیش‌نمایش بنر</div>
                <div v-if="form.bannerUrl" class="preview-frame"><img :src="form.bannerUrl" alt="banner" class="preview-image preview-banner" /></div>
                <div v-else class="preview-empty">بدون بنر</div>
              </div>
            </div>
          </div>
        </div>

        <div class="builder-note mt-3">
          <i class="fa-solid fa-lightbulb me-1"></i>
          عنوان و لوگوی همین نوع وام در هدر قرارداد A4 نیز قابل استفاده هستند.
        </div>
      </div>

      <div v-show="activeTab === 'contract'" class="builder-panel">
        <div class="contract-builder-head">
          <div>
            <h2 class="section-title">طراحی قرارداد A4</h2>
            <p class="section-subtitle">هدر، بدنه و فوتر قرارداد را با متن ثابت و متغیرهای پویا تنظیم کنید.</p>
          </div>
          <div class="contract-badges">
            <span class="a4-badge"><i class="fa-solid fa-file-lines me-1"></i> فرمت ثابت A4</span>
            <span class="config-badge" :class="currentContractConfigured ? 'config-badge-ready' : 'config-badge-empty'">
              <i class="fa-solid fa-circle-dot me-1"></i>
              {{ currentContractConfigured ? 'قرارداد تنظیم شده' : 'قرارداد هنوز خالی است' }}
            </span>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-12 col-xl-4">
            <label class="form-label form-label-required"><i class="fa-solid fa-heading me-1"></i> عنوان هدر قرارداد</label>
            <input v-model="form.contractTemplate.header.title" class="form-control" maxlength="255" placeholder="عنوان نمایشی قرارداد" />
          </div>
          <div class="col-12 col-md-6 col-xl-4">
            <label class="form-label form-label-required"><i class="fa-solid fa-calendar-day me-1"></i> متن تاریخ</label>
            <input v-model="form.contractTemplate.header.dateText" class="form-control" maxlength="255" placeholder="{{general.date}}" />
          </div>
          <div class="col-12 col-md-6 col-xl-4">
            <label class="form-label form-label-required"><i class="fa-solid fa-hashtag me-1"></i> متن شماره قرارداد</label>
            <input v-model="form.contractTemplate.header.contractNumberText" class="form-control" maxlength="255" placeholder="{{contract.number}}" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label form-label-required"><i class="fa-solid fa-signature me-1"></i> محل امضای مشتری</label>
            <input v-model="form.contractTemplate.footer.customerSignatureLabel" class="form-control" maxlength="255" placeholder="مثلا امضا و اثر انگشت مشتری" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label form-label-required"><i class="fa-solid fa-signature me-1"></i> محل امضای کارگزار</label>
            <input v-model="form.contractTemplate.footer.brokerSignatureLabel" class="form-control" maxlength="255" placeholder="مثلا امضا و اثر انگشت کارگزار" />
          </div>
          <div class="col-12 col-lg-4">
            <label class="form-label form-label-optional"><i class="fa-solid fa-image me-1"></i> بک‌گراند قرارداد</label>
            <input type="file" accept="image/*" class="form-control" @change="onContractBackgroundChange" />
            <div class="form-check contract-toggle">
              <input id="contract-logo-toggle" v-model="form.contractTemplate.header.showLogo" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="contract-logo-toggle">لوگوی نوع وام در هدر قرارداد نمایش داده شود</label>
            </div>
          </div>
          <div class="col-12 col-lg-8">
            <div class="preview-card preview-card-large">
              <div class="preview-card-title">پیش‌نمایش بک‌گراند قرارداد</div>
              <div v-if="form.contractBackgroundUrl" class="preview-frame contract-background-frame">
                <img :src="form.contractBackgroundUrl" alt="contract-background" class="preview-image contract-background-image" />
              </div>
              <div v-else class="preview-empty">برای صفحه قرارداد می‌توانید تصویر پس‌زمینه اختصاصی بارگذاری کنید.</div>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label form-label-optional"><i class="fa-solid fa-note-sticky me-1"></i> یادداشت فوتر</label>
            <textarea v-model="form.contractTemplate.footer.note" class="form-control" rows="2" maxlength="2000" placeholder="یادداشت کوتاه زیر بخش امضاها"></textarea>
          </div>
        </div>

        <div class="contract-helper-box mt-3">
          <div class="contract-helper-head">
            <div>
              <h3 class="helper-title">متغیرهای قابل درج در بدنه قرارداد</h3>
              <p class="helper-subtitle">روی هر متغیر کلیک کنید تا در محل فعلی نشانگر در بدنه قرارداد درج شود.</p>
            </div>
            <button type="button" class="btn btn-outline-primary btn-sm" @click="insertContractTable">
              <i class="fa-solid fa-table me-1"></i> درج جدول نمونه
            </button>
          </div>

          <div class="variable-groups">
            <div v-for="group in contractVariableGroups" :key="group.title" class="variable-group-card">
              <div class="variable-group-title">{{ group.title }}</div>
              <p class="variable-group-desc">{{ group.description }}</p>
              <div class="variable-chip-list">
                <button
                  v-for="item in group.items"
                  :key="item.token"
                  type="button"
                  class="variable-chip"
                  @click="insertContractVariable(item.token)"
                >
                  <span>{{ item.label }}</span>
                  <small>{{ item.token }}</small>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-card mt-3">
          <div class="editor-card-head">
            <div>
              <h3 class="helper-title mb-1">بدنه قرارداد</h3>
              <p class="helper-subtitle mb-0">متن ثابت، متغیرها، لیست‌ها، جدول‌ها و فرمت‌های بولد، ایتالیک و هایلایت را در این بخش تنظیم کنید.</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" @click="activeTab = 'preview'">
              <i class="fa-solid fa-eye me-1"></i> مشاهده پیش‌نمایش
            </button>
          </div>

          <RichTextEditor
            ref="contractEditorRef"
            v-model="form.contractTemplate.bodyHtml"
            :min-height="340"
            placeholder="بدنه قرارداد را با متن ثابت و متغیرهای برنامه تنظیم کنید..."
          />
        </div>
      </div>

      <div v-show="activeTab === 'preview'" class="builder-panel">
        <div class="contract-builder-head preview-head">
          <div>
            <h2 class="section-title">پیش‌نمایش قرارداد</h2>
            <p class="section-subtitle">خروجی به صورت کاغذ A4 نمایش داده می‌شود و متغیرها با نمونه داده جایگزین شده‌اند.</p>
          </div>
          <div class="contract-badges">
            <span class="preview-chip"><i class="fa-solid fa-image me-1"></i>{{ form.contractBackgroundUrl ? 'دارای بک‌گراند' : 'بدون بک‌گراند' }}</span>
            <span class="preview-chip"><i class="fa-solid fa-font me-1"></i>{{ stripHtml(form.contractTemplate.bodyHtml) ? 'بدنه تنظیم شده' : 'بدنه خالی' }}</span>
          </div>
        </div>

        <ContractTemplatePreview
          :template="form.contractTemplate"
          :background-url="form.contractBackgroundUrl"
          :logo-url="form.logoUrl"
          :fallback-title="form.title"
        />
      </div>

      <div class="builder-actions">
        <button class="btn btn-primary" :disabled="saving" @click="submit">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
          <i v-else class="fa-solid fa-floppy-disk me-1"></i>
          {{ form.id ? 'بروزرسانی نوع وام' : 'ثبت نوع وام' }}
        </button>
        <button v-if="form.id" class="btn btn-outline-secondary" @click="resetForm">
          <i class="fa-solid fa-xmark me-1"></i> انصراف
        </button>
        <button type="button" class="btn btn-outline-primary" @click="activeTab = 'preview'">
          <i class="fa-solid fa-file-contract me-1"></i> بازبینی قرارداد
        </button>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>نوع وامی ثبت نشده است</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>نوع</th>
              <th>قرارداد</th>
              <th>رسانه‌ها</th>
              <th>توضیحات</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="fw-bold">{{ item.title }}</td>
              <td>
                <span class="type-chip" :class="item.type === 'banking' ? 'type-chip-banking' : 'type-chip-none-banking'">{{ item.typeLabel }}</span>
              </td>
              <td>
                <div class="contract-status-cell">
                  <span class="contract-chip" :class="item.hasContractTemplate ? 'contract-chip-ready' : 'contract-chip-empty'">
                    {{ item.hasContractTemplate ? 'تنظیم شده' : 'تنظیم نشده' }}
                  </span>
                  <div class="contract-cell-title">{{ item.contractTemplate?.header?.title || item.title || '-' }}</div>
                </div>
              </td>
              <td>
                <div class="media-stack">
                  <img v-if="item.logoUrl" :src="item.logoUrl" alt="logo" class="table-thumb table-logo" />
                  <div v-else class="media-empty">لوگو</div>

                  <img v-if="item.bannerUrl" :src="item.bannerUrl" alt="banner" class="table-thumb table-banner" />
                  <div v-else class="media-empty media-empty-wide">بنر</div>

                  <img v-if="item.contractBackgroundUrl" :src="item.contractBackgroundUrl" alt="contract-background" class="table-thumb table-contract-background" />
                  <div v-else class="media-empty media-empty-wide">بک‌گراند قرارداد</div>
                </div>
              </td>
              <td class="text-wrap table-description">{{ item.body || '-' }}</td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="editItem(item)">
                    <i class="fa-solid fa-pen me-1"></i> ویرایش
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" @click="previewItem(item)">
                    <i class="fa-solid fa-eye me-1"></i> پیش‌نمایش قرارداد
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="removeItem(item.id)">
                    <i class="fa-solid fa-trash-can me-1"></i> حذف
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
    </div>
  </div>
</template>

<style scoped src="./styles/LoanTypesView.css"></style>