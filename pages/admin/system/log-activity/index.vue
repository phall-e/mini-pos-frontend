<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('log_activity.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('log_activity.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('log_activity.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
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
        <el-table-column :label="t('log_activity.user')" min-width="180">
          <template #default="{ row }">
            {{ formatUser(row.user) }}
          </template>
        </el-table-column>
        <el-table-column prop="module" :label="t('log_activity.module')" min-width="160" />
        <el-table-column :label="t('log_activity.action')" min-width="150">
          <template #default="{ row }">
            <el-tag type="primary" effect="plain">
              {{ row.action || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" :label="t('columns.description')" min-width="280" show-overflow-tooltip />
        <el-table-column prop="ipAddress" :label="t('log_activity.ip_address')" min-width="150" />
        <el-table-column :label="t('columns.created_at')" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="96" align="center">
          <template #default="{ row }">
            <el-tooltip :content="t('log_activity.view_title')" placement="top">
              <el-button type="primary" circle @click="openViewDialog(row)">
                <Icon name="solar:eye-outline" size="17" />
              </el-button>
            </el-tooltip>
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
      :title="t('log_activity.view_title')"
      width="720px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      draggable
    >
      <div v-loading="viewLoading" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.user') }}</p>
            <p class="mt-1 break-words text-sm text-slate-900">{{ selectedItem ? formatUser(selectedItem.user) : '-' }}</p>
          </div>
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.module') }}</p>
            <p class="mt-1 break-words text-sm text-slate-900">{{ selectedItem?.module || '-' }}</p>
          </div>
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.action') }}</p>
            <p class="mt-1 break-words text-sm text-slate-900">{{ selectedItem?.action || '-' }}</p>
          </div>
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.ip_address') }}</p>
            <p class="mt-1 break-words text-sm text-slate-900">{{ selectedItem?.ipAddress || '-' }}</p>
          </div>
        </div>

        <div class="rounded-md border border-slate-200 p-3">
          <p class="text-xs font-medium uppercase text-slate-500">{{ t('columns.description') }}</p>
          <p class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{{ selectedItem?.description || '-' }}</p>
        </div>

        <div class="rounded-md border border-slate-200 p-3">
          <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.user_agent') }}</p>
          <p class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{{ selectedItem?.userAgent || '-' }}</p>
        </div>

        <div v-if="selectedItem?.createdAt || selectedItem?.updatedAt" class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('columns.created_at') }}</p>
            <p class="mt-1 text-sm text-slate-900">{{ formatDate(selectedItem?.createdAt) }}</p>
          </div>
          <div class="rounded-md border border-slate-200 p-3">
            <p class="text-xs font-medium uppercase text-slate-500">{{ t('log_activity.updated_at') }}</p>
            <p class="mt-1 text-sm text-slate-900">{{ formatDate(selectedItem?.updatedAt) }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('ok') }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  permission: ['log-activity-read', 'log-activities-read']
})

useHead({
  title: 'MINI-POS-LOG-ACTIVITY'
})

interface ActivityUser {
  id?: number
  username?: string
  name?: string
  email?: string
}

interface LogActivity {
  id: number
  user?: ActivityUser | string | null
  module?: string | null
  action?: string | null
  description?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: LogActivity[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: LogActivity
}

const endpoint = 'admin/system/log-activities'
const pageSizes = [10, 20, 50, 100]

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const viewLoading = ref(false)
const items = ref<LogActivity[]>([])
const selectedItem = ref<LogActivity | null>(null)
const dialogVisible = ref(false)
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

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.log_activity'))
  breadcrumbStore.setBreadcrumbs([t('menu.system'), t('menu.log_activity')])
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

const formatUser = (user: LogActivity['user']) => {
  if (!user) return '-'
  if (typeof user === 'string') return user

  return user.username ?? user.name ?? user.email ?? (user.id ? String(user.id) : '-')
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
    useNotification(getErrorMessage(error, t('log_activity.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const openViewDialog = async (item: LogActivity) => {
  selectedItem.value = item
  dialogVisible.value = true

  try {
    viewLoading.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    selectedItem.value = response.payload
  } catch (error) {
    useNotification(getErrorMessage(error, t('log_activity.load_failed')), 'error')
  } finally {
    viewLoading.value = false
  }
}

onMounted(() => {
  loadItems()
})
</script>
