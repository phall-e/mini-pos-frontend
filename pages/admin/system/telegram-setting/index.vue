<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">
            {{ t('telegram_setting.title') }}
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            {{ t('telegram_setting.description') }}
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('telegram_setting.search_placeholder')"
            class="sm:!w-[260px]"
          >
            <template #prefix>
              <Icon name="solar:magnifer-outline" />
            </template>
          </el-input>

          <el-button
            type="primary"
            @click="openCreateDialog"
          >
            <Icon
              name="solar:add-circle-outline"
              size="18"
            />
            <span class="ml-1">
              {{ t('create') }}
            </span>
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        row-key="id"
      >
        <template #empty>
          {{ t('no_data') }}
        </template>

        <el-table-column
          prop="name"
          :label="t('telegram_setting.name')"
          min-width="200"
        />

        <el-table-column
          prop="telegramChatId"
          :label="t('telegram_setting.telegram_chat_id')"
          min-width="220"
        />

        <el-table-column
          prop="slug"
          :label="t('telegram_setting.slug')"
          min-width="180"
        />

        <el-table-column
          :label="t('telegram_setting.status')"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.isActive ? 'success' : 'danger'"
            >
              {{ row.isActive ? t('active') : t('inactive') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="t('columns.action')"
          fixed="right"
          width="140"
          align="center"
        >
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip
                :content="t('edit')"
              >
                <el-button
                  type="success"
                  circle
                  @click="openEditDialog(row)"
                >
                  <Icon
                    name="solar:pen-2-outline"
                    size="17"
                  />
                </el-button>
              </el-tooltip>

              <el-tooltip
                :content="t('delete')"
              >
                <el-button
                  type="danger"
                  circle
                  @click="deleteItem(row)"
                >
                  <Icon
                    name="solar:trash-bin-trash-outline"
                    size="17"
                  />
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <span>{{ t('dashboard.rows') }}</span>

          <el-select
            v-model="params.limit"
            class="!w-[88px]"
            @change="handleLimitChange"
          >
            <el-option
              v-for="size in pageSizes"
              :key="size"
              :label="size"
              :value="size"
            />
          </el-select>

          <span>
            {{ t('total') }}:
            {{ meta.totalItems }}
          </span>
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
      :title="editingItem ? t('telegram_setting.edit_title') : t('telegram_setting.create_title')"
      width="520px"
      align-center
      append-to-body
    >
      <el-form
        id="telegram-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item
          :label="t('telegram_setting.name')"
          prop="name"
        >
          <el-input
            v-model="form.name"
          />
        </el-form-item>

        <el-form-item
          :label="t('telegram_setting.telegram_chat_id')"
          prop="telegramChatId"
        >
          <el-input
            v-model="form.telegramChatId"
            placeholder="-100123456789"
          />
        </el-form-item>

        <el-form-item
          :label="t('telegram_setting.slug')"
          prop="slug"
        >
          <el-input
            v-model="form.slug"
          />
        </el-form-item>

        <el-form-item
          :label="t('telegram_setting.status')"
        >
          <el-switch
            v-model="form.isActive"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button
          @click="dialogVisible = false"
        >
          {{ t('cancel') }}
        </el-button>

        <el-button
          type="primary"
          native-type="submit"
          form="telegram-form"
          :loading="submitting"
        >
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type {
  FormInstance,
  FormRules,
} from 'element-plus'

import { useDebounceFn } from '@vueuse/core'

interface TelegramSetting {
  id: number
  name: string
  telegramChatId: string
  slug: string
  isActive: boolean
  createdById: number
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
    data: TelegramSetting[]
    meta?: Partial<ListMeta>
  }
}

interface ItemResponse {
  payload: TelegramSetting
}

const endpoint = 'admin/system/telegrams'
const pageSizes = [10, 20, 50, 100]

const { t } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)

const items = ref<TelegramSetting[]>([])

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

const editingItem = ref<TelegramSetting | null>(null)

const emptyForm = () => ({
  name: '',
  telegramChatId: '',
  slug: '',
  isActive: true,
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  name: [
    {
      required: true,
      message: t('telegram_setting.name_required'),
      trigger: 'blur',
    },
  ],
  telegramChatId: [
    {
      required: true,
      message: t('telegram_setting.telegram_chat_id_required'),
      trigger: 'blur',
    },
  ],
  slug: [
    {
      required: true,
      message: t('telegram_setting.slug_required'),
      trigger: 'blur',
    },
  ],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(
    t('menu.telegram_setting'),
  )

  breadcrumbStore.setBreadcrumbs([
    t('menu.system'),
    t('menu.telegram_setting'),
  ])
})

const debouncedLoad = useDebounceFn(() => {
  params.page = 1
  loadItems()
}, 500)

watch(
  () => params.search,
  debouncedLoad,
)

const getErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const maybeError = error as {
      message?: string
      data?: {
        message?: string
      }
    }

    return (
      maybeError.data?.message ??
      maybeError.message ??
      fallback
    )
  }

  return fallback
}

const resetForm = (
  value?: Partial<TelegramSetting>,
) => {
  Object.assign(
    form,
    emptyForm(),
    value || {},
  )

  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const loadItems = async () => {
  try {
    loading.value = true

    const response =
      await useApi<ListResponse>(
        `${endpoint}?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search)}`,
        {
          method: 'get',
        },
      )

    items.value =
      response.payload.data ?? []

    meta.totalItems =
      response.payload.meta
        ?.totalItems ??
      items.value.length

    meta.currentPage =
      response.payload.meta
        ?.currentPage ??
      params.page

    meta.totalPages =
      response.payload.meta
        ?.totalPages ?? 1
  } catch (error) {
    useNotification(
      getErrorMessage(
        error,
        t('telegram_setting.load_failed'),
      ),
      'error',
    )
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

const openEditDialog = async (
  item: TelegramSetting,
) => {
  try {
    editingItem.value = item
    dialogVisible.value = true
    submitting.value = true

    const response =
      await useApi<ItemResponse>(
        `${endpoint}/${item.id}`,
        {
          method: 'get',
        },
      )

    resetForm(response.payload)
  } catch (error) {
    useNotification(
      getErrorMessage(
        error,
        t('telegram_setting.load_failed'),
      ),
      'error',
    )
  } finally {
    submitting.value = false
  }
}

const submit = async () => {
  const valid =
    await formRef.value
      ?.validate()
      .catch(() => false)

  if (!valid) return

  try {
    submitting.value = true

    await useApi(
      editingItem.value
        ? `${endpoint}/${editingItem.value.id}`
        : endpoint,
      {
        method:
          editingItem.value
            ? 'put'
            : 'post',
        body: {
          name: form.name,
          telegramChatId:
            form.telegramChatId,
          slug: form.slug,
          isActive:
            form.isActive,
        },
      },
    )

    useMessage(
      editingItem.value
        ? t('telegram_setting.updated')
        : t('telegram_setting.created'),
    )

    dialogVisible.value = false

    await loadItems()
  } catch (error) {
    useNotification(
      getErrorMessage(
        error,
        t('telegram_setting.save_failed'),
      ),
      'error',
    )
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (
  item: TelegramSetting,
) => {
  try {
    await ElMessageBox.confirm(
      t(
        'telegram_setting.confirm_delete',
        {
          name: item.name,
        },
      ),
      t('telegram_setting.delete_title'),
      {
        confirmButtonText:
          t('delete'),
        cancelButtonText:
          t('cancel'),
        type: 'warning',
      },
    )

    await useApi(
      `${endpoint}/${item.id}`,
      {
        method: 'delete',
      },
    )

    useMessage(
      t('telegram_setting.deleted'),
    )

    await loadItems()
  } catch (error) {
    if (
      error === 'cancel' ||
      error === 'close'
    ) {
      return
    }

    useNotification(
      getErrorMessage(
        error,
        t(
          'telegram_setting.delete_failed',
        ),
      ),
      'error',
    )
  }
}

onMounted(() => {
  loadItems()
})
</script>