<script setup>
import { Chart, registerables } from 'chart.js';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

Chart.register(...registerables);

const props = defineProps({
  items: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'داده ای برای نمایش وجود ندارد' }
});

const canvasRef = ref(null);
let chartInstance = null;

const buildChart = () => {
  if (!canvasRef.value || !props.items.length) return;
  if (chartInstance) chartInstance.destroy();

  const labels = props.items.map((i) => i.title || '-');
  const data = props.items.map((i) => Number(i.views || 0));

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(219,0,0,0.70)',
        borderColor: '#db0000',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          textDirection: 'rtl',
          callbacks: {
            label: (ctx) => `بازدید: ${ctx.parsed.x.toLocaleString('fa-IR')}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { font: { size: 11 }, callback: (v) => v.toLocaleString('fa-IR') },
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false }
        },
        y: {
          ticks: { font: { size: 12, weight: 'bold' }, autoSkip: false },
          grid: { display: false }
        }
      }
    }
  });
};

const chartHeight = () => Math.max(180, props.items.length * 38 + 40);

onMounted(buildChart);
watch(() => props.items, buildChart, { deep: true });
onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy(); });
</script>

<template>
  <div v-if="items.length" class="chart-shell">
    <canvas ref="canvasRef" :style="{ height: chartHeight() + 'px' }"></canvas>
  </div>
  <div v-else class="chart-empty">
    <i class="fa-solid fa-chart-column"></i>
    <span>{{ emptyText }}</span>
  </div>
</template>

<style scoped src="./styles/SimpleBarChart.css"></style>
