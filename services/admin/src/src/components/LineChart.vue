<script setup>
import { Chart, registerables } from 'chart.js';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

Chart.register(...registerables);

const props = defineProps({
  items: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'داده‌ای برای نمایش وجود ندارد' },
  lineColor: { type: String, default: '#0b5f83' },
  fillColor: { type: String, default: 'rgba(11,95,131,0.10)' },
  height: { type: Number, default: 220 },
  valueLabel: { type: String, default: 'تعداد' },
  valueSuffix: { type: String, default: '' }
});

const canvasRef = ref(null);
let chartInstance = null;

const resolveItemTitle = (item) => item?.title || item?.date || item?.label || '';
const resolveItemLabel = (item) => {
  const rawValue = String(item?.label || item?.date || item?.title || '');

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue.slice(5);
  }

  if (/^\d{4}-\d{2}$/.test(rawValue)) {
    return rawValue.slice(2);
  }

  return rawValue;
};

const resolveItemValue = (item) => Number(item?.count ?? item?.value ?? 0);

const buildChart = () => {
  if (!canvasRef.value || !props.items.length) return;
  if (chartInstance) chartInstance.destroy();

  const labels = props.items.map((item) => resolveItemLabel(item));
  const data = props.items.map((item) => resolveItemValue(item));

  chartInstance = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: props.lineColor,
        backgroundColor: props.fillColor,
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: props.lineColor,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          textDirection: 'rtl',
          callbacks: {
            title: (ctx) => resolveItemTitle(props.items[ctx[0].dataIndex]) || '',
            label: (ctx) => `${props.valueLabel}: ${ctx.parsed.y.toLocaleString('fa-IR')}${props.valueSuffix}`
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10, family: 'inherit' }, maxRotation: 0, autoSkipPadding: 12 },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11 },
            callback: (v) => v.toLocaleString('fa-IR')
          },
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false }
        }
      },
      interaction: { intersect: false, mode: 'index' }
    }
  });
};

onMounted(buildChart);
watch(() => [props.items, props.lineColor, props.fillColor], buildChart, { deep: true });
onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<template>
  <div v-if="!items.length" class="lc-empty">{{ emptyText }}</div>
  <div v-else class="lc-wrap">
    <canvas ref="canvasRef" :style="{ height: height + 'px' }"></canvas>
  </div>
</template>

<style scoped src="./styles/LineChart.css"></style>
