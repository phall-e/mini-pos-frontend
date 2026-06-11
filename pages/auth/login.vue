<template>
  <div class="w-full h-screen flex items-start justify-between overflow-hidden">
    <div class="hidden md:block md:w-[75%] h-screen">
      <el-image
        class="h-full w-full object-cover"
        fit="cover"
        :src="thumbnail" alt="Login"/>
    </div>
    <div class="w-[100%] md:w-[25%] h-screen flex items-center justify-center">
      <el-form
        label-position="top"
        @submit.prevent="handleLogin"
        class="px-4 w-full"
      >
        <div class="w-full flex items-center justify-center mb-4">
          <el-image 
            :src="logo" 
            alt=""
            class="h-[80px]"
          />
        </div>
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
  import thumbnail from '~/assets/images/login/login-bg.png';
  import logo from '~/assets/images/logo/logo.png';
  definePageMeta({
      layout: 'auth',
  });

  useSeoMeta({
    title: 'MINI POS - Login',
  })

  interface FormData {
    username: string;
    password: string;
  }

  const formData = ref<FormData>({
    username: 'guest',
    password: '123',
  });

  const loading = ref<boolean>(false);

  const auth = useAuthStore();

  const handleLogin = async () => {
    loading.value = true

    try {
      await auth.login(formData.value)
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }

</script>