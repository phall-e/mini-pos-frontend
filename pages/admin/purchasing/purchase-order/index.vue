<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('purchase_order.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('purchase_order.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('purchase_order.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button v-if="can('purchase-order-create')" type="primary" @click="openCreateDialog">
            <Icon name="solar:add-circle-outline" size="18" />
            <span class="ml-1">{{ t('create') }}</span>
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe class="w-full" row-key="id">
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column :label="t('columns.order_date')" min-width="160">
          <template #default="{ row }">{{ displayDate(row.orderDate) }}</template>
        </el-table-column>
        <el-table-column :label="t('menu.vendor')" min-width="220">
          <template #default="{ row }">{{ displayOption(row.vendor, row.vendorId, vendorOptions) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.status')" min-width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ displayStatus(row.status) }}</el-tag>
          </template>
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
              <el-tooltip v-if="can('purchase-order-edit')" :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="can('purchase-order-delete')" :content="t('delete')" placement="top">
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
      :title="editingItem ? t('purchase_order.edit_title') : t('purchase_order.create_title')"
      width="860px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="purchase-order-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.code')" prop="code">
            <el-input v-model="form.code" :disabled="codeLoading" placeholder="PO-001" />
          </el-form-item>
          <el-form-item :label="t('columns.order_date')" prop="orderDate">
            <el-date-picker
              v-model="form.orderDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="t('columns.order_date')"
              :teleported="false"
              class="!w-full"
            />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('menu.vendor')" prop="vendorId">
            <el-select
              v-model="form.vendorId"
              filterable
              :loading="vendorLoading"
              :placeholder="t('purchase_order.select_vendor')"
              :teleported="false"
              class="w-full"
            >
              <el-option
                v-for="vendor in vendorOptions"
                :key="vendor.id"
                :label="vendor.name"
                :value="vendor.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('columns.status')" prop="status">
            <el-select v-model="form.status" :teleported="false" class="w-full">
              <el-option
                v-for="status in statusOptions"
                :key="status"
                :label="displayStatus(status)"
                :value="status"
              />
            </el-select>
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

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.total_quantity')">
            <el-input :model-value="totalQuantity" disabled />
          </el-form-item>
          <el-form-item :label="t('columns.total_amount')">
            <el-input :model-value="formatAmount(totalAmount)" disabled />
          </el-form-item>
        </div>

        <el-tabs v-model="activeFormTab" type="border-card">
          <el-tab-pane :label="t('purchase_order.item_tab')" name="items">
            <div class="space-y-3">
              <div class="flex justify-end">
                <el-button type="primary" @click="addOrderItem">
                  <Icon name="solar:add-circle-outline" size="18" />
                  <span class="ml-1">{{ t('purchase_order.add_item') }}</span>
                </el-button>
              </div>

              <el-table :data="form.items" stripe>
                <template #empty>{{ t('no_data') }}</template>
                <el-table-column :label="t('columns.product_name')" min-width="240">
                  <template #default="{ row, $index }">
                    <el-form-item
                      :prop="`items.${$index}.productId`"
                      :rules="[{ required: true, message: t('purchase_order.product_required'), trigger: 'change' }]"
                      class="!mb-0"
                    >
                      <el-select
                        v-model="row.productId"
                        filterable
                        :loading="productLoading"
                        :placeholder="t('purchase_order.select_product')"
                        popper-class="purchase-order-select-popper"
                        class="w-full"
                        @change="handleProductChange(row)"
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
                <el-table-column :label="t('columns.quantity')" min-width="150">
                  <template #default="{ row, $index }">
                    <el-form-item
                      :prop="`items.${$index}.quantity`"
                      :rules="[{ required: true, type: 'number', min: 1, message: t('purchase_order.quantity_required'), trigger: 'blur' }]"
                      class="!mb-0"
                    >
                      <el-input-number v-model="row.quantity" :min="1" class="!w-full" />
                    </el-form-item>
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.unit_price')" min-width="170">
                  <template #default="{ row, $index }">
                    <el-form-item
                      :prop="`items.${$index}.unitPrice`"
                      :rules="[{ required: true, type: 'number', min: 0, message: t('purchase_order.unit_price_required'), trigger: 'blur' }]"
                      class="!mb-0"
                    >
                      <el-input-number
                        v-model="row.unitPrice"
                        :min="0"
                        :precision="2"
                        :step="1"
                        class="!w-full"
                      />
                    </el-form-item>
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.total_amount')" min-width="160">
                  <template #default="{ row }">
                    {{ formatAmount(getItemTotalAmount(row)) }}
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.note')" min-width="220">
                  <template #default="{ row }">
                    <el-input v-model="row.note" :placeholder="t('columns.note')" />
                  </template>
                </el-table-column>
                <el-table-column :label="t('columns.action')" width="100" align="center">
                  <template #default="{ $index }">
                    <el-tooltip :content="t('delete')" placement="top">
                      <el-button type="danger" circle @click="removeOrderItem($index)">
                        <Icon name="solar:trash-bin-trash-outline" size="17" />
                      </el-button>
                    </el-tooltip>
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
        <el-button type="primary" native-type="submit" form="purchase-order-form" :loading="submitting">
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
  permission: 'purchase-order-read'
})

useHead({
  title: 'MINI-POS-PURCHASE-ORDER'
})

const { can } = usePermission();

type PurchaseOrderStatus = 'Pending' | 'Cancelled' | 'Completed'

interface SelectOption {
  id: number
  name: string
  code?: string
  unitPrice?: number
}

interface SelectOptionPayload {
  id?: number
  value?: number
  name?: string
  label?: string
  code?: string
  nameEn?: string
  nameKh?: string
  unitPrice?: number
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

interface PurchaseOrderItem {
  id?: number
  purchaseOrderId?: number
  productId?: number
  quantity: number
  unitPrice: number
  totalAmount?: number
  note?: string | null
}

interface PurchaseOrder {
  id: number
  code: string
  orderDate: string | Date
  vendorId: number
  createdById?: number | string | null
  description?: string | null
  status: PurchaseOrderStatus
  attachment?: AttachmentFile[]
  attachments?: AttachmentFile[]
  items?: PurchaseOrderItem[]
  vendor?: SelectOption | string | null
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
    data: PurchaseOrder[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: PurchaseOrder
}

interface GenerateCodeResponse {
  payload?: {
    code?: string
  }
}

interface RawSelectResponse {
  payload?: SelectOptionPayload[] | {
    data?: SelectOptionPayload[]
    items?: SelectOptionPayload[]
  }
  data?: SelectOptionPayload[]
  items?: SelectOptionPayload[]
}

const endpoint = 'admin/purchasing/purchase-orders'
const vendorEndpoint = 'admin/master-data/vendors/select-options'
const productEndpoint = 'admin/master-data/products/select-options'
const pageSizes = [10, 20, 50, 100]
const statusOptions: PurchaseOrderStatus[] = ['Pending', 'Cancelled', 'Completed']

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()
const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const codeLoading = ref(false)
const vendorLoading = ref(false)
const productLoading = ref(false)
const items = ref<PurchaseOrder[]>([])
const vendorOptions = ref<SelectOption[]>([])
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
const editingItem = ref<PurchaseOrder | null>(null)
const activeFormTab = ref('items')

const currentUserId = computed(() => authStore.users?.id ?? authStore.user?.id)

const emptyOrderItem = (): PurchaseOrderItem => ({
  productId: undefined,
  quantity: 1,
  unitPrice: 0,
  note: '',
})

const emptyForm = () => ({
  code: '',
  orderDate: new Date().toISOString().slice(0, 10),
  vendorId: undefined as number | undefined,
  createdById: currentUserId.value as number | string | undefined,
  description: '',
  status: 'Pending' as PurchaseOrderStatus,
  attachments: [] as AttachmentFile[],
  items: [emptyOrderItem()],
})

const form = reactive(emptyForm())

const getItemTotalAmount = (item: Pick<PurchaseOrderItem, 'quantity' | 'unitPrice'>) => {
  return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
}

const totalQuantity = computed(() => {
  return form.items.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
})

const totalAmount = computed(() => {
  return form.items.reduce((total, item) => total + getItemTotalAmount(item), 0)
})

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: t('purchase_order.code_required'), trigger: 'blur' }],
  orderDate: [{ required: true, message: t('purchase_order.order_date_required'), trigger: 'change' }],
  vendorId: [{ required: true, message: t('purchase_order.vendor_required'), trigger: 'change' }],
  status: [{ required: true, message: t('purchase_order.status_required'), trigger: 'change' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.purchase_order'))
  breadcrumbStore.setBreadcrumbs([t('menu.purchasing'), t('menu.purchase_order')])
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
  unitPrice: typeof option.unitPrice === 'number' ? option.unitPrice : undefined,
})

const displayOption = (value: PurchaseOrder['vendor'], id: number | undefined, options: SelectOption[]) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.name ?? value.code ?? String(value.id)
  if (!id) return '-'

  return options.find(option => option.id === id)?.name ?? String(id)
}

const displayCreatedBy = (createdBy: PurchaseOrder['createdBy'] | PurchaseOrder['createdById']) => {
  if (!createdBy) return '-'
  if (typeof createdBy === 'string' || typeof createdBy === 'number') return String(createdBy)

  return createdBy.username
    ?? createdBy.name
    ?? createdBy.nameEn
    ?? createdBy.nameKh
    ?? createdBy.email
    ?? '-'
}

const displayDate = (value: PurchaseOrder['orderDate']) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

const displayCreatedAt = (createdAt: PurchaseOrder['createdAt']) => {
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

const displayStatus = (status: PurchaseOrderStatus) => {
  return t(`purchase_order.status_${status.toLowerCase()}`)
}

const statusTagType = (status: PurchaseOrderStatus) => {
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'danger'

  return 'warning'
}

const formatAmount = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const loadSelectOptions = async () => {
  await Promise.all([
    (async () => {
      try {
        vendorLoading.value = true
        const response = await useApi<RawSelectResponse>(vendorEndpoint, { method: 'get' })
        vendorOptions.value = selectPayloadItems(response)
          .map(normalizeOption)
          .filter(option => Number.isFinite(option.id))
      } catch (error) {
        useNotification(getErrorMessage(error, t('purchase_order.load_vendors_failed')), 'error')
      } finally {
        vendorLoading.value = false
      }
    })(),
    (async () => {
      try {
        productLoading.value = true
        const response = await useApi<RawSelectResponse>(productEndpoint, { method: 'get' })
        productOptions.value = selectPayloadItems(response)
          .map(normalizeOption)
          .filter(option => Number.isFinite(option.id))
      } catch (error) {
        useNotification(getErrorMessage(error, t('purchase_order.load_products_failed')), 'error')
      } finally {
        productLoading.value = false
      }
    })(),
  ])
}

const resetForm = (value: Partial<PurchaseOrder> = emptyForm()) => {
  form.code = value.code ?? ''
  form.orderDate = value.orderDate ? String(value.orderDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  form.vendorId = value.vendorId
  form.createdById = value.createdById ?? currentUserId.value
  form.description = value.description ?? ''
  form.status = value.status ?? 'Pending'
  form.attachments = [...(value.attachments ?? value.attachment ?? [])]
  form.items = (value.items?.length ? value.items : [emptyOrderItem()]).map(item => ({
    id: item.id,
    purchaseOrderId: item.purchaseOrderId,
    productId: item.productId,
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.unitPrice ?? 0),
    totalAmount: Number(item.totalAmount ?? getItemTotalAmount(item)),
    note: item.note ?? '',
  }))
  activeFormTab.value = 'items'
  nextTick(() => formRef.value?.clearValidate())
}

const loadGeneratedCode = async () => {
  try {
    codeLoading.value = true
    const response = await useApi<GenerateCodeResponse>(`${endpoint}/generate-code`, { method: 'get' })

    form.code = response.payload?.code ?? form.code
  } catch (error) {
    useNotification(getErrorMessage(error, t('purchase_order.generate_code_failed')), 'error')
  } finally {
    codeLoading.value = false
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
    useNotification(getErrorMessage(error, t('purchase_order.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const addOrderItem = () => {
  form.items.push(emptyOrderItem())
}

const removeOrderItem = (index: number) => {
  form.items.splice(index, 1)

  if (!form.items.length) {
    addOrderItem()
  }
}

const handleProductChange = (item: PurchaseOrderItem) => {
  const product = productOptions.value.find(option => option.id === item.productId)

  if (product?.unitPrice !== undefined && Number(item.unitPrice) === 0) {
    item.unitPrice = product.unitPrice
  }
}

const openCreateDialog = async () => {
  editingItem.value = null
  resetForm()
  dialogVisible.value = true
  await loadGeneratedCode()

  if (!vendorOptions.value.length || !productOptions.value.length) {
    await loadSelectOptions()
  }
}

const openEditDialog = async (item: PurchaseOrder) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!vendorOptions.value.length || !productOptions.value.length) {
    await loadSelectOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('purchase_order.load_failed')), 'error')
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
          orderDate: form.orderDate,
          vendorId: form.vendorId,
          createdById: form.createdById,
          description: form.description || null,
          status: form.status,
          attachments: form.attachments,
          totalQuantity: totalQuantity.value,
          totalAmount: totalAmount.value,
          items: form.items.map(item => ({
            ...(item.id ? { id: item.id } : {}),
            ...(item.purchaseOrderId ? { purchaseOrderId: item.purchaseOrderId } : {}),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: getItemTotalAmount(item),
            note: item.note || null,
          })),
        },
      },
    )

    useMessage(editingItem.value ? t('purchase_order.updated') : t('purchase_order.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('purchase_order.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: PurchaseOrder) => {
  try {
    await ElMessageBox.confirm(
      t('purchase_order.confirm_delete', { code: item.code }),
      t('purchase_order.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('purchase_order.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('purchase_order.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadSelectOptions()
})
</script>
