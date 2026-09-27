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

    <label>Frequency bands: <ClickHelp class="help">Each row is one frequency band. Rows can be entered in any order; use "Sort table" to reorder them by start frequency for a clearer overview. Bands must not overlap, and frequencies must not exceed the Nyquist frequency.</ClickHelp></label>
    <table class="striped-table bands-table">
        <thead>
            <tr>
                <th class="text-center">Freq. from [Hz]</th>
                <th class="text-center">Freq. to [Hz]</th>
                <th class="text-center">Gain from</th>
                <th class="text-center">Gain to</th>
                <th class="text-center">Weight</th>
                <th class="text-center">&nbsp;</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(row, index) in rows" :key="index">
                <td><input type="text" inputmode="decimal" class="cell-input text-center" :value="row.freqBegin"
                    @input="onCellInput($event, row, 'freqBegin')" :class="cellClass(row, 'freqBegin')"/></td>
                <td><input type="text" inputmode="decimal" class="cell-input text-center" :value="row.freqEnd"
                    @input="onCellInput($event, row, 'freqEnd')" :class="cellClass(row, 'freqEnd')"/></td>
                <td><input type="text" inputmode="decimal" class="cell-input text-center" :value="row.gainBegin"
                    @input="onCellInput($event, row, 'gainBegin')" :class="{ 'is-success': isCellOk(row.gainBegin) }"/></td>
                <td><input type="text" inputmode="decimal" class="cell-input text-center" :value="row.gainEnd"
                    @input="onCellInput($event, row, 'gainEnd')" :class="{ 'is-success': isCellOk(row.gainEnd) }"/></td>
                <td><input type="text" inputmode="decimal" class="cell-input text-center" :value="row.weight"
                    @input="onCellInput($event, row, 'weight')" :class="{ 'is-success': isCellOk(row.weight) }"/></td>
                <td class="text-center">
                    <button type="button" class="delete-row" @click="removeRow(index)" :disabled="rows.length === 1" aria-label="Delete band" title="Delete band">🗑️</button>
                </td>
            </tr>
        </tbody>
    </table>
    <button type="button" @click="addRow">+ Add band</button>
    &nbsp;
    <button type="button" @click="sortRows" :disabled="!rowsOk">Sort table</button>
    &nbsp;
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
/*
const mode = ref('manual');
// const isAutomatic = computed(() => { return mode.value == 'auto'; });

watch(mode, () => {
  updateCalculatedFlag(false);
});
*/

/* ======================================================== */
/*
const filter_type = ref('1');

watch(filter_type, () => {
  updateCalculatedFlag(false);
});
*/

/* ======================================================== */
interface BandRow {
  freqBegin: string;
  freqEnd: string;
  gainBegin: string;
  gainEnd: string;
  weight: string;
}

const rows = ref<BandRow[]>([
  { freqBegin: '0', freqEnd: '200', gainBegin: '2', gainEnd: '2', weight: '1' },
  { freqBegin: '400', freqEnd: '500', gainBegin: '0', gainEnd: '0', weight: '1' }
]);

// set before reordering rows via the Sort table button, so that reorder itself doesn't mark the result stale
let skipNextRowsWatch = false;
watch(rows, () => {
  if (skipNextRowsWatch) {
    skipNextRowsWatch = false;
    return;
  }
  updateCalculatedFlag(false);
}, { deep: true });

function isCellOk(value: string): boolean {
  return isNumeric(value);
}

/** a row's own begin must not be after its own end, and its end must not exceed the Nyquist frequency (sorting other rows can't fix either) */
function rowRangeOk(row: BandRow): boolean {
  return isCellOk(row.freqBegin) && isCellOk(row.freqEnd)
    && Number(row.freqBegin) <= Number(row.freqEnd)
    && Number(row.freqEnd) <= nyquistFrequency.value;
}

const rowsOk = computed(() => {
  return rows.value.length > 0 && rows.value.every(row =>
    isCellOk(row.freqBegin) && isCellOk(row.freqEnd) && isCellOk(row.gainBegin) && isCellOk(row.gainEnd) && isCellOk(row.weight) && rowRangeOk(row)
  );
});

/** rows sorted ascending by start frequency; only meaningful once rowsOk */
const sortedRows = computed(() => {
  return [...rows.value].sort((a, b) => Number(a.freqBegin) - Number(b.freqBegin));
});

const overlapOk = computed(() => {
  if (!rowsOk.value) return false;
  const sorted = sortedRows.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (Number(sorted[i + 1]!.freqBegin) < Number(sorted[i]!.freqEnd)) {
      return false;
    }
  }
  return true;
});

const tableOk = computed(() => { return rowsOk.value && overlapOk.value; });

const tapsText = ref('15');

function cellClass(row: BandRow, field: 'freqBegin' | 'freqEnd') {
  return { 'is-success': isCellOk(row[field]) && rowRangeOk(row) && overlapOk.value };
}

function onCellInput(event: Event, row: BandRow, field: keyof BandRow) {
  const target = event.target as HTMLInputElement;
  target.value = filterPositiveNumeric(target.value);
  row[field] = target.value;
}

function addRow(): void {
  rows.value.push({ freqBegin: '', freqEnd: '', gainBegin: '', gainEnd: '', weight: '' });
}

function removeRow(index: number): void {
  if (rows.value.length === 1) return;
  rows.value.splice(index, 1);
}

function sortRows(): void {
  skipNextRowsWatch = true;
  rows.value = sortedRows.value;
}

/* ======================================================== */
/** true if FIR LS calculations are done */
const calculated = ref(false);

const allInputsOk = computed(() => {
  return frequencyOk.value && tapsOk.value && tableOk.value;
});
const submitClass = computed(() => { return { 'muted-button': !allInputsOk.value }; });

function handleSubmit(): void {
  if (!allInputsOk.value)
    return;

  if (!_fircalc.isInitialized()) {
    addLog('FirCalc is not initalized');
    return;
  }

  const frequencies = sortedRows.value.flatMap(row => [Number(row.freqBegin), Number(row.freqEnd)]);
  const desiredBegin = sortedRows.value.map(row => Number(row.gainBegin));
  const desiredEnd = sortedRows.value.map(row => Number(row.gainEnd));
  const weights = sortedRows.value.map(row => Number(row.weight));

  const [success, result] = _fircalc.updateFilter(Number(tapsText.value), frequencies, desiredBegin, desiredEnd, weights, Number(frequencyText.value));
  const message = success ? "OK" : String(result);
  updateCalculatedFlag(success, message);
}

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

.bands-table {
  table-layout: fixed;
}

.bands-table th,
.bands-table td {
  padding: 0.25rem 0.4rem;
}

.bands-table th:last-child,
.bands-table td:last-child {
  width: 2.5rem;
}

.cell-input {
  width: 100%;
  padding: 0.35rem;
  margin-bottom: 0;
  box-sizing: border-box;
}

.delete-row {
  line-height: 1;
  font-size: 1.1em;
}

.delete-row:disabled {
  opacity: 0.35;
}
</style>
