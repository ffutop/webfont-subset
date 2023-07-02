<template>
  <div class="container mx-auto">
    <div class="bg-sky-50 rounded-lg shadow-md p-3 my-3">
      <p class="text-sky-400 text-3xl font-medium mt-2">中文网络字体分片工具</p>
    </div>
    <div class="relative">
      <div class="bg-sky-50 z-10 rounded-lg shadow-md p-3 my-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mx-auto w-8 h-8 stroke-sky-400 stroke-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
          />
        </svg>
        <p class="text-sky-400 text-xl font-medium mt-2 text-center">选择字体</p>
      </div>
      <input
        class="opacity-0 absolute z-50 hover:cursor-pointer w-full h-full top-0 left-0"
        type="file"
        ref="fontFile"
        @change="uploadFile"
      />
    </div>
  </div>
</template>

<script>
import generateSubsetList from "@/components/subset/subset.js";

export default {
  mounted() {},
  methods: {
    uploadFile() {
      const file = this.$refs.fontFile.files[0];
      const reader = new FileReader();

      reader.onload = event => {
        const contents = event.target.result;
        const fontBlob = new Uint8Array(contents);
        generateSubsetList(file.name, "swap", fontBlob);
      };

      reader.readAsArrayBuffer(file);
    }
  }
};
</script>
