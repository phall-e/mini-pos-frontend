export default defineNuxtRouteMiddleware((to) => {
    const authStore = useAuthStore();

    const requiredPermission = to.meta.permission as string;

    if (!requiredPermission) return;

    // Admin bypass
    if (authStore.user?.isAdmin) {
        return;
    }

    const permissions = authStore.user?.permissions || [];

    const hasPermission = permissions.includes(
        requiredPermission,
    );

    if (!hasPermission) {
        navigateTo('/403');
    }
})