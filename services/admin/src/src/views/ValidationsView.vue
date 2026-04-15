<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import {
  createValidation,
  deleteValidation,
  getDocumentOptions,
  getValidations,
  updateValidation
} from '../services/admin-api.js';
import { useConfirm } from '../composables/useConfirm.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

let stageSeed = 0;
let itemSeed = 0;

const nextStageUid = () => `stage-${Date.now()}-${++stageSeed}`;
const nextItemUid = () => `item-${Date.now()}-${++itemSeed}`;

const createDocumentItem = () => ({
  uid: nextItemUid(),
  type: 'document',
  documentId: '',
  document: null
});

const createDescriptionItem = () => ({
  uid: nextItemUid(),
  type: 'description',
  title: '',
  description: ''
});

const createStage = () => ({
  uid: nextStageUid(),
  title: '',
  description: '',
  collapsed: true,
  items: []
});

const createEmptyForm = () => ({
  id: null,
  title: '',
  type: '',
  validFor: '',
  amount: '',
  available: true,
  description: '',
  introTitle: '',
  introDescription: '',
  stepsLabel: '',
  featureLinesText: '',
  trainingVideoFile: null,
  trainingVideoUrl: '',
  trainingVideoPreviewUrl: '',
  trainingVideoName: '',
  selfValidation: false,
  selfValidationGuide: '',
  selfValidationNote: '',
  selfValidationUploadLabel: '',
  stages: [createStage()]
});

const items = ref([]);
const documentOptions = ref([]);
const loading = ref(false);
const optionLoading = ref(false);
const saving = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const search = ref('');
const availableFilter = ref('');
const form = ref(createEmptyForm());
const formTab = ref('base');
const stageModalOpen = ref(false);
const stageModalIndex = ref(-1);
const stageModalData = ref(null);
const draggingStageUid = ref('');
const draggingStageItemUid = ref('');

const currentTrainingVideoUrl = computed(() => form.value.trainingVideoPreviewUrl || form.value.trainingVideoUrl || '');

const revokeTrainingVideoPreview = () => {
  if (String(form.value.trainingVideoPreviewUrl || '').startsWith('blob:')) {
    URL.revokeObjectURL(form.value.trainingVideoPreviewUrl);
  }
};

const resolveDocument = (documentId) =>
  documentOptions.value.find((item) => Number(item.id) === Number(documentId)) || null;

const getAvailableDocuments = (stageIndex, currentDocumentId = '') => {
  const stage = form.value.stages[stageIndex];
  const usedInStage = new Set(
    (stage?.items || [])
      .filter((item) => item.type === 'document' && item.documentId)
      .map((item) => Number(item.documentId))
  );
  return documentOptions.value.filter((item) => {
    const id = Number(item.id);
    return id === Number(currentDocumentId || 0) || !usedInStage.has(id);
  });
};

const resetForm = () => {
  revokeTrainingVideoPreview();
  form.value = createEmptyForm();
};

const normalizeStagesForPayload = () =>
  form.value.stages
    .map((stage) => ({
      title: String(stage.title || '').trim(),
      description: String(stage.description || '').trim(),
      items: stage.items
        .map((item) => {
          if (item.type === 'document') {
            return item.documentId
              ? {
                  type: 'document',
                  documentId: Number(item.documentId)
                }
              : null;
          }

          const title = String(item.title || '').trim();
          const description = String(item.description || '').trim();

          if (!title && !description) {
            return null;
          }

          return {
            type: 'description',
            title,
            description
          };
        })
        .filter(Boolean)
    }))
    .filter((stage) => stage.title || stage.description || stage.items.length);

const validateForm = () => {
  if (!String(form.value.title || '').trim()) {
    toast.error('عنوان روش اعتبارسنجی الزامی است');
    return false;
  }

  if (!String(form.value.type || '').trim()) {
    toast.error('شناسه نوع روش اعتبارسنجی الزامی است');
    return false;
  }

  const stages = normalizeStagesForPayload();

  for (let index = 0; index < stages.length; index += 1) {
    if (!stages[index].title) {
      toast.error(`عنوان مرحله ${index + 1} الزامی است`);
      return false;
    }
  }

  return true;
};

const onTrainingVideoChange = (event) => {
  const [file] = event.target.files || [];

  revokeTrainingVideoPreview();
  form.value.trainingVideoPreviewUrl = '';
  form.value.trainingVideoFile = file || null;

  if (file) {
    form.value.trainingVideoPreviewUrl = URL.createObjectURL(file);
    form.value.trainingVideoName = file.name;
  }
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
  if (search.value.trim()) params.set('search', search.value.trim());
  if (availableFilter.value) params.set('available', availableFilter.value);
  return `?${params.toString()}`;
};

const loadOptions = async () => {
  optionLoading.value = true;
  try {
    const data = await getDocumentOptions('?subject=validation');
    documentOptions.value = data.items || [];
  } catch (error) {
    toast.error(error.message);
  } finally {
    optionLoading.value = false;
  }
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getValidations(buildQuery());
    items.value = data.items || [];
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

const clearFilters = async () => {
  search.value = '';
  availableFilter.value = '';
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load();
};

const addStage = () => {
  form.value.stages.push(createStage());
};

const removeStage = (stageIndex) => {
  form.value.stages.splice(stageIndex, 1);
  if (!form.value.stages.length) {
    form.value.stages.push(createStage());
  }
};

const toggleStageCollapse = (stageIndex) => {
  const stage = form.value.stages[stageIndex];
  if (!stage) {
    return;
  }

  stage.collapsed = !stage.collapsed;
};

const moveStage = (stageIndex, direction) => {
  const nextIndex = stageIndex + direction;
  if (nextIndex < 0 || nextIndex >= form.value.stages.length) {
    return;
  }

  const stages = [...form.value.stages];
  const [stage] = stages.splice(stageIndex, 1);
  stages.splice(nextIndex, 0, stage);
  form.value.stages = stages;
};

const moveStageByUid = (sourceUid, targetUid) => {
  if (!sourceUid || !targetUid || sourceUid === targetUid) {
    return;
  }

  const stages = [...form.value.stages];
  const sourceIndex = stages.findIndex((item) => item.uid === sourceUid);
  const targetIndex = stages.findIndex((item) => item.uid === targetUid);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const [moved] = stages.splice(sourceIndex, 1);
  stages.splice(targetIndex, 0, moved);
  form.value.stages = stages;
};

const addStageDocumentItem = (stageIndex) => {
  form.value.stages[stageIndex].items.push(createDocumentItem());
};

const addStageDescriptionItem = (stageIndex) => {
  form.value.stages[stageIndex].items.push(createDescriptionItem());
};

const removeStageItem = (stageIndex, itemIndex) => {
  form.value.stages[stageIndex].items.splice(itemIndex, 1);
};

const moveStageItem = (stageIndex, itemIndex, direction) => {
  const nextIndex = itemIndex + direction;
  const stageItems = [...form.value.stages[stageIndex].items];

  if (nextIndex < 0 || nextIndex >= stageItems.length) {
    return;
  }

  const [item] = stageItems.splice(itemIndex, 1);
  stageItems.splice(nextIndex, 0, item);
  form.value.stages[stageIndex].items = stageItems;
};

const moveStageItemByUid = (stageUid, sourceUid, targetUid) => {
  if (!stageUid || !sourceUid || !targetUid || sourceUid === targetUid) {
    return;
  }

  const stage = form.value.stages.find((item) => item.uid === stageUid);
  if (!stage) {
    return;
  }

  const stageItems = [...stage.items];
  const sourceIndex = stageItems.findIndex((item) => item.uid === sourceUid);
  const targetIndex = stageItems.findIndex((item) => item.uid === targetUid);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const [moved] = stageItems.splice(sourceIndex, 1);
  stageItems.splice(targetIndex, 0, moved);
  stage.items = stageItems;
};

const startStageDrag = (stageUid) => {
  draggingStageUid.value = stageUid;
};

const endStageDrag = () => {
  draggingStageUid.value = '';
};

const dropStage = (targetStageUid) => {
  moveStageByUid(draggingStageUid.value, targetStageUid);
  endStageDrag();
};

const startStageItemDrag = (itemUid) => {
  draggingStageItemUid.value = itemUid;
};

const endStageItemDrag = () => {
  draggingStageItemUid.value = '';
};

const dropStageItem = (stageUid, targetItemUid) => {
  moveStageItemByUid(stageUid, draggingStageItemUid.value, targetItemUid);
  endStageItemDrag();
};

const syncStageDocument = (stageIndex, itemIndex) => {
  const item = form.value.stages[stageIndex]?.items?.[itemIndex];
  if (!item || item.type !== 'document') {
    return;
  }

  item.document = resolveDocument(item.documentId);
};

const openStageModal = (stageIndex = -1) => {
  if (stageIndex >= 0 && form.value.stages[stageIndex]) {
    stageModalIndex.value = stageIndex;
    stageModalData.value = JSON.parse(JSON.stringify(form.value.stages[stageIndex]));
  } else {
    stageModalIndex.value = -1;
    stageModalData.value = createStage();
    stageModalData.value.collapsed = false;
  }
  stageModalOpen.value = true;
};

const closeStageModal = () => {
  stageModalOpen.value = false;
  stageModalData.value = null;
  stageModalIndex.value = -1;
};

const saveStageModal = () => {
  if (!stageModalData.value) return;
  if (!String(stageModalData.value.title || '').trim()) {
    toast.error('عنوان مرحله الزامی است');
    return;
  }
  if (stageModalIndex.value >= 0) {
    form.value.stages[stageModalIndex.value] = {
      ...stageModalData.value,
      collapsed: form.value.stages[stageModalIndex.value].collapsed
    };
  } else {
    form.value.stages.push({ ...stageModalData.value, collapsed: true });
  }
  closeStageModal();
};

const addStageDocumentItemModal = () => {
  if (!stageModalData.value) return;
  stageModalData.value.items.push(createDocumentItem());
};

const addStageDescriptionItemModal = () => {
  if (!stageModalData.value) return;
  stageModalData.value.items.push(createDescriptionItem());
};

const removeStageItemModal = (itemIndex) => {
  if (!stageModalData.value) return;
  stageModalData.value.items.splice(itemIndex, 1);
};

const moveStageItemModal = (itemIndex, direction) => {
  if (!stageModalData.value) return;
  const nextIndex = itemIndex + direction;
  const items = [...stageModalData.value.items];
  if (nextIndex < 0 || nextIndex >= items.length) return;
  const [item] = items.splice(itemIndex, 1);
  items.splice(nextIndex, 0, item);
  stageModalData.value.items = items;
};

const syncStageDocumentModal = (itemIndex) => {
  const item = stageModalData.value?.items?.[itemIndex];
  if (!item || item.type !== 'document') return;
  item.document = resolveDocument(item.documentId);
};

const getAvailableDocumentsModal = (currentDocumentId = '') => {
  const items = stageModalData.value?.items || [];
  const usedIds = new Set(
    items
      .filter((item) => item.type === 'document' && item.documentId)
      .map((item) => Number(item.documentId))
  );
  return documentOptions.value.filter((item) => {
    const id = Number(item.id);
    return id === Number(currentDocumentId || 0) || !usedIds.has(id);
  });
};

const submit = async () => {
  if (!validateForm()) {
    return;
  }

  saving.value = true;

  try {
    const payload = new FormData();
    payload.append('title', form.value.title);
    payload.append('type', form.value.type);
    payload.append('validFor', String(form.value.validFor || ''));
    payload.append('amount', String(form.value.amount || ''));
    payload.append('available', String(Boolean(form.value.available)));
    payload.append('description', form.value.description || '');
    payload.append('introTitle', form.value.introTitle || '');
    payload.append('introDescription', form.value.introDescription || '');
    payload.append('stepsLabel', form.value.stepsLabel || '');
    payload.append('featureLines', JSON.stringify(
      (form.value.featureLinesText || '').split('\n').map(l => l.trim()).filter(Boolean)
    ));
    payload.append('stages', JSON.stringify(normalizeStagesForPayload()));
    payload.append('selfValidation', String(Boolean(form.value.selfValidation)));
    payload.append('selfValidationGuide', form.value.selfValidationGuide || '');
    payload.append('selfValidationNote', form.value.selfValidationNote || '');
    payload.append('selfValidationUploadLabel', form.value.selfValidationUploadLabel || '');

    if (form.value.trainingVideoFile) {
      payload.append('trainingVideo', form.value.trainingVideoFile);
    }

    if (form.value.id) {
      await updateValidation(form.value.id, payload);
      toast.success('روش اعتبارسنجی بروزرسانی شد');
    } else {
      await createValidation(payload);
      toast.success('روش اعتبارسنجی ثبت شد');
    }

    resetForm();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const mapStagesFromItem = (item) => {
  const stages = Array.isArray(item?.stages) && item.stages.length ? item.stages : [createStage()];

  return stages.map((stage) => ({
    uid: nextStageUid(),
    title: stage.title || '',
    description: stage.description || '',
    collapsed: true,
    items: (stage.items || []).map((stageItem) => {
      if (stageItem.type === 'document') {
        const documentId = stageItem.documentId || stageItem.document?.id || '';
        return {
          uid: nextItemUid(),
          type: 'document',
          documentId: documentId ? String(documentId) : '',
          document: stageItem.document || resolveDocument(documentId)
        };
      }

      return {
        uid: nextItemUid(),
        type: 'description',
        title: stageItem.title || '',
        description: stageItem.description || ''
      };
    })
  }));
};

const editItem = (item) => {
  revokeTrainingVideoPreview();
  form.value = {
    id: item.id,
    title: item.title || '',
    type: item.type || '',
    validFor: item.validFor || '',
    amount: Number(item.amount || 0) || '',
    available: Boolean(item.available),
    description: item.description || '',
    introTitle: item.introTitle || '',
    introDescription: item.introDescription || '',
    stepsLabel: item.stepsLabel || '',
    featureLinesText: Array.isArray(item.featureLines) ? item.featureLines.join('\n') : '',
    trainingVideoFile: null,
    trainingVideoUrl: item.trainingVideoUrl || '',
    trainingVideoPreviewUrl: '',
    trainingVideoName: item.trainingVideoName || '',
    selfValidation: Boolean(item.selfValidation),
    selfValidationGuide: item.selfValidationGuide || '',
    selfValidationNote: item.selfValidationNote || '',
    selfValidationUploadLabel: item.selfValidationUploadLabel || '',
    stages: mapStagesFromItem(item)
  };
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف روش اعتبارسنجی', text: 'آیا از حذف این روش اعتبارسنجی مطمئن هستید؟' });
  if (!ok) return;

  try {
    await deleteValidation(id);
    if (form.value.id === id) resetForm();
    toast.success('روش اعتبارسنجی حذف شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
};

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});

onBeforeUnmount(() => {
  revokeTrainingVideoPreview();
});
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-list-check"></i></div>
        <div>
          <h1 class="page-title">مدیریت روش های اعتبارسنجی</h1>
          <p class="page-subtitle">هر روش را با مراحل، توضیحات داخلی و فیلدهای مستندات مخصوص اعتبارسنجی مدیریت کنید.</p>
        </div>
      </div>
      <div class="page-header-badge">{{ total }} روش</div>
    </div>

    <div class="card card-body mb-3 management-card">
      <ul class="nav nav-tabs validation-tabs mb-3">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: formTab === 'base' }" @click="formTab = 'base'">
            <i class="fa-solid fa-circle-info me-1"></i> اطلاعات پایه
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: formTab === 'self' }" @click="formTab = 'self'">
            <i class="fa-solid fa-user-pen me-1"></i> اعتبارسنجی شخصی
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: formTab === 'display' }" @click="formTab = 'display'">
            <i class="fa-solid fa-palette me-1"></i> تنظیمات نمایشی
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: formTab === 'stages' }" @click="formTab = 'stages'">
            <i class="fa-solid fa-layer-group me-1"></i> مراحل
            <span class="tab-badge">{{ form.stages.filter(s => s.title).length }}</span>
          </button>
        </li>
      </ul>

      <!-- Tab: Base Fields -->
      <div v-show="formTab === 'base'" class="tab-panel">
        <div class="row g-3">
          <div class="col-12 col-lg-4">
            <label class="form-label form-label-required">عنوان</label>
            <input v-model="form.title" class="form-control" maxlength="255" placeholder="مثلا اعتباریتو" />
          </div>
          <div class="col-12 col-lg-3">
            <label class="form-label form-label-required">شناسه نوع</label>
            <input v-model="form.type" class="form-control" maxlength="255" placeholder="eetebarito" dir="ltr" />
          </div>
          <div class="col-6 col-lg-2">
            <label class="form-label form-label-optional">اعتبار (روز)</label>
            <input v-model="form.validFor" type="number" min="1" class="form-control" placeholder="25" />
          </div>
          <div class="col-6 col-lg-3">
            <label class="form-label form-label-optional">مبلغ</label>
            <input v-model="form.amount" type="number" min="0" class="form-control" placeholder="10000" />
            <small v-if="Number(form.amount)" class="text-muted d-block mt-1">{{ formatMoney(form.amount) }}</small>
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-optional">ویدیوی آموزشی</label>
            <input type="file" accept="video/*" class="form-control" @change="onTrainingVideoChange" />
            <small class="text-muted">فرمت های رایج ویدیویی مانند mp4 و webm پشتیبانی می شوند.</small>
          </div>
          <div class="col-12 col-lg-6">
            <div class="video-preview-card">
              <div class="video-preview-title">پیش نمایش ویدیوی آموزشی</div>
              <div v-if="currentTrainingVideoUrl" class="video-preview-frame">
                <video :src="currentTrainingVideoUrl" controls preload="metadata" class="training-video-player"></video>
                <div class="video-preview-name">{{ form.trainingVideoName || 'ویدیوی آموزشی' }}</div>
              </div>
              <div v-else class="video-preview-empty">ویدیویی انتخاب نشده است</div>
            </div>
          </div>
          <div class="col-12 col-lg-8">
            <label class="form-label form-label-optional">توضیحات کلی روش</label>
            <textarea v-model="form.description" class="form-control" rows="2" maxlength="10000" placeholder="توضیح کوتاه درباره این روش"></textarea>
          </div>
          <div class="col-12 col-lg-4 d-flex align-items-end">
            <label class="check-tile w-100">
              <input v-model="form.available" class="form-check-input" type="checkbox" />
              <span>
                <strong>فعال و قابل استفاده (اختیاری)</strong>
                <small>در صورت غیرفعال بودن این روش در لیست فعال‌ها نمایش داده نمی‌شود.</small>
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Tab: Self Validation -->
      <div v-show="formTab === 'self'" class="tab-panel">
        <div class="row g-3">
          <div class="col-12">
            <label class="check-tile w-100">
              <input v-model="form.selfValidation" class="form-check-input" type="checkbox" />
              <span>
                <strong>فعال‌سازی اعتبارسنجی شخصی</strong>
                <small>با فعال کردن این گزینه، در مودال اعتبارسنجی گزینه «خودم انجام میدم» نمایش داده می‌شود.</small>
              </span>
            </label>
          </div>
          <template v-if="form.selfValidation">
            <div class="col-12">
              <label class="form-label form-label-optional">راهنمای اعتبارسنجی شخصی</label>
              <textarea v-model="form.selfValidationGuide" class="form-control" rows="3" maxlength="10000" placeholder="متن راهنما برای مشتری جهت انجام اعتبارسنجی شخصی ..."></textarea>
              <small class="text-muted">این متن در صفحه بارگذاری فایل به مشتری نمایش داده می‌شود.</small>
            </div>
            <div class="col-12">
              <label class="form-label form-label-optional">نکته مهم</label>
              <textarea v-model="form.selfValidationNote" class="form-control" rows="2" maxlength="10000" placeholder="نکته مهم یا هشدار برای مشتری ..."></textarea>
              <small class="text-muted">به صورت یک باکس هشدار زردرنگ در صفحه بارگذاری نمایش داده می‌شود.</small>
            </div>
            <div class="col-12 col-lg-6">
              <label class="form-label form-label-optional">برچسب دکمه بارگذاری</label>
              <input v-model="form.selfValidationUploadLabel" class="form-control" maxlength="500" placeholder="بارگذاری فایل گزارش" />
              <small class="text-muted">پیش‌فرض: بارگذاری فایل گزارش</small>
            </div>
          </template>
        </div>
      </div>

      <!-- Tab: Display Config -->
      <div v-show="formTab === 'display'" class="tab-panel">
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-optional">عنوان معرفی</label>
            <input v-model="form.introTitle" class="form-control" maxlength="500" placeholder="مثلا: اعتبارسنجی توسط دیجی وام" />
            <small class="text-muted">در مودال اعتبارسنجی نمایش داده می شود. پیش فرض: اعتبارسنجی توسط دیجی وام</small>
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-optional">برچسب مراحل</label>
            <input v-model="form.stepsLabel" class="form-control" maxlength="255" placeholder="مثلا: 4 مرحله ساده" />
            <small class="text-muted">در لیست ویژگی‌ها نمایش داده می شود. پیش‌فرض: تعداد مراحل + «مرحله ساده»</small>
          </div>
          <div class="col-12">
            <label class="form-label form-label-optional">زیرعنوان معرفی</label>
            <input v-model="form.introDescription" class="form-control" maxlength="1000" placeholder="مثلا: ثبت اطلاعات و انجام اعتبارسنجی جدید توسط دیجی وام" />
            <small class="text-muted">در ویزارد اعتبارسنجی و مودال نمایش داده می‌شود.</small>
          </div>
          <div class="col-12">
            <label class="form-label form-label-optional">تگ‌های ویژگی (هر خط یک تگ)</label>
            <textarea v-model="form.featureLinesText" class="form-control" rows="3" placeholder="دریافت گزارش کامل اعتبار سنجی&#10;سریع , آسان و بدون دردسر"></textarea>
            <small class="text-muted">هر خط به عنوان یک تگ/ویژگی در مودال اعتبارسنجی نمایش داده می‌شود.</small>
          </div>
        </div>
      </div>

      <!-- Tab: Stages -->
      <div v-show="formTab === 'stages'" class="tab-panel">
        <div class="stage-builder-shell">
          <div class="stage-builder-head">
            <div>
              <h2 class="panel-title">مراحل اعتبارسنجی</h2>
              <p class="panel-subtitle">برای هر مرحله عنوان، توضیح و آیتم‌های مستندات یا توضیحات داخلی تعریف کنید.</p>
            </div>
            <button type="button" class="btn btn-outline-primary" @click="openStageModal()">
              <i class="fa-solid fa-plus me-1"></i> افزودن مرحله
            </button>
          </div>

          <div v-if="optionLoading" class="spinner-overlay compact-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>در حال بارگذاری فیلدهای مستندات اعتبارسنجی...</span>
          </div>

          <div v-if="!form.stages.length || (form.stages.length === 1 && !form.stages[0].title)" class="empty-mini">
            هنوز مرحله‌ای ثبت نشده است. از دکمه «افزودن مرحله» استفاده کنید.
          </div>

          <div v-else class="stage-list">
            <article
              v-for="(stage, stageIndex) in form.stages"
              :key="stage.uid"
              class="stage-card stage-card-compact"
              :class="{ 'drag-active': draggingStageUid === stage.uid }"
              @dragover.prevent
              @drop="dropStage(stage.uid)"
            >
              <div class="stage-head">
                <div>
                  <div class="stage-kicker">مرحله {{ stageIndex + 1 }}</div>
                  <h3 class="stage-title">{{ stage.title || 'مرحله جدید' }}</h3>
                  <p v-if="stage.description" class="stage-desc-preview">{{ stage.description }}</p>
                </div>
                <div class="stage-actions">
                  <button type="button" class="btn btn-sm btn-outline-primary" title="ویرایش مرحله" @click="openStageModal(stageIndex)">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary drag-handle"
                    draggable="true"
                    title="جابجایی با ماوس"
                    @dragstart="startStageDrag(stage.uid)"
                    @dragend="endStageDrag"
                  >
                    <i class="fa-solid fa-grip-vertical"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="stageIndex === 0" @click="moveStage(stageIndex, -1)">
                    <i class="fa-solid fa-arrow-up"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="stageIndex === form.stages.length - 1" @click="moveStage(stageIndex, 1)">
                    <i class="fa-solid fa-arrow-down"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="removeStage(stageIndex)">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
              <div class="stage-collapsed-summary">
                <span>{{ stage.items.length }} آیتم</span>
                <span>{{ stage.items.filter(i => i.type === 'document').length }} مستند | {{ stage.items.filter(i => i.type === 'description').length }} توضیح</span>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div class="mt-3 d-flex gap-2 flex-wrap">
        <button class="btn btn-primary" :disabled="saving" @click="submit">
          <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
          <i v-else class="fa-solid fa-floppy-disk me-1"></i>
          {{ form.id ? 'بروزرسانی روش' : 'ثبت روش اعتبارسنجی' }}
        </button>
        <button v-if="form.id" class="btn btn-outline-secondary" @click="resetForm">
          <i class="fa-solid fa-xmark me-1"></i> انصراف
        </button>
      </div>
    </div>

    <!-- Stage Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="stageModalOpen" class="stage-modal-overlay" @click.self="closeStageModal">
          <div class="stage-modal-dialog">
            <div class="stage-modal-header">
              <h3>{{ stageModalIndex >= 0 ? 'ویرایش مرحله' : 'افزودن مرحله جدید' }}</h3>
              <button type="button" class="btn-close" @click="closeStageModal"></button>
            </div>
            <div v-if="stageModalData" class="stage-modal-body">
              <div class="row g-3 mb-3">
                <div class="col-12 col-lg-5">
                  <label class="form-label form-label-required">عنوان مرحله</label>
                  <input v-model="stageModalData.title" class="form-control" maxlength="255" placeholder="مثلا احراز هویت پایه" />
                </div>
                <div class="col-12 col-lg-7">
                  <label class="form-label form-label-optional">توضیح مرحله</label>
                  <textarea v-model="stageModalData.description" class="form-control" rows="2" maxlength="10000" placeholder="توضیح کوتاه برای این مرحله"></textarea>
                </div>
              </div>

              <div class="stage-item-toolbar mb-3">
                <button type="button" class="btn btn-outline-primary btn-sm" @click="addStageDocumentItemModal">
                  <i class="fa-solid fa-file-lines me-1"></i> افزودن فیلد مستندات
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" @click="addStageDescriptionItemModal">
                  <i class="fa-solid fa-align-left me-1"></i> افزودن توضیح
                </button>
              </div>

              <div v-if="!stageModalData.items.length" class="empty-mini">هنوز آیتمی برای این مرحله ثبت نشده است.</div>
              <div v-else class="stage-item-list">
                <div
                  v-for="(stageItem, itemIndex) in stageModalData.items"
                  :key="stageItem.uid"
                  class="stage-item-card"
                >
                  <div class="stage-item-head">
                    <span class="type-chip" :class="stageItem.type === 'document' ? 'chip-blue' : 'chip-gray'">
                      {{ stageItem.type === 'document' ? 'فیلد مستندات' : 'توضیح' }}
                    </span>
                    <div class="stage-item-actions">
                      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="itemIndex === 0" @click="moveStageItemModal(itemIndex, -1)">
                        <i class="fa-solid fa-arrow-up"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="itemIndex === stageModalData.items.length - 1" @click="moveStageItemModal(itemIndex, 1)">
                        <i class="fa-solid fa-arrow-down"></i>
                      </button>
                      <button type="button" class="btn btn-sm btn-outline-danger" @click="removeStageItemModal(itemIndex)">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>

                  <template v-if="stageItem.type === 'document'">
                    <label class="form-label form-label-required">فیلد مستندات</label>
                    <select v-model="stageItem.documentId" class="form-select" @change="syncStageDocumentModal(itemIndex)">
                      <option value="">انتخاب مستند</option>
                      <option v-for="document in getAvailableDocumentsModal(stageItem.documentId)" :key="document.id" :value="document.id">
                        {{ document.title }} | {{ document.typeLabel }}
                      </option>
                    </select>
                    <div v-if="stageItem.document" class="stage-document-meta">
                      <strong>{{ stageItem.document.title }}</strong>
                      <span>{{ stageItem.document.typeLabel }} | {{ stageItem.document.categoryLabel || '-' }}</span>
                      <small>{{ stageItem.document.help || 'بدون راهنما' }}</small>
                    </div>
                  </template>

                  <template v-else>
                    <div class="row g-3">
                      <div class="col-12 col-lg-4">
                        <label class="form-label form-label-optional">عنوان توضیح</label>
                        <input v-model="stageItem.title" class="form-control" maxlength="255" placeholder="مثلا نکته مهم" />
                      </div>
                      <div class="col-12 col-lg-8">
                        <label class="form-label form-label-required">متن توضیح</label>
                        <textarea v-model="stageItem.description" class="form-control" rows="2" maxlength="10000" placeholder="متن توضیح این مرحله"></textarea>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div class="stage-modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="closeStageModal">انصراف</button>
              <button type="button" class="btn btn-primary" @click="saveStageModal">
                <i class="fa-solid fa-check me-1"></i>
                {{ stageModalIndex >= 0 ? 'بروزرسانی مرحله' : 'افزودن مرحله' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="card management-card">
      <div class="filter-row validation-filter-row">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو در عنوان، type یا توضیحات" @keyup.enter="applyFilters" />
        </div>
        <select v-model="availableFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه وضعیت ها</option>
          <option value="1">فعال</option>
          <option value="0">غیرفعال</option>
        </select>
        <button class="btn btn-outline-secondary" @click="clearFilters">
          <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
        </button>
      </div>

      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>در حال بارگذاری روش های اعتبارسنجی...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>روش اعتبارسنجی یافت نشد</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>type</th>
              <th>اعتبار</th>
              <th>مبلغ</th>
              <th>مراحل</th>
              <th>مستندات</th>
              <th>ویدیوی آموزشی</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="fw-bold">{{ item.title }}</div>
                <div class="small text-muted">{{ item.description || '-' }}</div>
              </td>
              <td dir="ltr" class="fw-semibold">{{ item.type }}</td>
              <td>{{ item.validFor ? `${item.validFor} روز` : '-' }}</td>
              <td>{{ new Intl.NumberFormat('fa-IR').format(Number(item.amount || 0)) }} تومان</td>
              <td>
                <div class="doc-pill-list">
                  <span v-for="stage in item.stages.slice(0, 2)" :key="stage.id || stage.title" class="doc-pill">{{ stage.title }}</span>
                  <span v-if="item.stageCount > 2" class="doc-pill doc-pill-more">+{{ item.stageCount - 2 }}</span>
                </div>
              </td>
              <td>
                <div class="doc-pill-list">
                  <span v-for="document in item.documents.slice(0, 3)" :key="document.id" class="doc-pill">{{ document.title }}</span>
                  <span v-if="item.documents.length > 3" class="doc-pill doc-pill-more">+{{ item.documents.length - 3 }}</span>
                </div>
              </td>
              <td>
                <a v-if="item.trainingVideoUrl" :href="item.trainingVideoUrl" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-secondary">
                  <i class="fa-solid fa-circle-play me-1"></i> مشاهده
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span class="type-chip" :class="item.available ? 'chip-green' : 'chip-gray'">{{ item.available ? 'فعال' : 'غیرفعال' }}</span>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="editItem(item)">
                    <i class="fa-solid fa-pen me-1"></i> ویرایش
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

<style scoped src="./styles/ValidationsView.css"></style>
