<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('stock.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('stock.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('stock.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button type="primary" @click="openCreateDialog">
            <Icon name="solar:add-circle-outline" size="18" />
            <span class="ml-1">{{ t('create') }}</span>
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe class="w-full" row-key="id">
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column :label="t('columns.product_name')" min-width="240">
          <template #default="{ row }">
            {{ displayProduct(row.product, row.productId) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.min_stock')" min-width="130" align="right">
          <template #default="{ row }">{{ formatNumber(row.minStock) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_adjustment')" min-width="170" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockAdjustment) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_in')" min-width="130" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockIn) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_out')" min-width="130" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockOut) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_onhand')" min-width="150" align="right">
          <template #default="{ row }">{{ formatNumber(getStockOnHand(row)) }}</template>
        </el-table-column>
        <el-table-column prop="note" :label="t('columns.note')" min-width="220" show-overflow-tooltip />
        <el-table-column :label="t('columns.created_by')" min-width="170">
          <template #default="{ row }">{{ displayCreatedBy(row.createdBy ?? row.createdById) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.created_at')" min-width="190">
          <template #default="{ row }">{{ displayCreatedAt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('delete')" placement="top">
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
      :title="editingItem ? t('stock.edit_title') : t('stock.create_title')"
      width="760px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="stock-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item :label="t('columns.product_name')" prop="productId">
          <el-select
            v-model="form.productId"
            filterable
            :disabled="Boolean(editingItem)"
            :loading="productLoading"
            :placeholder="t('stock.select_product')"
            popper-class="stock-select-popper"
            class="w-full"
          >
            <el-option
              v-for="product in availableProductOptions"
              :key="product.id"
              :label="product.name"
              :value="product.id"
            />
          </el-select>
        </el-form-item>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.min_stock')" prop="minStock">
            <el-input-number v-model="form.minStock" :min="0" class="!w-full" />
          </el-form-item>
          <el-form-item :label="t('columns.stock_adjustment')" prop="stockAdjustment">
            <el-input-number v-model="form.stockAdjustment" class="!w-full" />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.stock_in')" prop="stockIn">
            <el-input-number v-model="form.stockIn" :min="0" class="!w-full" />
          </el-form-item>
          <el-form-item :label="t('columns.stock_out')" prop="stockOut">
            <el-input-number v-model="form.stockOut" :min="0" class="!w-full" />
          </el-form-item>
        </div>

        <el-form-item :label="t('columns.stock_onhand')">
          <el-input :model-value="formatNumber(formStockOnHand)" disabled />
        </el-form-item>

        <el-form-item :label="t('columns.note')" prop="note">
          <el-input
            v-model="form.note"
            type="textarea"
            :rows="3"
            :placeholder="t('columns.note')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" native-type="submit" form="stock-form" :loading="submitting">
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

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

interface StockItem {
  id: number
  productId: number
  createdById?: number | string | null
  minStock: number
  stockAdjustment: number
  stockIn: number
  stockOut: number
  note?: string | null
  product?: SelectOption | string | null
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
    data: StockItem[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: StockItem
}

interface RawSelectResponse {
  payload?: SelectOptionPayload[] | {
    data?: SelectOptionPayload[]
    items?: SelectOptionPayload[]
  }
  data?: SelectOptionPayload[]
  items?: SelectOptionPayload[]
}

const endpoint = 'admin/stocking/stocks'
const productEndpoint = 'admin/master-data/products/select-options'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const productLoading = ref(false)
const items = ref<StockItem[]>([])
const existingStockItems = ref<StockItem[]>([])
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
const editingItem = ref<StockItem | null>(null)

const emptyForm = () => ({
  productId: undefined as number | undefined,
  minStock: 0,
  stockAdjustment: 0,
  stockIn: 0,
  stockOut: 0,
  note: '',
})

const form = reactive(emptyForm())

const existingProductIds = computed(() => {
  return new Set(
    existingStockItems.value
      .filter(item => item.id !== editingItem.value?.id)
      .map(item => Number(item.productId))
      .filter(Number.isFinite),
  )
})

const availableProductOptions = computed(() => {
  return productOptions.value.filter((product) => {
    return product.id === form.productId || !existingProductIds.value.has(product.id)
  })
})

const formStockOnHand = computed(() => getStockOnHand(form))

const rules = computed<FormRules>(() => ({
  productId: [{ required: true, message: t('stock.product_required'), trigger: 'change' }],
  minStock: [{ required: true, type: 'number', min: 0, message: t('stock.min_stock_required'), trigger: 'blur' }],
  stockAdjustment: [{ required: true, type: 'number', message: t('stock.stock_adjustment_required'), trigger: 'blur' }],
  stockIn: [{ required: true, type: 'number', min: 0, message: t('stock.stock_in_required'), trigger: 'blur' }],
  stockOut: [{ required: true, type: 'number', min: 0, message: t('stock.stock_out_required'), trigger: 'blur' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.stock'))
  breadcrumbStore.setBreadcrumbs([t('menu.stocking'), t('menu.stock')])
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

const displayProduct = (product: StockItem['product'], productId: number | undefined) => {
  if (typeof product === 'string') return product
  if (product && typeof product === 'object') return product.name ?? product.code ?? String(product.id)
  if (!productId) return '-'

  return productOptions.value.find(option => option.id === productId)?.name ?? String(productId)
}

const displayCreatedBy = (createdBy: StockItem['createdBy'] | StockItem['createdById']) => {
  if (!createdBy) return '-'
  if (typeof createdBy === 'string' || typeof createdBy === 'number') return String(createdBy)

  return createdBy.username
    ?? createdBy.name
    ?? createdBy.nameEn
    ?? createdBy.nameKh
    ?? createdBy.email
    ?? '-'
}

const displayCreatedAt = (createdAt: StockItem['createdAt']) => {
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

const getStockOnHand = (item: Pick<StockItem, 'stockAdjustment' | 'stockIn' | 'stockOut'>) => {
  return Number(item.stockIn ?? 0) + Number(item.stockAdjustment ?? 0) - Number(item.stockOut ?? 0)
}

const resetForm = (value: Partial<StockItem> = emptyForm()) => {
  form.productId = value.productId
  form.minStock = Number(value.minStock ?? 0)
  form.stockAdjustment = Number(value.stockAdjustment ?? 0)
  form.stockIn = Number(value.stockIn ?? 0)
  form.stockOut = Number(value.stockOut ?? 0)
  form.note = value.note ?? ''
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
    useNotification(getErrorMessage(error, t('stock.load_products_failed')), 'error')
  } finally {
    productLoading.value = false
  }
}

const loadExistingStocks = async () => {
  try {
    const response = await useApi<ListResponse>(
      `${endpoint}?page=1&limit=10000&search=`,
      { method: 'get' },
    )
    existingStockItems.value = response.payload.data ?? []
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock.load_failed')), 'error')
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
    existingStockItems.value = items.value
    meta.totalItems = response.payload.meta?.totalItems ?? items.value.length
    meta.currentPage = response.payload.meta?.currentPage ?? params.page
    meta.totalPages = response.payload.meta?.totalPages ?? 1
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock.load_failed')), 'error')
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

  await Promise.all([
    loadProductOptions(),
    loadExistingStocks(),
  ])
}

const openEditDialog = async (item: StockItem) => {
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
    useNotification(getErrorMessage(error, t('stock.load_failed')), 'error')
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
          productId: form.productId,
          minStock: form.minStock,
          stockAdjustment: form.stockAdjustment,
          stockIn: form.stockIn,
          stockOut: form.stockOut,
          note: form.note || null,
        },
      },
    )

    useMessage(editingItem.value ? t('stock.updated') : t('stock.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: StockItem) => {
  try {
    await ElMessageBox.confirm(
      t('stock.confirm_delete', { product: displayProduct(item.product, item.productId) }),
      t('stock.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('stock.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('stock.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadProductOptions()
})
</script>
