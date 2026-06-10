<template>
  <div class="flex h-full items-center justify-center">
    <div class="text-center">
      <el-image 
        :src="image"
        class="h-[200px] mt-5"
      />
      <h1 class="text-4xl font-bold">
        403
      </h1>

      <p class="mt-2">
        {{ $t('you_do_not_have_permission_to_access_this_page') }}
      </p>

      <el-button
        type="primary"
        size="large"
        class="mt-4"
        @click="backDashboard"
      >{{ $t('back_dashboard') }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import image from '~/assets/images/system/unauthorized.png';

  useHead({
    title: 'MINI-POS-FOBIDDEN'
  });

  const backDashboard = () => {
    navigateTo('/');
  }
</script>