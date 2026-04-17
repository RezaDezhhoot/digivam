<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { useAppToast } from '../composables/useToast.js';
import { getCustomerConversations, getDealMessages, sendDealMessage } from '../services/customer-panel.api.js';

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
let isAlive = true;

const currentRouteDealId = computed(() => Number(route.params.dealId || 0) || null);
const selectedConversation = computed(() => conversations.value.find((i) => i.dealId === selectedDealId.value) || null);
const filteredConversations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return conversations.value;
  return conversations.value.filter((i) => [i.dealCode, i.facilityTitle, i.loanTypeTitle, i.broker?.name, i.broker?.phone, i.lastMessage?.body, i.lastMessage?.senderName].some((v) => String(v || '').toLowerCase().includes(q)));
});
const totalUnread = computed(() => conversations.value.reduce((s, i) => s + Number(i.unreadCount || 0), 0));
const formatNumber = (v) => new Intl.NumberFormat('fa-IR').format(Number(v || 0));
const shellStats = computed(() => [
  { label: '\u06A9\u0644 \u06AF\u0641\u062A\u06AF\u0648\u0647\u0627', value: formatNumber(conversations.value.length) },
  { label: '\u062E\u0648\u0627\u0646\u062F\u0647 \u0646\u0634\u062F\u0647', value: formatNumber(totalUnread.value) },
  { label: '\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u0627\u0633\u062E', value: formatNumber(conversations.value.filter((i) => i.unreadCount).length) }
]);

const scrollToBottom = async () => { await nextTick(); if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight; };

const syncRoute = async (dealId) => {
  if (!isAlive) return;
  if (dealId) { if (currentRouteDealId.value !== dealId) await router.replace({ name: 'customer-conversations', params: { dealId } }); return; }
  if (currentRouteDealId.value) await router.replace({ name: 'customer-conversations' });
};

const loadMessages = async ({ silent = false } = {}) => {
  if (!isAlive || !selectedDealId.value) { messages.value = []; return; }
  if (!silent) threadLoading.value = true;
  try {
    const data = await getDealMessages(selectedDealId.value);
    messages.value = Array.isArray(data.messages) ? data.messages : [];
    await scrollToBottom();
    await loadConversations({ silent: true, keepSelection: true });
  } catch (e) { if (!silent) toast.error(e.message || '\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F'); }
  finally { threadLoading.value = false; }
};

const chatPageRef = ref(null);

const selectConversation = async (dealId) => {
  selectedDealId.value = Number(dealId || 0) || null;
  mobileThreadOpen.value = true;
  setMobileThreadClass(true);
  await syncRoute(selectedDealId.value);
  await loadMessages();
  await nextTick();
  chatPageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const setMobileThreadClass = (open) => {
  document.documentElement.classList.toggle('chat-thread-fullscreen', open);
};

const goBackToList = () => { mobileThreadOpen.value = false; setMobileThreadClass(false); };

const loadConversations = async ({ silent = false, keepSelection = true } = {}) => {
  if (!isAlive) return;
  if (!silent) loading.value = true;
  try {
    const data = await getCustomerConversations();
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
    const data = await sendDealMessage(selectedDealId.value, { body });
    if (data.message) { messages.value = [...messages.value, data.message]; composer.value = ''; await scrollToBottom(); await loadConversations({ silent: true, keepSelection: true }); window.dispatchEvent(new CustomEvent('customer-deal-updated')); }
  } catch (e) { toast.error(e.message || '\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0627\u0646\u062C\u0627\u0645 \u0646\u0634\u062F'); }
  finally { sending.value = false; }
};

const handleComposerKeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
const insertEmoji = (emoji) => { composer.value += emoji; emojiOpen.value = false; composerRef.value?.focus(); };
const openDealDetail = () => { if (selectedConversation.value?.dealId) router.push(`/customer/deals/${selectedConversation.value.dealId}`); };

watch(currentRouteDealId, async (id) => { if (id && id !== selectedDealId.value && conversations.value.some((i) => i.dealId === id)) await selectConversation(id); });

onMounted(async () => {
  await loadConversations();
  conversationPollTimer = setInterval(() => loadConversations({ silent: true, keepSelection: true }), 15000);
  messagePollTimer = setInterval(() => loadMessages({ silent: true }), 8000);
});

onBeforeUnmount(() => { isAlive = false; clearInterval(conversationPollTimer); clearInterval(messagePollTimer); setMobileThreadClass(false); });
</script>

<template>
  <section class="customer-conversations-view">
    <CustomerPanelShell kicker="گفتگوهای من" title="گفتگوهای معامله" description="پیام‌های مربوط به هر معامله را اینجا ببینید و پاسخ بدهید." :stats="shellStats">
      <div ref="chatPageRef" class="chat-page" :class="{ 'mobile-thread-open': mobileThreadOpen }">
        <aside class="chat-sidebar">
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
                <div class="conv-footer"><span class="conv-broker">{{ c.broker?.name || 'کارگزار' }}</span><span v-if="c.unreadCount" class="conv-badge">{{ formatNumber(c.unreadCount) }}</span></div>
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
                <p class="thread-header-sub">{{ selectedConversation.broker?.name || '-' }} &mdash; {{ selectedConversation.broker?.phone || '-' }}</p>
              </div>
              <button type="button" class="thread-action-btn" title="جزئیات معامله" @click="openDealDetail"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            </header>
            <div ref="messageListRef" class="thread-messages">
              <div v-if="threadLoading && !messages.length" class="chat-empty-state"><i class="fa-solid fa-spinner fa-spin"></i><span>بارگذاری پیام‌ها...</span></div>
              <div v-else-if="!messages.length" class="chat-empty-state"><i class="fa-regular fa-comment-dots"></i><span>هنوز پیامی ثبت نشده</span></div>
              <div v-for="msg in messages" :key="msg.id" class="msg-row" :class="msg.senderType === 'customer' ? 'mine' : 'theirs'">
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
    </CustomerPanelShell>
  </section>
</template>

<style scoped>
.customer-conversations-view { display: grid; }

.chat-page { display: grid; grid-template-columns: 320px minmax(0,1fr); height: calc(100vh - 240px); min-height: 500px; gap: 0; border-radius: 24px; overflow: hidden; border: 1px solid var(--web-border); background: var(--web-surface); box-shadow: var(--web-shadow); }

.chat-sidebar { display: flex; flex-direction: column; border-left: 1px solid var(--web-border); background: var(--web-surface); overflow: hidden; }
.sidebar-search { margin: 14px 14px 10px; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; background: var(--web-surface-soft); border: 1px solid transparent; transition: border-color .2s; }
.sidebar-search:focus-within { border-color: var(--web-primary); }
.sidebar-search i { color: var(--web-muted); font-size: 14px; }
.sidebar-search input { flex: 1; border: none; outline: none; background: transparent; color: var(--web-text); font-size: .9rem; font-family: inherit; }
.sidebar-search input::placeholder { color: var(--web-muted); }

.sidebar-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 8px 8px; }
.sidebar-list::-webkit-scrollbar { width: 5px; }
.sidebar-list::-webkit-scrollbar-track { background: transparent; }
.sidebar-list::-webkit-scrollbar-thumb { background: var(--web-border); border-radius: 99px; }

.conv-item { width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1px solid transparent; background: transparent; text-align: right; cursor: pointer; transition: background .15s, border-color .15s; position: relative; }
.conv-item:hover { background: var(--web-surface-soft); }
.conv-item.active { background: var(--web-primary-soft); border-color: rgba(155,0,0,.12); }
.conv-item.unread::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 40%; border-radius: 0 4px 4px 0; background: var(--web-primary); }
.conv-avatar { width: 44px; height: 44px; border-radius: 14px; background: var(--web-primary-soft); color: var(--web-primary); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.conv-body { flex: 1; min-width: 0; display: grid; gap: 3px; }
.conv-top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-name { font-size: .9rem; font-weight: 700; color: var(--web-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-time { font-size: .74rem; color: var(--web-muted); white-space: nowrap; flex-shrink: 0; }
.conv-meta { display: flex; align-items: center; gap: 6px; font-size: .78rem; color: var(--web-muted); }
.conv-code { padding: 1px 7px; border-radius: 6px; background: var(--web-surface-soft); font-weight: 700; font-size: .72rem; }
.conv-loan { font-size: .72rem; }
.conv-preview { margin: 0; font-size: .84rem; color: var(--web-muted); line-height: 1.6; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.conv-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.conv-broker { font-size: .78rem; color: var(--web-muted); }
.conv-badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--web-primary); color: #fff; font-size: .72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.chat-thread { display: flex; flex-direction: column; overflow: hidden; background: var(--web-surface-soft); }
.thread-header { padding: 14px 18px; display: flex; align-items: center; gap: 14px; background: var(--web-surface); border-bottom: 1px solid var(--web-border); flex-shrink: 0; }
.thread-back-btn { display: none; width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--web-border); background: var(--web-surface-soft); color: var(--web-text); font-size: 16px; cursor: pointer; align-items: center; justify-content: center; flex-shrink: 0; }
.thread-header-info { flex: 1; min-width: 0; }
.thread-header-top { display: flex; align-items: center; gap: 10px; }
.thread-header-top h3 { margin: 0; font-size: 1rem; font-weight: 800; color: var(--web-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-code { padding: 2px 8px; border-radius: 8px; background: var(--web-primary-soft); color: var(--web-primary); font-size: .74rem; font-weight: 800; flex-shrink: 0; }
.thread-header-sub { margin: 2px 0 0; font-size: .82rem; color: var(--web-muted); }
.thread-action-btn { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--web-border); background: var(--web-surface); color: var(--web-primary); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; flex-shrink: 0; }
.thread-action-btn:hover { background: var(--web-primary-soft); }

.thread-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.thread-messages::-webkit-scrollbar { width: 5px; }
.thread-messages::-webkit-scrollbar-track { background: transparent; }
.thread-messages::-webkit-scrollbar-thumb { background: var(--web-border); border-radius: 99px; }

.msg-row { display: flex; max-width: 72%; }
.msg-row.mine { align-self: flex-start; }
.msg-row.theirs { align-self: flex-end; }
.msg-bubble { padding: 10px 14px; border-radius: 18px; display: grid; gap: 4px; }
.msg-row.mine .msg-bubble { background: var(--web-surface); border: 1px solid var(--web-border); border-bottom-right-radius: 6px; }
.msg-row.theirs .msg-bubble { background: var(--web-primary-soft); border: 1px solid rgba(155,0,0,.1); border-bottom-left-radius: 6px; }
.msg-header { display: flex; align-items: center; gap: 8px; }
.msg-role { padding: 1px 8px; border-radius: 6px; font-size: .7rem; font-weight: 800; }
.role-customer { background: rgba(16,185,129,.14); color: #059669; }
.role-broker { background: rgba(59,130,246,.14); color: #2563eb; }
.role-admin { background: rgba(245,158,11,.14); color: #d97706; }
[data-theme='dark'] .role-customer { background: rgba(52,211,153,.16); color: #6ee7b7; }
[data-theme='dark'] .role-broker { background: rgba(96,165,250,.16); color: #93bbfd; }
[data-theme='dark'] .role-admin { background: rgba(251,191,36,.16); color: #fcd34d; }
.msg-sender { font-size: .82rem; font-weight: 700; color: var(--web-text); }
.msg-body { margin: 0; font-size: .92rem; line-height: 1.85; color: var(--web-text); white-space: pre-wrap; word-break: break-word; }
.msg-time { font-size: .72rem; color: var(--web-muted); text-align: left; }

.thread-composer { padding: 12px 18px 16px; background: var(--web-surface); border-top: 1px solid var(--web-border); flex-shrink: 0; }
.composer-row { display: flex; align-items: flex-end; gap: 10px; padding: 8px 12px; border-radius: 20px; background: var(--web-surface-soft); border: 1px solid var(--web-border); transition: border-color .2s; }
.composer-row:focus-within { border-color: var(--web-primary); }
.composer-row textarea { flex: 1; border: none; outline: none; background: transparent; color: var(--web-text); font-family: inherit; font-size: .92rem; resize: none; max-height: 120px; min-height: 24px; line-height: 1.7; padding: 4px 0; }
.composer-row textarea::placeholder { color: var(--web-muted); }
.composer-icon-btn { width: 36px; height: 36px; border-radius: 12px; border: none; background: transparent; color: var(--web-muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color .15s; flex-shrink: 0; }
.composer-icon-btn:hover { color: var(--web-primary); }
.composer-send-btn { width: 40px; height: 40px; border-radius: 14px; border: none; background: var(--web-primary); color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity .15s, transform .15s; flex-shrink: 0; }
.composer-send-btn:hover:not(:disabled) { transform: scale(1.06); }
.composer-send-btn:disabled { opacity: .4; cursor: not-allowed; }

.emoji-wrap { position: relative; }
.emoji-picker { position: absolute; bottom: calc(100% + 10px); right: 0; display: grid; grid-template-columns: repeat(5,1fr); gap: 4px; padding: 10px; border-radius: 16px; background: var(--web-surface); border: 1px solid var(--web-border); box-shadow: var(--web-shadow-lg); z-index: 20; }
.emoji-btn { width: 38px; height: 38px; border: none; background: transparent; border-radius: 10px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .12s; }
.emoji-btn:hover { background: var(--web-surface-soft); }
.emoji-pop-enter-active { transition: opacity .15s ease, transform .15s ease; }
.emoji-pop-leave-active { transition: opacity .1s ease, transform .1s ease; }
.emoji-pop-enter-from, .emoji-pop-leave-to { opacity: 0; transform: translateY(6px) scale(.96); }

.chat-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 40px 20px; color: var(--web-muted); text-align: center; font-size: .9rem; }
.chat-empty-state.fill { flex: 1; }
.empty-illustration { width: 80px; height: 80px; border-radius: 24px; background: var(--web-surface-soft); display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--web-muted); margin-bottom: 8px; }

@media (max-width: 991px) {
  .chat-page { grid-template-columns: 1fr; height: calc(100vh - 200px); border-radius: 0; border: none; box-shadow: none; }
  .chat-sidebar { border-left: none; }
  .chat-thread { position: fixed; inset: 0; z-index: 9999; transform: translateX(-100%); transition: transform .28s cubic-bezier(.4,0,.2,1); }
  .chat-page.mobile-thread-open .chat-thread { transform: translateX(0); }
  .thread-back-btn { display: flex; }
  .msg-row { max-width: 88%; }
}
@media (max-width: 575px) {
  .sidebar-search { margin: 10px 10px 8px; }
  .sidebar-list { padding: 0 6px 6px; }
  .conv-item { padding: 10px 12px; }
  .thread-header { padding: 12px 14px; }
  .thread-messages { padding: 14px; }
  .thread-composer { padding: 10px 14px 14px; }
}
</style>

<style>
@media (max-width: 991px) {
  html.chat-thread-fullscreen .mobile-quick-nav,
  html.chat-thread-fullscreen .floating-deals-cta,
  html.chat-thread-fullscreen .site-header { display: none !important; }
  html.chat-thread-fullscreen .customer-shell-layout { z-index: 9998 !important; }
}
</style>