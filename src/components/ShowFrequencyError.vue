<template>
    <table class="striped-table">
        <thead>
            <tr>
                <th class="text-center" colspan="2">Frequency [Hz]</th>
                <th class="text-right">No of points</th>
                <th class="text-right">Max error</th>
                <th class="text-right">Min error</th>
                <th class="text-right">Error integral</th>
                <th class="text-right">Weighted error integral</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in filterSpec.bands" :key="index">
                <td class="text-right">{{ item.freqBegin }}</td>
                <td class="text-right">{{ item.freqEnd }}</td>
                <td class="text-right">{{ filterSpec.errorPerBand[index].noPoints }}</td>
                <td class="text-right">{{ filterSpec.errorPerBand[index].maxError.toPrecision(PRECISION) }}</td>
                <td class="text-right">{{ filterSpec.errorPerBand[index].minError.toPrecision(PRECISION) }}</td>
                <td class="text-right">{{ filterSpec.errorPerBand[index].errorIntegral.toPrecision(PRECISION) }}</td>
                <td class="text-right">{{ (item.weight *
                    filterSpec.errorPerBand[index].errorIntegral).toPrecision(PRECISION) }}</td>
            </tr>
        </tbody>
    </table>
    <p><ClickHelp>Table and graph use the frequency response calculated in {{ NO_POINTS }} points, evenly divided from DC till
        Nyquist frequency.
        Max error and Min error are respectively the maximum and minimum value of the error Em = Hm - |Dm|, with Hm = actual
        magnitude and Dm = desired magnitude.
        The error integral is 1/f<sub>Nyquist</sub> x &int;Em<sup>2</sup>df. The weighted error integral is the error integral multiplied with the
        weight.</ClickHelp></p>
</template>

<script setup lang="ts">
import { NO_POINTS, filterSpec } from '@/models/FilterSpec';
import ClickHelp from './ClickHelp.vue';

const PRECISION = 3;

</script>