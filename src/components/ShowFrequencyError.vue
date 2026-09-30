<template>
    <table class="striped-table">
        <thead>
            <tr>
                <th class="text-center" colspan="2">Frequency [Hz]</th>
                <th class="text-right">No of points</th>
                <th class="text-right">Max abs error</th>
                <th class="text-right">Min abs error</th>
                <th class="text-right">Error integral</th>
                <th class="text-right">Weighted error integral</th>
                <th class="text-right">Ripple [%]</th>
                <th class="text-right">Attenuation [dB]</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in filterSpec.bands" :key="index">
                <td class="text-right">{{ item.freqBegin }}</td>
                <td class="text-right">{{ item.freqEnd }}</td>
                <td class="text-right">{{ filterSpec.errorPerBand[index]!.noPoints }}</td>
                <td class="text-right">{{ errorText(index, filterSpec.errorPerBand[index]!.maxError) }}</td>
                <td class="text-right">{{ errorText(index, filterSpec.errorPerBand[index]!.minError) }}</td>
                <td class="text-right">{{ errorText(index, filterSpec.errorPerBand[index]!.errorIntegral) }}</td>
                <td class="text-right">{{ weightedErrorText(index, item.weight) }}</td>
                <td class="text-right">{{ rippleText(index) }}</td>
                <td class="text-right">{{ attenuationText(index) }}</td>
            </tr>
        </tbody>
    </table>
    <p>
        <ClickHelp>Table and graph use the frequency response calculated in {{ NO_POINTS }} points, evenly divided from DC
            till Nyquist frequency. <span class="block">Max error and Min error are respectively the maximum and minimum value of the error Em =
            Hm - |Dm|, with Hm = actual magnitude and Dm = desired magnitude. The error integral is 1/f<sub>Nyquist</sub> x
            &int;Em<sup>2</sup>df. The weighted error integral is the error integral multiplied with the weight.</span></ClickHelp>
    </p>
</template>

<script setup lang="ts">
import { NO_POINTS, filterSpec, FilterBandType } from '@/models/FilterSpec';
import ClickHelp from './ClickHelp.vue';

const PRECISION = 3;

function hasPoints(index: number) {
    return filterSpec.errorPerBand[index]!.noPoints > 0;
}

function errorText(index: number, error: number) {
    return hasPoints(index) ? error.toPrecision(PRECISION) : "N/A";
}

function weightedErrorText(index: number, weight: number) {
    return hasPoints(index)
        ? (weight * filterSpec.errorPerBand[index]!.errorIntegral).toPrecision(PRECISION)
        : "N/A";
}

function rippleText(index: number) {
    if (filterSpec.typePerBand[index] == FilterBandType.PassBand && hasPoints(index)) {
        const ripple = 100 * (filterSpec.errorPerBand[index]!.maxRelError - filterSpec.errorPerBand[index]!.minRelError);
        return ripple.toFixed(2);
    }
    if (filterSpec.typePerBand[index] == FilterBandType.PassBand) {
        return "N/A";
    }
    return "";
}

function attenuationText(index: number) {
    if (filterSpec.typePerBand[index] == FilterBandType.StopBand) {
        if (!hasPoints(index))
            return "N/A";
        const maxError = filterSpec.errorPerBand[index]!.maxError;
        // A stop band with zero error at all points has an infinite attenuation
        if (maxError <= 0)
            return "∞";
        const attenuationDb = -20 * Math.log10(maxError);
        return attenuationDb.toFixed(1);
    }
    return "";
}

</script>

<style scoped>
/* ClickHelp help text is a span, start the second paragraph of the help on a new line */
.block {
    display: block;
}
</style>
