<script setup lang="ts">
/* ClickHelp: show help text after clicking on a help button. */

import { ref } from 'vue'
const showHelp = ref(false);
</script>

<template>
  <span>
      <button type="button" class="help-button" :aria-expanded="showHelp" title="Help"
          @click="showHelp = !showHelp">?</button>
      <span v-if="showHelp" class="help-text"><slot></slot></span>
  </span>
</template>

<style scoped>
/* kbd look from main.min.css, but as a focusable button */
.help-button {
    -webkit-appearance: none;
    display: inline-block;
    background-color: #f7f7f7;
    border: 1px solid #ccc;
    border-radius: 3px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, .2), inset 0 0 0 2px #fff;
    color: #333;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    margin: 0 .1em;
    padding: .1em .6em;
    text-shadow: 0 1px 0 #fff;
    cursor: pointer;
}

/* phrasing content, so it's valid HTML inside <label> and <p> */
.help-text {
    display: block;
}
</style>
