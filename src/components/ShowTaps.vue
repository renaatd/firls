<template>
    <p>{{ filterSpec.taps.length }} taps - middle
        <span v-if="filterSpec.taps.length % 2 == 0">taps: {{ filterSpec.taps.length / 2 - 1 }}, {{ filterSpec.taps.length / 2 }}</span>
        <span v-else>tap: {{ (filterSpec.taps.length - 1) / 2 }} </span>
    </p>
    <table class="striped-table">
        <thead>
            <tr>
                <th class="text-right">No</th>
                <th class="text-right">Value</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in filterSpec.taps" :key="index">
                <td class="text-right">{{ index }}</td>
                <td class="text-right">{{ item }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script setup lang="ts">
import { filterSpec } from '@/models/FilterSpec';

</script>