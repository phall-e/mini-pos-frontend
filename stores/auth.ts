import { defineStore } from 'pinia'

interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  roles: string[]
  permissions: string[]
}

interface Token {
  accessToken: string
  expireIn: string
  tokenType: string
}


interface VerifyOtpResponse {
  payload: {
    users: User
    token: Token
    isRequiredOtp: boolean
  }
}

const cookieOptions = {
  maxAge: 60 * 60 * 24,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: string
      data?: {
        message?: string
      }
    }

    return maybeError.data?.message ?? maybeError.message ?? fallback
  }

  return fallback
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = useCookie<string | null>('token', cookieOptions)
  const users = useCookie<User | null>('users', cookieOptions)

  const isLoggedIn = computed(() => !!token.value)

  const login = async (payload: { username: string; password: string }) => {
    try {
      const response = await useApi<any>('auth/login', {
        method: 'post',
        body: payload,
      })
      const otpStore = useOtpStore()

      if (response.payload.isRequiredOtp) {
        otpStore.isOptSent = true;
        otpStore.username = response.payload.username;

        useNotification(
          response.payload.message || 'OTP sent successfully',
        );

        await navigateTo('/auth/otp-verify');
      } else {
        await setAuthentication(response);
      }

    } catch (error) {
      useMessage(getErrorMessage(error, 'Login failed'), 'error')
      throw error
    }
  }

  const verifyOtp = async (payload: { username: string; otp: string }) => {
    const username = payload.username.trim()
    const otp = payload.otp.trim()

    if (!username) {
      const message = 'Username is required to verify OTP'
      useMessage(message, 'error')
      throw new Error(message)
    }

    if (!/^\d{6}$/.test(otp)) {
      const message = 'Please enter a valid 6-digit OTP code'
      useMessage(message, 'error')
      throw new Error(message)
    }

    try {
      const response = await useApi<VerifyOtpResponse>('auth/otp-verify', {
        method: 'post',
        body: {
          username,
          otp,
        },
      })

      const accessToken = response.payload.token?.accessToken

      if (!accessToken || !response.payload.users) {
        throw new Error('Invalid OTP verification response')
      }

      await setAuthentication(response);
    } catch (error) {
      useMessage(getErrorMessage(error, 'OTP verification failed'), 'error')
      throw error
    }
  }

  const setAuthentication = async(payload: VerifyOtpResponse) => {
    token.value = payload.payload.token.accessToken,
    users.value = payload.payload.users
    user.value = payload.payload.users

    const otpStore = useOtpStore()
    otpStore.isOptSent = false
    otpStore.username = ''

    useNotification('OTP verified successfully')
    await navigateTo('/')
  }

  const logout = async () => {
    token.value = null
    users.value = null
    user.value = null

    const otpStore = useOtpStore()
    otpStore.isOptSent = false
    otpStore.username = ''

    localStorage.clear()
    sessionStorage.clear()

    await navigateTo('/auth/login')
  }

  return {
    user,
    token,
    users,
    isLoggedIn,
    login,
    verifyOtp,
    logout,
  }
})



