<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('stock_adjustment.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('stock_adjustment.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('stock_adjustment.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button v-if="can('stock-adjustment-create')" type="primary" @click="openCreateDialog">
            <Icon name="solar:add-circle-outline" size="18" />
            <span class="ml-1">{{ t('create') }}</span>
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe class="w-full" row-key="id">
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column :label="t('columns.adjustment_date')" min-width="170">
          <template #default="{ row }">{{ displayDate(row.adjustmentDate) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.product_name')" min-width="240">
          <template #default="{ row }">{{ displayProduct(row.product, row.productId) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.quantity')" min-width="130" align="right">
          <template #default="{ row }">{{ formatNumber(row.quantity) }}</template>
        </el-table-column>
        <el-table-column prop="note" :label="t('columns.note')" min-width="220" show-overflow-tooltip />
        <el-table-column :label="t('columns.attachments')" min-width="140" align="center">
          <template #default="{ row }">{{ getAttachmentCount(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.created_by')" min-width="170">
          <template #default="{ row }">{{ displayCreatedBy(row.createdBy ?? row.createdById) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.created_at')" min-width="190">
          <template #default="{ row }">{{ displayCreatedAt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip v-if="can('stock-adjustment-edit')" :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="can('stock-adjustment-delete')" :content="t('delete')" placement="top">
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
            <el-option v-for="size in pageSizes" :key="size" :label="size" :value="size" />
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
      :title="editingItem ? t('stock_adjustment.edit_title') : t('stock_adjustment.create_title')"
      width="820px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="stock-adjustment-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.adjustment_date')" prop="adjustmentDate">
            <el-date-picker
              v-model="form.adjustmentDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="t('columns.adjustment_date')"
              popper-class="stock-adjustment-popper"
              class="!w-full"
            />
          </el-form-item>

          <el-form-item :label="t('columns.product_name')" prop="productId">
            <el-select
              v-model="form.productId"
              filterable
              :loading="productLoading"
              :placeholder="t('stock_adjustment.select_product')"
              popper-class="stock-adjustment-popper"
              class="w-full"
            >
              <el-option
                v-for="product in productOptions"
                :key="product.id"
                :label="product.name"
                :value="product.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item :label="t('columns.quantity')" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" class="!w-full" />
        </el-form-item>

        <el-form-item :label="t('columns.note')" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            :rows="3"
            :placeholder="t('columns.note')"
          />
        </el-form-item>

        <el-tabs v-model="activeFormTab" type="border-card">
          <el-tab-pane :label="t('columns.attachment')" name="attachment">
            <DropZone v-model="form.attachments" />
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" native-type="submit" form="stock-adjustment-form" :loading="submitting">
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import DropZone from '~/@core/components/DropZone.vue'

definePageMeta({
  permission: 'stock-adjustment-read'
})

useHead({
  title: 'MINI-POS-STOCK-ADJUSTMENT'
})

const { can } = usePermission();

interface SelectOption {
  id: number
  name: string
  code?: string
}

interface SelectOptionPayload {
  id?: number
  value?: number
  name?: string
  label?: string
  code?: string
  nameEn?: string
  nameKh?: string
}

interface AttachmentFile {
  fileName: string
  publicId?: string
  public_id?: string
  url?: string
  secureUrl?: string
  secure_url?: string
  path?: string
  resourceType?: string
  resource_type?: string
  format?: string
  bytes?: number
  originalFilename?: string
  original_filename?: string
}

interface StockAdjustment {
  id: number
  adjustmentDate: string | Date
  productId: number
  quantity: number
  note?: string | null
  attachment?: AttachmentFile[]
  attachments?: AttachmentFile[]
  product?: SelectOption | string | null
  createdById?: number | string | null
  createdBy?: string | number | {
    username?: string
    name?: string
    nameEn?: string
    nameKh?: string
    email?: string
  } | null
  createdAt?: string | Date | null
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: StockAdjustment[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: StockAdjustment
}

interface RawSelectResponse {
  payload?: SelectOptionPayload[] | {
    data?: SelectOptionPayload[]
    items?: SelectOptionPayload[]
  }
  data?: SelectOptionPayload[]
  items?: SelectOptionPayload[]
}

const endpoint = 'admin/stocking/stock-adjustments'
const productEndpoint = 'admin/master-data/products/select-options'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const productLoading = ref(false)
const items = ref<StockAdjustment[]>([])
const productOptions = ref<SelectOption[]>([])
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
const editingItem = ref<StockAdjustment | null>(null)
const activeFormTab = ref('attachment')

const emptyForm = () => ({
  adjustmentDate: new Date().toISOString().slice(0, 10),
  productId: undefined as number | undefined,
  quantity: 1,
  note: '',
  attachments: [] as AttachmentFile[],
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  adjustmentDate: [{ required: true, message: t('stock_adjustment.adjustment_date_required'), trigger: 'change' }],
  productId: [{ required: true, message: t('stock_adjustment.product_required'), trigger: 'change' }],
  quantity: [{ required: true, type: 'number', min: 1, message: t('stock_adjustment.quantity_required'), trigger: 'blur' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.stock_adjustment'))
  breadcrumbStore.setBreadcrumbs([t('menu.stocking'), t('menu.stock_adjustment')])
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

const selectPayloadItems = (response: RawSelectResponse) => {
  if (Array.isArray(response.payload)) return response.payload
  if (response.payload && typeof response.payload === 'object') {
    if (Array.isArray(response.payload.data)) return response.payload.data
    if (Array.isArray(response.payload.items)) return response.payload.items
  }
  if (Array.isArray(response.data)) return response.data
  if (Array.isArray(response.items)) return response.items

  return []
}

const normalizeOption = (option: SelectOptionPayload): SelectOption => ({
  id: Number(option.id ?? option.value),
  name: option.label
    ?? option.name
    ?? option.nameEn
    ?? option.nameKh
    ?? option.code
    ?? String(option.id ?? option.value),
  code: option.code,
})

const displayProduct = (product: StockAdjustment['product'], productId: number | undefined) => {
  if (typeof product === 'string') return product
  if (product && typeof product === 'object') return product.name ?? product.code ?? String(product.id)
  if (!productId) return '-'

  return productOptions.value.find(option => option.id === productId)?.name ?? String(productId)
}

const displayCreatedBy = (createdBy: StockAdjustment['createdBy'] | StockAdjustment['createdById']) => {
  if (!createdBy) return '-'
  if (typeof createdBy === 'string' || typeof createdBy === 'number') return String(createdBy)

  return createdBy.username
    ?? createdBy.name
    ?? createdBy.nameEn
    ?? createdBy.nameKh
    ?? createdBy.email
    ?? '-'
}

const displayDate = (value: StockAdjustment['adjustmentDate']) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

const displayCreatedAt = (createdAt: StockAdjustment['createdAt']) => {
  if (!createdAt) return '-'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const getAttachmentCount = (item: Pick<StockAdjustment, 'attachment' | 'attachments'>) => {
  return (item.attachments ?? item.attachment ?? []).length
}

const resetForm = (value: Partial<StockAdjustment> = emptyForm()) => {
  form.adjustmentDate = value.adjustmentDate ? String(value.adjustmentDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  form.productId = value.productId
  form.quantity = Number(value.quantity ?? 1)
  form.note = value.note ?? ''
  form.attachments = [...(value.attachments ?? value.attachment ?? [])]
  activeFormTab.value = 'attachment'
  nextTick(() => formRef.value?.clearValidate())
}

const loadProductOptions = async () => {
  try {
    productLoading.value = true
    const response = await useApi<RawSelectResponse>(productEndpoint, { method: 'get' })
    productOptions.value = selectPayloadItems(response)
      .map(normalizeOption)
      .filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_adjustment.load_products_failed')), 'error')
  } finally {
    productLoading.value = false
  }
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
    useNotification(getErrorMessage(error, t('stock_adjustment.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const openCreateDialog = async () => {
  editingItem.value = null
  resetForm()
  dialogVisible.value = true

  if (!productOptions.value.length) {
    await loadProductOptions()
  }
}

const openEditDialog = async (item: StockAdjustment) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!productOptions.value.length) {
    await loadProductOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_adjustment.load_failed')), 'error')
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
          adjustmentDate: form.adjustmentDate,
          productId: form.productId,
          quantity: form.quantity,
          note: form.note || null,
          attachments: form.attachments,
        },
      },
    )

    useMessage(editingItem.value ? t('stock_adjustment.updated') : t('stock_adjustment.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_adjustment.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: StockAdjustment) => {
  try {
    await ElMessageBox.confirm(
      t('stock_adjustment.confirm_delete', { product: displayProduct(item.product, item.productId) }),
      t('stock_adjustment.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('stock_adjustment.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('stock_adjustment.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadProductOptions()
})
</script>
