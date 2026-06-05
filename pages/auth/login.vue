<template>
  <div class="w-full h-screen flex items-start justify-between">
    <div class="w-[75%] h-screen">
      <img
        class="h-full w-full object-cover"
        src="~/assets/images/login/login-bg.png" alt="Login">
    </div>
    <div class="w-[25%] h-screen flex items-center justify-center">
      <el-form
        label-position="top"
        @submit.prevent="handleLogin"
        class="px-4 w-full"
      >
        <img 
          src="~/assets/images/logo/logo.png" 
          alt=""
          class="h-[90px] mx-auto mb-5"
        >
        <el-form-item
          label="ឈ្មោះអ្នកប្រើប្រាស់"
        >
          <el-input
            v-model="formData.username"
            placeholder="Username"
            clearable
          >
            <template #prefix>
              <Icon name="iconoir:user"/>
            </template>            

          </el-input>
        </el-form-item>
      <el-form-item
        label="អក្សរសម្ងាត់"
      >
        <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="Password"
            clearable
          >
            <template #prefix>
              <Icon name="material-symbols:lock-outline"/>
            </template>

          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            class="w-full"
            :disabled="loading"
            :loading="loading"
          >
            ចូលប្រព័ន្ធ
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
      layout: 'auth',
  });

  interface FormData {
    username: string;
    password: string;
  }

  const formData = ref<FormData>({
    username: 'admin',
    password: '123',
  });

  const loading = ref<boolean>(false);

  const auth = useAuthStore();

  const handleLogin = () => {
    loading.value = true;
    try {
      auth.login(formData.value);
    } catch (error) {

    } finally {
      loading.value = false;
    }
  }

</script>