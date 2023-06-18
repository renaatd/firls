<template>
    <canvas ref="chartRef" width="700" height="450"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Chart, LinearScale, LineElement, PointElement, LineController, Title } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';

import { filterSpec } from '@/models/FilterSpec';
import { addLog } from '@/helpers/Logger';

/** chart.js Chart object, defined at first update */
let chart: Chart | null = null;
/** reference to the DOM element chart */
const chartRef = ref(null);

function createChartIfNeeded(): void {
    if (chart)
        return;

    if (!chartRef.value) {
        addLog("Error: can't create chart, no reference");
        return;
    }

    let ctx = (chartRef.value as HTMLCanvasElement).getContext('2d');
    if (ctx == null) {
        addLog("Error: can't create chart, no canvas");
        return;
    }

    const data = {
        datasets: [
            {
                label: 'amplitude',
                data: [],
                backgroundColor: 'rgb(44, 160, 44)',
                borderColor: 'rgb(44, 160, 44)',
                stepped: 'middle'
            },
        ],
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            animation: false,
            elements: {
                point: {
                    pointStyle: false
                },
                line: {
                    borderWidth: 1,
                    stepped: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Frequency response',
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    title: {
                        display: true,
                        text: 'frequency (Hz)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'amplitude'
                    }
                }
            }
        }
    };

    chart = new Chart(ctx, config as ChartConfiguration);
}

/** update chart object */
function updateChart(): void {
    createChartIfNeeded();
    if (!chart) {
        return;
    }

    let amplitudes = filterSpec.hm;
    let frequencies = filterSpec.fr;
    let dataset = amplitudes.map((a, index) => { return { x: frequencies[index], y: a }; });
    chart.data.datasets[0].data = dataset;

    chart.update();
}

watch(filterSpec, () => {
    // addLog("ShowFrequency: watch(FilterSpec)");
    updateChart();
});

onMounted(() => {
    // addLog("ShowFrequency: onMounted");
    Chart.register(LineController, LinearScale, PointElement, LineElement, Title);
    updateChart();
});

/*
onUpdated(() => {
    addLog("ShowFrequency: onUpdated");
    // Update chart when the DOM is ready, don't try earlier.
    updateChart();
});
*/
</script>