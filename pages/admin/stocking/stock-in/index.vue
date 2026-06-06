<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('stock_in.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('stock_in.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('stock_in.search_placeholder')"
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
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column :label="t('columns.stock_in_date')" min-width="170">
          <template #default="{ row }">{{ displayDate(row.stockInDate) }}</template>
        </el-table-column>
        <el-table-column :label="t('menu.purchase_order')" min-width="190">
          <template #default="{ row }">{{ displayPurchaseOrder(row.purchaseOrder, row.purchaseOrderId) }}</template>
        </el-table-column>
        <el-table-column prop="invoiceReference" :label="t('columns.invoice_reference')" min-width="180" show-overflow-tooltip />
        <el-table-column :label="t('columns.total_quantity')" min-width="150" align="right">
          <template #default="{ row }">{{ formatNumber(getTotalQuantity(row.items)) }}</template>
        </el-table-column>
        <el-table-column prop="description" :label="t('columns.description')" min-width="220" show-overflow-tooltip />
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
      :title="editingItem ? t('stock_in.edit_title') : t('stock_in.create_title')"
      width="880px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="stock-in-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.code')" prop="code">
            <el-input v-model="form.code" disabled placeholder="SI-001" />
          </el-form-item>
          <el-form-item :label="t('columns.stock_in_date')" prop="stockInDate">
            <el-date-picker
              v-model="form.stockInDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="t('columns.stock_in_date')"
              :teleported="false"
              popper-class="stock-in-popper"
              class="!w-full"
            />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('menu.purchase_order')" prop="purchaseOrderId">
            <el-select
              v-model="form.purchaseOrderId"
              filterable
              :loading="purchaseOrderLoading || vendorLoading"
              :placeholder="t('stock_in.select_purchase_order')"
              :teleported="false"
              popper-class="stock-in-popper"
              class="w-full"
              @change="handlePurchaseOrderChange"
            >
              <el-option
                v-for="order in purchaseOrderOptions"
                :key="order.id"
                :label="formatPurchaseOrderLabel(order)"
                :value="order.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('columns.invoice_reference')" prop="invoiceReference">
            <el-input v-model="form.invoiceReference" :placeholder="t('columns.invoice_reference')" />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.order_date')">
            <el-input :model-value="selectedPurchaseOrderDate" disabled />
          </el-form-item>
          <el-form-item :label="t('menu.vendor')">
            <el-input :model-value="selectedPurchaseOrderVendor" disabled />
          </el-form-item>
        </div>

        <el-form-item :label="t('columns.description')" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            :placeholder="t('columns.description')"
          />
        </el-form-item>

        <el-form-item :label="t('columns.total_quantity')">
          <el-input :model-value="formatNumber(totalQuantity)" disabled />
        </el-form-item>

        <el-tabs v-model="activeFormTab" type="border-card">
          <el-tab-pane :label="t('purchase_order.item_tab')" name="items">
            <div class="space-y-3">
              <el-table :data="form.items" stripe>
                <template #empty>{{ t('no_data') }}</template>
                <el-table-column :label="t('columns.product_name')" min-width="260">
                  <template #default="{ row, $index }">
                    <el-form-item
                      :prop="`items.${$index}.productId`"
                      :rules="[{ required: true, message: t('stock_in.product_required'), trigger: 'change' }]"
                      class="!mb-0"
                    >
                      <el-select
                        v-model="row.productId"
                        filterable
                        disabled
                        :loading="productLoading"
                        :placeholder="t('stock_in.select_product')"
                        :teleported="false"
                        popper-class="stock-in-popper"
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
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.quantity')" min-width="160">
                  <template #default="{ row, $index }">
                    <el-form-item
                      :prop="`items.${$index}.quantity`"
                      :rules="[{ required: true, type: 'number', min: 1, message: t('stock_in.quantity_required'), trigger: 'blur' }]"
                      class="!mb-0"
                    >
                      <el-input-number v-model="row.quantity" :min="1" disabled class="!w-full" />
                    </el-form-item>
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.note')" min-width="240">
                  <template #default="{ row }">
                    <el-input v-model="row.note" :placeholder="t('columns.note')" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane :label="t('columns.attachment')" name="attachment">
            <DropZone v-model="form.attachments" />
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" native-type="submit" form="stock-in-form" :loading="submitting">
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import DropZone from '~/@core/components/DropZone.vue'

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

interface PurchaseOrderOptionPayload extends SelectOptionPayload {
  orderDate?: string | Date
  vendorId?: number
  vendor?: SelectOption | string | null
}

interface PurchaseOrderOption extends SelectOption {
  orderDate?: string | Date
  vendorId?: number
  vendor?: SelectOption | string | null
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

interface StockInItem {
  id?: number
  stockInId?: number
  productId?: number
  quantity: number
  note?: string | null
  product?: SelectOption | string | null
}

interface StockIn {
  id: number
  code: string
  purchaseOrderId: number
  stockInDate: string | Date
  invoiceReference: string
  description?: string | null
  attachment?: AttachmentFile[]
  attachments?: AttachmentFile[]
  items?: StockInItem[]
  purchaseOrder?: PurchaseOrderOption | string | null
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

interface PurchaseOrderDetailItem {
  id?: number
  productId?: number
  quantity?: number
  note?: string | null
  product?: SelectOption | string | null
}

interface PurchaseOrderDetail {
  id: number
  code: string
  orderDate?: string | Date
  vendorId?: number
  vendor?: SelectOption | string | null
  items?: PurchaseOrderDetailItem[]
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: StockIn[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: StockIn
}

interface PurchaseOrderResponse {
  payload: PurchaseOrderDetail
}

interface GenerateCodeResponse {
  payload?: {
    code?: string
  }
}

interface RawSelectResponse<T = SelectOptionPayload> {
  payload?: T[] | {
    data?: T[]
    items?: T[]
  }
  data?: T[]
  items?: T[]
}

const endpoint = 'admin/stocking/stock-ins'
const purchaseOrderSelectEndpoint = 'admin/purchasing/purchase-orders/select-options/completed'
const purchaseOrderEndpoint = 'admin/purchasing/purchase-orders'
const vendorEndpoint = 'admin/master-data/vendors/select-options'
const productEndpoint = 'admin/master-data/products/select-options'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const codeLoading = ref(false)
const purchaseOrderLoading = ref(false)
const vendorLoading = ref(false)
const productLoading = ref(false)
const items = ref<StockIn[]>([])
const purchaseOrderOptions = ref<PurchaseOrderOption[]>([])
const vendorOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const selectedPurchaseOrder = ref<PurchaseOrderDetail | null>(null)
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
const editingItem = ref<StockIn | null>(null)
const activeFormTab = ref('items')

const emptyStockInItem = (): StockInItem => ({
  productId: undefined,
  quantity: 1,
  note: '',
})

const emptyForm = () => ({
  code: '',
  purchaseOrderId: undefined as number | undefined,
  stockInDate: new Date().toISOString().slice(0, 10),
  invoiceReference: '',
  description: '',
  attachments: [] as AttachmentFile[],
  items: [emptyStockInItem()],
})

const form = reactive(emptyForm())

const totalQuantity = computed(() => getTotalQuantity(form.items))

const selectedPurchaseOrderDate = computed(() => {
  return displayDate(selectedPurchaseOrder.value?.orderDate)
})

const selectedPurchaseOrderVendor = computed(() => {
  const order = selectedPurchaseOrder.value
  if (!order) return '-'

  return displayVendor(order.vendor, order.vendorId)
})

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: t('stock_in.code_required'), trigger: 'blur' }],
  purchaseOrderId: [{ required: true, message: t('stock_in.purchase_order_required'), trigger: 'change' }],
  stockInDate: [{ required: true, message: t('stock_in.stock_in_date_required'), trigger: 'change' }],
  invoiceReference: [{ required: true, message: t('stock_in.invoice_reference_required'), trigger: 'blur' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.stock_in'))
  breadcrumbStore.setBreadcrumbs([t('menu.stocking'), t('menu.stock_in')])
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

const selectPayloadItems = <T,>(response: RawSelectResponse<T>) => {
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

const normalizePurchaseOrderOption = (option: PurchaseOrderOptionPayload): PurchaseOrderOption => ({
  id: Number(option.id ?? option.value),
  name: option.label
    ?? option.name
    ?? option.code
    ?? String(option.id ?? option.value),
  code: option.code,
  orderDate: option.orderDate,
  vendorId: option.vendorId,
  vendor: option.vendor,
})

const displayVendor = (vendor: PurchaseOrderOption['vendor'], vendorId: number | undefined) => {
  if (typeof vendor === 'string') return vendor
  if (vendor && typeof vendor === 'object') return vendor.name ?? vendor.code ?? String(vendor.id)
  if (!vendorId) return '-'

  return vendorOptions.value.find(option => option.id === vendorId)?.name ?? String(vendorId)
}

const formatPurchaseOrderLabel = (order: PurchaseOrderOption) => {
  const parts = [
    order.code ?? order.name,
    order.orderDate ? displayDate(order.orderDate) : '',
    displayVendor(order.vendor, order.vendorId),
  ].filter(Boolean)

  return parts.join(' - ')
}

const displayPurchaseOrder = (purchaseOrder: StockIn['purchaseOrder'], purchaseOrderId: number | undefined) => {
  if (typeof purchaseOrder === 'string') return purchaseOrder
  if (purchaseOrder && typeof purchaseOrder === 'object') return purchaseOrder.code ?? purchaseOrder.name ?? String(purchaseOrder.id)
  if (!purchaseOrderId) return '-'

  return purchaseOrderOptions.value.find(option => option.id === purchaseOrderId)?.code ?? String(purchaseOrderId)
}

const displayCreatedBy = (createdBy: StockIn['createdBy'] | StockIn['createdById']) => {
  if (!createdBy) return '-'
  if (typeof createdBy === 'string' || typeof createdBy === 'number') return String(createdBy)

  return createdBy.username
    ?? createdBy.name
    ?? createdBy.nameEn
    ?? createdBy.nameKh
    ?? createdBy.email
    ?? '-'
}

const displayDate = (value?: string | Date) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

const displayCreatedAt = (createdAt: StockIn['createdAt']) => {
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

const getAttachmentCount = (item: Pick<StockIn, 'attachment' | 'attachments'>) => {
  return (item.attachments ?? item.attachment ?? []).length
}

const getTotalQuantity = (stockInItems: StockInItem[] = []) => {
  return stockInItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
}

const syncSelectedPurchaseOrder = (purchaseOrderId?: number) => {
  const selectedOption = purchaseOrderOptions.value.find(option => option.id === purchaseOrderId)

  selectedPurchaseOrder.value = selectedOption
    ? {
        id: selectedOption.id,
        code: selectedOption.code ?? selectedOption.name,
        orderDate: selectedOption.orderDate,
        vendorId: selectedOption.vendorId,
        vendor: selectedOption.vendor,
      }
    : null
}

const resetForm = (value: Partial<StockIn> = emptyForm()) => {
  form.code = value.code ?? ''
  form.purchaseOrderId = value.purchaseOrderId
  form.stockInDate = value.stockInDate ? String(value.stockInDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  form.invoiceReference = value.invoiceReference ?? ''
  form.description = value.description ?? ''
  form.attachments = [...(value.attachments ?? value.attachment ?? [])]
  form.items = (value.items?.length ? value.items : [emptyStockInItem()]).map(item => ({
    id: item.id,
    stockInId: item.stockInId,
    productId: item.productId,
    quantity: Number(item.quantity ?? 1),
    note: item.note ?? '',
    product: item.product,
  }))
  syncSelectedPurchaseOrder(value.purchaseOrderId)
  activeFormTab.value = 'items'
  nextTick(() => formRef.value?.clearValidate())
}

const loadGeneratedCode = async () => {
  try {
    codeLoading.value = true
    const response = await useApi<GenerateCodeResponse>(`${endpoint}/generate-code`, { method: 'get' })

    form.code = response.payload?.code ?? form.code
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.generate_code_failed')), 'error')
  } finally {
    codeLoading.value = false
  }
}

const loadProductOptions = async () => {
  try {
    productLoading.value = true
    const response = await useApi<RawSelectResponse>(productEndpoint, { method: 'get' })
    productOptions.value = selectPayloadItems(response)
      .map(normalizeOption)
      .filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.load_products_failed')), 'error')
  } finally {
    productLoading.value = false
  }
}

const loadVendorOptions = async () => {
  try {
    vendorLoading.value = true
    const response = await useApi<RawSelectResponse>(vendorEndpoint, { method: 'get' })
    vendorOptions.value = selectPayloadItems(response)
      .map(normalizeOption)
      .filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.load_vendors_failed')), 'error')
  } finally {
    vendorLoading.value = false
  }
}

const loadPurchaseOrderOptions = async () => {
  try {
    purchaseOrderLoading.value = true
    const response = await useApi<RawSelectResponse<PurchaseOrderOptionPayload>>(purchaseOrderSelectEndpoint, { method: 'get' })
    purchaseOrderOptions.value = selectPayloadItems(response)
      .map(normalizePurchaseOrderOption)
      .filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.load_purchase_orders_failed')), 'error')
  } finally {
    purchaseOrderLoading.value = false
  }
}

const loadPurchaseOrderDetail = async (purchaseOrderId: number) => {
  const response = await useApi<PurchaseOrderResponse>(`${purchaseOrderEndpoint}/${purchaseOrderId}`, { method: 'get' })
  selectedPurchaseOrder.value = response.payload

  form.items = (response.payload.items?.length ? response.payload.items : [emptyStockInItem()]).map(item => ({
    productId: item.productId,
    quantity: Number(item.quantity ?? 1),
    note: item.note ?? '',
    product: item.product,
  }))
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
    useNotification(getErrorMessage(error, t('stock_in.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const handlePurchaseOrderChange = async (purchaseOrderId: number) => {
  syncSelectedPurchaseOrder(purchaseOrderId)

  if (!purchaseOrderId) return

  try {
    purchaseOrderLoading.value = true
    await loadPurchaseOrderDetail(purchaseOrderId)
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.load_purchase_order_failed')), 'error')
  } finally {
    purchaseOrderLoading.value = false
  }
}

const openCreateDialog = async () => {
  editingItem.value = null
  resetForm()
  dialogVisible.value = true

  await Promise.all([
    loadGeneratedCode(),
    loadPurchaseOrderOptions(),
    loadVendorOptions(),
    loadProductOptions(),
  ])
}

const openEditDialog = async (item: StockIn) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!purchaseOrderOptions.value.length || !vendorOptions.value.length || !productOptions.value.length) {
    await Promise.all([
      loadPurchaseOrderOptions(),
      loadVendorOptions(),
      loadProductOptions(),
    ])
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)

    if (response.payload.purchaseOrderId) {
      await loadPurchaseOrderDetail(response.payload.purchaseOrderId)
      form.items = (response.payload.items?.length ? response.payload.items : form.items).map(stockInItem => ({
        id: stockInItem.id,
        stockInId: stockInItem.stockInId,
        productId: stockInItem.productId,
        quantity: Number(stockInItem.quantity ?? 1),
        note: stockInItem.note ?? '',
        product: stockInItem.product,
      }))
    }
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.load_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    activeFormTab.value = 'items'
    return
  }

  try {
    submitting.value = true
    await useApi(
      editingItem.value ? `${endpoint}/${editingItem.value.id}` : endpoint,
      {
        method: editingItem.value ? 'put' : 'post',
        body: {
          code: form.code,
          purchaseOrderId: form.purchaseOrderId,
          stockInDate: form.stockInDate,
          invoiceReference: form.invoiceReference,
          description: form.description || null,
          attachments: form.attachments,
          items: form.items.map(item => ({
            ...(item.id ? { id: item.id } : {}),
            ...(item.stockInId ? { stockInId: item.stockInId } : {}),
            productId: item.productId,
            quantity: item.quantity,
            note: item.note || null,
          })),
        },
      },
    )

    useMessage(editingItem.value ? t('stock_in.updated') : t('stock_in.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('stock_in.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: StockIn) => {
  try {
    await ElMessageBox.confirm(
      t('stock_in.confirm_delete', { code: item.code }),
      t('stock_in.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('stock_in.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('stock_in.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadPurchaseOrderOptions()
  loadVendorOptions()
  loadProductOptions()
})
</script>
