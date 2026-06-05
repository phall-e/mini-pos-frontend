export default defineNuxtRouteMiddleware((to, from) => {
  const otpStore = useOtpStore()

  const isFromLogin = from.path === '/auth/login'

  if (!otpStore.isOptSent && !isFromLogin) {
    return navigateTo('/auth/login')
  }
})