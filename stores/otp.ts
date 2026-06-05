export const useOtpStore = defineStore('opt', () => {
    const isOptSent = ref<boolean>(false);
    const username = ref<string>('');

    return {
        isOptSent,
        username,
    };
})