<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[#374350]">{{ $t('ទិន្នន័យ') }}</h1>
      </div>
      <div class="flex items-center justify-end gap-2">
        <template v-if="pageHeaderOptions?.actions?.length">
          <el-button
            v-for="item in pageHeaderOptions?.actions"
            :key="item.title"
            :type="item.color"
            @click="item.onClick"
          ><Icon :size="20" :name="item.icon"/>&nbsp;{{ $t(item.title) }}</el-button>
        </template>
        <el-input
          v-if="searchEnabled"
          v-model="metaData.search"
          :placeholder="$t('search')+'...'"
          clearable
          @keydown.enter="loadItem"
        >
          <template #prefix>
            <Icon name="iconamoon:search"/>
          </template>
        </el-input>
        <template v-if="pageHeaderOptions?.rightActions?.length">
          <el-button
            v-for="item in pageHeaderOptions?.rightActions"
            :key="item.title"
            :type="item.color"
            @click="item.onClick"
          ><Icon :size="20" :name="item.icon"/>&nbsp;{{ $t(item.title) }}</el-button>
        </template>
        <el-button
          v-if="showCreateButton"
          type="primary"
          @click="openDialog(true)"
        >
          {{ $t('create') }}
        </el-button>
      </div>
    </div>    
    <div
      class="bg-white rounded-sm border mt-4"
    >
      <el-table
        ref="multipleTableRef"
        :data="items?.payload.data"
        stripe
        class="rounded-sm"
        row-key="id"
        @selection-change="handleSelectChange"
        v-loading="getLoading"
      >
        <template #empty>{{ $t('no_data') }}</template>
        <el-table-column 
          type="selection"
          width="55"
        />
        <template v-for="item in headers" :key="item.key">
          <el-table-column :width="item.width ? item.width : 200" :prop="item.key" :label="$t(item.title).toUpperCase()" :sortable="item.sort ? true : false">
            <template #default="{ row }">
              <slot :name="`item.${item.key}`" :item="row">
                <span class="line-clamp-1">{{ row[item.key] }}</span>
              </slot>
            </template>
          </el-table-column>
        </template>
        <el-table-column 
          v-if="showActionButton" 
          fixed="right" 
          :width="actionWidth" 
          :label="$t('columns.action')"
        >
          <template #default="scope">
            <div class="flex items-center justify-center gap-2">
              <slot
                name="item.action-button"
                :row="scope.row"
                :index="scope.$index"
              />
              <el-tag
                v-if="isItemPrintable"
                type="primary"
                class="cursor-pointer"
                @click="itemPrinting(scope.row.id)"
              >
                <Icon name="fluent:print-20-regular"/>
              </el-tag>
              <el-tag
                type="primary"
                class="cursor-pointer"
                v-can="`read-${props.moduleName}`"
              >
                <Icon name="carbon:view"/>
              </el-tag>
              <el-tag 
                v-if="isItemEditable"
                type="success"
                class="cursor-pointer"
                v-can="`update-${props.moduleName}`"
                @click="openDialog(false, scope.row.id)"
              >
                <Icon name="tabler:edit"/>
              </el-tag>
              <el-tag 
                v-if="isItemRemovable"
                type="danger"
                class="cursor-pointer"
                v-can="`delete-${props.moduleName}`"
                @click="itemDelete(scope.row.id)"
              >
                <Icon name="material-symbols-light:delete-outline"/>
              </el-tag>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex items-center justify-between mb-4 mx-3">
        <div class="text-[14px] flex items-center gap-2">
          <el-select
            class="!w-[80px]"
            v-model="metaData.limit"
          >
            <el-option v-for="item in itemPerPages" :label="item" :value="item"/>
          </el-select>
          {{ $t('total') }} : {{ items?.payload.meta.totalItems }} - {{ $t('page') }} {{ items?.payload.meta.currentPage }} {{ $t('of') }} {{ items?.payload.meta.totalPages }}
        </div>
        <el-pagination
          background
          layout="prev, pager, next"
          v-model="metaData.page"
          :page-size="metaData.limit"
          :total="items?.payload.meta.totalItems"
          @change="pageChange"
          class="mt-4"
        />
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog
      :title="`${dialogState.dialogState === CrudDialogState.CREATE ? $t('create') : $t('edit')} ${$t(pageHeaderOptions?.pageTitle || '')}`"
      v-model="isOpenDialog"
      align-center
      draggable
      :fullscreen="tableOptions.dialogOptions.fullscreen"
      :width="tableOptions.dialogOptions.width"
    >
      <el-form
        ref="formRef"
        :model="formData"
        label-position="top"
        label-width="auto"
        @submit.prevent="submit"
      >
        <slot name="form" :form-ref="formData"/>
        <el-button v-show="false" native-type="submit"/>
      </el-form>

      <template #footer>
        <el-button
          @click="isOpenDialog = false"
        >{{ $t('cancel') }}</el-button>
        <el-button 
          type="primary" 
          :disabled="crudLoading"
          @click="submit"
        >
            <Icon
              name="icon-park-outline:loading-one"
              v-if="crudLoading"
              class="animate-spin"
            />
            <span v-else>{{ $t('save') }}</span>
        </el-button>
      </template>
    </el-dialog>


    <!-- Document Printing -->
    <div class="fixed inset-0 z-50 bg-white hidden print:block">
      <slot 
        v-if="printItem"
        name="printable" 
        :print-item="printItem"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstance, TableInstance } from 'element-plus';
import { CrudDialogState } from '~/types/crud-dialog-state.type';
import type { Headers } from '~/types/header.type';
import type { IPageHeaderOption } from '~/types/PageHeaderOption'; 
import type { UseCrudOption } from '~/types/UseCrudOption'; 

const props = defineProps({
  moduleName: {
    type: String,
    required: true,
  },

  pageHeaderOptions: {
    type: Object as PropType<IPageHeaderOption>,
    required: false,
  },
  crudPath: { 
    type: String,
    required: true,
  },
  headers: {
    type: Array as PropType<Headers[]>, 
    required: true, 
  },
  tableOptions: {
    type: Object as PropType<UseCrudOption>,
    default: () => ({}),
  },
  searchEnabled: {
    type: Boolean,
    default: true,
  },
  showCreateButton: {
    type: Boolean,
    default: true,
  },
  isItemEditable: {
    type: Boolean,
    default: true,
  },
  isItemRemovable: {
    type: Boolean,
    default: true,
  },
  isItemPrintable: {
    type: Boolean,
    default: false,
  },
  showActionButton: {
    type: Boolean,
    default: true,
  }
});

const {
  crudPath,
  headers,
  pageHeaderOptions,
  tableOptions,
  searchEnabled,
  showCreateButton,
  isItemEditable,
  isItemRemovable,
  isItemPrintable,
  showActionButton,
} = props;

const slots = useSlots()

const actionWidth = computed(() => {
  let width = 40

  if (isItemEditable) width += 40
  if (isItemRemovable) width += 40
  if (isItemPrintable) width += 40
  if (slots['item.action-button']) width += 40

  return width
});

const breadcrumbsStore = useBreadcrumbStore();

const breads = computed(() => {
  return pageHeaderOptions?.breadcrumbs;
});

const pageTitle = computed(() => {
  return pageHeaderOptions?.pageTitle;
})

breadcrumbsStore.setBreadcrumbs(breads.value??[]);
breadcrumbsStore.setPageTitle(pageTitle.value??'');


const itemPerPages = ref<number[]>([
  10,
  20,
  30,
  40,
  50,
  60,
  70,
  80,
  90,
  100,
  200,
  300,
  400,
  500,
  600,
  1000,
])
const metaData = ref({
  search: '' as string,
  limit: 10 as number,
  page: 1 as number,
});


interface Meta {
  itemsPerPage: number,
  totalItems: number,
  currentPage: number,
  totalPages: number,
  sortBy: any[],
}

interface Payload {
  payload: {
    data: any[],
    meta: Meta,
    links: any,
  }
}
const getLoading = ref<boolean>(true);
const items = ref<Payload>();

const loadItem = async () => {
  try {
    getLoading.value = true;
    const response: any = await useApi(`${crudPath}?page=${metaData.value.page}&limit=${metaData.value.limit}&search=${metaData.value.search}`, {
      method: 'get',
    });
    items.value = response;
  } catch (error: any) {
    useNotification(error, 'error');
  } finally {
    getLoading.value = false;
  }
};

const pageChange = (page: number) => {
  console.log(page);
  metaData.value.page = page;
  loadItem();
};

onMounted(() => {
  loadItem();
});


const refreshList = () => {
  metaData.value.limit = 10;
  metaData.value.page = 1;
  metaData.value.search = '';
  loadItem();
}

// Select Item
const multipleTableRef = ref<TableInstance>();

const itemSelectedIds = ref<number[]>([]); 
  
const handleSelectChange = (val: any) => {
  itemSelectedIds.value = val.map((item: any) => item.id);
}


// Create
const isOpenDialog = ref<boolean>(false);
const formRef = ref<FormInstance>();
const formData = reactive<any>({});

const dialogState = useCrudDialogStateStore();
const itemId = ref<number | null>(null);
const openDialog = async (isCreating?: boolean, id?: number) =>{
  if (isCreating) {
    dialogState.setDialogState(CrudDialogState.CREATE);
    Object.assign(
      formData,
      tableOptions.defaultCreateValue
        ? JSON.parse(JSON.stringify(tableOptions.defaultCreateValue))
        : {}
    );
  } else {
    dialogState.setDialogState(CrudDialogState.EDIT);
  }

  isOpenDialog.value = true;

  if (id) {
    itemId.value = id;
    try {
      crudLoading.value = true;
      let response: any = await useApi(`${crudPath}/${id}`, {
        method: 'get',
      });
      if (response) {
        Object.assign(formData, tableOptions.mapEditValue ? tableOptions.mapEditValue(response.payload) : null);
      }
    } catch (error: any) {
      const message =
          error?.data?.message ||
          error?.message ||
          'Something went wrong'

        useNotification(message, 'error')
    } finally {
      crudLoading.value = false;
    }
  }
}

const crudLoading = ref<boolean>(false);
const { t: $t } = useI18n()
const submit = () => {
  formRef.value?.validate( async (valid) => {
    if (valid) {
      try {
        crudLoading.value = true;
        const response: any = await useApi(itemId.value ? `${crudPath}/${itemId.value}` : crudPath, {
          method: dialogState.dialogState === CrudDialogState.CREATE ? 'post' : 'put',
          body: formData,
        });
        if (response) {
          const action =
            dialogState.dialogState === CrudDialogState.CREATE
              ? 'inserted'
              : 'updated';

          useNotification(
            `${$t(pageHeaderOptions?.pageTitle || '')} ${$t(action)} ${$t('successfully')}`
          );
          isOpenDialog.value = false;
          loadItem();
        }
      } catch (error: any) {
        const message =
          error?.data?.message ||
          error?.message ||
          'Something went wrong'

        useNotification(message, 'error')
      } finally {
        crudLoading.value = false;
      }
    }
    return;
  })
  
}


const itemDelete = async (id: number) => {
  ElMessageBox.confirm(
    `Do you want to delete this item?`,
    'Warning',
    {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
  .then( async() => {
    try {
      const response = await useApi(crudPath+'/'+id, {
        method: 'delete',
      });
      if (response) {
        useMessage('Item deleted successfully');
        loadItem();
      }
    } catch (error: any) {
      useMessage('Failed to delete item', 'error');
    }
  })
  .catch(() => {
    useMessage('Delete canceled', 'info');
  })
}

watch(() => [isOpenDialog], () => {
  if (!isOpenDialog.value) {
    dialogState.setDialogState(CrudDialogState.DEFAULT);
    itemId.value = null;
    formRef.value?.resetFields();
    Object.keys(formData).forEach(key => {
      delete formData[key]
    });
  }
}, { deep: true });

// Document printing
const itemPrintLoading = ref<boolean>(false);
const printItem = ref<any>(null);
const itemPrinting = async(id: number) => {
  itemPrintLoading.value = true;
  try {
    const response: any = await useApi(`${crudPath}/${id}`);
    printItem.value = response.payload;
  } catch (error: any) {
    const message =
          error?.data?.message ||
          error?.message ||
          'Something went wrong'
  } finally {
    itemPrintLoading.value = false;
  }
}

watch(printItem, (val) => {
  if (val) {
    nextTick(() => window.print())
  }
});

defineExpose({ 
  refreshList,
  itemSelectedIds,
});

</script>
