<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('vendor.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('vendor.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('vendor.search_placeholder')"
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
        <el-table-column :label="t('columns.profile')" width="110" align="center">
          <template #default="{ row }">
            <el-image
              v-if="profileUrl(row.profile)"
              :src="profileUrl(row.profile)"
              fit="cover"
              class="h-10 w-10 rounded-full border border-slate-200"
              :preview-src-list="[profileUrl(row.profile)]"
              preview-teleported
            />
            <span v-else class="text-sm text-slate-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column prop="nameEn" :label="t('columns.name_en')" min-width="220" />
        <el-table-column prop="nameKh" :label="t('columns.name_kh')" min-width="220" />
        <el-table-column prop="phoneNumber" :label="t('columns.phone_number')" min-width="160">
          <template #default="{ row }">{{ row.phoneNumber || '-' }}</template>
        </el-table-column>
        <el-table-column prop="email" :label="t('columns.email')" min-width="250">
          <template #default="{ row }">{{ row.email || '-' }}</template>
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
      :title="editingItem ? t('vendor.edit_title') : t('vendor.create_title')"
      width="760px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="vendor-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-tabs v-model="activeFormTab" type="border-card">
          <el-tab-pane :label="t('vendor.general_tab')" name="general">
            <div class="grid gap-4 sm:grid-cols-2">
              <el-form-item :label="t('columns.code')" prop="code">
                <el-input v-model="form.code" placeholder="VND-001" />
              </el-form-item>
              <el-form-item :label="t('columns.phone_number')" prop="phoneNumber">
                <el-input v-model="form.phoneNumber" placeholder="+855 12 345 678" />
              </el-form-item>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <el-form-item :label="t('columns.name_en')" prop="nameEn">
                <el-input v-model="form.nameEn" placeholder="ABC Trading" />
              </el-form-item>
              <el-form-item :label="t('columns.name_kh')" prop="nameKh">
                <el-input v-model="form.nameKh" :placeholder="t('columns.name_kh')" />
              </el-form-item>
            </div>

            <el-form-item :label="t('columns.email')" prop="email">
              <el-input v-model="form.email" placeholder="vendor@example.com" />
            </el-form-item>

            <el-form-item :label="t('columns.address')" prop="address">
              <el-input
                v-model="form.address"
                type="textarea"
                :rows="3"
                :placeholder="t('columns.address')"
              />
            </el-form-item>

            <el-form-item :label="t('columns.profile')" prop="profile">
              <SingleUpload
                v-model="form.profile"
                :tip="t('vendor.profile_tip')"
                preview-width="220px"
                preview-height="160px"
              />
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane :label="t('columns.attachment')" name="attachment">
            <DropZone v-model="form.attachments" />
          </el-tab-pane>
        </el-tabs>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="vendor-form"
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
import DropZone from '~/@core/components/DropZone.vue'
import SingleUpload from '~/@core/components/SingleUpload.vue'

type ProfileValue = string | {
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

interface ProfileDto {
  publicId: string
  url: string
  secureUrl: string
  resourceType: string
  format?: string
  bytes?: number
  originalFilename?: string
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

interface Vendor {
  id: number
  code: string
  nameEn: string
  nameKh: string
  phoneNumber?: string | null
  email?: string | null
  address?: string | null
  profile?: ProfileValue
  attachment?: AttachmentFile[]
  attachments?: AttachmentFile[]
  createdAt?: string | Date | null
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: Vendor[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: Vendor
}

const endpoint = 'admin/master-data/vendors'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const items = ref<Vendor[]>([])
const profilePreviewMap = ref<Record<string, string>>({})
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
const editingItem = ref<Vendor | null>(null)
const activeFormTab = ref('general')

const emptyForm = () => ({
  code: '',
  nameEn: '',
  nameKh: '',
  phoneNumber: '',
  email: '',
  address: '',
  profile: null as ProfileValue,
  attachments: [] as AttachmentFile[],
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: t('vendor.code_required'), trigger: 'blur' }],
  nameEn: [{ required: true, message: t('vendor.name_en_required'), trigger: 'blur' }],
  nameKh: [{ required: true, message: t('vendor.name_kh_required'), trigger: 'blur' }],
  email: [{ type: 'email', message: t('user.email_invalid'), trigger: ['blur', 'change'] }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.vendor'))
  breadcrumbStore.setBreadcrumbs([t('menu.master_data'), t('menu.vendor')])
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

const displayCreatedAt = (createdAt: Vendor['createdAt']) => {
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

const profilePublicId = (profile: ProfileValue) => {
  if (!profile) return null
  if (typeof profile === 'string') return profile

  return profile.publicId ?? profile.public_id ?? null
}

const normalizeProfile = (profile: ProfileValue): ProfileDto | undefined => {
  if (!profile || typeof profile === 'string') return undefined

  const publicId = profile.publicId ?? profile.public_id
  const url = profile.url ?? profile.path
  const secureUrl = profile.secureUrl ?? profile.secure_url ?? profile.url ?? profile.path
  const resourceType = profile.resourceType ?? profile.resource_type ?? 'image'

  if (!publicId || !url || !secureUrl || !resourceType) return undefined

  return {
    publicId,
    url,
    secureUrl,
    resourceType,
    ...(profile.format ? { format: profile.format } : {}),
    ...(typeof profile.bytes === 'number' ? { bytes: profile.bytes } : {}),
    ...(profile.originalFilename || profile.original_filename
      ? { originalFilename: profile.originalFilename ?? profile.original_filename }
      : {}),
  }
}

const profileUrl = (profile: ProfileValue) => {
  const publicId = profilePublicId(profile)

  if (publicId && profilePreviewMap.value[publicId]) {
    return profilePreviewMap.value[publicId]
  }

  if (!profile || typeof profile === 'string') return null

  return profile.secureUrl ?? profile.secure_url ?? profile.url ?? profile.path ?? null
}

const loadProfilePreview = async (profile: ProfileValue) => {
  const publicId = profilePublicId(profile)

  if (!publicId || profileUrl(profile)) return

  try {
    const response = await useApi<unknown>(
      `cloudinary/preview?publicId=${encodeURIComponent(publicId)}&resourceType=image`,
      { method: 'get' },
    )
    const previewLink = getPreviewLinkFromResponse(response)

    if (previewLink) {
      profilePreviewMap.value = {
        ...profilePreviewMap.value,
        [publicId]: previewLink,
      }
    }
  } catch (error) {
    useNotification(getErrorMessage(error, t('vendor.preview_failed')), 'error')
  }
}

const loadProfilePreviews = () => {
  items.value.forEach(item => loadProfilePreview(item.profile))
}

const resetForm = (value: Partial<Vendor> = emptyForm()) => {
  form.code = value.code ?? ''
  form.nameEn = value.nameEn ?? ''
  form.nameKh = value.nameKh ?? ''
  form.phoneNumber = value.phoneNumber ?? ''
  form.email = value.email ?? ''
  form.address = value.address ?? ''
  form.profile = value.profile ?? null
  form.attachments = [...(value.attachments ?? value.attachment ?? [])]
  activeFormTab.value = 'general'
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
    loadProfilePreviews()
  } catch (error) {
    useNotification(getErrorMessage(error, t('vendor.load_failed')), 'error')
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

const openEditDialog = async (item: Vendor) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('vendor.load_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    activeFormTab.value = 'general'
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
          nameEn: form.nameEn,
          nameKh: form.nameKh,
          phoneNumber: form.phoneNumber || null,
          email: form.email || null,
          address: form.address || null,
          profile: normalizeProfile(form.profile),
          attachments: form.attachments,
        },
      },
    )

    useMessage(editingItem.value ? t('vendor.updated') : t('vendor.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('vendor.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: Vendor) => {
  try {
    await ElMessageBox.confirm(
      t('vendor.confirm_delete', { code: item.code }),
      t('vendor.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('vendor.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('vendor.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
})
</script>
