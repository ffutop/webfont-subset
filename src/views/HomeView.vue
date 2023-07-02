<script>
import TheWelcome from "../components/TheWelcome.vue";

import generateSubsetList from "@/components/subset/copy.js";

export default {
  mounted() {
    this.subset();
  },
  methods: {
    subset() {
        generateSubsetList();
    }
  }
};
</script>

<template>
  <main>
    <TheWelcome />
  </main>
  <form method="post" enctype="multipart/from-data" action="api/upload">
    <input type="file" name="file" />
    <button type="submit">Submit</button>
  </form>
</template>
