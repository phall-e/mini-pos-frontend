<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('payment_setting.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('payment_setting.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('payment_setting.search_placeholder')"
            class="sm:!w-[280px]"
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

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        class="w-full"
        row-key="id"
      >
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column :label="t('payment_setting.logo')" width="110" align="center">
          <template #default="{ row }">
            <el-image
              v-if="logoUrl(row.logo)"
              :src="logoUrl(row.logo) ?? ''"
              fit="contain"
              class="h-12 w-12 rounded-md border border-slate-200 bg-white"
              :preview-src-list="[logoUrl(row.logo) ?? '']"
              preview-teleported
            />
            <span v-else class="text-slate-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="t('payment_setting.name')" min-width="170" />
        <el-table-column prop="bankAccount" :label="t('payment_setting.bank_account')" min-width="180" />
        <el-table-column prop="merchantName" :label="t('payment_setting.merchant_name')" min-width="190" />
        <el-table-column prop="merchantCity" :label="t('payment_setting.merchant_city')" min-width="160" />
        <el-table-column :label="t('payment_setting.amount')" min-width="150" align="right">
          <template #default="{ row }">
            {{ displayAmount(row.amount, row.currency) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('payment_setting.currency')" min-width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.currency?.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phoneNumber" :label="t('payment_setting.phone_number')" min-width="160" />
        <el-table-column prop="billNumber" :label="t('payment_setting.bill_number')" min-width="150" />
        <el-table-column prop="terminalLabel" :label="t('payment_setting.terminal_label')" min-width="160" />
        <el-table-column prop="merchantCategoryCode" :label="t('payment_setting.merchant_category_code')" min-width="180" />
        <el-table-column :label="t('columns.is_active')" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" effect="plain">
              {{ row.isActive ? t('active') : t('inactive') }}
            </el-tag>
          </template>
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
      :title="editingItem ? t('payment_setting.edit_title') : t('payment_setting.create_title')"
      width="760px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="payment-setting-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <el-form-item :label="t('payment_setting.name')" prop="name">
            <el-input v-model="form.name" placeholder="ABA Pay" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.bank_account')" prop="bankAccount">
            <el-input v-model="form.bankAccount" placeholder="00123456789" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.merchant_name')" prop="merchantName">
            <el-input v-model="form.merchantName" placeholder="Mini POS" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.merchant_city')" prop="merchantCity">
            <el-input v-model="form.merchantCity" placeholder="Phnom Penh" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.currency')" prop="currency">
            <el-select
              v-model="form.currency"
              :placeholder="t('payment_setting.select_currency')"
              class="w-full"
            >
              <el-option
                v-for="option in currencyOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('payment_setting.amount')" prop="amount">
            <el-input-number
              v-model="form.amount"
              :min="0"
              :precision="2"
              step="any"
              controls-position="right"
              class="!w-full"
            />
          </el-form-item>
          <el-form-item :label="t('payment_setting.store_label')" prop="storeLabel">
            <el-input v-model="form.storeLabel" placeholder="Main Store" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.phone_number')" prop="phoneNumber">
            <el-input v-model="form.phoneNumber" placeholder="+85512345678" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.bill_number')" prop="billNumber">
            <el-input v-model="form.billNumber" placeholder="INV-0001" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.terminal_label')" prop="terminalLabel">
            <el-input v-model="form.terminalLabel" placeholder="POS-01" />
          </el-form-item>
          <el-form-item :label="t('payment_setting.merchant_category_code')" prop="merchantCategoryCode">
            <el-input v-model="form.merchantCategoryCode" maxlength="4" placeholder="5999" />
          </el-form-item>
          <el-form-item :label="t('columns.is_active')" prop="isActive">
            <el-switch
              v-model="form.isActive"
              :active-text="t('active')"
              :inactive-text="t('inactive')"
            />
          </el-form-item>
          <el-form-item :label="t('payment_setting.logo')" prop="logo" class="sm:col-span-2 xl:col-span-3">
            <SingleUpload
              v-model="form.logo"
              :tip="t('payment_setting.logo_tip')"
              preview-height="140px"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="payment-setting-form"
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
import SingleUpload from '~/@core/components/SingleUpload.vue'

type Currency = 'usd' | 'khr'
type LogoValue = string | {
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
} | null

interface LogoDto {
  publicId: string
  url?: string
  secureUrl?: string
  resourceType?: string
  format?: string
  bytes?: number
  originalFilename?: string
}

interface PaymentSetting {
  id: number
  name: string
  logo?: LogoValue
  bankAccount: string
  merchantName: string
  merchantCity: string
  amount: number
  currency: Currency
  storeLabel: string
  phoneNumber: string
  billNumber: string
  terminalLabel: string
  merchantCategoryCode: string
  isActive: boolean
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: PaymentSetting[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: PaymentSetting
}

const endpoint = 'admin/system/payment-setting'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const items = ref<PaymentSetting[]>([])
const logoPreviewMap = ref<Record<string, string>>({})
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
const editingItem = ref<PaymentSetting | null>(null)

const currencyOptions = [
  { label: 'USD', value: 'usd' },
  { label: 'KHR', value: 'khr' },
]

const emptyForm = () => ({
  name: '',
  logo: null as LogoValue,
  bankAccount: '',
  merchantName: '',
  merchantCity: '',
  amount: 0,
  currency: 'usd' as Currency,
  storeLabel: '',
  phoneNumber: '',
  billNumber: '',
  terminalLabel: '',
  merchantCategoryCode: '5999',
  isActive: true,
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('payment_setting.name_required'), trigger: 'blur' }],
  bankAccount: [{ required: true, message: t('payment_setting.bank_account_required'), trigger: 'blur' }],
  merchantName: [{ required: true, message: t('payment_setting.merchant_name_required'), trigger: 'blur' }],
  merchantCity: [{ required: true, message: t('payment_setting.merchant_city_required'), trigger: 'blur' }],
  amount: [{ required: true, type: 'number', min: 0, message: t('payment_setting.amount_required'), trigger: 'blur' }],
  currency: [{ required: true, message: t('payment_setting.currency_required'), trigger: 'change' }],
  storeLabel: [{ required: true, message: t('payment_setting.store_label_required'), trigger: 'blur' }],
  phoneNumber: [{ required: true, message: t('payment_setting.phone_number_required'), trigger: 'blur' }],
  billNumber: [{ required: true, message: t('payment_setting.bill_number_required'), trigger: 'blur' }],
  terminalLabel: [{ required: true, message: t('payment_setting.terminal_label_required'), trigger: 'blur' }],
  merchantCategoryCode: [
    { required: true, message: t('payment_setting.merchant_category_code_required'), trigger: 'blur' },
    { pattern: /^\d{4}$/, message: t('payment_setting.merchant_category_code_invalid'), trigger: ['blur', 'change'] },
  ],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.payment_setting'))
  breadcrumbStore.setBreadcrumbs([t('menu.system'), t('menu.payment_setting')])
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

const logoPublicId = (logo: LogoValue) => {
  if (!logo) return null
  if (typeof logo === 'string') return logo

  return logo.publicId ?? logo.public_id ?? null
}

const normalizeLogo = (logo: LogoValue): LogoDto | undefined => {
  if (!logo || typeof logo === 'string') return undefined

  const publicId = logo.publicId ?? logo.public_id
  const url = logo.url ?? logo.path
  const secureUrl = logo.secureUrl ?? logo.secure_url ?? logo.url ?? logo.path
  const resourceType = logo.resourceType ?? logo.resource_type ?? 'image'

  if (!publicId) return undefined

  return {
    publicId,
    ...(url ? { url } : {}),
    ...(secureUrl ? { secureUrl } : {}),
    resourceType,
    ...(logo.format ? { format: logo.format } : {}),
    ...(typeof logo.bytes === 'number' ? { bytes: logo.bytes } : {}),
    ...(logo.originalFilename || logo.original_filename
      ? { originalFilename: logo.originalFilename ?? logo.original_filename }
      : {}),
  }
}

const logoUrl = (logo: LogoValue) => {
  const publicId = logoPublicId(logo)

  if (publicId && logoPreviewMap.value[publicId]) {
    return logoPreviewMap.value[publicId]
  }

  if (!logo || typeof logo === 'string') return null

  return logo.secureUrl ?? logo.secure_url ?? logo.url ?? logo.path ?? null
}

const loadLogoPreview = async (logo: LogoValue) => {
  const publicId = logoPublicId(logo)

  if (!publicId || logoUrl(logo)) return

  try {
    const response = await useApi<{ payload?: string | { url?: string, secureUrl?: string, secure_url?: string, path?: string } }>(
      `cloudinary/preview?publicId=${encodeURIComponent(publicId)}&resourceType=image`,
      { method: 'get' },
    )
    const payload = response.payload
    const url = typeof payload === 'string'
      ? payload
      : payload?.secureUrl ?? payload?.secure_url ?? payload?.url ?? payload?.path

    if (url) {
      logoPreviewMap.value = {
        ...logoPreviewMap.value,
        [publicId]: url,
      }
    }
  } catch (error) {
    useNotification(getErrorMessage(error, t('payment_setting.preview_failed')), 'error')
  }
}

const loadLogoPreviews = () => {
  items.value.forEach(item => loadLogoPreview(item.logo ?? null))
}

const resetForm = (value = emptyForm()) => {
  Object.assign(form, {
    ...emptyForm(),
    ...value,
    amount: Number(value.amount ?? 0),
    currency: (value.currency ?? 'usd') as Currency,
    logo: value.logo ?? null,
    merchantCategoryCode: value.merchantCategoryCode || '5999',
    isActive: value.isActive ?? true,
  })
  nextTick(() => formRef.value?.clearValidate())
}

const displayAmount = (amount: number | string, currency: Currency) => {
  const value = Number(amount)

  if (Number.isNaN(value)) return '-'

  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: currency === 'khr' ? 'KHR' : 'USD',
    minimumFractionDigits: currency === 'khr' ? 0 : 2,
    maximumFractionDigits: currency === 'khr' ? 0 : 2,
  }).format(value)
}

const loadItems = async () => {
  try {
    loading.value = true
    const response = await useApi<ListResponse>(
      `${endpoint}?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search)}`,
      { method: 'get' },
    )

    items.value = response.payload.data ?? []
    loadLogoPreviews()
    meta.totalItems = response.payload.meta?.totalItems ?? items.value.length
    meta.currentPage = response.payload.meta?.currentPage ?? params.page
    meta.totalPages = response.payload.meta?.totalPages ?? 1
  } catch (error) {
    useNotification(getErrorMessage(error, t('payment_setting.load_failed')), 'error')
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

const openEditDialog = async (item: PaymentSetting) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('payment_setting.load_failed')), 'error')
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
          name: form.name,
          logo: normalizeLogo(form.logo),
          bankAccount: form.bankAccount,
          merchantName: form.merchantName,
          merchantCity: form.merchantCity,
          amount: form.amount,
          currency: form.currency,
          storeLabel: form.storeLabel,
          phoneNumber: form.phoneNumber,
          billNumber: form.billNumber,
          terminalLabel: form.terminalLabel,
          merchantCategoryCode: form.merchantCategoryCode || '5999',
          isActive: form.isActive,
        },
      },
    )

    useMessage(editingItem.value ? t('payment_setting.updated') : t('payment_setting.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('payment_setting.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: PaymentSetting) => {
  try {
    await ElMessageBox.confirm(
      t('payment_setting.confirm_delete', { name: item.merchantName }),
      t('payment_setting.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('payment_setting.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('payment_setting.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
})
</script>
