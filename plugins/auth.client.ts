export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  if (!authStore.user && authStore.users) {
    authStore.user = authStore.users
  }
})