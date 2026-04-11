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

<style scoped>
.tickets-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, var(--admin-primary) 0%, #083d54 100%);
  border-radius: 18px;
  padding: 22px 24px;
  color: #fff;
  margin-bottom: 20px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

.tickets-hero-title { font-size: 24px; font-weight: 800; margin: 0 0 8px; }
.tickets-hero-subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.82); margin: 0; max-width: 560px; }

.hero-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 12px;
  min-width: min(100%, 320px);
}

.hero-stat-card {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 16px;
}

.hero-stat-card span {
  display: block;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 6px;
}

.hero-stat-card strong {
  font-size: 24px;
  font-weight: 800;
}

.filter-panel {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--admin-shadow);
  margin-bottom: 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 14px;
  align-items: end;
}

.filter-field { min-width: 0; }
.filter-label { display: block; font-size: 12px; font-weight: 700; color: var(--admin-muted); margin-bottom: 6px; }

.filter-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.redesigned-card {
  border-radius: 18px;
  overflow: hidden;
}

.ticket-list-card { min-height: 640px; }
.ticket-thread-card { min-height: 640px; display: flex; flex-direction: column; }

.list-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid var(--admin-border);
}

.section-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.section-subtitle { font-size: 12px; color: var(--admin-muted); margin: 0; }

.ticket-list {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 620px;
  overflow-y: auto;
}

.ticket-item {
  width: 100%;
  text-align: right;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 14px 16px;
  background: var(--admin-surface-soft);
  color: var(--admin-text);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.ticket-item:hover {
  transform: translateY(-1px);
  border-color: var(--admin-primary);
}

.ticket-item.active {
  border-color: var(--admin-primary);
  background: var(--admin-primary-light);
  box-shadow: 0 10px 24px rgba(11, 95, 131, 0.08);
}

.ticket-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.ticket-subject {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}

.ticket-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  color: var(--admin-muted);
  font-size: 12px;
}

.ticket-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
}

.status-pending { background: #fff4d8; color: #b45309; }
.status-answered { background: #dcfce7; color: #166534; }
.status-closed { background: #e5e7eb; color: #4b5563; }

.sender-type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.sender-type-customer {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
}

.sender-type-broker {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

.sender-type-admin {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 20px 14px;
}

.thread-title { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
.thread-subtitle { font-size: 13px; color: var(--admin-muted); margin: 0; }

.thread-meta-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  padding: 0 20px 18px;
  border-bottom: 1px solid var(--admin-border);
}

.thread-meta-card {
  background: var(--admin-surface-soft);
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 12px 14px;
}

.thread-meta-card span {
  display: block;
  font-size: 12px;
  color: var(--admin-muted);
  margin-bottom: 6px;
}

.thread-meta-card strong {
  font-size: 13px;
  font-weight: 700;
}

.messages-area {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
}

.message-bubble {
  border-radius: 16px;
  padding: 14px 16px;
  max-width: 82%;
}

.message-bubble-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.message-sender {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bubble-user {
  align-self: flex-start;
  background: var(--admin-surface-soft);
  border: 1px solid var(--admin-border);
}

.bubble-admin {
  align-self: flex-end;
  background: var(--admin-primary-light);
  border: 1px solid rgba(11, 95, 131, 0.15);
}

.reply-area {
  padding: 18px 20px 20px;
  border-top: 1px solid var(--admin-border);
  margin-top: auto;
  background: linear-gradient(180deg, rgba(11, 95, 131, 0.02) 0%, transparent 100%);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--admin-muted);
  gap: 10px;
  flex: 1;
}

.empty-state i { font-size: 36px; opacity: 0.4; }
.small-empty { padding: 40px 16px; }
.small-empty i { font-size: 24px; }

:global(:root[data-theme='dark']) .sender-type-customer {
  background: rgba(249, 115, 22, 0.18);
  color: #fed7aa;
}

:global(:root[data-theme='dark']) .sender-type-broker {
  background: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
}

:global(:root[data-theme='dark']) .sender-type-admin {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

@media (max-width: 1199px) {
  .thread-meta-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }

  .thread-header {
    flex-direction: column;
  }

  .message-bubble {
    max-width: 100%;
  }
}

@media (max-width: 767px) {
  .tickets-hero,
  .filter-panel {
    padding: 18px 16px;
  }

  .hero-stat-grid,
  .filter-grid,
  .ticket-meta-grid,
  .thread-meta-cards {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    width: 100%;
  }

  .filter-actions .btn {
    flex: 1;
  }

  .ticket-item-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>