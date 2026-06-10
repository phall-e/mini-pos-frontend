<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <aside
      class="fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white transition-all duration-200"
      :class="collapseStore.isCollapsed ? 'w-[72px]' : 'w-[260px]'"
    >
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <img
          src="~/assets/images/logo/logo.png"
          alt="Mini POS"
          class="h-10 w-10 shrink-0 object-contain"
        >
        <div v-show="!collapseStore.isCollapsed" class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">Mini POS</p>
          <p class="truncate text-xs text-slate-500">{{ t('admin_console') }}</p>
        </div>
      </div>

      <el-scrollbar class="h-[calc(100vh-64px)]">
        <el-menu
          :collapse="collapseStore.isCollapsed"
          :default-active="activeMenu"
          unique-opened
          class="!border-0 px-2 py-3"
          router
        >
          <template
            v-for="item in filteredMenus"
            :key="item.index"
          >
            <el-menu-item
              v-if="!item.children"
              :index="item.index"
            >
              <el-icon>
                <Icon :name="item.icon" size="20" />
              </el-icon>
              <template #title>{{ t(item.label) }}</template>
            </el-menu-item>

            <el-sub-menu
              v-else
              :index="item.index"
            >
              <template #title>
                <el-icon>
                  <Icon :name="item.icon" size="20" />
                </el-icon>
                <span>{{ t(item.label) }}</span>
              </template>

              <el-menu-item
                v-for="child in item.children"
                :key="child.index"
                :index="child.index"
              >
                <el-icon>
                  <Icon :name="child.icon" size="18" />
                </el-icon>
                <template #title>{{ t(child.label) }}</template>
              </el-menu-item>
            </el-sub-menu>
          </template>

        </el-menu>
      </el-scrollbar>
    </aside>

    <header
      class="fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 transition-all duration-200"
      :class="collapseStore.isCollapsed ? 'left-[72px]' : 'left-[260px]'"
    >
      <div class="flex min-w-0 items-center gap-4">
        <el-button text circle @click="collapseStore.setCollapse">
          <Icon
            :name="collapseStore.isCollapsed ? 'solar:hamburger-menu-outline' : 'solar:sidebar-minimalistic-outline'"
            size="22"
          />
        </el-button>

        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold text-slate-900">
            {{ pageTitle }}
          </h1>
          <el-breadcrumb separator="/" class="mt-1">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item"
            >
              {{ item }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <el-segmented
          v-model="selectedLocale"
          :options="languageOptions"
          size="small"
          class="language-switcher hidden sm:flex"
        >
          <template #default="{ item }">
            <span class="language-switcher__option">
              <Icon
                :name="item.flag"
                class="language-switcher__flag"
                aria-hidden="true"
              />
              <span class="language-switcher__label">{{ item.label }}</span>
            </span>
          </template>
        </el-segmented>
        <el-button text circle>
          <Icon name="solar:bell-outline" size="20" />
        </el-button>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-100">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-orange-500 border">
              {{ userInitial }}
            </span>
            <span class="hidden leading-tight sm:block">
              <span class="block text-sm font-medium text-slate-900">{{ username }}</span>
              <span class="block text-xs text-slate-500">{{ t('administrator') }}</span>
            </span>
            <Icon name="solar:alt-arrow-down-outline" size="16" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit-profile">
                <Icon name="mynaui:user" size="17" class="mr-2" />
                {{ t('edit_profile') }}
              </el-dropdown-item>
              <el-dropdown-item command="change-password">
                <Icon name="solar:lock-password-outline" size="17" class="mr-2" />
                {{ t('change_password') }}
              </el-dropdown-item>
              <el-dropdown-item command="logout">
                <Icon name="solar:logout-broken" size="17" class="mr-2" />
                {{ t('logout') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main
      class="min-h-screen pt-16 transition-all duration-200"
      :class="collapseStore.isCollapsed ? 'pl-[72px]' : 'pl-[260px]'"
    >
      <div class="p-5">
        <slot />
      </div>
    </main>

    <el-dialog
      v-model="profileDialogVisible"
      :title="t('profile.edit_information')"
      width="620px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      draggable
    >
      <el-form
        id="profile-form"
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-position="top"
        @submit.prevent="submitProfile"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('username')" prop="username">
            <el-input v-model="profileForm.username" disabled/>
          </el-form-item>
          <el-form-item :label="t('user.email')" prop="email">
            <el-input v-model="profileForm.email" disabled/>
          </el-form-item>
        </div>

        <el-form-item :label="t('user.roles')" prop="roles">
          <el-select
            v-model="profileForm.roles"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            :loading="roleLoading"
            :placeholder="t('user.select_roles')"
            :teleported="false"
            class="w-full"
            disabled
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('user.telegram_chat_id')" prop="telegramChatId">
          <el-input v-model="profileForm.telegramChatId" />
        </el-form-item>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.created_at')">
            <el-input :model-value="profileCreatedAt" disabled />
          </el-form-item>
          <el-form-item :label="t('columns.is_active')" prop="isActive">
            <el-switch
              v-model="profileForm.isActive"
              :active-text="t('active')"
              :inactive-text="t('inactive')"
              disabled
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="profileDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="profile-form"
          :loading="profileSubmitting"
        >
          {{ t('updated') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="passwordDialogVisible"
      :title="t('change_password')"
      width="460px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      draggable
    >
      <el-form
        id="password-form"
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
        @submit.prevent="submitPassword"
      >
        <el-form-item :label="t('password')" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="password-form"
          :loading="passwordSubmitting"
        >
          {{ t('change_password') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="otpDialogVisible"
      :title="t('profile.verify_otp')"
      width="520px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      draggable
    >
      <el-form
        id="otp-password-form"
        ref="otpFormRef"
        :model="otpForm"
        :rules="otpRules"
        label-position="top"
        @submit.prevent="submitOtpPassword"
      >
        <el-form-item :label="t('profile.otp')" prop="otp">
          <el-input
            v-model="otpForm.otp"
            maxlength="6"
            inputmode="numeric"
            placeholder="000000"
          />
        </el-form-item>

        <div class="grid gap-4 sm:grid-cols-2">
          <el-form-item :label="t('columns.new_password')" prop="newPassword">
            <el-input
              v-model="otpForm.newPassword"
              type="password"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
          <el-form-item :label="t('user.confirm_password')" prop="confirmPassword">
            <el-input
              v-model="otpForm.confirmPassword"
              type="password"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="otpDialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button
          type="primary"
          native-type="submit"
          form="otp-password-form"
          :loading="otpSubmitting"
        >
          {{ t('change_password') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';

interface RoleOption {
  id: number
  name: string
}

interface HeaderUser {
  id: number
  username: string
  email: string
  telegramChatId?: string | null
  isActive: boolean
  isAdmin?: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  deletedAt?: string | Date | null
  role?: RoleOption[] | number[]
  roles?: RoleOption[] | number[] | string[]
  permissions?: string[]
}

interface UserResponse {
  payload: HeaderUser
}

interface RoleListResponse {
  payload: RoleOption[]
}

const route = useRoute()
const authStore = useAuthStore()
const collapseStore = useCollapseStore()
const breadcrumbStore = useBreadcrumbStore()
const { t, locale, setLocale } = useI18n()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => breadcrumbStore.pageTitle || t('menu.dashboard'))
const breadcrumbs = computed(() => breadcrumbStore.breadcrumbs.length ? breadcrumbStore.breadcrumbs : [t('menu.dashboard')])

const username = computed(() => authStore.users?.username || authStore.user?.username || 'Admin')
const userInitial = computed(() => username.value.charAt(0).toUpperCase())
const currentUserId = computed(() => authStore.users?.id || authStore.user?.id)
type AppLocale = 'en' | 'km'

const selectedLocale = ref<AppLocale>(locale.value as AppLocale)
const profileDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const otpDialogVisible = ref(false)
const profileSubmitting = ref(false)
const passwordSubmitting = ref(false)
const otpSubmitting = ref(false)
const roleLoading = ref(false)
const roleOptions = ref<RoleOption[]>([])
const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const otpFormRef = ref<FormInstance>()

const profileForm = reactive({
  username: '',
  email: '',
  roles: [] as number[],
  telegramChatId: '',
  createdAt: '',
  isActive: true,
})

const passwordForm = reactive({
  password: '',
})

const otpForm = reactive({
  otp: '',
  newPassword: '',
  confirmPassword: '',
})

const languageOptions = [
  { label: 'English', value: 'en', flag: 'circle-flags:us' },
  { label: 'ខ្មែរ', value: 'km', flag: 'circle-flags:kh' },
]

interface MenuChild {
  index: string;
  label: string;
  icon: string;
  permission?: string | null;
}

interface MenuItem {
  index: string;
  label: string;
  icon: string;
  permission?: string | null;
  children?: MenuChild[];
}

const menuItems: MenuItem[] = [
  {
    index: '/',
    label: 'menu.dashboard',
    icon: 'solar:widget-5-outline',
  },
  {
    index: 'master-data',
    label: 'menu.master_data',
    icon: 'solar:database-outline',
    children: [
      { 
        index: '/admin/master-data/uom/', 
        label: 'menu.uom', 
        icon: 'solar:ruler-angular-outline',
        permission: 'uom-read', 
      },
      { 
        index: '/admin/master-data/products/', 
        label: 'menu.product', 
        icon: 'solar:box-outline',
        permission: 'product-read',  
      },
      { 
        index: '/admin/master-data/categories/', 
        label: 'menu.category', 
        icon: 'solar:folder-with-files-outline',
        permission: 'category-read',  
      },
      { 
        index: '/admin/master-data/vendor/', 
        label: 'menu.vendor', 
        icon: 'solar:delivery-outline',
        permission: 'vendor-read',  
      },
      { 
        index: '/admin/master-data/customer/', 
        label: 'menu.customer', 
        icon: 'solar:users-group-rounded-outline',
        permission: 'customer-read',  
      },
    ],
  },
  {
    index: 'purchasing',
    label: 'menu.purchasing',
    icon: 'solar:cart-large-minimalistic-outline',
    children: [
      { 
        index: '/admin/purchasing/purchase-order/', 
        label: 'menu.purchase_order', 
        icon: 'solar:clipboard-list-outline',
        permission: 'purchase-order-read',  
      },
    ],
  },
  {
    index: 'stocking',
    label: 'menu.stocking',
    icon: 'solar:box-minimalistic-outline',
    children: [
      { 
        index: '/admin/stocking/stock/', 
        label: 'menu.stock', 
        icon: 'solar:box-outline',
        permission: 'stock-read',  
      },
      { 
        index: '/admin/stocking/stock-in/', 
        label: 'menu.stock_in', 
        icon: 'solar:inbox-in-outline',
        permission: 'stock-in-read',  
      },
      { 
        index: '/admin/stocking/stock-adjustment/', 
        label: 'menu.stock_adjustment',
        icon: 'solar:tuning-square-outline',
        permission: 'stock-adjustment-read',  
      },
    ],
  },
  {
    index: 'sales',
    label: 'menu.saling',
    icon: 'solar:cart-large-2-outline',
    children: [
      { 
        index: '/admin/saling/sale/', 
        label: 'menu.sale', 
        icon: 'solar:bill-list-outline',
        permission: 'sale-read',  
      },
    ],
  },
  {
    index: 'system',
    label: 'menu.system',
    icon: 'solar:settings-outline',
    children: [
      { 
        index: '/admin/system/user/', 
        label: 'menu.user', 
        icon: 'solar:user-id-outline',
        permission: 'user-read',  
      },
      { 
        index: '/admin/system/role/', 
        label: 'menu.role', 
        icon: 'solar:shield-user-outline',
        permission: 'role-read',  
      },
      { 
        index: '/admin/system/payment-setting/', 
        label: 'menu.payment_setting', 
        icon: 'solar:card-2-outline',
        permission: 'payment-setting-read',  
      },
      { 
        index: '/admin/system/telegram-setting/', 
        label: 'menu.telegram_setting', 
        icon: 'mage:notification-bell',
        permission: 'telegram-read',  
      },
    ],
  },
]

const { can } = usePermission();
const filterMenus = (menus: MenuItem[]): MenuItem[] => {
  return menus.reduce<MenuItem[]>((result, menu) => {
    // Parent permission check
    if (menu.permission && !can(menu.permission)) {
      return result;
    }

    // No children
    if (!menu.children?.length) {
      result.push(menu);
      return result;
    }

    const children = menu.children.filter(
      (child) =>
        !child.permission || can(child.permission),
    );

    if (children.length) {
      result.push({
        ...menu,
        children,
      });
    }

    return result;
  }, []);
};

const filteredMenus = computed(() =>
  filterMenus(menuItems),
);

watchEffect(() => {
  console.log('user', authStore.user);
  console.log('menus', filteredMenus.value);
});


watch(selectedLocale, async (value) => {
  await setLocale(value)
})

watch(locale, (value) => {
  selectedLocale.value = value as AppLocale
})

const profileCreatedAt = computed(() => {
  if (!profileForm.createdAt) return ''

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(profileForm.createdAt))
})

const profileRules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('user.username_required'), trigger: 'blur' }],
  email: [
    { required: true, message: t('user.email_required'), trigger: 'blur' },
    { type: 'email', message: t('user.email_invalid'), trigger: ['blur', 'change'] },
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

const passwordRules = computed<FormRules>(() => ({
  password: [{ required: true, message: t('user.password_required'), trigger: 'blur' }],
}))

const otpRules = computed<FormRules>(() => ({
  otp: [
    { required: true, message: t('profile.otp_required'), trigger: 'blur' },
    {
      pattern: /^\d{6}$/,
      message: t('profile.otp_invalid'),
      trigger: ['blur', 'change'],
    },
  ],
  newPassword: [{ required: true, message: t('profile.new_password_required'), trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: t('user.confirm_password_required'), trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== otpForm.newPassword) {
          callback(new Error(t('user.password_mismatch')))
          return
        }

        callback()
      },
      trigger: ['blur', 'change'],
    },
  ],
}))

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

const normalizeRoleIds = (item: Partial<HeaderUser>) => {
  const roles = Array.isArray(item.roles) ? item.roles : item.role

  if (!Array.isArray(roles)) return []

  return roles
    .map((role) => {
      if (typeof role === 'number') return role
      if (typeof role === 'string') {
        return roleOptions.value.find(option => option.name === role)?.id
      }

      return role.id
    })
    .filter((role): role is number => typeof role === 'number')
}

const resetProfileForm = (user: Partial<HeaderUser> = {}) => {
  profileForm.username = user.username ?? ''
  profileForm.email = user.email ?? ''
  profileForm.roles = normalizeRoleIds(user)
  profileForm.telegramChatId = user.telegramChatId ?? ''
  profileForm.createdAt = user.createdAt ? String(user.createdAt) : ''
  profileForm.isActive = user.isActive ?? true
  nextTick(() => profileFormRef.value?.clearValidate())
}

const resetPasswordForms = () => {
  passwordForm.password = ''
  otpForm.otp = ''
  otpForm.newPassword = ''
  otpForm.confirmPassword = ''
  nextTick(() => {
    passwordFormRef.value?.clearValidate()
    otpFormRef.value?.clearValidate()
  })
}

const loadRoleOptions = async () => {
  if (roleOptions.value.length) return

  try {
    roleLoading.value = true
    const response = await useApi<RoleListResponse>('admin/system/role/select-options', { method: 'get' })
    roleOptions.value = response.payload ?? []
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.load_roles_failed')), 'error')
  } finally {
    roleLoading.value = false
  }
}

const openProfileDialog = async () => {
  if (!currentUserId.value) {
    useNotification(t('profile.current_user_missing'), 'error')
    return
  }

  profileDialogVisible.value = true
  await loadRoleOptions()

  try {
    profileSubmitting.value = true
    const response = await useApi<UserResponse>(`admin/system/user/${currentUserId.value}`, { method: 'get' })
    resetProfileForm(response.payload)
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.load_failed')), 'error')
  } finally {
    profileSubmitting.value = false
  }
}

const openPasswordDialog = () => {
  if (!currentUserId.value) {
    useNotification(t('profile.current_user_missing'), 'error')
    return
  }

  resetPasswordForms()
  passwordDialogVisible.value = true
}

const submitProfile = async () => {
  const valid = await profileFormRef.value?.validate().catch(() => false)

  if (!valid || !currentUserId.value) return

  try {
    profileSubmitting.value = true
    const response = await useApi<UserResponse>(
      `admin/system/user/${currentUserId.value}`,
      {
        method: 'put',
        body: {
          username: profileForm.username,
          email: profileForm.email,
          roles: profileForm.roles,
          telegramChatId: profileForm.telegramChatId,
          isActive: profileForm.isActive,
        },
      },
    )

    const updatedUser = response.payload
    authStore.user = updatedUser
    authStore.users = updatedUser
    useMessage(t('your_profile_updated_successfully'))
    profileDialogVisible.value = false
  } catch (error) {
    useNotification(getErrorMessage(error, t('user.save_failed')), 'error')
  } finally {
    profileSubmitting.value = false
  }
}

const submitPassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)

  if (!valid || !currentUserId.value) return

  try {
    passwordSubmitting.value = true
    await useApi(
      `admin/system/user/${currentUserId.value}/reset-password`,
      {
        method: 'post',
        body: {
          password: passwordForm.password,
        },
      },
    )

    passwordDialogVisible.value = false
    otpDialogVisible.value = true
    nextTick(() => otpFormRef.value?.clearValidate())
  } catch (error) {
    useNotification(getErrorMessage(error, t('profile.password_check_failed')), 'error')
  } finally {
    passwordSubmitting.value = false
  }
}

const submitOtpPassword = async () => {
  const valid = await otpFormRef.value?.validate().catch(() => false)

  if (!valid || !currentUserId.value) return

  try {
    otpSubmitting.value = true
    await useApi(
      `admin/system/user/${currentUserId.value}/reset-password/verify-otp`,
      {
        method: 'post',
        body: {
          otp: otpForm.otp,
          newPassword: otpForm.newPassword,
          confirmPassword: otpForm.confirmPassword,
        },
      },
    )

    useMessage(t('your_password_change_successfully'))
    otpDialogVisible.value = false
    resetPasswordForms()
  } catch (error) {
    useNotification(getErrorMessage(error, t('profile.otp_verify_failed')), 'error')
  } finally {
    otpSubmitting.value = false
  }
}

const handleUserCommand = async (command: string) => {
  if (command === 'edit-profile') {
    await openProfileDialog()
    return
  }

  if (command === 'change-password') {
    openPasswordDialog()
    return
  }

  if (command === 'logout') {
    await authStore.logout()
  }
}
</script>

<style scoped>
.language-switcher {
  --el-segmented-bg-color: #f8fafc;
  --el-segmented-item-hover-bg-color: #eef2f7;
  --el-segmented-item-selected-bg-color: #f59e0b;
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-selected-disabled-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 2px;
}

.language-switcher :deep(.el-segmented__group) {
  align-items: center;
  gap: 2px;
}

.language-switcher :deep(.el-segmented__item) {
  min-width: 96px;
  height: 25px;
  border-radius: 6px;
  padding: 0 10px;
}

.language-switcher :deep(.el-segmented__item-label) {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.language-switcher__option {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 400;
}

.language-switcher__flag {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgb(15 23 42 / 8%);
}

.language-switcher__label {
  min-width: 0;
}
</style>
