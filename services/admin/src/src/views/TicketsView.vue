<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import { getTicketThread, getTickets, replyTicket } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const items = ref([]);
const listLoading = ref(false);
const threadLoading = ref(false);
const replyLoading = ref(false);
const selectedId = ref(null);
const statusFilter = ref('');
const phoneFilter = ref('');
const nationalCodeFilter = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const ticketStats = ref({ total: 0, pending: 0, answered: 0, closed: 0 });
const thread = ref({ ticket: null, messages: [] });
const replyForm = ref({ status: 'answered', body: '' });

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const senderMeta = (item) => {
  if (item?.admin || item?.senderType === 'admin') {
    return {
      icon: 'fa-solid fa-headset',
      className: 'sender-type-admin',
      label: item?.senderTypeLabel || 'ادمین'
    };
  }

  if (item?.senderType === 'broker') {
    return {
      icon: 'fa-solid fa-briefcase',
      className: 'sender-type-broker',
      label: item?.senderTypeLabel || 'کارگزار'
    };
  }

  return {
    icon: 'fa-solid fa-user',
    className: 'sender-type-customer',
    label: item?.senderTypeLabel || 'مشتری'
  };
};

const statusMeta = (status) => {
  const meta = {
    pending: { icon: 'fa-solid fa-clock', className: 'status-pending' },
    answered: { icon: 'fa-solid fa-circle-check', className: 'status-answered' },
    closed: { icon: 'fa-solid fa-circle-xmark', className: 'status-closed' }
  };

  return meta[status] || meta.pending;
};

const buildQuery = () => {
  const params = new URLSearchParams({
    page: String(page.value),
    limit: String(limit.value)
  });

  if (statusFilter.value) {
    params.set('status', statusFilter.value);
  }

  if (phoneFilter.value.trim()) {
    params.set('phone', phoneFilter.value.trim());
  }

  if (nationalCodeFilter.value.trim()) {
    params.set('nationalCode', nationalCodeFilter.value.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};

const loadThread = async (id) => {
  if (!id) {
    thread.value = { ticket: null, messages: [] };
    return;
  }

  threadLoading.value = true;

  try {
    const data = await getTicketThread(id);
    thread.value = data;
    replyForm.value.status = data.ticket?.status === 'closed' ? 'closed' : 'answered';
  } catch (error) {
    toast.error(error.message);
  } finally {
    threadLoading.value = false;
  }
};

const loadTickets = async () => {
  listLoading.value = true;

  try {
    const data = await getTickets(buildQuery());
    items.value = data.items;
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
    ticketStats.value = data.stats || { total: total.value, pending: 0, answered: 0, closed: 0 };

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
    toast.error(error.message);
  } finally {
    listLoading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  selectedId.value = null;
  await loadTickets();
};

const clearFilters = async () => {
  statusFilter.value = '';
  phoneFilter.value = '';
  nationalCodeFilter.value = '';
  page.value = 1;
  selectedId.value = null;
  await loadTickets();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await loadTickets();
};

const selectTicket = async (id) => {
  selectedId.value = id;
  replyForm.value.body = '';
  await loadThread(id);
};

const submitReply = async () => {
  if (!selectedId.value) {
    return;
  }

  replyLoading.value = true;

  try {
    const data = await replyTicket(selectedId.value, replyForm.value);
    thread.value = { ticket: data.ticket, messages: data.messages };
    replyForm.value.body = '';
    toast.success('پاسخ ارسال شد');
    await loadTickets();
  } catch (error) {
    toast.error(error.message);
  } finally {
    replyLoading.value = false;
  }
};

onMounted(loadTickets);
</script>

<template>
  <div class="animate-in">
    <section class="tickets-hero">
      <div class="tickets-hero-copy">
        <span class="hero-chip"><i class="fa-solid fa-headset me-1"></i> مرکز پشتیبانی</span>
        <h1 class="tickets-hero-title">مدیریت تیکت ها</h1>
        <p class="tickets-hero-subtitle">فهرست گفتگوها را با فیلتر وضعیت، شماره همراه و کد ملی مدیریت کنید.</p>
      </div>
      <div class="hero-stat-grid">
        <div class="hero-stat-card">
          <span>کل تیکت ها</span>
          <strong>{{ ticketStats.total }}</strong>
        </div>
        <div class="hero-stat-card">
          <span>در انتظار</span>
          <strong>{{ ticketStats.pending }}</strong>
        </div>
        <div class="hero-stat-card">
          <span>پاسخ داده شده</span>
          <strong>{{ ticketStats.answered }}</strong>
        </div>
        <div class="hero-stat-card">
          <span>بسته شده</span>
          <strong>{{ ticketStats.closed }}</strong>
        </div>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <div class="filter-field">
          <label class="filter-label">وضعیت</label>
          <select v-model="statusFilter" class="form-select">
            <option value="">همه وضعیت ها</option>
            <option value="pending">در انتظار</option>
            <option value="answered">پاسخ داده شده</option>
            <option value="closed">بسته شده</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">شماره همراه</label>
          <input v-model="phoneFilter" class="form-control" dir="ltr" placeholder="09xxxxxxxxx" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-field">
          <label class="filter-label">کد ملی</label>
          <input v-model="nationalCodeFilter" class="form-control" dir="ltr" placeholder="0012345678" @keyup.enter="applyFilters" />
        </div>
        <div class="filter-actions">
          <button class="btn btn-primary" :disabled="listLoading" @click="applyFilters">
            <i v-if="listLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-magnifying-glass me-1"></i>
            اعمال فیلتر
          </button>
          <button class="btn btn-outline-secondary" @click="clearFilters">
            <i class="fa-solid fa-rotate-left me-1"></i> حذف فیلتر
          </button>
        </div>
      </div>
    </section>

    <div class="row g-3">
      <div class="col-12 col-xl-4">
        <div class="card ticket-list-card redesigned-card">
          <div class="list-card-head">
            <div>
              <h2 class="section-title">لیست تیکت ها</h2>
              <p class="section-subtitle">{{ total }} مورد در نتیجه فعلی</p>
            </div>
            <button class="btn btn-light btn-sm" @click="loadTickets">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
          </div>
          <div v-if="listLoading" class="spinner-overlay">
            <i class="fa-solid fa-spinner"></i>
          </div>
          <div v-else-if="!items.length" class="empty-state small-empty">
            <i class="fa-solid fa-inbox"></i>
            <p>تیکتی یافت نشد</p>
          </div>
          <div v-else class="ticket-list">
            <button
              v-for="item in items"
              :key="item.id"
              type="button"
              class="ticket-item"
              :class="{ active: selectedId === item.id }"
              @click="selectTicket(item.id)"
            >
              <div class="ticket-item-top">
                <span class="ticket-chip" :class="statusMeta(item.status).className">
                  <i :class="statusMeta(item.status).icon"></i>
                  {{ item.statusLabel }}
                </span>
                <small class="text-muted">{{ formatDate(item.updatedAt) }}</small>
              </div>
              <div class="ticket-subject">{{ item.subject || 'بدون موضوع' }}</div>
              <div class="ticket-meta-grid">
                <span>
                  <span class="sender-type-badge" :class="senderMeta(item).className">
                    <i :class="senderMeta(item).icon"></i>
                    {{ senderMeta(item).label }}
                  </span>
                </span>
                <span><i class="fa-solid fa-user me-1"></i>{{ item.senderName || '-' }}</span>
                <span><i class="fa-solid fa-phone me-1"></i>{{ item.senderPhone || '-' }}</span>
                <span><i class="fa-solid fa-id-card me-1"></i>{{ item.senderNationalCode || '-' }}</span>
              </div>
            </button>
          </div>
          <AppPagination :page="page" :limit="limit" :total="total" :disabled="listLoading" @change="changePage" />
        </div>
      </div>

      <div class="col-12 col-xl-8">
        <div class="card ticket-thread-card redesigned-card">
          <div v-if="threadLoading" class="spinner-overlay">
            <i class="fa-solid fa-spinner"></i>
          </div>
          <div v-else-if="!thread.ticket" class="empty-state">
            <i class="fa-solid fa-comments"></i>
            <p>یک تیکت انتخاب کنید</p>
          </div>
          <template v-else>
            <div class="thread-header">
              <div>
                <h2 class="thread-title">{{ thread.ticket.subject || 'بدون موضوع' }}</h2>
                <p class="thread-subtitle">پیام ها و پاسخ های این گفتگو در ادامه نمایش داده می‌شود.</p>
              </div>
              <span class="ticket-chip" :class="statusMeta(thread.ticket.status).className">
                <i :class="statusMeta(thread.ticket.status).icon"></i>
                {{ thread.ticket.statusLabel }}
              </span>
            </div>

            <div class="thread-meta-cards">
              <div class="thread-meta-card">
                <span>نوع فرستنده</span>
                <strong>
                  <span class="sender-type-badge" :class="senderMeta(thread.ticket).className">
                    <i :class="senderMeta(thread.ticket).icon"></i>
                    {{ senderMeta(thread.ticket).label }}
                  </span>
                </strong>
              </div>
              <div class="thread-meta-card">
                <span>فرستنده</span>
                <strong class="text-muted">{{ thread.ticket.senderName || '-' }}</strong>
              </div>
              <div class="thread-meta-card">
                <span>شماره همراه</span>
                <strong class="text-muted" dir="ltr">{{ thread.ticket.senderPhone || '-' }}</strong>
              </div>
              <div class="thread-meta-card">
                <span>کد ملی</span>
                <strong class="text-muted" dir="ltr">{{ thread.ticket.senderNationalCode || '-' }}</strong>
              </div>
              <div class="thread-meta-card">
                <span>آخرین بروزرسانی</span>
                <strong class="text-muted">{{ formatDate(thread.ticket.updatedAt) }}</strong>
              </div>
            </div>

            <div class="messages-area">
              <div
                v-for="msg in thread.messages"
                :key="msg.id"
                class="message-bubble"
                :class="msg.admin ? 'bubble-admin' : 'bubble-user'"
              >
                <div class="message-bubble-head">
                  <div class="message-sender">
                    <span class="sender-type-badge" :class="senderMeta(msg).className">
                      <i :class="senderMeta(msg).icon"></i>
                      {{ senderMeta(msg).label }}
                    </span>
                    <strong class="small text-muted">{{ msg.senderName || senderMeta(msg).label }}</strong>
                  </div>
                  <small class="text-muted">{{ formatDate(msg.createdAt) }}</small>
                </div>
                <p class="mb-0 text-muted">{{ msg.body }}</p>
              </div>
            </div>

            <div class="reply-area">
              <div class="row g-2">
                <div class="col-12 col-md-4">
                  <select v-model="replyForm.status" class="form-select">
                    <option value="answered">پاسخ داده شده</option>
                    <option value="pending">در انتظار</option>
                    <option value="closed">بسته شده</option>
                  </select>
                </div>
                <div class="col-12">
                  <textarea v-model="replyForm.body" class="form-control" rows="3" placeholder="پاسخ مدیریت..."></textarea>
                </div>
                <div class="col-12 d-flex justify-content-end">
                  <button class="btn btn-primary" :disabled="replyLoading" @click="submitReply">
                    <i v-if="replyLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa-solid fa-paper-plane me-1"></i>
                    {{ replyLoading ? 'ارسال...' : 'ارسال پاسخ' }}
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./styles/TicketsView.css"></style>