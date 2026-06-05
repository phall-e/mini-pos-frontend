<template>
  <section class="space-y-5">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="item in summaryCards"
        :key="item.label"
        class="rounded-md border border-slate-200 bg-white p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ item.value }}</p>
          </div>
          <span class="flex h-10 w-10 items-center justify-center rounded-md" :class="item.iconClass">
            <Icon :name="item.icon" size="22" />
          </span>
        </div>
      </div>
    </div>

    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.products') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.manage_product_inventory') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="search"
            clearable
            :placeholder="t('dashboard.search_products')"
            class="sm:!w-[260px]"
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
        :data="paginatedProducts"
        stripe
        class="w-full"
        row-key="id"
      >
        <el-table-column prop="sku" :label="t('dashboard.sku')" width="130" />
        <el-table-column prop="name" :label="t('dashboard.product_name')" min-width="220" />
        <el-table-column prop="category" :label="t('dashboard.category')" min-width="160" />
        <el-table-column prop="stock" :label="t('dashboard.stock')" width="120" align="right" />
        <el-table-column prop="price" :label="t('dashboard.price')" width="140" align="right">
          <template #default="{ row }">
            ${{ row.price.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('dashboard.status')" width="130">
          <template #default="{ row }">
            <el-tag :type="row.status === 'Active' ? 'success' : 'info'">
              {{ t(row.status === 'Active' ? 'active' : 'inactive') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('dashboard.action')" fixed="right" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip :content="t('edit')" placement="top">
                <el-button type="success" circle @click="openEditDialog(row)">
                  <Icon name="solar:pen-2-outline" size="17" />
                </el-button>
              </el-tooltip>
              <el-tooltip :content="t('delete')" placement="top">
                <el-button type="danger" circle @click="deleteProduct(row)">
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
          <el-select v-model="pageSize" class="!w-[88px]" @change="page = 1">
            <el-option
              v-for="size in pageSizes"
              :key="size"
              :label="size"
              :value="size"
            />
          </el-select>
          <span>{{ t('total') }}: {{ filteredProducts.length }}</span>
        </div>

        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          layout="prev, pager, next"
          :total="filteredProducts.length"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingProduct ? t('dashboard.edit_product') : t('dashboard.create_product')"
      width="520px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item :label="t('dashboard.sku')" prop="sku">
          <el-input v-model="form.sku" placeholder="PRD-000" />
        </el-form-item>
        <el-form-item :label="t('dashboard.product_name')" prop="name">
          <el-input v-model="form.name" :placeholder="t('dashboard.product_name')" />
        </el-form-item>
        <div class="grid gap-3 sm:grid-cols-2">
          <el-form-item :label="t('dashboard.category')" prop="category">
            <el-select v-model="form.category" class="w-full" :placeholder="t('dashboard.select_category')">
              <el-option label="Beverage" value="Beverage" />
              <el-option label="Bakery" value="Bakery" />
              <el-option label="Grocery" value="Grocery" />
              <el-option label="Stationery" value="Stationery" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('dashboard.status')" prop="status">
            <el-select v-model="form.status" class="w-full">
              <el-option :label="t('active')" value="Active" />
              <el-option :label="t('inactive')" value="Inactive" />
            </el-select>
          </el-form-item>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <el-form-item :label="t('dashboard.stock')" prop="stock">
            <el-input-number v-model="form.stock" :min="0" class="!w-full" />
          </el-form-item>
          <el-form-item :label="t('dashboard.price')" prop="price">
            <el-input-number v-model="form.price" :min="0" :precision="2" class="!w-full" />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" @click="saveProduct">
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

interface Product {
  id: number
  sku: string
  name: string
  category: string
  stock: number
  price: number
  status: 'Active' | 'Inactive'
}

definePageMeta({
  title: 'Dashboard',
})

const breadcrumbStore = useBreadcrumbStore()
const { t } = useI18n()

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.dashboard'))
  breadcrumbStore.setBreadcrumbs([t('menu.dashboard'), t('dashboard.products')])
})

const products = ref<Product[]>([
  { id: 1, sku: 'PRD-001', name: 'Arabica Coffee Beans', category: 'Beverage', stock: 82, price: 12.5, status: 'Active' },
  { id: 2, sku: 'PRD-002', name: 'Brown Sugar Milk Tea', category: 'Beverage', stock: 44, price: 3.25, status: 'Active' },
  { id: 3, sku: 'PRD-003', name: 'Butter Croissant', category: 'Bakery', stock: 18, price: 2.75, status: 'Active' },
  { id: 4, sku: 'PRD-004', name: 'Thermal Receipt Paper', category: 'Stationery', stock: 120, price: 1.1, status: 'Active' },
  { id: 5, sku: 'PRD-005', name: 'Organic Honey 500g', category: 'Grocery', stock: 26, price: 8.4, status: 'Active' },
  { id: 6, sku: 'PRD-006', name: 'Imported Pasta 1kg', category: 'Grocery', stock: 9, price: 4.9, status: 'Inactive' },
  { id: 7, sku: 'PRD-007', name: 'Chocolate Muffin', category: 'Bakery', stock: 31, price: 2.35, status: 'Active' },
  { id: 8, sku: 'PRD-008', name: 'Mineral Water Pack', category: 'Beverage', stock: 66, price: 5.5, status: 'Active' },
  { id: 9, sku: 'PRD-009', name: 'Barcode Label Roll', category: 'Stationery', stock: 14, price: 6.75, status: 'Active' },
  { id: 10, sku: 'PRD-010', name: 'Green Tea Powder', category: 'Beverage', stock: 21, price: 9.2, status: 'Inactive' },
  { id: 11, sku: 'PRD-011', name: 'Almond Cookies', category: 'Bakery', stock: 38, price: 4.15, status: 'Active' },
])

const summaryCards = computed(() => [
  {
    label: t('dashboard.total_products'),
    value: products.value.length,
    icon: 'solar:box-outline',
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    label: t('dashboard.active_items'),
    value: products.value.filter(item => item.status === 'Active').length,
    icon: 'solar:check-circle-outline',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: t('dashboard.low_stock'),
    value: products.value.filter(item => item.stock < 20).length,
    icon: 'solar:danger-triangle-outline',
    iconClass: 'bg-rose-100 text-rose-700',
  },
  {
    label: t('dashboard.inventory_value'),
    value: `$${products.value.reduce((sum, item) => sum + item.stock * item.price, 0).toFixed(0)}`,
    icon: 'solar:wallet-money-outline',
    iconClass: 'bg-sky-100 text-sky-700',
  },
])

const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const pageSizes = [10, 20, 50]

const filteredProducts = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  if (!keyword) return products.value

  return products.value.filter(item =>
    [item.sku, item.name, item.category, item.status]
      .some(value => value.toLowerCase().includes(keyword))
  )
})

const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize.value

  return filteredProducts.value.slice(start, start + pageSize.value)
})

watch(search, () => {
  page.value = 1
})

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const editingProduct = ref<Product | null>(null)

const emptyForm = (): Omit<Product, 'id'> => ({
  sku: '',
  name: '',
  category: '',
  stock: 0,
  price: 0,
  status: 'Active',
})

const form = reactive(emptyForm())

const rules = computed<FormRules>(() => ({
  sku: [{ required: true, message: t('dashboard.sku_required'), trigger: 'blur' }],
  name: [{ required: true, message: t('dashboard.product_name_required'), trigger: 'blur' }],
  category: [{ required: true, message: t('dashboard.category_required'), trigger: 'change' }],
}))

const resetForm = (value = emptyForm()) => {
  Object.assign(form, value)
  nextTick(() => formRef.value?.clearValidate())
}

const openCreateDialog = () => {
  editingProduct.value = null
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (product: Product) => {
  editingProduct.value = product
  resetForm(product)
  dialogVisible.value = true
}

const saveProduct = async () => {
  await formRef.value?.validate((valid) => {
    if (!valid) return

    if (editingProduct.value) {
      Object.assign(editingProduct.value, form)
      useMessage(t('dashboard.product_updated'))
    } else {
      products.value.unshift({
        id: Date.now(),
        ...form,
      })
      page.value = 1
      useMessage(t('dashboard.product_created'))
    }

    dialogVisible.value = false
  })
}

const deleteProduct = async (product: Product) => {
  try {
    await ElMessageBox.confirm(
      t('dashboard.confirm_delete_product', { name: product.name }),
      t('dashboard.delete_product'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    products.value = products.value.filter(item => item.id !== product.id)
    useMessage(t('dashboard.product_deleted'))
  } catch {
    useMessage(t('delete_canceled'), 'info')
  }
}
</script>

<style>
.admin-dialog-mask {
  position: fixed !important;
  inset: 0 !important;
  z-index: 3000 !important;
  background-color: rgb(15 23 42 / 55%) !important;
}

.admin-dialog-mask .el-overlay-dialog {
  min-height: 100vh;
}
</style>
