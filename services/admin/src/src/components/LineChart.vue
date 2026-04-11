<script setup>
import { Chart, registerables } from 'chart.js';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

Chart.register(...registerables);

const props = defineProps({
  items: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'داده‌ای برای نمایش وجود ندارد' },
  lineColor: { type: String, default: '#0b5f83' },
  fillColor: { type: String, default: 'rgba(11,95,131,0.10)' },
  height: { type: Number, default: 220 }
});

const canvasRef = ref(null);
let chartInstance = null;

const buildChart = () => {
  if (!canvasRef.value || !props.items.length) return;
  if (chartInstance) chartInstance.destroy();

  const labels = props.items.map((i) => i.date?.slice(5) || '');
  const data = props.items.map((i) => i.count);

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
            title: (ctx) => props.items[ctx[0].dataIndex]?.date || '',
            label: (ctx) => `تعداد: ${ctx.parsed.y.toLocaleString('fa-IR')}`
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

<style scoped>
.lc-wrap {
  overflow-x: auto;
  position: relative;
}
.lc-empty {
  padding: 32px;
  text-align: center;
  color: var(--admin-muted, #6b7280);
  font-weight: 700;
}
</style>
