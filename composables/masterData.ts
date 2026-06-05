export const useMasterData = <T>(url: string) => {
  const data = ref<T[]>([]);
  const loadingMasterData = ref(false);

  const fetch = async () => {
    loadingMasterData.value = true;
    const config = useRuntimeConfig();
    url = `${config.public.apiBaseUrl}${url}`;
    const response: any = await useApi<{ payload: T[] }>(url);
    loadingMasterData.value = false;
    data.value = response.payload;
  }

  fetch();

  return data;
}
