<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <el-icon size="28" color="#409EFF">
            <Message />
          </el-icon>
        </div>

        <h1 class="text-2xl font-bold text-gray-800">
          Verify OTP Code
        </h1>

        <p class="text-gray-500 mt-2">
          We've sent a verification code to
        </p>

        <p class="font-medium text-gray-700">
          {{ useOtp.username }}
        </p>
      </div>

      <div class="flex justify-center gap-3 mb-6">
        <input
          v-for="(_, index) in otp"
          :key="index"
          :ref="el => otpRefs[index] = el"
          v-model="otp[index]"
          maxlength="1"
          type="text"
          class="w-14 h-14 border border-gray-300 rounded-xl text-center text-xl font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
          @input="handleInput(index)"
          @keydown.backspace="handleBackspace(index)"
        />
      </div>

      <el-button
        type="primary"
        size="large"
        class="w-full"
        :loading="loading"
        @click="verifyOtp"
      >
        Verify OTP
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Message } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

definePageMeta({
    middleware: ['otp'],
});

const useOtp = useOtpStore();
const useAuth = useAuthStore();

const loading = ref(false)

const otp = ref(['', '', '', '', '', ''])

const otpRefs = ref<HTMLInputElement[]>([])

const handleInput = (index: number) => {
  const value = otp.value[index]

  if (!/^\d$/.test(value)) {
    otp.value[index] = ''
    return
  }

  if (index < 5) {
    otpRefs.value[index + 1]?.focus()
  }
}

const handleBackspace = (index: number) => {
  if (!otp.value[index] && index > 0) {
    otpRefs.value[index - 1]?.focus()
  }
}

const verifyOtp = async () => {
  const code = otp.value.join('')

  if (code.length !== 6) {
    ElMessage.error('Please enter complete OTP code')
    return
  }

  try {
    loading.value = true

    console.log(code)
    const response = await useAuth.verifyOtp({
      username: useOtp.username,
      otp: code,
    });
    
  } catch(error) {
    console.log('Error', error);
  } finally {
    loading.value = false
  }
}

</script>