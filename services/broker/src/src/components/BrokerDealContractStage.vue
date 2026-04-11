<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { requestBrokerDealContractOtp, signBrokerDealContract } from '../services/broker-deal.api.js';

const props = defineProps({
  deal: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['updated']);

const signatureMode = ref(false);
const otpOpen = ref(false);
const otpCode = ref('');
const feedbackText = ref('');
const feedbackTone = ref('info');
const busy = ref(false);
const resendIn = ref(0);
const previewOpen = ref(false);
const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const emptySignature = ref(true);

let timerId = null;
let drawing = false;
let lastPoint = null;
let resizeFrameId = null;

const contractKey = computed(() => `${props.deal?.id}-${props.deal?.contractSignedByCustomer}-${props.deal?.contractSignedByBroker}`);

const stopTimer = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const startTimer = (seconds) => {
  stopTimer();
  resendIn.value = Number(seconds || 0);
  if (resendIn.value <= 0) {
    return;
  }

  timerId = window.setInterval(() => {
    resendIn.value -= 1;
    if (resendIn.value <= 0) {
      stopTimer();
    }
  }, 1000);
};

const setFeedback = (message, tone = 'info') => {
  feedbackText.value = String(message || '').trim();
  feedbackTone.value = tone;
};

const resolveCanvasWidth = (wrap, minWidth) => {
  const styles = window.getComputedStyle(wrap);
  const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight || '0') || 0;
  return Math.max(Math.floor(wrap.clientWidth - paddingLeft - paddingRight), minWidth);
};

const setupCanvas = () => {
  const canvas = canvasRef.value;
  const wrap = canvasWrapRef.value;
  if (!canvas || !wrap) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const width = resolveCanvasWidth(wrap, 300);
  const height = window.innerWidth < 768 ? 240 : 310;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext('2d');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(ratio, ratio);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#111111';
  context.lineWidth = 2.4;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  emptySignature.value = true;
};

const scheduleCanvasSetup = () => {
  if (resizeFrameId) {
    cancelAnimationFrame(resizeFrameId);
  }

  resizeFrameId = window.requestAnimationFrame(() => {
    setupCanvas();
  });
};

const clearCanvas = () => {
  const canvas = canvasRef.value;
  const context = canvas?.getContext('2d');

  if (!canvas || !context) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  emptySignature.value = true;
};

const getPoint = (event) => {
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

const startDraw = (event) => {
  canvasRef.value?.setPointerCapture(event.pointerId);
  drawing = true;
  lastPoint = getPoint(event);
};

const moveDraw = (event) => {
  if (!drawing || !lastPoint) {
    return;
  }

  const point = getPoint(event);
  const context = canvasRef.value?.getContext('2d');
  if (!point || !context) {
    return;
  }

  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  lastPoint = point;
  emptySignature.value = false;
};

const endDraw = (event) => {
  if (canvasRef.value) {
    try {
      canvasRef.value.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }
  }

  drawing = false;
  lastPoint = null;
};

const currentSignature = () => (emptySignature.value ? '' : canvasRef.value?.toDataURL('image/png') || '');

const openPreview = () => {
  if (!props.deal?.contractData) {
    return;
  }

  previewOpen.value = true;
};

const createPdfExportNode = () => {
  const html = props.deal?.contractData || '';
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.right = '0';
  wrapper.style.bottom = '0';
  wrapper.style.width = '1024px';
  wrapper.style.opacity = '0.01';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-1';
  wrapper.setAttribute('aria-hidden', 'true');

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const styles = doc.querySelectorAll('style');
  styles.forEach((style) => {
    const clonedStyle = document.createElement('style');
    clonedStyle.textContent = style.textContent;
    wrapper.appendChild(clonedStyle);
  });

  const bodyContent = doc.body?.innerHTML || html;
  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = bodyContent;
  wrapper.appendChild(bodyDiv);

  document.body.appendChild(wrapper);
  return { wrapper, exportNode: bodyDiv.querySelector('.deal-contract-wrap') || bodyDiv };
};

const waitForPdfImages = async (container) => {
  const images = Array.from(container.querySelectorAll('img') || []);
  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        })
    )
  );
};

const downloadContract = async () => {
  if (!props.deal?.contractData) {
    return;
  }

  busy.value = true;
  let container = null;

  try {
    const module = await import('html2pdf.js');
    const html2pdf = module.default || module;
    const { wrapper, exportNode } = createPdfExportNode();
    container = wrapper;
    await waitForPdfImages(wrapper);

    await html2pdf()
      .set({
        margin: [0, 0, 0, 0],
        filename: `broker-deal-contract-${props.deal.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(exportNode)
      .save();

    setFeedback('نسخه PDF قرارداد دانلود شد.', 'success');
  } catch (error) {
    setFeedback(error?.message || 'دانلود PDF قرارداد با خطا مواجه شد.', 'error');
  } finally {
    container?.remove();
    busy.value = false;
  }
};

const openSignatureMode = async () => {
  signatureMode.value = true;
  await nextTick();
  setupCanvas();
};

const requestOtp = async () => {
  if (!props.deal?.canBrokerSignContract) {
    return;
  }

  if (!currentSignature()) {
    setFeedback('ابتدا امضای کارگزار را رسم کنید.', 'error');
    return;
  }

  busy.value = true;
  try {
    const data = await requestBrokerDealContractOtp(props.deal.id);
    otpOpen.value = true;
    startTimer(data.resendIn);
    setFeedback(data.message || 'کد تایید ارسال شد.', 'success');
  } catch (error) {
    if (error.status === 409) {
      otpOpen.value = true;
      startTimer(error.data?.resendIn || 0);
      setFeedback(error.message || 'کد تایید قبلا ارسال شده است.', 'info');
    } else {
      setFeedback(error.message || 'ارسال کد تایید با خطا مواجه شد.', 'error');
    }
  } finally {
    busy.value = false;
  }
};

const resendOtp = async () => {
  if (resendIn.value > 0 || busy.value) {
    return;
  }

  await requestOtp();
};

const submitSignature = async () => {
  if (!otpCode.value.trim()) {
    setFeedback('کد تایید را وارد کنید.', 'error');
    return;
  }

  const signature = currentSignature();
  if (!signature) {
    setFeedback('امضا خالی است.', 'error');
    return;
  }

  busy.value = true;
  try {
    const data = await signBrokerDealContract(props.deal.id, {
      code: otpCode.value.trim(),
      signature
    });
    emit('updated', data.item);
    otpOpen.value = false;
    signatureMode.value = false;
    otpCode.value = '';
    stopTimer();
    setFeedback(data.message || 'امضای کارگزار ثبت شد.', 'success');
  } catch (error) {
    setFeedback(error.message || 'ثبت امضا با خطا مواجه شد.', 'error');
  } finally {
    busy.value = false;
  }
};

watch(
  () => props.deal?.id,
  () => {
    signatureMode.value = false;
    otpOpen.value = false;
    previewOpen.value = false;
    otpCode.value = '';
    stopTimer();
    setFeedback('', 'info');
  }
);

watch(signatureMode, async (value) => {
  if (value) {
    await nextTick();
    setupCanvas();
  }
});

window.addEventListener('resize', scheduleCanvasSetup);

onBeforeUnmount(() => {
  stopTimer();
  window.removeEventListener('resize', scheduleCanvasSetup);
  if (resizeFrameId) {
    cancelAnimationFrame(resizeFrameId);
  }
});
</script>

<template>
  <section class="contract-stage-card mt-3">
    <div class="contract-stage-head">
      <div>
        <span class="contract-kicker">مرحله قرارداد</span>
        <h3 class="section-title mb-1">بررسی و امضای قرارداد</h3>
        <p class="section-subtitle mb-0">
          {{ deal.contractFullySigned ? 'هر دو طرف قرارداد را امضا کرده‌اند و مرحله پرداخت فعال شده است.' : 'پس از بررسی روش‌های پرداخت و متن قرارداد، امضای کارگزار با تایید OTP ثبت می‌شود.' }}
        </p>
      </div>
      <span class="status-pill" :class="deal.contractFullySigned ? 'status-pill-done' : 'status-pill-pending'">
        {{ deal.contractFullySigned ? 'قرارداد کامل شد' : 'در انتظار امضا' }}
      </span>
    </div>

    <div v-if="feedbackText" class="contract-feedback" :class="`tone-${feedbackTone}`">{{ feedbackText }}</div>

    <div class="contract-sign-status-grid">
      <div class="contract-sign-status-card" :class="deal.contractSignedByCustomer ? 'done' : ''">
        <strong>امضای مشتری</strong>
        <span>{{ deal.contractSignedByCustomer ? 'ثبت شده' : 'در انتظار' }}</span>
      </div>
      <div class="contract-sign-status-card" :class="deal.contractSignedByBroker ? 'done' : ''">
        <strong>امضای کارگزار</strong>
        <span>{{ deal.contractSignedByBroker ? 'ثبت شده' : 'در انتظار' }}</span>
      </div>
    </div>

    <div class="contract-payment-grid">
      <article v-for="item in deal.paymentTypes || []" :key="item.id || item.paymentType" class="contract-payment-card">
        <div class="contract-payment-title-row">
          <strong>{{ item.paymentTypeLabel }}</strong>
          <span>{{ item.amount }} تومان</span>
        </div>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div v-if="!signatureMode" class="contract-content-grid">
      <div class="contract-actions-col">
        <button type="button" class="btn btn-outline-secondary" :disabled="!deal.contractData" @click="openPreview">مشاهده کامل قرارداد</button>
        <button type="button" class="btn btn-outline-secondary" :disabled="!deal.contractData || busy" @click="downloadContract">
          {{ busy ? 'در حال آماده‌سازی PDF...' : 'دانلود PDF قرارداد' }}
        </button>
        <button v-if="deal.canBrokerSignContract" type="button" class="btn btn-primary" @click="openSignatureMode">امضای قرارداد توسط کارگزار</button>
        <span v-else class="contract-muted-note">{{ deal.contractSignedByBroker ? 'امضای کارگزار قبلا ثبت شده است.' : 'در این مرحله فعلا امضای کارگزار فعال نیست.' }}</span>
      </div>

      <div class="contract-preview-shell contract-preview-shell--inline">
        <iframe v-if="deal.contractData" :key="contractKey" class="contract-preview-frame" :srcdoc="deal.contractData"></iframe>
        <div v-else class="contract-preview-empty">قرارداد هنوز آماده نشده است.</div>
      </div>
    </div>

    <div v-else class="signature-stage-shell">
      <div class="signature-stage-head">
        <div>
          <h4>امضای کارگزار</h4>
          <p>امضا را در کادر سفید رسم کنید و سپس کد OTP را تایید نمایید.</p>
        </div>
        <button type="button" class="btn btn-outline-secondary" @click="signatureMode = false">بازگشت</button>
      </div>

      <div ref="canvasWrapRef" class="signature-canvas-wrap">
        <canvas
          ref="canvasRef"
          class="signature-canvas"
          @pointerdown="startDraw"
          @pointermove="moveDraw"
          @pointerup="endDraw"
          @pointerleave="endDraw"
          @pointercancel="endDraw"
        ></canvas>
      </div>

      <div class="signature-action-row">
        <button type="button" class="btn btn-outline-secondary" @click="clearCanvas">پاک کردن</button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="requestOtp">
          {{ busy ? 'در حال ارسال...' : 'ثبت امضا و دریافت کد' }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="contract-modal-fade">
        <div v-if="previewOpen" class="contract-preview-overlay" @click.self="previewOpen = false">
          <div class="contract-preview-modal">
            <div class="contract-preview-modal-head">
              <div>
                <span class="contract-kicker">پیش‌نمایش کامل قرارداد</span>
                <h4>نمایش تمام‌صفحه قرارداد</h4>
                <p>قرارداد را در ابعاد کامل مرور کنید و در صورت نیاز PDF بگیرید.</p>
              </div>
              <div class="contract-preview-modal-actions">
                <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="downloadContract">دانلود PDF</button>
                <button type="button" class="contract-otp-close" @click="previewOpen = false">×</button>
              </div>
            </div>

            <div class="contract-preview-shell contract-preview-shell--fullscreen">
              <iframe v-if="deal.contractData" :key="'fs-' + contractKey" class="contract-preview-frame contract-preview-frame--fullscreen" :srcdoc="deal.contractData"></iframe>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="contract-modal-fade">
        <div v-if="otpOpen" class="contract-otp-overlay" @click.self="otpOpen = false">
          <div class="contract-otp-modal">
            <div class="contract-otp-head">
              <div>
                <span class="contract-kicker">OTP قرارداد</span>
                <h4>کد تایید امضای قرارداد</h4>
                <p>اگر پیامک قبلا ارسال شده باشد، مستقیم همین فرم نمایش داده می‌شود.</p>
              </div>
              <button type="button" class="contract-otp-close" @click="otpOpen = false">×</button>
            </div>

            <input v-model="otpCode" class="form-control form-control-lg" dir="ltr" inputmode="numeric" maxlength="6" placeholder="1234" />

            <div class="signature-action-row">
              <button type="button" class="btn btn-outline-secondary" :disabled="busy || resendIn > 0" @click="resendOtp">
                {{ resendIn > 0 ? `ارسال مجدد تا ${resendIn} ثانیه` : 'ارسال مجدد کد' }}
              </button>
              <button type="button" class="btn btn-primary" :disabled="busy" @click="submitSignature">
                {{ busy ? 'در حال ثبت...' : 'تایید و ثبت امضا' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.contract-stage-card {
  padding: 18px;
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--surface-color) 0%, var(--surface-soft) 100%);
  box-shadow: var(--panel-shadow);
}

.contract-stage-head,
.contract-payment-title-row,
.signature-stage-head,
.contract-otp-head,
.signature-action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.contract-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(219, 0, 0, 0.08);
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 10px;
}

.contract-feedback {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
}

.contract-feedback.tone-success {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.contract-feedback.tone-error {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.contract-feedback.tone-info {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.status-pill-pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-pill-done {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
}

.contract-sign-status-grid,
.contract-payment-grid,
.contract-content-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.contract-sign-status-grid,
.contract-payment-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.contract-content-grid {
  grid-template-columns: 1fr;
  align-items: start;
}

.contract-sign-status-card,
.contract-payment-card,
.signature-canvas-wrap,
.contract-preview-shell {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--surface-color);
}

.contract-sign-status-card,
.contract-payment-card {
  padding: 14px;
  display: grid;
  gap: 8px;
}

.contract-sign-status-card.done {
  border-color: rgba(34, 197, 94, 0.24);
  background: rgba(34, 197, 94, 0.08);
}

.contract-sign-status-card strong,
.contract-payment-title-row strong {
  font-size: 14px;
  font-weight: 800;
}

.contract-sign-status-card span,
.contract-payment-title-row span,
.contract-muted-note {
  font-size: 12px;
  color: var(--muted-text);
}

.contract-payment-card p {
  margin: 0;
  color: var(--muted-text);
  font-size: 12px;
  line-height: 1.9;
}

.contract-actions-col {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.contract-preview-shell {
  padding: 8px;
  min-height: 620px;
}

.contract-preview-shell--inline {
  width: 100%;
}

.contract-preview-frame {
  width: 100%;
  min-height: 604px;
  border: 0;
  border-radius: 14px;
  background: #fff;
}

.contract-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(12px);
}

.contract-preview-modal {
  width: min(100%, 1460px);
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  border-radius: 26px;
  background:
    radial-gradient(circle at top left, rgba(219, 0, 0, 0.08), transparent 32%),
    linear-gradient(180deg, var(--surface-color) 0%, var(--surface-soft) 100%);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}

.contract-preview-modal-head,
.contract-preview-modal-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.contract-preview-shell--fullscreen {
  min-height: 100%;
  height: 100%;
  padding: 12px;
}

.contract-preview-frame--fullscreen {
  min-height: 100%;
  height: 100%;
}

.contract-preview-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-text);
  font-size: 13px;
}

.signature-stage-shell {
  margin-top: 16px;
  display: grid;
  gap: 14px;
}

.signature-canvas-wrap {
  padding: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18), 0 16px 36px rgba(15, 23, 42, 0.08);
}

.signature-canvas {
  width: 100%;
  display: block;
  border-radius: 14px;
  border: 1px dashed rgba(219, 0, 0, 0.24);
  background: #fff;
  touch-action: none;
}

.contract-otp-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(8px);
}

.contract-otp-modal {
  width: min(100%, 460px);
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid var(--panel-border);
  background: var(--surface-color);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.contract-otp-close {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  color: var(--heading-text);
  font-size: 22px;
  line-height: 1;
}

.contract-modal-fade-enter-active,
.contract-modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.contract-modal-fade-enter-from,
.contract-modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 991px) {
  .contract-preview-modal,
  .contract-preview-modal-head,
  .contract-preview-modal-actions {
    gap: 10px;
  }
}

@media (max-width: 767px) {
  .contract-stage-head,
  .contract-payment-title-row,
  .signature-stage-head,
  .contract-otp-head,
  .signature-action-row {
    flex-direction: column;
  }

  .contract-sign-status-grid,
  .contract-payment-grid {
    grid-template-columns: 1fr;
  }

  .contract-preview-shell {
    min-height: 420px;
  }

  .contract-preview-frame {
    min-height: 404px;
  }

  .signature-action-row .btn,
  .contract-actions-col .btn {
    width: 100%;
  }

  .contract-preview-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .contract-preview-modal {
    width: 100%;
    height: 92vh;
    padding: 16px;
    border-radius: 28px 28px 0 0;
  }

  .contract-preview-modal-head,
  .contract-preview-modal-actions {
    flex-direction: column;
  }
}
</style>