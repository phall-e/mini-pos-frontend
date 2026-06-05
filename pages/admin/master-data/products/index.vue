<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('product.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('product.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('product.search_placeholder')"
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

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        class="w-full"
        row-key="id"
      >
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column :label="t('columns.thumbnail')" width="110" align="center">
          <template #default="{ row }">
            <el-image
              v-if="thumbnailUrl(row.thumbnail)"
              :src="thumbnailUrl(row.thumbnail)"
              fit="cover"
              class="h-12 w-12 rounded border border-slate-200"
              :preview-src-list="[thumbnailUrl(row.thumbnail)]"
              preview-teleported
            />
            <span v-else class="text-sm text-slate-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column prop="nameEn" :label="t('columns.name_en')" min-width="220" />
        <el-table-column prop="nameKh" :label="t('columns.name_kh')" min-width="220" />
        <el-table-column :label="t('menu.category')" min-width="180">
          <template #default="{ row }">
            {{ displayOption(row.category, row.categoryId, categoryOptions) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('menu.uom')" min-width="160">
          <template #default="{ row }">
            {{ displayOption(row.uom, row.uomId, uomOptions) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.unit_price')" min-width="140">
          <template #default="{ row }">
            {{ formatPrice(row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.created_by')" min-width="180">
          <template #default="{ row }">
            {{ displayCreatedBy(row.createdBy) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.created_at')" min-width="190">
          <template #default="{ row }">
            {{ displayCreatedAt(row.createdAt) }}
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
      :title="editingItem ? t('product.edit_title') : t('product.create_title')"
      width="720px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="product-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('menu.category')" prop="categoryId">
            <el-select
              v-model="form.categoryId"
              filterable
              :loading="categoryLoading"
              :placeholder="t('product.select_category')"
              :teleported="false"
              class="w-full"
            >
              <el-option
                v-for="category in categoryOptions"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('menu.uom')" prop="uomId">
            <el-select
              v-model="form.uomId"
              filterable
              :loading="uomLoading"
              :placeholder="t('product.select_uom')"
              :teleported="false"
              class="w-full"
            >
              <el-option
                v-for="uom in uomOptions"
                :key="uom.id"
                :label="uom.name"
                :value="uom.id"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.code')" prop="code">
            <el-input v-model="form.code" placeholder="PRD-001" />
          </el-form-item>
          <el-form-item :label="t('columns.unit_price')" prop="unitPrice">
            <el-input-number
              v-model="form.unitPrice"
              :min="0"
              :precision="2"
              :step="1"
              class="!w-full"
            />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.name_en')" prop="nameEn">
            <el-input v-model="form.nameEn" placeholder="Arabica Coffee Beans" />
          </el-form-item>
          <el-form-item :label="t('columns.name_kh')" prop="nameKh">
            <el-input v-model="form.nameKh" :placeholder="t('columns.name_kh')" />
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

        <el-form-item :label="t('columns.thumbnail')" prop="thumbnail">
          <SingleUpload
            v-model="form.thumbnail"
            :tip="t('product.thumbnail_tip')"
            preview-width="300px"
            preview-height="200px"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="product-form"
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

type ThumbnailValue = string | {
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

interface ProductThumbnailDto {
  publicId: string
  url: string
  secureUrl: string
  resourceType: string
  format?: string
  bytes?: number
  originalFilename?: string
}

interface Product {
  id: number
  categoryId: number
  uomId: number
  code: string
  nameEn: string
  nameKh: string
  description?: string | null
  unitPrice: number
  thumbnail?: ThumbnailValue
  category?: SelectOption | string | null
  uom?: SelectOption | string | null
  createdAt?: string | Date | null
  createdBy?: string | {
    username?: string
    name?: string
    email?: string
  } | null
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: Product[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: Product
}

interface SelectResponse {
  payload: SelectOptionPayload[] | {
    data?: SelectOptionPayload[]
    items?: SelectOptionPayload[]
  }
}

interface RawSelectResponse {
  payload?: SelectResponse['payload']
  data?: SelectOptionPayload[]
  items?: SelectOptionPayload[]
}

const endpoint = 'admin/master-data/products'
const categoryEndpoint = 'admin/master-data/categories/select-options'
const uomEndpoint = 'admin/master-data/uom/select-options'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const categoryLoading = ref(false)
const uomLoading = ref(false)
const items = ref<Product[]>([])
const thumbnailPreviewMap = ref<Record<string, string>>({})
const categoryOptions = ref<SelectOption[]>([])
const uomOptions = ref<SelectOption[]>([])
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
const editingItem = ref<Product | null>(null)

const emptyForm = () => ({
  categoryId: undefined as number | undefined,
  uomId: undefined as number | undefined,
  code: '',
  nameEn: '',
  nameKh: '',
  description: '',
  unitPrice: 0,
  thumbnail: null as ThumbnailValue,
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  categoryId: [{ required: true, message: t('product.category_required'), trigger: 'change' }],
  uomId: [{ required: true, message: t('product.uom_required'), trigger: 'change' }],
  code: [{ required: true, message: t('product.code_required'), trigger: 'blur' }],
  nameEn: [{ required: true, message: t('product.name_en_required'), trigger: 'blur' }],
  nameKh: [{ required: true, message: t('product.name_kh_required'), trigger: 'blur' }],
  unitPrice: [{ required: true, message: t('product.unit_price_required'), trigger: 'blur' }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.product'))
  breadcrumbStore.setBreadcrumbs([t('menu.master_data'), t('menu.product')])
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

const displayOption = (
  value: Product['category'] | Product['uom'],
  id: number | undefined,
  options: SelectOption[],
) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.name ?? value.code ?? String(value.id)
  if (!id) return '-'

  return options.find(option => option.id === id)?.name ?? String(id)
}

const displayCreatedBy = (createdBy: Product['createdBy']) => {
  if (!createdBy) return '-'
  if (typeof createdBy === 'string') return createdBy

  return createdBy.username ?? createdBy.name ?? createdBy.email ?? '-'
}

const displayCreatedAt = (createdAt: Product['createdAt']) => {
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

const formatPrice = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const getPreviewLinkFromResponse = (response: unknown) => {
  if (typeof response === 'string') return response

  if (typeof response === 'object' && response !== null) {
    const result = response as {
      payload?: string | Record<string, string>
      url?: string
      secureUrl?: string
      secure_url?: string
      path?: string
    }

    if (typeof result.payload === 'string') return result.payload

    if (typeof result.payload === 'object' && result.payload !== null) {
      return result.payload.secureUrl
        ?? result.payload.secure_url
        ?? result.payload.url
        ?? result.payload.path
        ?? null
    }

    return result.secureUrl ?? result.secure_url ?? result.url ?? result.path ?? null
  }

  return null
}

const thumbnailPublicId = (thumbnail: ThumbnailValue) => {
  if (!thumbnail) return null
  if (typeof thumbnail === 'string') return thumbnail

  return thumbnail.publicId ?? thumbnail.public_id ?? null
}

const normalizeThumbnail = (thumbnail: ThumbnailValue): ProductThumbnailDto | undefined => {
  if (!thumbnail || typeof thumbnail === 'string') return undefined

  const publicId = thumbnail.publicId ?? thumbnail.public_id
  const url = thumbnail.url ?? thumbnail.path
  const secureUrl = thumbnail.secureUrl ?? thumbnail.secure_url ?? thumbnail.url ?? thumbnail.path
  const resourceType = thumbnail.resourceType ?? thumbnail.resource_type ?? 'image'

  if (!publicId || !url || !secureUrl || !resourceType) return undefined

  return {
    publicId,
    url,
    secureUrl,
    resourceType,
    ...(thumbnail.format ? { format: thumbnail.format } : {}),
    ...(typeof thumbnail.bytes === 'number' ? { bytes: thumbnail.bytes } : {}),
    ...(thumbnail.originalFilename || thumbnail.original_filename
      ? { originalFilename: thumbnail.originalFilename ?? thumbnail.original_filename }
      : {}),
  }
}

const thumbnailUrl = (thumbnail: ThumbnailValue) => {
  const publicId = thumbnailPublicId(thumbnail)

  if (publicId && thumbnailPreviewMap.value[publicId]) {
    return thumbnailPreviewMap.value[publicId]
  }

  if (!thumbnail || typeof thumbnail === 'string') return null

  return thumbnail.secureUrl ?? thumbnail.secure_url ?? thumbnail.url ?? thumbnail.path ?? null
}

const loadThumbnailPreview = async (thumbnail: ThumbnailValue) => {
  const publicId = thumbnailPublicId(thumbnail)

  if (!publicId || thumbnailUrl(thumbnail)) return

  try {
    const response = await useApi<unknown>(
      `cloudinary/preview?publicId=${encodeURIComponent(publicId)}&resourceType=image`,
      { method: 'get' },
    )
    const previewLink = getPreviewLinkFromResponse(response)

    if (previewLink) {
      thumbnailPreviewMap.value = {
        ...thumbnailPreviewMap.value,
        [publicId]: previewLink,
      }
    }
  } catch (error) {
    useNotification(getErrorMessage(error, t('product.preview_failed')), 'error')
  }
}

const loadThumbnailPreviews = () => {
  items.value.forEach(item => loadThumbnailPreview(item.thumbnail))
}

const resetForm = (value: Partial<Product> = emptyForm()) => {
  form.categoryId = value.categoryId
  form.uomId = value.uomId
  form.code = value.code ?? ''
  form.nameEn = value.nameEn ?? ''
  form.nameKh = value.nameKh ?? ''
  form.description = value.description ?? ''
  form.unitPrice = Number(value.unitPrice ?? 0)
  form.thumbnail = value.thumbnail ?? null
  nextTick(() => formRef.value?.clearValidate())
}

const loadSelectOptions = async () => {
  await Promise.all([
    (async () => {
      try {
        categoryLoading.value = true
        const response = await useApi<RawSelectResponse>(categoryEndpoint, { method: 'get' })
        categoryOptions.value = selectPayloadItems(response)
          .map(normalizeOption)
          .filter(option => Number.isFinite(option.id))
      } catch (error) {
        useNotification(getErrorMessage(error, t('product.load_categories_failed')), 'error')
      } finally {
        categoryLoading.value = false
      }
    })(),
    (async () => {
      try {
        uomLoading.value = true
        const response = await useApi<RawSelectResponse>(uomEndpoint, { method: 'get' })
        uomOptions.value = selectPayloadItems(response)
          .map(normalizeOption)
          .filter(option => Number.isFinite(option.id))
      } catch (error) {
        useNotification(getErrorMessage(error, t('product.load_uom_failed')), 'error')
      } finally {
        uomLoading.value = false
      }
    })(),
  ])
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
    loadThumbnailPreviews()
  } catch (error) {
    useNotification(getErrorMessage(error, t('product.load_failed')), 'error')
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

  if (!categoryOptions.value.length || !uomOptions.value.length) {
    await loadSelectOptions()
  }
}

const openEditDialog = async (item: Product) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!categoryOptions.value.length || !uomOptions.value.length) {
    await loadSelectOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('product.load_failed')), 'error')
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
          categoryId: form.categoryId,
          uomId: form.uomId,
          code: form.code,
          nameEn: form.nameEn,
          nameKh: form.nameKh,
          description: form.description || null,
          unitPrice: form.unitPrice,
          thumbnail: normalizeThumbnail(form.thumbnail),
        },
      },
    )

    useMessage(editingItem.value ? t('product.updated') : t('product.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('product.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: Product) => {
  try {
    await ElMessageBox.confirm(
      t('product.confirm_delete', { code: item.code }),
      t('product.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('product.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('product.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadSelectOptions()
})
</script>
