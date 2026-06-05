export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('token')

  const isAuthenticated = !!token.value

  // ✅ Allow all auth صفحات (login, register, etc.)
  if (to.path.startsWith('/auth')) {
    // 👉 If already logged in → don't go back to login
    if (isAuthenticated && to.path === '/auth/login') {
      return navigateTo('/')
    }
    return
  }

  // ❌ Protect all other pages
  if (!isAuthenticated) {
    return navigateTo('/auth/login')
  }
})