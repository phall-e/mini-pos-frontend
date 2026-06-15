export const usePermission = () => {
    const authStore = useAuthStore();

    const can = (permission: string | string[]) => {
        const user = authStore.user;

        if (!user) return false;

        // Admin bypass
        if (user.isAdmin) return true;

        const permissions = user.permissions || [];

        if (typeof permission === 'string') {
            return permissions.includes(permission);
        }

        return permission.some((p) => permissions.includes(p));
    };

    const canAll = (permissions: string[]): boolean => {
        const user = authStore.user;

        if (!user) return false;

        if (user.isAdmin) return true;

        return permissions.every((p) => 
            user.permissions.includes(p),
        );
    };

    return {
        can,
        canAll,
    };
}
