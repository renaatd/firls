<template>
    <p>{{ filterSpec.taps.length }} taps - middle
        <span v-if="filterSpec.taps.length % 2 == 0">taps: {{ filterSpec.taps.length / 2 - 1 }}, {{ filterSpec.taps.length / 2 }}</span>
        <span v-else>tap: {{ (filterSpec.taps.length - 1) / 2 }} </span>
        <span v-if="outputMode == 'half'"> - showing the first half only, the taps are symmetric</span>
    </p>
    <div>Output:</div>
    <label for="all"><input type="radio" id="all" value="all" v-model="outputMode" /> All taps</label>
    <label for="half"><input type="radio" id="half" value="half" v-model="outputMode" /> Half the taps</label>
    <label for="c"><input type="radio" id="c" value="c" v-model="outputMode" /> C header/source</label>
    <table class="striped-table" v-if="outputMode != 'c'">
        <thead>
            <tr>
                <th class="text-right">No</th>
                <th class="text-right">Value</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in shownTaps" :key="index">
                <td class="text-right">{{ index }}</td>
                <td class="text-right">{{ item }}</td>
            </tr>
        </tbody>
    </table>
    <template v-if="outputMode == 'c'">
        <p>This is an example filter implementation. The code is reasonably optimized and the coding style favors loop unrolling.
          Compile using gcc with: <code>gcc -Wall -O3 -o filter_output_demo filter_output_demo.c -lm</code></p>
        <div class="code-box">
            <div class="code-box-header">
                <span>filter_definition.h</span>
                <button type="button" @click="copyCode('filter_definition.h', cTaps)">{{ copyLabel('filter_definition.h') }}</button>
            </div>
            <pre class="c-taps"><code class="language-c" v-html="highlightedFilterDefinition"></code></pre>
        </div>
        <div class="code-box">
            <div class="code-box-header">
                <span>symfir.h</span>
                <button type="button" @click="copyCode('symfir.h', symfirHeader)">{{ copyLabel('symfir.h') }}</button>
            </div>
            <pre class="c-taps"><code class="language-c" v-html="highlightedSymfirHeader"></code></pre>
        </div>
        <div class="code-box">
            <div class="code-box-header">
                <span>filter_output_demo.c</span>
                <button type="button" @click="copyCode('filter_output_demo.c', filterDemoSource)">{{ copyLabel('filter_output_demo.c') }}</button>
            </div>
            <pre class="c-taps"><code class="language-c" v-html="highlightedFilterDemo"></code></pre>
        </div>
    </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { filterSpec } from '@/models/FilterSpec';
import { addLog } from '@/helpers/Logger';

import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/themes/prism.min.css';

import symfirHeader from '../assets/symfir.h?raw';
import filterDemoSource from '../assets/filter_output_demo.c?raw';

/** selected output mode: all taps, only half the taps, or C-style output */
const outputMode = ref<'all' | 'half' | 'c'>('all');

/** first half of the taps, including the middle tap for an odd number of taps (taps are symmetric) */
const halfTaps = computed(() => filterSpec.taps.slice(0, Math.ceil(filterSpec.taps.length / 2)));

/** taps to show in the table: all, or only the first half (taps are symmetric) */
const shownTaps = computed(() => {
    if (outputMode.value == 'half')
        return halfTaps.value;
    return filterSpec.taps;
});

/** first half of the taps formatted as a C array definition, 4 values per line */
const cTaps = computed(() => {
    const taps = halfTaps.value;
    const lines: string[] = [
        `// Symmetric filter with ${filterSpec.taps.length} taps, only the first half is stored.`,
        '// Full filter: taps[i] = taps[N_TAPS - 1 - i]',
        '//',
        '// Note: the typedef symfir_float_t must be defined before including this header',
        '',
        `#define N_TAPS ${filterSpec.taps.length} // total number of taps`,
        `#define N_COEFFS ${taps.length} // number of stored coefficients`,
        `#define SAMPLE_FREQUENCY ${filterSpec.sampleFrequency} // sample frequency [Hz]`,
        '',
        'static const symfir_float_t taps[N_COEFFS] = {'
    ];
    for (let i = 0; i < taps.length; i += 4) {
        lines.push('    ' + taps.slice(i, i + 4).map(value => `${value},`).join(' '));
    }
    lines.push('};');
    return lines.join('\n');
});

/** highlight C source code with prismjs */
function highlightC(code: string): string {
    return Prism.highlight(code, Prism.languages.c!, 'c');
}

const highlightedFilterDefinition = computed(() => highlightC(cTaps.value));
const highlightedSymfirHeader = computed(() => highlightC(symfirHeader));
const highlightedFilterDemo = computed(() => highlightC(filterDemoSource));

/** name of the file whose copy button was clicked last, null if none */
const copiedFile = ref<string | null>(null);

/** copy the given source code to the clipboard and show it on the file's button */
async function copyCode(name: string, code: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(code);
        copiedFile.value = name;
        setTimeout(() => {
            if (copiedFile.value === name)
                copiedFile.value = null;
        }, 2000);
    } catch (e) {
        copiedFile.value = null;
        addLog(`Copy to clipboard failed: ${e}`);
    }
}

function copyLabel(name: string): string {
    return copiedFile.value === name ? 'Copied' : 'Copy';
}

</script>

<style scoped>
.code-box {
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 1.5rem;
}

.code-box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: #f5f5f5;
    border-bottom: 1px solid #ccc;
}

.code-box-header span {
    font-family: monospace;
}

.c-taps {
    margin: 0;
    padding: 0.5rem;
    overflow-x: auto;
}
</style>
