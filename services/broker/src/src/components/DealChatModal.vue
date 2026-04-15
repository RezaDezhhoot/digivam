<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  dealId: { type: [Number, String], required: true },
  currentSenderType: { type: String, required: true },
  getMessages: { type: Function, required: true },
  sendMessage: { type: Function, required: true }
});

const emit = defineEmits(['close']);

const messages = ref([]);
const body = ref('');
const loading = ref(false);
const sending = ref(false);
const scrollRef = ref(null);
const inputRef = ref(null);
const showPicker = ref(false);
let pollTimer = null;

const EMOJIS = ['😀','😂','😍','😎','👍','❤️','🔥','🎉','✅','⭐','💬','🙏','😊','🤝','👋','😢','😡','🤔','💪','📎'];

const loadMessages = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true;
  try {
    const data = await props.getMessages(props.dealId);
    messages.value = data.messages || [];
    await nextTick();
    scrollToBottom();
  } catch {
    // silent
  } finally {
    loading.value = false;
  }
};

const handleSend = async () => {
  const text = body.value.trim();
  if (!text || sending.value) return;

  sending.value = true;
  try {
    const data = await props.sendMessage(props.dealId, { body: text });
    if (data.message) {
      messages.value = [...messages.value, data.message];
    }
    body.value = '';
    showPicker.value = false;
    await nextTick();
    scrollToBottom();
    inputRef.value?.focus();
  } catch {
    // silent
  } finally {
    sending.value = false;
  }
};

const insertEmoji = (emoji) => {
  body.value += emoji;
  inputRef.value?.focus();
};

const scrollToBottom = () => {
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
};

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const startPolling = () => {
  pollTimer = setInterval(() => loadMessages({ silent: true }), 8000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

watch(() => props.dealId, () => {
  loadMessages();
});

onMounted(() => {
  loadMessages();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <teleport to="body">
    <transition name="chat-overlay-fade">
      <div class="deal-chat-overlay" @click.self="emit('close')">
        <div class="deal-chat-frame">
          <div class="chat-header">
            <button class="chat-close-btn" @click="emit('close')">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <span class="chat-header-title">
              <i class="fa-solid fa-comments me-2"></i>
              گفتگوی معامله
            </span>
          </div>

          <div ref="scrollRef" class="chat-body">
            <div v-if="loading && !messages.length" class="chat-loading">
              <i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...
            </div>
            <div v-if="!loading && !messages.length" class="chat-empty">
              <i class="fa-regular fa-comments"></i>
              <p>هنوز پیامی ارسال نشده است</p>
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="chat-bubble-row"
              :class="{ 'is-mine': msg.senderType === currentSenderType, 'is-other': msg.senderType !== currentSenderType }"
            >
              <div class="chat-bubble">
                <div class="chat-sender-name">
                  <span class="sender-badge" :class="`sender-${msg.senderType}`">{{ msg.senderTypeLabel }}</span>
                  <span class="sender-name-text">{{ msg.senderName }}</span>
                </div>
                <p class="chat-text">{{ msg.body }}</p>
                <span class="chat-time">{{ msg.createdAtLabel }}</span>
              </div>
            </div>
          </div>

          <div class="chat-footer">
            <div v-if="showPicker" class="emoji-picker-row">
              <button
                v-for="emoji in EMOJIS"
                :key="emoji"
                type="button"
                class="emoji-btn"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
            <div class="chat-input-row">
              <button type="button" class="emoji-toggle-btn" @click="showPicker = !showPicker">
                <i class="fa-regular fa-face-smile"></i>
              </button>
              <textarea
                ref="inputRef"
                v-model="body"
                class="chat-input"
                rows="1"
                placeholder="پیام خود را بنویسید..."
                maxlength="2000"
                @keydown="handleKeydown"
              ></textarea>
              <button
                type="button"
                class="chat-send-btn"
                :disabled="!body.trim() || sending"
                @click="handleSend"
              >
                <i :class="sending ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped src="./styles/DealChatModal.css"></style>
