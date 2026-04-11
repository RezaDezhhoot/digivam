<script setup>
import { computed, ref, watch } from 'vue';
import { openCustomerAuthModal, useCustomerSession } from '../composables/useCustomerSession.js';
import { createCustomerTicket, getCustomerTicketThread, getCustomerTickets, replyCustomerTicket } from '../services/customer-ticket.api.js';

const { clearSession, isAuthenticated, profile } = useCustomerSession();

const createForm = ref({ subject: '', body: '' });
const replyBody = ref('');
const statusFilter = ref('');
const items = ref([]);
const thread = ref({ ticket: null, messages: [] });
const selectedId = ref(null);
const listLoading = ref(false);
const threadLoading = ref(false);
const submitLoading = ref(false);
const replyLoading = ref(false);
const errorText = ref('');
const successText = ref('');

const hasSession = computed(() => isAuthenticated.value);
const session = computed(() => profile.value);

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const resetState = () => {
  items.value = [];
  selectedId.value = null;
  thread.value = { ticket: null, messages: [] };
  createForm.value = { subject: '', body: '' };
  replyBody.value = '';
};

const handleError = (error) => {
  errorText.value = error.message;
  if (/توکن|دسترسی|معتبر/.test(error.message)) {
    clearSession();
    resetState();
  }
};

const loadThread = async (id) => {
  if (!id) {
    thread.value = { ticket: null, messages: [] };
    return;
  }

  threadLoading.value = true;
  errorText.value = '';

  try {
    thread.value = await getCustomerTicketThread(id);
  } catch (error) {
    handleError(error);
  } finally {
    threadLoading.value = false;
  }
};

const loadTickets = async () => {
  if (!hasSession.value) {
    return;
  }

  listLoading.value = true;
  errorText.value = '';

  try {
    const query = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : '';
    const data = await getCustomerTickets(query);
    items.value = data.items || [];

    if (!items.value.length) {
      selectedId.value = null;
      thread.value = { ticket: null, messages: [] };
      return;
    }

    if (!selectedId.value || !items.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = items.value[0].id;
    }

    await loadThread(selectedId.value);
  } catch (error) {
    handleError(error);
  } finally {
    listLoading.value = false;
  }
};

const submitTicket = async () => {
  submitLoading.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const data = await createCustomerTicket(createForm.value);
    createForm.value = { subject: '', body: '' };
    selectedId.value = data.ticket.id;
    thread.value = { ticket: data.ticket, messages: data.messages };
    successText.value = data.message;
    await loadTickets();
  } catch (error) {
    handleError(error);
  } finally {
    submitLoading.value = false;
  }
};

const selectTicket = async (id) => {
  selectedId.value = id;
  replyBody.value = '';
  await loadThread(id);
};

const submitReply = async () => {
  if (!selectedId.value) {
    return;
  }

  replyLoading.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const data = await replyCustomerTicket(selectedId.value, { body: replyBody.value });
    thread.value = { ticket: data.ticket, messages: data.messages };
    replyBody.value = '';
    successText.value = data.message;
    await loadTickets();
  } catch (error) {
    handleError(error);
  } finally {
    replyLoading.value = false;
  }
};

watch(
  () => hasSession.value,
  (authenticated) => {
    if (authenticated) {
      loadTickets();
      return;
    }

    resetState();
  },
  { immediate: true }
);
</script>

<template>
  <div class="request-view">
    <section class="card card-body mb-3 request-hero">
      <div>
        <p class="small text-muted mb-2">مرکز پشتیبانی مشتری</p>
        <h1 class="h4 mb-2">درخواست ها و تیکت های پشتیبانی</h1>
        <p class="mb-0 text-muted">برای ثبت درخواست، پاسخ گرفتن از ادمین و پیگیری گفتگوها از این بخش استفاده کنید.</p>
      </div>
      <div v-if="hasSession" class="request-user-chip">
        {{ session?.name || 'مشتری' }} - {{ session?.phone || '-' }}
      </div>
    </section>

    <p v-if="errorText" class="small text-danger">{{ errorText }}</p>
    <p v-if="successText" class="small text-success">{{ successText }}</p>

    <section v-if="!hasSession" class="card card-body mb-3 request-access-card">
      <h2 class="h5 mb-3">ورود به پشتیبانی مشتری</h2>
      <p class="text-muted mb-3">برای ثبت و پیگیری تیکت‌ها، ابتدا با شماره همراه خود وارد حساب مشتری شوید.</p>
      <div class="d-flex justify-content-end">
        <button class="btn btn-primary" @click="openCustomerAuthModal({ redirectTo: '/requests' })">ورود / عضویت مشتری</button>
      </div>
    </section>

    <template v-else>
      <section class="card card-body mb-3 request-create-card">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h2 class="h5 mb-1">تیکت جدید</h2>
            <p class="text-muted mb-0">موضوع و شرح درخواست خود را برای تیم پشتیبانی ثبت کنید.</p>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <select v-model="statusFilter" class="form-select w-auto" @change="loadTickets">
              <option value="">همه وضعیت ها</option>
              <option value="pending">در انتظار پاسخ</option>
              <option value="answered">پاسخ داده شده</option>
              <option value="closed">بسته شده</option>
            </select>
            <button class="btn btn-outline-secondary" @click="clearSession">خروج از حساب</button>
          </div>
        </div>

        <div class="row g-2">
          <div class="col-12 col-lg-4">
            <input v-model="createForm.subject" class="form-control" maxlength="100" placeholder="موضوع درخواست" />
          </div>
          <div class="col-12 col-lg-8">
            <textarea v-model="createForm.body" class="form-control" rows="2" placeholder="شرح مشکل یا درخواست"></textarea>
          </div>
          <div class="col-12 d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="submitLoading" @click="submitTicket">
              {{ submitLoading ? 'در حال ثبت...' : 'ثبت تیکت' }}
            </button>
          </div>
        </div>
      </section>

      <div class="row g-3">
        <div class="col-12 col-xl-4">
          <section class="card card-body request-list-panel">
            <p v-if="listLoading" class="small text-muted mb-0"><span class="web-spinner web-spinner-sm"></span> در حال بارگذاری لیست تیکت ها...</p>
            <div v-else-if="!items.length" class="text-muted">هنوز تیکتی ثبت نکرده اید.</div>
            <template v-else>
              <button
                v-for="item in items"
                :key="item.id"
                type="button"
                class="request-list-item"
                :class="{ active: selectedId === item.id }"
                @click="selectTicket(item.id)"
              >
                <div class="d-flex justify-content-between gap-2 align-items-start mb-2">
                  <span class="request-status-chip">{{ item.statusLabel }}</span>
                  <small class="text-muted">{{ formatDate(item.updatedAt) }}</small>
                </div>
                <div class="fw-bold mb-1">{{ item.subject }}</div>
                <div class="small text-muted">{{ item.senderPhone }}</div>
              </button>
            </template>
          </section>
        </div>

        <div class="col-12 col-xl-8">
          <section class="card card-body request-thread-panel">
            <p v-if="threadLoading" class="small text-muted"><span class="web-spinner web-spinner-sm"></span> در حال بارگذاری گفتگو...</p>
            <div v-else-if="!thread.ticket" class="text-muted">برای مشاهده جزئیات، یک تیکت را از لیست انتخاب کنید.</div>
            <template v-else>
              <div class="request-thread-header">
                <div>
                  <h2 class="h5 mb-1">{{ thread.ticket.subject }}</h2>
                  <p class="text-muted mb-0">وضعیت فعلی: {{ thread.ticket.statusLabel }}</p>
                </div>
                <span class="request-status-chip">{{ thread.ticket.statusLabel }}</span>
              </div>

              <div class="request-messages">
                <div
                  v-for="message in thread.messages"
                  :key="message.id"
                  class="request-message"
                  :class="message.admin ? 'message-admin' : 'message-user'"
                >
                  <div class="d-flex justify-content-between gap-2 mb-2 flex-wrap">
                    <strong>{{ message.senderTypeLabel === 'ادمین' ? 'پشتیبانی' : 'شما' }}</strong>
                    <small class="text-muted">{{ formatDate(message.createdAt) }}</small>
                  </div>
                  <p class="mb-0">{{ message.body }}</p>
                </div>
              </div>

              <div class="reply-box mt-3">
                <label class="form-label">پاسخ شما</label>
                <textarea v-model="replyBody" class="form-control mb-3" rows="4" placeholder="اگر نیاز به توضیح بیشتر دارید، اینجا بنویسید"></textarea>
                <div class="d-flex justify-content-end">
                  <button class="btn btn-primary" :disabled="replyLoading" @click="submitReply">
                    {{ replyLoading ? 'در حال ارسال...' : 'ارسال پاسخ' }}
                  </button>
                </div>
              </div>
            </template>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.request-view {
  display: grid;
  gap: 14px;
}

.request-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  border-radius: 30px;
  background: linear-gradient(135deg, rgba(155, 0, 0, 0.08) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.request-hero h1,
.request-hero p {
  color: var(--web-text);
}

.request-access-card,
.request-create-card,
.request-list-panel,
.request-thread-panel {
  border-radius: 28px;
}

.request-user-chip,
.request-status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 10px 14px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-weight: 700;
}

.request-list-panel,
.request-thread-panel {
  min-height: 520px;
}

.request-list-item {
  width: 100%;
  text-align: right;
  border: 1px solid #d7e7f4;
  border-radius: 18px;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: linear-gradient(180deg, --web-surface 0%, var(--web-surface) 100%);
  color: var(--web-text);
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.request-list-item:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 122, 163, 0.32);
}

.request-list-item.active {
  border-color: var(--web-primary);
  background: var(--web-primary-soft);
}

.request-thread-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.request-messages {
  display: grid;
  gap: 12px;
}

.request-message {
  border-radius: 18px;
  padding: 16px;
  max-width: 85%;
  color: var(--web-text);
}

.message-user {
  justify-self: flex-start;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.message-admin {
  justify-self: flex-end;
  background: var(--web-primary-soft);
  border: 1px solid rgba(155, 0, 0, 0.14);
}

.reply-box {
  border-top: 1px solid #d7e7f4;
  padding-top: 18px;
}

:global([data-theme='dark']) .request-view .request-hero {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.16) 0%, rgba(21, 30, 42, 0.96) 100%);
  border: 1px solid rgba(151, 176, 214, 0.2);
}

:global([data-theme='dark']) .request-view .request-access-card,
:global([data-theme='dark']) .request-view .request-create-card,
:global([data-theme='dark']) .request-view .request-list-panel,
:global([data-theme='dark']) .request-view .request-thread-panel {
  background: linear-gradient(180deg, rgba(16, 23, 32, 0.99) 0%, rgba(10, 15, 23, 0.99) 100%);
  border-color: rgba(151, 176, 214, 0.16);
}

:global([data-theme='dark']) .request-view .request-user-chip,
:global([data-theme='dark']) .request-view .request-status-chip {
  background: rgba(255, 106, 99, 0.16);
  color: #ffd2cf;
}

:global([data-theme='dark']) .request-view .request-list-item {
  border-color: rgba(151, 176, 214, 0.14);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.025) 100%);
  color: #f5f8ff;
}

:global([data-theme='dark']) .request-view .request-list-item.active {
  border-color: rgba(255, 106, 99, 0.45);
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.24) 0%, rgba(255, 106, 99, 0.12) 100%);
}

:global([data-theme='dark']) .request-view .message-user {
  border-color: rgba(151, 176, 214, 0.14);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.025) 100%);
}

:global([data-theme='dark']) .request-view .message-admin {
  border-color: rgba(255, 106, 99, 0.28);
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.14) 0%, rgba(255, 106, 99, 0.08) 100%);
}

:global([data-theme='dark']) .request-view .reply-box {
  border-top-color: rgba(151, 176, 214, 0.18);
}

:global([data-theme='dark']) .request-view .request-thread-header {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(151, 176, 214, 0.1);
  border-radius: 20px;
  padding: 14px 16px;
}

:global([data-theme='dark']) .request-view .form-control,
:global([data-theme='dark']) .request-view .form-select {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(151, 176, 214, 0.14);
  color: #f5f8ff;
}

:global([data-theme='dark']) .request-view .text-muted,
:global([data-theme='dark']) .request-view small,
:global([data-theme='dark']) .request-view p {
  color: #becbdd !important;
}

:global([data-theme='dark']) .request-view h1,
:global([data-theme='dark']) .request-view h2,
:global([data-theme='dark']) .request-view h3,
:global([data-theme='dark']) .request-view .fw-bold,
:global([data-theme='dark']) .request-view strong,
:global([data-theme='dark']) .request-view label {
  color: #f5f8ff;
}

@media (max-width: 991px) {
  .request-thread-header {
    flex-direction: column;
  }

  .request-message {
    max-width: 100%;
  }
}
</style>
