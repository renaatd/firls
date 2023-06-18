<template>
    <canvas ref="chartRef" width="700" height="450"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Chart, LinearScale, LineElement, PointElement, LineController, Legend, Title } from 'chart.js';
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
                label: 'impulse',
                data: [],
                backgroundColor: 'rgb(31, 119, 180)',
                borderColor: 'rgb(31, 119, 180)',
                pointStyle: 'circle',
                showLine: false
            },
            {
                label: 'step input',
                data: [],
                backgroundColor: 'rgb(255, 127, 14)',
                borderColor: 'rgb(255, 127, 14)',
            },
            {
                label: 'step output',
                data: [],
                backgroundColor: 'rgb(44, 160, 44)',
                borderColor: 'rgb(44, 160, 44)',
                stepped: 'left'
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
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Time response',
                },
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    title: {
                        display: true,
                        text: 'step'
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

    let taps = filterSpec.taps;

    let impulse = taps.map((a, index) => { return { x: index, y: a }; });
    chart.data.datasets[0].data = impulse;

    let step_input = taps.map((a, index) => { return { x: index, y: 1 }; });
    chart.data.datasets[1].data = step_input;

    let step_output: { x: number, y: number }[] = [{ x: 0, y: taps[0] }];
    for (let i = 1; i < taps.length; i++) {
        step_output.push({ x: i, y: step_output[i - 1].y + taps[i] });
    }
    chart.data.datasets[2].data = step_output;

    chart.update();
}

watch(filterSpec, () => {
    // addLog("ShowStepImpulse: watch(FilterSpec)");
    updateChart();
});

onMounted(() => {
    // addLog("ShowStepImpulse: onMounted");
    Chart.register(LineController, LinearScale, PointElement, LineElement, Title, Legend);
    updateChart();
});

</script>