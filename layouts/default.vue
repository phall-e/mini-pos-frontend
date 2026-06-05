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
            v-for="item in menuItems"
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
          class="hidden sm:flex"
        />
        <el-button text circle>
          <Icon name="solar:bell-outline" size="20" />
        </el-button>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-100">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
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
              <el-dropdown-item command="logout">{{ t('logout') }}</el-dropdown-item>
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
  </div>
</template>

<script setup lang="ts">
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
type AppLocale = 'en' | 'km'

const selectedLocale = ref<AppLocale>(locale.value as AppLocale)

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'ខ្មែរ', value: 'km' },
]

const menuItems = [
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
      { index: '/admin/master-data/uom/', label: 'menu.uom', icon: 'solar:ruler-angular-outline' },
      { index: '/products', label: 'menu.product', icon: 'solar:box-outline' },
      { index: '/categories', label: 'menu.category', icon: 'solar:folder-with-files-outline' },
      { index: '/suppliers', label: 'menu.supplier', icon: 'solar:delivery-outline' },
    ],
  },
  {
    index: 'sales',
    label: 'menu.saling',
    icon: 'solar:cart-large-2-outline',
    children: [
      { index: '/sales', label: 'menu.sale', icon: 'solar:bill-list-outline' },
      { index: '/customers', label: 'menu.customer', icon: 'solar:users-group-rounded-outline' },
    ],
  },
  {
    index: 'system',
    label: 'menu.system',
    icon: 'solar:settings-outline',
    children: [
      { index: '/admin/system/user/', label: 'menu.user', icon: 'solar:user-id-outline' },
      { index: '/admin/system/role/', label: 'menu.role', icon: 'solar:shield-user-outline' },
    ],
  },
]

watch(selectedLocale, async (value) => {
  await setLocale(value)
})

watch(locale, (value) => {
  selectedLocale.value = value as AppLocale
})

const handleUserCommand = async (command: string) => {
  if (command === 'logout') {
    await authStore.logout()
  }
}
</script>
