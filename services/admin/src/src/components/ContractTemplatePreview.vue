<script setup>
import { computed } from 'vue';

const props = defineProps({
  template: {
    type: Object,
    default: () => ({})
  },
  backgroundUrl: {
    type: String,
    default: ''
  },
  logoUrl: {
    type: String,
    default: ''
  },
  fallbackTitle: {
    type: String,
    default: ''
  }
});

const createDefaultTemplate = () => ({
  page: { size: 'A4' },
  header: {
    title: '',
    dateText: '{{general.date}}',
    contractNumberText: '{{contract.number}}',
    showLogo: true
  },
  bodyHtml: '',
  footer: {
    customerSignatureLabel: 'محل امضا مشتری',
    brokerSignatureLabel: 'محل امضا کارگزار',
    note: ''
  }
});

const now = new Date();

const sampleValues = computed(() => ({
  '{{contract.number}}': 'CT-1405-001',
  '{{general.date}}': now.toLocaleDateString('fa-IR'),
  '{{general.time}}': now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  '{{broker.name}}': 'نام کارگزار',
  '{{broker.phone}}': '09120000000',
  '{{broker.national_code}}': '0012345678',
  '{{broker.birthdate}}': '1370/01/01',
  '{{broker.address}}': 'آدرس کارگزار',
  '{{customer.name}}': 'نام مشتری',
  '{{customer.phone}}': '09910000000',
  '{{customer.email}}': 'customer@example.com',
  '{{deal.id}}': '125',
  '{{deal.status}}': 'در جریان',
  '{{deal.step}}': 'بررسی و امضای قرارداد',
  '{{deal.act_by}}': 'مشتری و کارگزار',
  '{{deal.amount}}': '۸۵۰,۰۰۰,۰۰۰',
  '{{deal.installments}}': '36',
  '{{deal.profit}}': '18',
  '{{deal.monthly_installment_amount}}': '۲۵,۰۰۰,۰۰۰',
  '{{deal.total_profit}}': '۵۰,۰۰۰,۰۰۰',
  '{{deal.total_amount}}': '۹۰۰,۰۰۰,۰۰۰',
  '{{facility.title}}': 'امتیاز وام نمونه',
  '{{facility.type}}': 'بانکی',
  '{{facility.sub_type}}': props.fallbackTitle || 'زیرنوع امتیاز',
  '{{facility.min_amount}}': '۵۰۰,۰۰۰,۰۰۰',
  '{{facility.max_amount}}': '۱,۲۰۰,۰۰۰,۰۰۰',
  '{{facility.validation_title}}': 'اعتبارسنجی نمونه',
  '{{facility.withdraw_dead_line}}': '30 روز',
  '{{payment.summary}}': 'پرداخت نقدی: ۵۰۰,۰۰۰,۰۰۰ تومان — مشتری باید مبلغ تعیین شده را پرداخت نماید\nپرداخت با چک: ۳۵۰,۰۰۰,۰۰۰ تومان — مشتری باید اسناد چک یا سفته را بارگذاری کند',
  '{{payment.count}}': '۲',
  '{{payment.total}}': '۸۵۰,۰۰۰,۰۰۰'
}));

const templateData = computed(() => {
  const defaults = createDefaultTemplate();
  const source = props.template && typeof props.template === 'object' ? props.template : {};
  const header = source.header && typeof source.header === 'object' ? source.header : {};
  const footer = source.footer && typeof source.footer === 'object' ? source.footer : {};

  return {
    page: { size: 'A4' },
    header: {
      title: String(header.title || '').trim(),
      dateText: String(header.dateText || defaults.header.dateText).trim(),
      contractNumberText: String(header.contractNumberText || defaults.header.contractNumberText).trim(),
      showLogo: header.showLogo !== false
    },
    bodyHtml: String(source.bodyHtml || '').trim(),
    footer: {
      customerSignatureLabel: String(footer.customerSignatureLabel || defaults.footer.customerSignatureLabel).trim(),
      brokerSignatureLabel: String(footer.brokerSignatureLabel || defaults.footer.brokerSignatureLabel).trim(),
      note: String(footer.note || '').trim()
    }
  };
});

const replaceTokensInText = (value) => {
  let output = String(value || '');

  Object.entries(sampleValues.value).forEach(([token, sample]) => {
    output = output.split(token).join(sample);
  });

  return output;
};

const renderedTitle = computed(() => replaceTokensInText(templateData.value.header.title || props.fallbackTitle || 'قرارداد بدون عنوان'));
const renderedDate = computed(() => replaceTokensInText(templateData.value.header.dateText));
const renderedContractNumber = computed(() => replaceTokensInText(templateData.value.header.contractNumberText));
const renderedCustomerSignatureLabel = computed(() => replaceTokensInText(templateData.value.footer.customerSignatureLabel));
const renderedBrokerSignatureLabel = computed(() => replaceTokensInText(templateData.value.footer.brokerSignatureLabel));
const renderedFooterNote = computed(() => replaceTokensInText(templateData.value.footer.note));

const renderedBodyHtml = computed(() => {
  let html = templateData.value.bodyHtml;

  if (!html) {
    return '<p class="contract-empty-text">بدنه قرارداد هنوز تنظیم نشده است.</p>';
  }

  Object.entries(sampleValues.value).forEach(([token, sample]) => {
    html = html.split(token).join(`<span class="contract-token">${sample}</span>`);
  });

  return html;
});

const paperStyle = computed(() => ({
  backgroundImage: props.backgroundUrl ? `url(${props.backgroundUrl})` : 'linear-gradient(180deg, #ffffff 0%, #f7f4f4 100%)'
}));
</script>

<template>
  <div class="contract-preview-shell">
    <div class="contract-preview-frame">
      <article class="contract-paper" :style="paperStyle">
        <header class="contract-header">
          <div v-if="templateData.header.showLogo && logoUrl" class="contract-logo-wrap">
            <img :src="logoUrl" alt="contract-logo" class="contract-logo" />
          </div>
          <div class="contract-header-main">
            <h2 class="contract-title">{{ renderedTitle }}</h2>
            <div class="contract-head-meta">
              <div class="contract-head-meta-item">
                <span>تاریخ</span>
                <strong>{{ renderedDate }}</strong>
              </div>
              <div class="contract-head-meta-item">
                <span>شماره قرارداد</span>
                <strong>{{ renderedContractNumber }}</strong>
              </div>
            </div>
          </div>
        </header>

        <main class="contract-body">
          <div class="contract-body-content" v-html="renderedBodyHtml"></div>
        </main>

        <footer class="contract-footer">
          <p v-if="renderedFooterNote" class="contract-footer-note">{{ renderedFooterNote }}</p>

          <div class="contract-signatures">
            <div class="signature-box">
              <span>{{ renderedCustomerSignatureLabel }}</span>
              <div class="signature-line"></div>
            </div>
            <div class="signature-box">
              <span>{{ renderedBrokerSignatureLabel }}</span>
              <div class="signature-line"></div>
            </div>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped src="./styles/ContractTemplatePreview.css"></style>