<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('role.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('role.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('role.search_placeholder')"
            class="sm:!w-[260px]"
            @keydown.enter="loadItems"
            @clear="loadItems"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>
          <el-button v-if="can('role-create')" type="primary" @click="openCreateDialog">
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
        <el-table-column prop="name" :label="t('columns.name')" min-width="220" />
        <el-table-column :label="t('role.permissions')" min-width="320">
          <template #default="{ row }">
            <el-tag
              type="primary"
            >
              {{ displayPermissions(row).length }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip v-if="can('role-edit')" :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="can('role-delete')" :content="t('delete')" placement="top">
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
      :title="editingItem ? t('role.edit_title') : t('role.create_title')"
      width="640px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="role-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item :label="t('columns.name')" prop="name">
          <el-input v-model="form.name" placeholder="Admin" />
        </el-form-item>
        <el-form-item :label="t('role.permissions')" prop="permissions">
          <div
            v-loading="permissionLoading"
            class="max-h-[360px] w-full overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <div
              v-if="permissionGroups.length"
              class="space-y-3"
            >
              <div
                v-for="group in permissionGroups"
                :key="group.id"
                class="rounded-md border border-slate-200 bg-white p-3"
              >
                <div class="mb-2 border-b border-slate-100 pb-2">
                  <el-checkbox
                    :model-value="isGroupChecked(group)"
                    :indeterminate="isGroupIndeterminate(group)"
                    @change="checked => toggleGroup(group, Boolean(checked))"
                  >
                    <span class="text-sm font-semibold text-slate-900 capitalize">{{ group.name }}</span>
                  </el-checkbox>
                </div>
                <el-checkbox-group
                  v-model="form.permissions"
                  class="grid gap-2 sm:grid-cols-4"
                >
                  <el-checkbox
                    v-for="permission in group.permissions"
                    :key="permission.id"
                    :value="permission.id"
                    class="!mr-0 !capitalize"
                  >
                    {{ formatPermissionName(permission.name) }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
            <div
              v-else
              class="flex min-h-24 items-center justify-center text-sm text-slate-400"
            >
              {{ t('no_data') }}
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="role-form"
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
  permission: 'role-read'
})

useHead({
  title: 'MINI-POS-ROLE'
})

const { can } = usePermission();

interface Permission {
  id: number
  name: string
}

interface PermissionGroup {
  id: number
  name: string
  permissions: Permission[]
}

interface Role {
  id: number
  name: string
  permission?: Permission[] | number[]
  permissions?: Permission[] | number[]
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: Role[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: Role
}

interface PermissionResponse {
  payload: PermissionGroup[]
}

const endpoint = 'admin/system/role'
const permissionEndpoint = 'admin/system/permission/select-options'
const pageSizes = [10, 20, 50, 100]

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const permissionLoading = ref(false)
const items = ref<Role[]>([])
const permissionGroups = ref<PermissionGroup[]>([])
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
const editingItem = ref<Role | null>(null)

const emptyForm = () => ({
  name: '',
  permissions: [] as number[],
})

const form = reactive(emptyForm())

const allPermissions = computed(() => permissionGroups.value.flatMap(group => group.permissions))

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('role.name_required'), trigger: 'blur' }],
  permissions: [
    {
      required: true,
      type: 'array',
      min: 1,
      message: t('role.permission_required'),
      trigger: 'change',
    },
  ],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.role'))
  breadcrumbStore.setBreadcrumbs([t('menu.system'), t('menu.role')])
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

const normalizePermissionIds = (item: Partial<Role>) => {
  if (Array.isArray(item.permission)) {
    return item.permission.map(permission => (
      typeof permission === 'number' ? permission : permission.id
    ))
  }

  if (Array.isArray(item.permissions)) {
    return item.permissions.map(permission => (
      typeof permission === 'number' ? permission : permission.id
    ))
  }

  return []
}

const displayPermissions = (item: Role) => {
  if (Array.isArray(item.permissions) && item.permissions.length) {
    return item.permissions.map(permission => (
      typeof permission === 'number'
        ? allPermissions.value.find(option => option.id === permission) ?? { id: permission, name: String(permission) }
        : permission
    ))
  }

  return normalizePermissionIds(item)
    .map(id => allPermissions.value.find(permission => permission.id === id) ?? { id, name: String(id) })
}

const resetForm = (value: Partial<Role> = {}) => {
  form.name = value.name ?? ''
  form.permissions = normalizePermissionIds(value)
  nextTick(() => formRef.value?.clearValidate())
}

const formatPermissionName = (name: string) => name.replaceAll('-', ' ')

const groupPermissionIds = (group: PermissionGroup) => group.permissions.map(permission => permission.id)

const selectedGroupPermissionIds = (group: PermissionGroup) => {
  const ids = groupPermissionIds(group)

  return form.permissions.filter(id => ids.includes(id))
}

const isGroupChecked = (group: PermissionGroup) => {
  const ids = groupPermissionIds(group)

  return ids.length > 0 && selectedGroupPermissionIds(group).length === ids.length
}

const isGroupIndeterminate = (group: PermissionGroup) => {
  const selectedCount = selectedGroupPermissionIds(group).length

  return selectedCount > 0 && selectedCount < groupPermissionIds(group).length
}

const toggleGroup = (group: PermissionGroup, checked: boolean) => {
  const ids = groupPermissionIds(group)

  if (checked) {
    form.permissions = Array.from(new Set([...form.permissions, ...ids]))
    return
  }

  form.permissions = form.permissions.filter(id => !ids.includes(id))
}

const loadPermissionOptions = async () => {
  try {
    permissionLoading.value = true
    const response = await useApi<PermissionResponse>(permissionEndpoint, { method: 'get' })
    permissionGroups.value = response.payload ?? []
  } catch (error) {
    useNotification(getErrorMessage(error, t('role.load_permissions_failed')), 'error')
  } finally {
    permissionLoading.value = false
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
    useNotification(getErrorMessage(error, t('role.load_failed')), 'error')
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

  if (!permissionGroups.value.length) {
    await loadPermissionOptions()
  }
}

const openEditDialog = async (item: Role) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!permissionGroups.value.length) {
    await loadPermissionOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('role.load_failed')), 'error')
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
          permissions: form.permissions,
        },
      },
    )

    useMessage(editingItem.value ? t('role.updated') : t('role.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('role.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: Role) => {
  try {
    await ElMessageBox.confirm(
      t('role.confirm_delete', { name: item.name }),
      t('role.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('role.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('role.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadPermissionOptions()
})
</script>
