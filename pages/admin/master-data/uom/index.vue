<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('uom.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('uom.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('uom.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button
            v-if="can('uom-create')"
            type="primary" 
            @click="openCreateDialog"
          >
            <Icon name="solar:add-circle-outline" size="18" />
            <span class="ml-1">{{ t('create') }}</span>
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        class="w-full"
        row-key="id"
      >
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column prop="nameEn" :label="t('columns.name_en')" min-width="220" />
        <el-table-column prop="nameKh" :label="t('columns.name_kh')" min-width="220" />
        <el-table-column :label="t('columns.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip 
                v-if="can('uom-edit')"
                :content="t('edit')" 
                placement="top"
              >
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip
                v-if="can('uom-delete')" 
                :content="t('delete')" 
                placement="top"
              >
                <el-button type="danger" circle @click="deleteItem(row)">
                  <Icon name="solar:trash-bin-trash-outline" size="17" />
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <span>{{ t('dashboard.rows') }}</span>
          <el-select v-model="params.limit" class="!w-[88px]" @change="handleLimitChange">
            <el-option
              v-for="size in pageSizes"
              :key="size"
              :label="size"
              :value="size"
            />
          </el-select>
          <span>{{ t('total') }}: {{ meta.totalItems }}</span>
        </div>

        <el-pagination
          v-model:current-page="params.page"
          background
          layout="prev, pager, next"
          :page-size="params.limit"
          :total="meta.totalItems"
          @current-change="loadItems"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingItem ? t('uom.edit_title') : t('uom.create_title')"
      width="520px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
    >
      <el-form
        id="uom-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item :label="t('columns.code')" prop="code">
          <el-input v-model="form.code" placeholder="PCS" />
        </el-form-item>
        <el-form-item :label="t('columns.name_en')" prop="nameEn">
          <el-input v-model="form.nameEn" placeholder="Piece" />
        </el-form-item>
        <el-form-item :label="t('columns.name_kh')" prop="nameKh">
          <el-input v-model="form.nameKh" :placeholder="t('columns.name_kh')" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="uom-form"
          :loading="submitting"
        >
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({
  permission: 'uom-read'
})

const { can } = usePermission();

interface Uom {
  id: number
  code: string
  nameEn: string
  nameKh: string
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: Uom[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: Uom
}

const endpoint = 'admin/master-data/uom'
const pageSizes = [10, 20, 50, 100]

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const items = ref<Uom[]>([])
const meta = reactive<ListMeta>({
  totalItems: 0,
  currentPage: 1,
  totalPages: 1,
})
const params = reactive({
  search: '',
  page: 1,
  limit: 10,
})

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const editingItem = ref<Uom | null>(null)

const emptyForm = () => ({
  code: '',
  nameEn: '',
  nameKh: '',
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: t('uom.code_required'), trigger: 'blur' }],
  nameEn: [{ required: true, message: t('uom.name_en_required'), trigger: 'blur' }],
  nameKh: [{ required: true, message: t('uom.name_kh_required'), trigger: 'blur' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.uom'))
  breadcrumbStore.setBreadcrumbs([t('menu.master_data'), t('menu.uom')])
})

watch(
  () => params.search,
  () => {
    params.page = 1
  },
)

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

const resetForm = (value = emptyForm()) => {
  Object.assign(form, value)
  nextTick(() => formRef.value?.clearValidate())
}

const loadItems = async () => {
  try {
    loading.value = true
    const response = await useApi<ListResponse>(
      `${endpoint}?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search)}`,
      { method: 'get' },
    )

    items.value = response.payload.data ?? []
    meta.totalItems = response.payload.meta?.totalItems ?? items.value.length
    meta.currentPage = response.payload.meta?.currentPage ?? params.page
    meta.totalPages = response.payload.meta?.totalPages ?? 1
  } catch (error) {
    useNotification(getErrorMessage(error, t('uom.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const openCreateDialog = () => {
  editingItem.value = null
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = async (item: Uom) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('uom.load_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) return

  try {
    submitting.value = true
    await useApi(
      editingItem.value ? `${endpoint}/${editingItem.value.id}` : endpoint,
      {
        method: editingItem.value ? 'put' : 'post',
        body: {
          code: form.code,
          nameEn: form.nameEn,
          nameKh: form.nameKh,
        },
      },
    )

    useMessage(editingItem.value ? t('uom.updated') : t('uom.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('uom.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: Uom) => {
  try {
    await ElMessageBox.confirm(
      t('uom.confirm_delete', { code: item.code }),
      t('uom.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('uom.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('uom.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
})
</script>
