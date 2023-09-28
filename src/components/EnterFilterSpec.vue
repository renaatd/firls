<template>
  <form @submit.prevent="handleSubmit">
    <label for="freq">Sample frequency [Hz]: </label><input id="freq" type="text" inputmode="decimal" :value="frequencyText"
        @input="onInputFrequency($event)" :class="frequencyClass"/> 
    Nyquist frequency: {{ nyquistFrequency }} Hz<br/>
    <!--
    <label for="mode_auto"><input type="radio" id="mode_auto" value="auto" v-model="mode" /> Auto - specify
      ripple/attenuation, filter order is calculated</label>
    <label for="mode_manual"><input type="radio" id="mode_manual" value="manual" v-model="mode" /> Manual - specify filter
      order and weight</label>

    <div v-if="isAutomatic">
      <label for="filter_type">Filter type:</label>
      <select id="filter_type" v-model="filter_type">
        <option value="1">Type 1 - symmetric, even order (odd no of taps)</option>
        <option value="2">Type 2 - symmetric, odd order (even no of taps)</option>
      </select>
    </div>

    <p>Table for frequencies</p>
        -->
    <label for="taps">Number of taps: 
    <ClickHelp class="help">
      This is the number of taps of the calculated filter. The filter order is 1
      less than the number of taps. Type I filters, with an odd number of taps,
      can handle any frequency respone. Type II filters, with an even number of
      taps, always have zero amplitude at the Nyquist frequency.
    </ClickHelp></label>
    <input id="taps" type="number" inputmode="numeric" :value="tapsText"
        @input="onInputTaps($event)" :class="{ 'is-success': tapsOk }">

    <label for="frequencies">List of frequency bands [Hz]: <ClickHelp class="help">List of frequency pairs specifying the edges of each frequency band. This list must be monotonically increasing, and the frequencies must be lower than the Nyquist frequency (half the sample frequency).</ClickHelp></label>
    <input id="frequencies" type="text" inputmode="text" v-model="frequencyBandsText" :class="frequencyBandsClass"/>

    <label for="amplitudes">List of amplitudes: <ClickHelp class="help">List of amplitude pairs, specifying the desired amplitude at the edges of each frequency band.</ClickHelp></label>
    <input id="amplitudes" type="text" inputmode="text" v-model="amplitudesText" :class="amplitudesClass"/>

    <label for="weights">List of weights: <ClickHelp class="help">Relative weighting factors, one per frequency band. A higher weighting factor reduces errors in that band.</ClickHelp></label>
    <input id="weights" type="text" inputmode="text" v-model="weightsText" :class="weightsClass"/>

    <input type="submit" value="Calculate" :disabled="!allInputsOk" :class="submitClass"/>
  </form>
  Status: {{ calculatedStatus }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isNumeric, filterPositiveInteger, filterPositiveNumeric } from '@/helpers/NumericHelpers';
import { addLog } from '@/helpers/Logger';

import ClickHelp from './ClickHelp.vue';
import _fircalc from '@/models/FIRCalc';

const emit = defineEmits(['setActive']);

/* ======================================================== */
const frequencyText = ref('1000');
const frequencyOk = computed(() => {
  const frequency = Number(frequencyText.value);
  return !isNaN(frequency) && frequency > 0.0;
});
const frequencyClass = computed(() => { return { 'is-success': frequencyOk.value }; });
const nyquistFrequency = computed(() => { return frequencyOk.value ? Number(frequencyText.value) / 2.0 : NaN; });

function onInputFrequency(event: Event) {
  const target = event.target as HTMLInputElement;
  // filter non-numerical characters
  target.value = filterPositiveNumeric(target.value);
  // and assign it to frequencyText for updating frquency
  frequencyText.value = target.value
}

watch(frequencyText, () => {
  updateCalculatedFlag(false);
});

/* ======================================================== */
const mode = ref('manual');
// const isAutomatic = computed(() => { return mode.value == 'auto'; });

watch(mode, () => {
  updateCalculatedFlag(false);
});

/* ======================================================== */
const filter_type = ref('1');

watch(filter_type, () => {
  updateCalculatedFlag(false);
});

/* ======================================================== */
const frequencyBandsText = ref('0, 200, 400, 500');
const frequencyBandsOk = computed(() => {
  const len = splitStringToNumbers(frequencyBandsText.value).length;
  return (len > 0) && (len % 2 == 0);
});
const frequencyBandsClass = computed(() => { return { 'is-success': frequencyBandsOk.value }; });
watch(frequencyBandsText, () => {
  updateCalculatedFlag(false);
});

const amplitudesText = ref('2, 2, 0, 0');
// In the form: using :class="is-success: <a computed property>" doesn't work, but a computed property returning an object works
const amplitudesOk = computed(() => { return splitStringToNumbers(amplitudesText.value).length > 0; });
const amplitudesClass = computed(() => { return { 'is-success': amplitudesOk }; });
watch(amplitudesText, () => {
  updateCalculatedFlag(false);
});

const weightsText = ref('1, 1');
const weightsOk = computed(() => { return splitStringToNumbers(weightsText.value).length > 0; });
const weightsClass = computed(() => { return { 'is-success': weightsOk.value }; });
watch(weightsText, () => {
  updateCalculatedFlag(false);
});

const tapsText = ref('15');
const tapsOk = ref(false);
// Just for variation: here using a watcher to update the class -> must be immediate to trigger immediately at start
watch(tapsText, () => {
  const order = Number(tapsText.value);
  tapsOk.value = !isNaN(order) && order >= 0;
}, { 'immediate': true })

watch(tapsText, () => {
  updateCalculatedFlag(false);
});

function onInputTaps(event: Event) {
  const target = event.target as HTMLInputElement;
  target.value = filterPositiveInteger(target.value);
  tapsText.value = target.value
}

/* ======================================================== */
/** true if FIR LS calculations are done */
const calculated = ref(false);
function splitStringToNumbers(textString: string): number[] {
  const listSplit = textString.split(",");
  if (!listSplit.every(isNumeric)) {
    return [];
  }
  return listSplit.map(x => Number(x));
}

const allInputsOk = computed(() => {
  return frequencyOk.value && tapsOk.value && frequencyBandsOk.value && amplitudesOk.value && weightsOk.value;
});
const submitClass = computed(() => { return { 'muted-button': !allInputsOk.value }; });

function handleSubmit(): void {
  if (!allInputsOk.value)
    return;

  if (!_fircalc.isInitalized()) {
    addLog('FirCalc is not initalized');
    return;
  }

  const amplitudes = splitStringToNumbers(amplitudesText.value).map(Number);
  const desiredBegin = amplitudes.filter(function (value, index) { return index % 2 == 0 });
  const desiredEnd = amplitudes.filter(function (value, index) { return index % 2 == 1 });

  const [success, result] = _fircalc.updateFilter(Number(tapsText.value), splitStringToNumbers(frequencyBandsText.value), desiredBegin, desiredEnd, splitStringToNumbers(weightsText.value), Number(frequencyText.value));
  const message = success ? "OK" : String(result);
  updateCalculatedFlag(success, message);
}

/* ======================================================== */
const calculatedStatus = ref('waiting for new calculation');

/** Update calculated flag and status message, emit to parent */
function updateCalculatedFlag(newValue: boolean, newMessage = 'waiting for new calculation'): void {
  calculatedStatus.value = newMessage;
  calculated.value = newValue;
  emit('setActive', newValue);
}
</script>

<style scoped>
.help {
  font-weight: normal;
}
</style>