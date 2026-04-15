<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import OtpCodeInput from './OtpCodeInput.vue';
import { requestCustomerDealContractOtp, signCustomerDealContract } from '../services/customer-panel.api.js';

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
const otpBusy = ref(false);
const feedbackText = ref('');
const feedbackTone = ref('info');
const resendIn = ref(0);
const previewOpen = ref(false);
const contractZoom = ref(1);
const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const emptySignature = ref(true);

let timerId = null;
let drawing = false;
let lastPoint = null;
let resizeFrameId = null;

const paymentMethods = computed(() => (Array.isArray(props.deal?.paymentTypes) ? props.deal.paymentTypes : []));
const canSign = computed(() => Boolean(props.deal?.canCustomerSignContract));
const contractReady = computed(() => Boolean(props.deal?.contractReady || props.deal?.contractData));
const contractKey = computed(() => `${props.deal?.id}-${props.deal?.contractSignedByCustomer}-${props.deal?.contractSignedByBroker}-${props.deal?.updatedAt || ''}-${String(props.deal?.contractData || '').length}`);
const signerStates = computed(() => [
  {
    key: 'customer',
    title: 'امضای مشتری',
    done: Boolean(props.deal?.contractSignedByCustomer),
    description: props.deal?.contractSignedByCustomer ? 'امضای شما روی قرارداد ثبت شده است.' : 'پس از رسم امضا و تایید OTP، این بخش تکمیل می‌شود.'
  },
  {
    key: 'broker',
    title: 'امضای کارگزار',
    done: Boolean(props.deal?.contractSignedByBroker),
    description: props.deal?.contractSignedByBroker ? 'کارگزار قرارداد را امضا کرده است.' : 'تا زمانی که کارگزار امضا نکند، قرارداد وارد مرحله پرداخت نمی‌شود.'
  }
]);

const reviewSummary = computed(() => {
  if (props.deal?.contractFullySigned) {
    return 'هر دو طرف قرارداد را امضا کرده‌اند و پرونده وارد مرحله پرداخت شده است.';
  }

  if (props.deal?.contractSignedByCustomer) {
    return 'امضای شما ثبت شده و اکنون منتظر امضای کارگزار هستید.';
  }

  return 'روش‌های پرداخت تعیین‌شده را بررسی کنید، نسخه قرارداد را ببینید و سپس امضای خود را ثبت کنید.';
});

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

const resetSignatureState = () => {
  signatureMode.value = false;
  otpOpen.value = false;
  otpCode.value = '';
  feedbackText.value = '';
  feedbackTone.value = 'info';
  stopTimer();
};

const showFeedback = (message, tone = 'info') => {
  feedbackText.value = String(message || '').trim();
  feedbackTone.value = tone;
};

const getCanvasContext = () => canvasRef.value?.getContext('2d');

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
  const width = resolveCanvasWidth(wrap, 280);
  const height = window.innerWidth < 768 ? 170 : 220;

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

const clearCanvas = () => {
  const canvas = canvasRef.value;
  const context = getCanvasContext();

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

const scheduleCanvasSetup = () => {
  if (resizeFrameId) {
    cancelAnimationFrame(resizeFrameId);
  }

  resizeFrameId = window.requestAnimationFrame(() => {
    setupCanvas();
  });
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

const beginDraw = (event) => {
  if (!canvasRef.value) {
    return;
  }

  canvasRef.value.setPointerCapture(event.pointerId);
  drawing = true;
  lastPoint = getPoint(event);
};

const moveDraw = (event) => {
  if (!drawing || !lastPoint) {
    return;
  }

  const point = getPoint(event);
  const context = getCanvasContext();

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

  contractZoom.value = window.innerWidth <= 767 ? 0.5 : 1;
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

  otpBusy.value = true;
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
        filename: `deal-contract-${props.deal.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(exportNode)
      .save();

    showFeedback('نسخه PDF قرارداد با موفقیت دانلود شد.', 'success');
  } catch (error) {
    showFeedback(error?.message || 'دانلود PDF قرارداد با خطا مواجه شد.', 'error');
  } finally {
    container?.remove();
    otpBusy.value = false;
  }
};

const openSignatureWorkspace = async () => {
  signatureMode.value = true;
  showFeedback('', 'info');
  await nextTick();
  setupCanvas();
};

const requestOtp = async () => {
  if (!canSign.value) {
    return;
  }

  if (!currentSignature()) {
    showFeedback('ابتدا امضای خود را رسم کنید.', 'error');
    return;
  }

  otpBusy.value = true;
  showFeedback('', 'info');

  try {
    const data = await requestCustomerDealContractOtp(props.deal.id);
    otpOpen.value = true;
    startTimer(data.resendIn);
    showFeedback(data.message || 'کد تایید ارسال شد.', 'success');
  } catch (error) {
    if (error.status === 409) {
      otpOpen.value = true;
      startTimer(error.data?.resendIn || 0);
      showFeedback(error.message || 'کد تایید قبلا ارسال شده است.', 'info');
    } else {
      showFeedback(error.message || 'ارسال کد تایید با خطا مواجه شد.', 'error');
    }
  } finally {
    otpBusy.value = false;
  }
};

const resendOtp = async () => {
  if (resendIn.value > 0 || otpBusy.value) {
    return;
  }

  await requestOtp();
};

const submitSignature = async () => {
  if (otpCode.value.trim().length !== 4) {
    showFeedback('کد تایید باید ۴ رقم باشد.', 'error');
    return;
  }

  const signature = currentSignature();
  if (!signature) {
    showFeedback('امضای شما خالی است.', 'error');
    return;
  }

  const { isConfirmed } = await Swal.fire({ title: 'ثبت امضا', text: 'امضای قرارداد با همین کد تایید ثبت شود؟', icon: 'question', confirmButtonText: 'بله، ثبت', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
  if (!isConfirmed) {
    return;
  }

  otpBusy.value = true;
  try {
    const data = await signCustomerDealContract(props.deal.id, {
      code: otpCode.value.trim(),
      signature
    });
    emit('updated', data.item);
    otpOpen.value = false;
    signatureMode.value = false;
    otpCode.value = '';
    stopTimer();
    showFeedback(data.message || 'امضای قرارداد ثبت شد.', 'success');
  } catch (error) {
    showFeedback(error.message || 'ثبت امضا با خطا مواجه شد.', 'error');
  } finally {
    otpBusy.value = false;
  }
};

watch(
  () => props.deal?.id,
  () => {
    resetSignatureState();
    previewOpen.value = false;
  }
);

watch(signatureMode, async (value) => {
  if (value) {
    await nextTick();
    setupCanvas();
  }
});

watch(
  () => props.deal?.contractFullySigned,
  (value) => {
    if (value) {
      otpOpen.value = false;
      signatureMode.value = false;
      stopTimer();
    }
  }
);

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
  <section class="contract-stage-card">
    <div class="contract-stage-head">
      <div>
        <span class="contract-kicker">مرحله قرارداد</span>
        <h3>بررسی، دانلود و امضای قرارداد</h3>
        <p>{{ reviewSummary }}</p>
      </div>
      <div class="contract-stage-badge" :class="props.deal.contractFullySigned ? 'done' : 'pending'">
        {{ props.deal.contractFullySigned ? 'قرارداد کامل شد' : 'در انتظار امضا' }}
      </div>
    </div>

    <div v-if="feedbackText" class="contract-feedback" :class="`tone-${feedbackTone}`">{{ feedbackText }}</div>

    <div class="contract-status-grid">
      <article v-for="item in signerStates" :key="item.key" class="contract-status-item" :class="item.done ? 'is-done' : 'is-pending'">
        <div class="contract-status-top">
          <strong>{{ item.title }}</strong>
          <span>{{ item.done ? 'ثبت شد' : 'در انتظار' }}</span>
        </div>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div class="contract-payment-grid">
      <article v-for="item in paymentMethods" :key="item.id || item.paymentType" class="contract-payment-card">
        <div class="contract-payment-title-row">
          <strong>{{ item.paymentTypeLabel }}</strong>
          <span>{{ Number(item.amount).toLocaleString() }} تومان</span>
        </div>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div v-if="!signatureMode" class="contract-review-grid">
      <div class="contract-review-side">
        <div class="contract-action-group">
          <button type="button" class="contract-secondary-btn" :disabled="!contractReady" @click="openPreview">مشاهده کامل قرارداد</button>
          <button type="button" class="contract-secondary-btn" :disabled="!contractReady || otpBusy" @click="downloadContract">
            {{ otpBusy ? 'در حال آماده‌سازی PDF...' : 'دانلود نسخه PDF' }}
          </button>
          <button v-if="canSign" type="button" class="contract-primary-btn" @click="openSignatureWorkspace">ورود به امضای قرارداد</button>
          <span v-else class="contract-passive-note">
            {{ props.deal.contractSignedByCustomer ? 'امضای شما ثبت شده است.' : 'در این مرحله فعلا نیازی به اقدام شما نیست.' }}
          </span>
        </div>

        <div class="contract-checklist-box">
          <strong>قبل از امضا بررسی کنید</strong>
          <ul>
            <li>روش‌های پرداخت و مبلغ هر کدام با خواسته کارگزار مطابقت داشته باشد.</li>
            <li>نسخه قرارداد را یک بار به صورت کامل مشاهده یا دانلود کنید.</li>
            <li>بعد از ثبت امضا، کد پیامکی ۲ دقیقه اعتبار دارد و امکان ارسال مجدد هم فعال است.</li>
          </ul>
        </div>
      </div>

      <div class="contract-preview-shell contract-preview-shell--inline">
        <iframe v-if="contractReady" :key="contractKey" class="contract-preview-frame" :srcdoc="props.deal.contractData"></iframe>
        <div v-else class="contract-preview-empty">نسخه قرارداد هنوز آماده نشده است.</div>
      </div>
    </div>

    <div v-else class="signature-stage-shell">
      <div class="signature-stage-head">
        <div>
          <span class="contract-kicker">امضای قرارداد</span>
          <h4>امضای خود را در کادر سفید رسم کنید</h4>
          <p>با انگشت یا ماوس امضا را بکشید. سپس روی دکمه ثبت امضا بزنید تا OTP ارسال شود.</p>
        </div>
        <button type="button" class="contract-secondary-btn" @click="signatureMode = false">بازگشت به بررسی قرارداد</button>
      </div>

      <div ref="canvasWrapRef" class="signature-canvas-wrap">
        <canvas
          ref="canvasRef"
          class="signature-canvas"
          @pointerdown="beginDraw"
          @pointermove="moveDraw"
          @pointerup="endDraw"
          @pointerleave="endDraw"
          @pointercancel="endDraw"
        ></canvas>
      </div>

      <div class="signature-stage-actions">
        <button type="button" class="contract-secondary-btn" @click="clearCanvas">پاک کردن / شروع دوباره</button>
        <button type="button" class="contract-primary-btn" :disabled="otpBusy" @click="requestOtp">
          {{ otpBusy ? 'در حال ارسال...' : 'ثبت امضا و دریافت کد' }}
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
                <p>نسخه کامل قرارداد را در همین صفحه مرور کنید و در صورت نیاز PDF بگیرید.</p>
              </div>
              <div class="contract-preview-modal-actions">
                <div class="contract-zoom-controls">
                  <button type="button" @click="contractZoom = Math.max(0.3, +(contractZoom - 0.1).toFixed(1))"><i class="fa-solid fa-minus"></i></button>
                  <span>{{ Math.round(contractZoom * 100) }}%</span>
                  <button type="button" @click="contractZoom = Math.min(2, +(contractZoom + 0.1).toFixed(1))"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button type="button" class="contract-secondary-btn" :disabled="otpBusy" @click="downloadContract">دانلود PDF</button>
                <button type="button" class="contract-otp-close" @click="previewOpen = false">×</button>
              </div>
            </div>

            <div class="contract-preview-shell contract-preview-shell--fullscreen">
              <iframe v-if="contractReady" :key="'fs-' + contractKey" class="contract-preview-frame contract-preview-frame--fullscreen" :style="{ transform: `scale(${contractZoom})`, transformOrigin: 'top right' }" :srcdoc="props.deal.contractData"></iframe>
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
                <span class="contract-kicker">تایید OTP</span>
                <h4>کد تایید امضای قرارداد را وارد کنید</h4>
                <p>اگر پیامک قبلا ارسال شده باشد، مستقیم همین فرم را می‌بینید. ارسال مجدد هر ۲ دقیقه فعال می‌شود.</p>
              </div>
              <button type="button" class="contract-otp-close" @click="otpOpen = false">×</button>
            </div>

            <label class="contract-otp-label" for="customer-contract-otp">کد تایید</label>
            <OtpCodeInput v-model="otpCode" :disabled="otpBusy" :auto-focus="otpOpen" />

            <div class="contract-otp-actions">
              <button type="button" class="contract-secondary-btn" :disabled="otpBusy || resendIn > 0" @click="resendOtp">
                {{ resendIn > 0 ? `ارسال مجدد تا ${resendIn} ثانیه` : 'ارسال مجدد کد' }}
              </button>
              <button type="button" class="contract-primary-btn" :disabled="otpBusy" @click="submitSignature">
                {{ otpBusy ? 'در حال ثبت...' : 'تایید و ثبت امضا' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped src="./styles/CustomerDealContractStage.css"></style>