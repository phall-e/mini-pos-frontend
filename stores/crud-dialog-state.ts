import { defineStore } from 'pinia'
import { CrudDialogState } from '~/types/crud-dialog-state.type';


export const useCrudDialogStateStore = defineStore('crudDialogStateStore', () => {
  const dialogState = ref<CrudDialogState>(CrudDialogState.CREATE);
  const setDialogState = (state: CrudDialogState) => {
    dialogState.value = state;
  };

  return {
    dialogState,
    setDialogState,
  }
})
