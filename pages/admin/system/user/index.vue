<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('user.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('user.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('user.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button v-if="can('user-create')" type="primary" @click="openCreateDialog">
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
        <el-table-column prop="username" :label="t('username')" min-width="180" />
        <el-table-column prop="email" :label="t('user.email')" min-width="220" />
        <el-table-column prop="telegramChatId" :label="t('user.telegram_chat_id')" min-width="250" />
        <el-table-column :label="t('user.is_required_otp')" width="150" align="center">
          <template #default="{ row }">
            <el-checkbox
              v-if="row.isRequiredOtp"
              :model-value="true"
              disabled
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.is_admin')" width="120" align="center">
          <template #default="{ row }">
            <el-checkbox
              v-if="row.isAdmin"
              :model-value="true"
              disabled
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('user.roles')" min-width="180">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1.5">
              <el-tag
                v-for="role in displayRoles(row)"
                :key="role.id"
                type="info"
                effect="plain"
              >
                {{ role.name }}
              </el-tag>
              <span
                v-if="!displayRoles(row).length"
                class="text-sm text-slate-400"
              >
                {{ t('no_data') }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.is_active')" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? t('active') : t('inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip v-if="can('user-edit')" :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="can('user-delete')" :content="t('delete')" placement="top">
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
      :title="editingItem ? t('user.edit_title') : t('user.create_title')"
      width="620px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      draggable
    >
      <el-form
        id="user-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('username')" prop="username">
            <el-input v-model="form.username" placeholder="admin" />
          </el-form-item>
          <el-form-item :label="t('user.email')" prop="email">
            <el-input v-model="form.email" placeholder="admin@example.com" />
          </el-form-item>
        </div>

        <el-form-item :label="t('user.telegram_chat_id')" prop="telegramChatId">
          <el-input v-model="form.telegramChatId" placeholder="123456789" />
        </el-form-item>

        <div
          v-if="!editingItem"
          class="grid gap-4 sm:grid-cols-2"
        >
          <el-form-item :label="t('password')" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="t('password')"
            />
          </el-form-item>
          <el-form-item :label="t('user.confirm_password')" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="t('user.confirm_password')"
            />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('user.roles')" prop="roles">
            <el-select
              v-model="form.roles"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="3"
              :loading="roleLoading"
              :placeholder="t('user.select_roles')"
              :teleported="false"
              class="w-full"
            >
              <el-option
                v-for="role in roleOptions"
                :key="role.id"
                :label="role.name"
                :value="role.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('user.is_required_otp')" prop="isRequiredOtp">
            <el-switch
              v-model="form.isRequiredOtp"
              :active-text="t('user.is_required_otp')"
            />
          </el-form-item>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.is_active')" prop="isActive">
            <el-switch
              v-model="form.isActive"
              :active-text="t('active')"
            />
          </el-form-item>
          <el-form-item :label="t('columns.is_admin')" prop="isAdmin">
            <el-switch
              v-model="form.isAdmin"
              :active-text="t('active')"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="user-form"
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
  permission: 'user-read'
})

useHead({
  title: 'MINI-POS-USER'
})

const { can } = usePermission();

interface RoleOption {
  id: number
  name: string
}

interface User {
  id: number
  username: string
  email: string
  telegramChatId?: string | null
  isRequiredOtp: boolean
  isActive: boolean
  isAdmin: boolean
  role?: RoleOption[] | number[]
  roles?: RoleOption[] | number[]
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: User[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: User
}

interface RoleListResponse {
  payload: RoleOption[]
}

const endpoint = 'admin/system/user'
const roleEndpoint = 'admin/system/role/select-options'
const pageSizes = [10, 20, 50, 100]

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const roleLoading = ref(false)
const items = ref<User[]>([])
const roleOptions = ref<RoleOption[]>([])
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
const editingItem = ref<User | null>(null)

const emptyForm = () => ({
  username: '',
  email: '',
  telegramChatId: '',
  password: '',
  confirmPassword: '',
  isRequiredOtp: true,
  isActive: true,
  isAdmin: false,
  roles: [] as number[],
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('user.username_required'), trigger: 'blur' }],
  email: [
    { required: true, message: t('user.email_required'), trigger: 'blur' },
    { type: 'email', message: t('user.email_invalid'), trigger: ['blur', 'change'] },
  ],
  password: [
    {
      required: !editingItem.value,
      message: t('user.password_required'),
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      required: !editingItem.value || Boolean(form.password),
      message: t('user.confirm_password_required'),
      trigger: 'blur',
    },
    {
      validator: (_rule, value: string, callback) => {
        if (!form.password && editingItem.value) {
          callback()
          return
        }

        if (value !== form.password) {
          callback(new Error(t('user.password_mismatch')))
          return
        }

        callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
  roles: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: t('user.role_required'),
      trigger: 'change',
    },
  ],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.user'))
  breadcrumbStore.setBreadcrumbs([t('menu.system'), t('menu.user')])
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

const normalizeRoleIds = (item: Partial<User>) => {
  const roles = Array.isArray(item.roles) ? item.roles : item.role

  if (!Array.isArray(roles)) return []

  return roles.map(role => (typeof role === 'number' ? role : role.id))
}

const displayRoles = (item: User) => {
  const roles = Array.isArray(item.roles) ? item.roles : item.role

  if (Array.isArray(roles) && roles.length) {
    return roles.map(role => (
      typeof role === 'number'
        ? roleOptions.value.find(option => option.id === role) ?? { id: role, name: String(role) }
        : role
    ))
  }

  return []
}

const resetForm = (value: Partial<User> = {}) => {
  form.username = value.username ?? ''
  form.email = value.email ?? ''
  form.telegramChatId = value.telegramChatId ?? ''
  form.password = ''
  form.confirmPassword = ''
  form.isRequiredOtp = value.isRequiredOtp ?? true
  form.isActive = value.isActive ?? true
  form.isAdmin = value.isAdmin ?? false
  form.roles = normalizeRoleIds(value)
  nextTick(() => formRef.value?.clearValidate())
}

const loadRoleOptions = async () => {
  try {
    roleLoading.value = true
    const response = await useApi<RoleListResponse>(roleEndpoint, { method: 'get' })
    roleOptions.value = response.payload ?? []
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.load_roles_failed')), 'error')
  } finally {
    roleLoading.value = false
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
    useNotification(getErrorMessage(error, t('user.load_failed')), 'error')
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

  if (!roleOptions.value.length) {
    await loadRoleOptions()
  }
}

const openEditDialog = async (item: User) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!roleOptions.value.length) {
    await loadRoleOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.load_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) return

  const body: {
    username: string
    email: string
    telegramChatId: string
    isRequiredOtp: boolean
    isActive: boolean
    isAdmin: boolean
    roles: number[]
    password?: string
    confirmPassword?: string
  } = {
    username: form.username,
    email: form.email,
    telegramChatId: form.telegramChatId,
    isRequiredOtp: form.isRequiredOtp,
    isActive: form.isActive,
    isAdmin: form.isAdmin,
    roles: form.roles,
  }

  if (form.password) {
    body.password = form.password
    body.confirmPassword = form.confirmPassword
  }

  try {
    submitting.value = true
    await useApi(
      editingItem.value ? `${endpoint}/${editingItem.value.id}` : endpoint,
      {
        method: editingItem.value ? 'put' : 'post',
        body,
      },
    )

    useMessage(editingItem.value ? t('user.updated') : t('user.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: User) => {
  try {
    await ElMessageBox.confirm(
      t('user.confirm_delete', { username: item.username }),
      t('user.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('user.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('user.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadRoleOptions()
})
</script>
