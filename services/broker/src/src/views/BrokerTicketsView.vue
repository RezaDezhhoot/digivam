<script setup>
import { onMounted, ref } from 'vue';
import {
  createBrokerTicket,
  getBrokerTicketThread,
  getBrokerTickets,
  replyBrokerTicket
} from '../services/broker-ticket.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const items = ref([]);
const listLoading = ref(false);
const threadLoading = ref(false);
const submitLoading = ref(false);
const replyLoading = ref(false);
const selectedId = ref(null);
const statusFilter = ref('');
const thread = ref({ ticket: null, messages: [] });
const createForm = ref({ subject: '', body: '' });
const replyBody = ref('');

const statusIcons = { pending: 'fa-solid fa-clock', answered: 'fa-solid fa-circle-check', closed: 'fa-solid fa-circle-xmark' };

const formatDate = (value) => value ? new Date(value).toLocaleString('fa-IR') : '-';

const loadThread = async (id) => {
  if (!id) { thread.value = { ticket: null, messages: [] }; return; }
  threadLoading.value = true;
  try {
    const data = await getBrokerTicketThread(id);
    thread.value = data;
  } catch (error) { toast.error(error.message); }
  finally { threadLoading.value = false; }
};

const loadTickets = async () => {
  listLoading.value = true;
  try {
    const query = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : '';
    const data = await getBrokerTickets(query);
    items.value = data.items;
    if (!items.value.length) { selectedId.value = null; thread.value = { ticket: null, messages: [] }; return; }
    if (!selectedId.value || !items.value.some((item) => item.id === selectedId.value)) selectedId.value = items.value[0].id;
    await loadThread(selectedId.value);
  } catch (error) { toast.error(error.message); }
  finally { listLoading.value = false; }
};

const submitTicket = async () => {
  submitLoading.value = true;
  try {
    const data = await createBrokerTicket(createForm.value);
    createForm.value = { subject: '', body: '' };
    selectedId.value = data.ticket.id;
    thread.value = { ticket: data.ticket, messages: data.messages };
    toast.success('تیکت با موفقیت ثبت شد');
    await loadTickets();
  } catch (error) { toast.error(error.message); }
  finally { submitLoading.value = false; }
};

const selectTicket = async (id) => { selectedId.value = id; replyBody.value = ''; await loadThread(id); };

const submitReply = async () => {
  if (!selectedId.value) return;
  replyLoading.value = true;
  try {
    const data = await replyBrokerTicket(selectedId.value, { body: replyBody.value });
    thread.value = { ticket: data.ticket, messages: data.messages };
    replyBody.value = '';
    toast.success('پاسخ ارسال شد');
    await loadTickets();
  } catch (error) { toast.error(error.message); }
  finally { replyLoading.value = false; }
};

onMounted(loadTickets);
</script>

<template>
  <div class="animate-in">
    <!-- Header -->
    <div class="page-header mb-3">
      <div class="page-header-icon"><i class="fa-solid fa-headset"></i></div>
      <div>
        <h1 class="page-header-title">پشتیبانی کارگزار</h1>
        <p class="page-header-desc">سوال یا مشکل خود را ثبت کنید و پاسخ‌ها را دنبال کنید.</p>
      </div>
    </div>

    <!-- Create Ticket -->
    <section class="content-card mb-3">
      <h2 class="card-section-title"><i class="fa-solid fa-pen-to-square me-2"></i>ثبت تیکت جدید</h2>
      <div class="row g-2">
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-required">موضوع تیکت</label>
          <input v-model="createForm.subject" class="form-control" placeholder="موضوع تیکت" maxlength="100" />
        </div>
        <div class="col-12 col-lg-8">
          <label class="form-label form-label-required">متن تیکت</label>
          <textarea v-model="createForm.body" class="form-control" rows="2" placeholder="متن تیکت را بنویسید"></textarea>
        </div>
        <div class="col-12 d-flex justify-content-end gap-2">
          <select v-model="statusFilter" class="form-select w-auto" @change="loadTickets">
            <option value="">همه وضعیت ها</option>
            <option value="pending">در انتظار پاسخ</option>
            <option value="answered">پاسخ داده شده</option>
            <option value="closed">بسته شده</option>
          </select>
          <button class="btn btn-primary" :disabled="submitLoading" @click="submitTicket">
            <i v-if="submitLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-paper-plane me-1"></i>
            ثبت تیکت
          </button>
        </div>
      </div>
    </section>

    <!-- Ticket List + Thread -->
    <div class="row g-3">
      <div class="col-12 col-xl-4">
        <section class="content-card ticket-list-panel">
          <div v-if="listLoading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i></div>
          <div v-else-if="!items.length" class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <p>هنوز تیکتی ثبت نکرده‌اید.</p>
          </div>
          <template v-else>
            <button
              v-for="item in items"
              :key="item.id"
              type="button"
              class="ticket-list-item"
              :class="{ active: selectedId === item.id }"
              @click="selectTicket(item.id)"
            >
              <div class="d-flex justify-content-between gap-2 align-items-start mb-2">
                <span class="status-chip">
                  <i :class="statusIcons[item.status] || 'fa-solid fa-circle-question'" class="me-1"></i>
                  {{ item.statusLabel }}
                </span>
                <small class="text-muted">{{ formatDate(item.updatedAt) }}</small>
              </div>
              <div class="fw-bold mb-1">{{ item.subject }}</div>
              <div class="small text-muted">{{ item.senderPhone }}</div>
            </button>
          </template>
        </section>
      </div>

      <div class="col-12 col-xl-8">
        <section class="content-card ticket-thread-panel">
          <div v-if="threadLoading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i></div>
          <div v-else-if="!thread.ticket" class="empty-state">
            <i class="fa-solid fa-comments"></i>
            <p>برای مشاهده جزئیات، یک تیکت را انتخاب کنید.</p>
          </div>
          <template v-else>
            <div class="thread-header">
              <div>
                <h2 class="thread-subject">{{ thread.ticket.subject }}</h2>
                <p class="text-muted mb-0"><i :class="statusIcons[thread.ticket.status]" class="me-1"></i> {{ thread.ticket.statusLabel }}</p>
              </div>
            </div>

            <div class="ticket-messages">
              <div
                v-for="message in thread.messages"
                :key="message.id"
                class="msg-bubble"
                :class="message.admin ? 'msg-admin' : 'msg-user'"
              >
                <div class="msg-header">
                  <strong><i :class="message.admin ? 'fa-solid fa-user-shield' : 'fa-solid fa-user'" class="me-1"></i>{{ message.senderTypeLabel === 'ادمین' ? 'پشتیبانی' : 'شما' }}</strong>
                  <small class="text-muted">{{ formatDate(message.createdAt) }}</small>
                </div>
                <p class="mb-0">{{ message.body }}</p>
              </div>
            </div>

            <div class="reply-box mt-3">
              <label class="form-label form-label-required"><i class="fa-solid fa-reply me-1"></i> پاسخ شما</label>
              <textarea v-model="replyBody" class="form-control mb-3" rows="3" placeholder="در صورت نیاز پاسخ خود را بنویسید"></textarea>
              <div class="d-flex justify-content-end">
                <button class="btn btn-primary" :disabled="replyLoading" @click="submitReply">
                  <i v-if="replyLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                  <i v-else class="fa-solid fa-paper-plane me-1"></i>
                  ارسال پاسخ
                </button>
              </div>
            </div>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex; align-items: center; gap: 14px;
  background: var(--surface-color); border: 1px solid var(--panel-border);
  border-radius: 14px; padding: 18px 20px; box-shadow: var(--panel-shadow);
}
.page-header-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--chip-bg); color: var(--brand-primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.page-header-title { font-size: 17px; font-weight: 700; margin: 0; }
.page-header-desc { font-size: 13px; color: var(--muted-text); margin: 2px 0 0; }

.content-card {
  background: var(--surface-color); border: 1px solid var(--panel-border);
  border-radius: 14px; padding: 20px; box-shadow: var(--panel-shadow);
  position: relative;
}
.card-section-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }

.ticket-list-panel, .ticket-thread-panel { min-height: 480px; }

.empty-state { text-align: center; padding: 40px 16px; color: var(--muted-text); }
.empty-state i { font-size: 36px; opacity: 0.3; margin-bottom: 12px; display: block; }
.empty-state p { margin: 0; font-size: 14px; }

.ticket-list-item {
  width: 100%; text-align: right;
  border: 1px solid var(--panel-border); border-radius: 12px;
  padding: 14px 16px; margin-bottom: 10px;
  background: var(--surface-soft); color: var(--brand-text);
  cursor: pointer; transition: all 0.15s ease;
}
.ticket-list-item:hover { border-color: var(--brand-primary); }
.ticket-list-item.active { border-color: var(--brand-primary); background: rgba(219,0,0,0.06); }

.status-chip {
  display: inline-flex; align-items: center;
  padding: 4px 10px; border-radius: 999px;
  background: var(--chip-bg); color: var(--chip-text);
  font-size: 12px; font-weight: 700;
}

.thread-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 14px; margin-bottom: 18px; padding-bottom: 14px;
  border-bottom: 1px solid var(--panel-border);
}
.thread-subject { font-size: 16px; font-weight: 700; margin-bottom: 4px; }

.ticket-messages {
  display: flex; flex-direction: column; gap: 12px;
  max-height: 420px; overflow-y: auto; padding-left: 4px;
}

.msg-bubble { border-radius: 14px; padding: 16px; max-width: 85%; }
.msg-header { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.msg-user { align-self: flex-start; background: var(--surface-soft); border: 1px solid var(--panel-border); }
.msg-admin { align-self: flex-end; background: rgba(219,0,0,0.06); border: 1px solid rgba(219,0,0,0.15); }

.reply-box { border-top: 1px solid var(--panel-border); padding-top: 16px; }

@media (max-width: 991px) {
  .thread-header { flex-direction: column; }
  .msg-bubble { max-width: 100%; }
}
</style>