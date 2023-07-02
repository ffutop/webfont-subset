<script>
import TheWelcome from "../components/TheWelcome.vue";

import generateSubsetList from "@/components/subset/subset.js";

export default {
  mounted() {
    this.subset();
  },
  methods: {
    subset() {
      fetch("Noto_Sans_SC/NotoSansSC-Regular.otf")
        .then(x => {
          return x.arrayBuffer();
        })
        .then(fontBlob => {
          generateSubsetList("Noto", fontBlob);
        });
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
