<script setup lang="ts">
const DEFAULT_TAB = 3;

import { onBeforeMount, ref } from 'vue'

import EnterFilterSpec from '@/components/EnterFilterSpec.vue'
import ShowLog from '@/components/ShowLog.vue'
import ShowFrequency from '@/components/ShowFrequency.vue'
import ShowFrequencyError from '@/components/ShowFrequencyError.vue'
import ShowStepImpulse from '@/components/ShowStepImpulse.vue'
import ShowTaps from '@/components/ShowTaps.vue'
import _firCalc from '@/models/FIRCalc'

let firCalcInitialized = ref(false);
let activeTab = ref(DEFAULT_TAB);
let calculated = ref(false);

function setActive(newValue: number): void { 
    activeTab.value = newValue; 
    if (!calculated.value && activeTab.value != DEFAULT_TAB)
        activeTab.value = DEFAULT_TAB;
}

function setCalculated(newValue: boolean): void { 
    calculated.value = newValue; 
    // Show the frequency response if there is a valid calculation
    if (calculated.value)
        setActive(0);
}

onBeforeMount(() => {
    _firCalc.addObserverInitialized(() => { 
        firCalcInitialized.value = true;
    });
});

</script>

<template>
  <div class="medium-container">
    <nav class="margin-top margin-bottom">
    | <a href="index.html">FIR LS</a> | <a href="about.html">About</a> |
    </nav>
    <EnterFilterSpec v-on:setActive="setCalculated"/>
    <br/>
    <div v-if="!firCalcInitialized">
      <p>FIR Calculation is initializing...</p>
      <p>If this message doesn't disappear, your browser is not able to run this application. Try again with a different browser.</p>
    </div>

    <a class="button" :class="{'muted-button': !calculated, 'round-button': activeTab==0}" @click.prevent="setActive(0)">Frequency response</a>&nbsp;
    <a class="button" :class="{'muted-button': !calculated, 'round-button': activeTab==1}"  @click.prevent="setActive(1)">Time response</a>&nbsp;
    <a class="button" :class="{'muted-button': !calculated, 'round-button': activeTab==2}"  @click.prevent="setActive(2)">Filter coefficients</a>&nbsp;
    <a class="button" :class="{'round-button': activeTab==3}"  @click.prevent="setActive(3)">Log messages</a>&nbsp;

    <ShowFrequencyError v-if="activeTab == 0"/>
    <ShowFrequency v-if="activeTab == 0"/>
    <ShowStepImpulse v-if="activeTab == 1"/>
    <ShowTaps v-if="activeTab == 2"/>
    <ShowLog v-if="activeTab == 3"/>
  </div>
</template>

<style scoped>
nav {
  font-size: 1.25rem;
}
</style>
