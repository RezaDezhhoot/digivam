<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppToast } from '../composables/useToast.js';
import { getBrokerConversations, getBrokerDealMessages, sendBrokerDealMessage } from '../services/broker-deal.api.js';

const route = useRoute();
const router = useRouter();
const toast = useAppToast();

const loading = ref(false);
const threadLoading = ref(false);
const sending = ref(false);
const conversations = ref([]);
const messages = ref([]);
const selectedDealId = ref(null);
const search = ref('');
const composer = ref('');
const messageListRef = ref(null);
const composerRef = ref(null);
const emojiOpen = ref(false);
const mobileThreadOpen = ref(false);
let conversationPollTimer = null;
let messagePollTimer = null;

const emojiList = ['\u{1F60A}','\u{1F602}','\u2764\uFE0F','\u{1F44D}','\u{1F64F}','\u{1F44F}','\u{1F389}','\u2705','\u274C','\u2B50','\u{1F525}','\u{1F4AF}','\u{1F60D}','\u{1F914}','\u{1F605}','\u{1F4AA}','\u{1F4CC}','\u{1F4CE}','\u23F3','\u{1F680}'];

const currentRouteDealId = computed(() => Number(route.params.dealId || 0) || null);
const selectedConversation = computed(() => conversations.value.find((i) => i.dealId === selectedDealId.value) || null);
const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((i) => [i.dealCode, i.facilityTitle, i.loanTypeTitle, i.customer?.name, i.customer?.phone, i.lastMessage?.body, i.lastMessage?.senderName].some((v) => String(v || '').toLowerCase().includes(q)));
});
const totalUnread = computed(() => conversations.value.reduce((s, i) => s + Number(i.unreadCount || 0), 0));
const formatNumber = (v) => new Intl.NumberFormat('fa-IR').format(Number(v || 0));

const scrollToBottom = async () => { await nextTick(); if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight; };

const syncRoute = async (dealId) => {
  if (dealId) { if (currentRouteDealId.value !== dealId) await router.replace({ name: 'broker-conversations', params: { dealId } }); return; }
  if (currentRouteDealId.value) await router.replace({ name: 'broker-conversations' });
};

const loadMessages = async ({ silent = false } = {}) => {
  if (!selectedDealId.value) { messages.value = []; return; }
  if (!silent) threadLoading.value = true;
  try {
    const data = await getBrokerDealMessages(selectedDealId.value);
    messages.value = Array.isArray(data.messages) ? data.messages : [];
    await scrollToBottom();
    await loadConversations({ silent: true, keepSelection: true });
  } catch (e) { if (!silent) toast.error(e.message || '\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F'); }
  finally { threadLoading.value = false; }
};

const selectConversation = async (dealId) => {
  selectedDealId.value = Number(dealId || 0) || null;
  mobileThreadOpen.value = true;
  await syncRoute(selectedDealId.value);
  await loadMessages();
};

const goBackToList = () => { mobileThreadOpen.value = false; };

const loadConversations = async ({ silent = false, keepSelection = true } = {}) => {
  if (!silent) loading.value = true;
  try {
    const data = await getBrokerConversations();
    conversations.value = Array.isArray(data.items) ? data.items : [];
    const ids = new Set(conversations.value.map((i) => i.dealId));
    const preferred = currentRouteDealId.value && ids.has(currentRouteDealId.value) ? currentRouteDealId.value : keepSelection && selectedDealId.value && ids.has(selectedDealId.value) ? selectedDealId.value : null;
    if (!preferred) { selectedDealId.value = null; messages.value = []; await syncRoute(null); return; }
    if (preferred !== selectedDealId.value) await selectConversation(preferred);
    else if (currentRouteDealId.value !== preferred) await syncRoute(preferred);
  } catch (e) { if (!silent) toast.error(e.message || '\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u06AF\u0641\u062A\u06AF\u0648\u0647\u0627 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F'); }
  finally { loading.value = false; }
};

const handleSend = async () => {
  const body = composer.value.trim();
  if (!selectedDealId.value || !body || sending.value) return;
  sending.value = true;
  try {
    const data = await sendBrokerDealMessage(selectedDealId.value, { body });
    if (data.message) { messages.value = [...messages.value, data.message]; composer.value = ''; await scrollToBottom(); await loadConversations({ silent: true, keepSelection: true }); window.dispatchEvent(new CustomEvent('broker-deal-updated')); }
  } catch (e) { toast.error(e.message || '\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F'); }
  finally { sending.value = false; }
};

const handleComposerKeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
const insertEmoji = (emoji) => { composer.value += emoji; emojiOpen.value = false; composerRef.value?.focus(); };
const openDealDetail = () => { if (selectedConversation.value?.dealId) router.push(`/deals/${selectedConversation.value.dealId}`); };

watch(currentRouteDealId, async (id) => { if (id && id !== selectedDealId.value && conversations.value.some((i) => i.dealId === id)) await selectConversation(id); });

onMounted(async () => {
  await loadConversations();
  conversationPollTimer = setInterval(() => loadConversations({ silent: true, keepSelection: true }), 15000);
  messagePollTimer = setInterval(() => loadMessages({ silent: true }), 8000);
});

onBeforeUnmount(() => { clearInterval(conversationPollTimer); clearInterval(messagePollTimer); });
</script>

<template>
  <div class="chat-page" :class="{ 'mobile-thread-open': mobileThreadOpen }">
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title"><i class="fa-solid fa-comments"></i> گفتگوها</h2>
        <div class="sidebar-stats">
          <span class="stat-chip">{{ formatNumber(conversations.length) }} گفتگو</span>
          <span v-if="totalUnread" class="stat-chip accent">{{ formatNumber(totalUnread) }} خوانده‌نشده</span>
        </div>
      </div>
      <div class="sidebar-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="search" type="text" placeholder="جستجو در گفتگوها..." />
      </div>
      <div class="sidebar-list">
        <div v-if="loading && !conversations.length" class="chat-empty-state"><i class="fa-solid fa-spinner fa-spin"></i><span>در حال بارگذاری...</span></div>
        <div v-else-if="!filteredConversations.length" class="chat-empty-state"><i class="fa-regular fa-comment-dots"></i><span>گفتگویی یافت نشد</span></div>
        <button v-for="c in filteredConversations" :key="c.dealId" type="button" class="conv-item" :class="{ active: c.dealId === selectedDealId, unread: c.unreadCount }" @click="selectConversation(c.dealId)">
          <div class="conv-avatar"><i class="fa-solid fa-file-contract"></i></div>
          <div class="conv-body">
            <div class="conv-top-row"><strong class="conv-name">{{ c.facilityTitle }}</strong><time class="conv-time">{{ c.lastActivityAtLabel || '' }}</time></div>
            <div class="conv-meta"><span class="conv-code">{{ c.dealCode }}</span><span v-if="c.loanTypeTitle" class="conv-loan">{{ c.loanTypeTitle }}</span></div>
            <p class="conv-preview">{{ c.lastMessage?.body || 'بدون پیام' }}</p>
            <div class="conv-footer"><span class="conv-customer">{{ c.customer?.name || 'مشتری' }}</span><span v-if="c.unreadCount" class="conv-badge">{{ formatNumber(c.unreadCount) }}</span></div>
          </div>
        </button>
      </div>
    </aside>

    <section class="chat-thread">
      <template v-if="selectedConversation">
        <header class="thread-header">
          <button type="button" class="thread-back-btn" @click="goBackToList"><i class="fa-solid fa-arrow-right"></i></button>
          <div class="thread-header-info">
            <div class="thread-header-top"><h3>{{ selectedConversation.facilityTitle }}</h3><span class="thread-code">{{ selectedConversation.dealCode }}</span></div>
            <p class="thread-header-sub">{{ selectedConversation.customer?.name || '-' }} &mdash; {{ selectedConversation.customer?.phone || '-' }}</p>
          </div>
          <button type="button" class="thread-action-btn" title="جزئیات معامله" @click="openDealDetail"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
        </header>
        <div ref="messageListRef" class="thread-messages">
          <div v-if="threadLoading && !messages.length" class="chat-empty-state"><i class="fa-solid fa-spinner fa-spin"></i><span>بارگذاری پیام‌ها...</span></div>
          <div v-else-if="!messages.length" class="chat-empty-state"><i class="fa-regular fa-comment-dots"></i><span>هنوز پیامی ثبت نشده</span></div>
          <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.senderType === 'broker' ? 'mine' : 'theirs'">
            <div class="msg-bubble">
              <div class="msg-header"><span class="msg-role" :class="`role-${msg.senderType}`">{{ msg.senderTypeLabel }}</span><span class="msg-sender">{{ msg.senderName }}</span></div>
              <p class="msg-body">{{ msg.body }}</p>
              <time class="msg-time">{{ msg.createdAtLabel }}</time>
            </div>
          </div>
        </div>
        <div class="thread-composer">
          <div class="composer-row">
            <div class="emoji-wrap">
              <button type="button" class="composer-icon-btn" @click="emojiOpen = !emojiOpen"><i class="fa-regular fa-face-smile"></i></button>
              <Transition name="emoji-pop"><div v-if="emojiOpen" class="emoji-picker" @mouseleave="emojiOpen = false"><button v-for="e in emojiList" :key="e" type="button" class="emoji-btn" @click="insertEmoji(e)">{{ e }}</button></div></Transition>
            </div>
            <textarea ref="composerRef" v-model="composer" rows="1" maxlength="2000" placeholder="پیام خود را بنویسید..." @keydown="handleComposerKeydown"></textarea>
            <button type="button" class="composer-send-btn" :disabled="!composer.trim() || sending" @click="handleSend"><i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i></button>
          </div>
        </div>
      </template>
      <div v-else class="chat-empty-state fill"><div class="empty-illustration"><i class="fa-regular fa-comments"></i></div><strong>گفتگویی انتخاب نشده</strong><span>یک مکالمه را از لیست سمت راست انتخاب کنید.</span></div>
    </section>
  </div>
</template>

<style scoped>
.chat-page { display: grid; grid-template-columns: 340px minmax(0,1fr); height: calc(100vh - 80px); gap: 0; border-radius: 24px; overflow: hidden; border: 1px solid var(--panel-border); background: var(--surface-color); box-shadow: var(--panel-shadow-lg); }

.chat-sidebar { display: flex; flex-direction: column; border-left: 1px solid var(--panel-border); background: var(--surface-color); overflow: hidden; }
.sidebar-header { padding: 18px 20px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sidebar-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--brand-text); display: flex; align-items: center; gap: 8px; }
.sidebar-title i { color: var(--brand-primary); }
.sidebar-stats { display: flex; gap: 6px; }
.stat-chip { padding: 3px 10px; border-radius: 999px; background: var(--surface-soft); color: var(--muted-text); font-size: .78rem; font-weight: 700; }
.stat-chip.accent { background: var(--chip-bg); color: var(--chip-text); }

.sidebar-search { margin: 0 16px 12px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: var(--surface-soft); border: 1px solid transparent; transition: border-color .2s; }
.sidebar-search:focus-within { border-color: var(--brand-primary); }
.sidebar-search i { color: var(--muted-text); font-size: 14px; }
.sidebar-search input { flex: 1; border: none; outline: none; background: transparent; color: var(--brand-text); font-size: .9rem; font-family: inherit; }
.sidebar-search input::placeholder { color: var(--muted-text); }

.sidebar-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 10px 10px; }
.sidebar-list::-webkit-scrollbar { width: 5px; }
.sidebar-list::-webkit-scrollbar-track { background: transparent; }
.sidebar-list::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 99px; }

.conv-item { width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1px solid transparent; background: transparent; text-align: right; cursor: pointer; transition: background .15s, border-color .15s; position: relative; }
.conv-item:hover { background: var(--surface-soft); }
.conv-item.active { background: var(--chip-bg); border-color: rgba(219,0,0,.15); }
.conv-item.unread::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 40%; border-radius: 0 4px 4px 0; background: var(--brand-primary); }
.conv-avatar { width: 46px; height: 46px; border-radius: 14px; background: var(--chip-bg); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.conv-body { flex: 1; min-width: 0; display: grid; gap: 3px; }
.conv-top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-name { font-size: .9rem; font-weight: 700; color: var(--brand-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-time { font-size: .74rem; color: var(--muted-text); white-space: nowrap; flex-shrink: 0; }
.conv-meta { display: flex; align-items: center; gap: 6px; font-size: .78rem; color: var(--muted-text); }
.conv-code { padding: 1px 7px; border-radius: 6px; background: var(--surface-soft); font-weight: 700; font-size: .72rem; }
.conv-loan { font-size: .72rem; }
.conv-preview { margin: 0; font-size: .84rem; color: var(--muted-text); line-height: 1.6; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.conv-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-customer { font-size: .78rem; color: var(--muted-text); }
.conv-badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--brand-primary); color: #fff; font-size: .72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.chat-thread { display: flex; flex-direction: column; overflow: hidden; background: var(--page-bg); }
.thread-header { padding: 14px 20px; display: flex; align-items: center; gap: 14px; background: var(--surface-color); border-bottom: 1px solid var(--panel-border); flex-shrink: 0; }
.thread-back-btn { display: none; width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--panel-border); background: var(--surface-soft); color: var(--brand-text); font-size: 16px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0; }
.thread-header-info { flex: 1; min-width: 0; }
.thread-header-top { display: flex; align-items: center; gap: 10px; }
.thread-header-top h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--brand-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-code { padding: 2px 8px; border-radius: 8px; background: var(--chip-bg); color: var(--chip-text); font-size: .74rem; font-weight: 800; flex-shrink: 0; }
.thread-header-sub { margin: 2px 0 0; font-size: .82rem; color: var(--muted-text); }
.thread-action-btn { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--panel-border); background: var(--surface-color); color: var(--brand-primary); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; flex-shrink: 0; }
.thread-action-btn:hover { background: var(--chip-bg); }

.thread-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.thread-messages::-webkit-scrollbar { width: 5px; }
.thread-messages::-webkit-scrollbar-track { background: transparent; }
.thread-messages::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 99px; }

.msg-row { display: flex; max-width: 72%; }
.msg-row.mine { align-self: flex-start; }
.msg-row.theirs { align-self: flex-end; }
.msg-bubble { padding: 10px 14px; border-radius: 18px; display: grid; gap: 4px; }
.msg-row.mine .msg-bubble { background: var(--surface-color); border: 1px solid var(--panel-border); border-bottom-right-radius: 6px; }
.msg-row.theirs .msg-bubble { background: var(--chip-bg); border: 1px solid rgba(219,0,0,.1); border-bottom-left-radius: 6px; }
.msg-header { display: flex; align-items: center; gap: 8px; }
.msg-role { padding: 1px 8px; border-radius: 6px; font-size: .7rem; font-weight: 800; }
.role-admin { background: rgba(34,197,94,.14); color: #16a34a; }
.role-broker { background: rgba(59,130,246,.14); color: #2563eb; }
.role-customer { background: rgba(249,115,22,.14); color: #ea580c; }
:root[data-theme='dark'] .role-admin { background: rgba(74,222,128,.16); color: #86efac; }
:root[data-theme='dark'] .role-broker { background: rgba(96,165,250,.16); color: #93bbfd; }
:root[data-theme='dark'] .role-customer { background: rgba(251,146,60,.16); color: #fdba74; }
.msg-sender { font-size: .82rem; font-weight: 700; color: var(--brand-text); }
.msg-body { margin: 0; font-size: .92rem; line-height: 1.85; color: var(--brand-text); white-space: pre-wrap; word-break: break-word; }
.msg-time { font-size: .72rem; color: var(--muted-text); text-align: left; }

.thread-composer { padding: 12px 20px 16px; background: var(--surface-color); border-top: 1px solid var(--panel-border); flex-shrink: 0; }
.composer-row { display: flex; align-items: flex-end; gap: 10px; padding: 8px 12px; border-radius: 20px; background: var(--surface-soft); border: 1px solid var(--panel-border); transition: border-color .2s; }
.composer-row:focus-within { border-color: var(--brand-primary); }
.composer-row textarea { flex: 1; border: none; outline: none; background: transparent; color: var(--brand-text); font-family: inherit; font-size: .92rem; resize: none; max-height: 120px; min-height: 24px; line-height: 1.7; padding: 4px 0; }
.composer-row textarea::placeholder { color: var(--muted-text); }
.composer-icon-btn { width: 36px; height: 36px; border-radius: 12px; border: none; background: transparent; color: var(--muted-text); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color .15s; flex-shrink: 0; }
.composer-icon-btn:hover { color: var(--brand-primary); }
.composer-send-btn { width: 40px; height: 40px; border-radius: 14px; border: none; background: var(--brand-primary); color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity .15s, transform .15s; flex-shrink: 0; }
.composer-send-btn:hover:not(:disabled) { transform: scale(1.06); }
.composer-send-btn:disabled { opacity: .4; cursor: not-allowed; }

.emoji-wrap { position: relative; }
.emoji-picker { position: absolute; bottom: calc(100% + 10px); right: 0; display: grid; grid-template-columns: repeat(5,1fr); gap: 4px; padding: 10px; border-radius: 16px; background: var(--surface-color); border: 1px solid var(--panel-border); box-shadow: var(--panel-shadow-lg); z-index: 20; }
.emoji-btn { width: 38px; height: 38px; border: none; background: transparent; border-radius: 10px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.emoji-btn:hover { background: var(--surface-soft); }
.emoji-pop-enter-active { transition: opacity .15s ease, transform .15s ease; }
.emoji-pop-leave-active { transition: opacity .1s ease, transform .1s ease; }
.emoji-pop-enter-from, .emoji-pop-leave-to { opacity: 0; transform: translateY(6px) scale(.96); }

.chat-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; color: var(--muted-text); text-align: center; font-size: .9rem; }
.chat-empty-state.fill { flex: 1; }
.empty-illustration { width: 80px; height: 80px; border-radius: 24px; background: var(--surface-soft); display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--muted-text); margin-bottom: 8px; }

@media (max-width: 991px) {
  .chat-page { grid-template-columns: 1fr; height: calc(100vh - 70px); border-radius: 0; border: none; box-shadow: none; }
  .chat-sidebar { border-left: none; }
  .chat-thread { position: fixed; inset: 0; z-index: 200; transform: translateX(-100%); transition: transform .28s cubic-bezier(.4,0,.2,1); }
  .chat-page.mobile-thread-open .chat-thread { transform: translateX(0); }
  .thread-back-btn { display: flex; }
  .msg-row { max-width: 88%; }
}
@media (max-width: 575px) {
  .sidebar-header { padding: 14px 16px 10px; }
  .sidebar-search { margin: 0 12px 10px; }
  .sidebar-list { padding: 0 6px 6px; }
  .conv-item { padding: 10px 12px; }
  .thread-header { padding: 12px 14px; }
  .thread-messages { padding: 14px; }
  .thread-composer { padding: 10px 14px 14px; }
}
</style>