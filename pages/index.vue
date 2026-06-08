<template>
  <section class="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <div
        v-for="item in summaryCards"
        :key="item.label"
        class="rounded-md border border-slate-200 bg-white p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm text-slate-500">{{ item.label }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ formatNumber(item.value) }}</p>
          </div>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md" :class="item.iconClass">
            <Icon :name="item.icon" size="22" />
          </span>
        </div>
      </div>
    </div>

    <!-- <div class="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]"> -->
      <div class="rounded-md border border-slate-200 bg-white">
        <div class="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.monthly_sale_graphic')}}</h2>
            <!-- <p class="mt-1 text-sm text-slate-500">Monthly sale amount and quantity</p> -->
          </div>
          <el-button :loading="loading" @click="loadDashboard">
            <Icon name="solar:refresh-outline" size="17" />
            <span class="ml-1">{{ t('dashboard.refresh')}}</span>
          </el-button>
        </div>

        <div v-loading="loading" class="h-[360px] p-4">
          <canvas ref="saleChartRef" aria-label="Sale summary chart" />
          <div
            v-if="!loading && !dashboard.saleChart.length"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            {{ t('no_data') }}
          </div>
        </div>
      </div>

      <!-- <div class="rounded-md border border-slate-200 bg-white">
        <div class="border-b border-slate-200 p-4">
          <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.low_stock') }}</h2>
          <p class="mt-1 text-sm text-slate-500">Products at or below minimum stock</p>
        </div>

        <el-table
          v-loading="loading"
          :data="dashboard.lowStocks"
          stripe
          height="360"
          row-key="stockId"
        >
          <template #empty>{{ t('no_data') }}</template>
          <el-table-column :label="t('columns.product_name')" min-width="220">
            <template #default="{ row }">
              <p class="font-medium text-slate-900">{{ displayProductName(row) }}</p>
              <p class="text-xs text-slate-500">{{ row.productCode }}</p>
            </template>
          </el-table-column>
          <el-table-column :label="t('columns.stock_onhand')" width="130" align="right">
            <template #default="{ row }">
              <span :class="row.currentStock <= row.minStock ? 'font-semibold text-rose-600' : 'text-slate-700'">
                {{ formatNumber(row.currentStock) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="t('columns.min_stock')" width="120" align="right">
            <template #default="{ row }">{{ formatNumber(row.minStock) }}</template>
          </el-table-column>
        </el-table>
      </div> -->
    <!-- </div> -->

    <div class="grid gap-5 lg:grid-cols-2">
      <div class="rounded-md border border-slate-200 bg-white">
        <div class="border-b border-slate-200 p-4">
          <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.purchase_order_status')}}</h2>
          <!-- <p class="mt-1 text-sm text-slate-500">Purchase orders grouped by status</p> -->
        </div>
        <div v-loading="loading" class="h-[320px] p-4">
          <canvas ref="purchaseOrderStatusChartRef" aria-label="Purchase order status chart" />
          <div
            v-if="!loading && !dashboard.purchaseOrderStatusSummary.length"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            {{ t('no_data') }}
          </div>
        </div>
      </div>

      <div class="rounded-md border border-slate-200 bg-white">
        <div class="border-b border-slate-200 p-4">
          <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.sale_status')}}</h2>
          <!-- <p class="mt-1 text-sm text-slate-500">Sales grouped by status</p> -->
        </div>
        <div v-loading="loading" class="h-[320px] p-4">
          <canvas ref="saleStatusChartRef" aria-label="Sale status chart" />
          <div
            v-if="!loading && !dashboard.saleStatusSummary.length"
            class="flex h-full items-center justify-center text-sm text-slate-400"
          >
            {{ t('no_data') }}
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-md border border-slate-200 bg-white">
      <div class="border-b border-slate-200 p-4">
        <h2 class="text-base font-semibold text-slate-900">{{ t('dashboard.low_stock_movement')}}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.stock_movement_totals_for_products_below_threshold')}} </p>
      </div>

      <el-table
        v-loading="loading"
        :data="dashboard.lowStocks"
        stripe
        class="w-full"
        row-key="stockId"
      >
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column prop="productCode" :label="t('columns.code')" min-width="140" />
        <el-table-column :label="t('columns.product_name')" min-width="260">
          <template #default="{ row }">{{ displayProductName(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.min_stock')" min-width="130" align="right">
          <template #default="{ row }">{{ formatNumber(row.minStock) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_onhand')" min-width="140" align="right">
          <template #default="{ row }">
            <el-tag :type="row.currentStock <= row.minStock ? 'danger' : 'warning'">
              {{ formatNumber(row.currentStock) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_in')" min-width="120" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockIn) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_out')" min-width="120" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockOut) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.stock_adjustment')" min-width="170" align="right">
          <template #default="{ row }">{{ formatNumber(row.stockAdjustment) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ArcElement,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

interface DashboardSummary {
  totalUser: number
  totalVendor: number
  totalCustomer: number
  totalCategory: number
  totalProduct: number
  totalSaling: number
  totalExpense: number
}

interface SaleChartItem {
  label: string
  month: number
  totalSales: number
  totalQuantity: number
  totalAmount: number
}

interface LowStockItem {
  stockId: number
  productId: number
  productCode: string
  productNameEn: string
  productNameKh: string
  minStock: number
  currentStock: number
  stockAdjustment: number
  stockIn: number
  stockOut: number
}

interface StatusSummaryItem {
  status: string
  total: number
}

interface DashboardPayload {
  summary: DashboardSummary
  saleChart: SaleChartItem[]
  lowStocks: LowStockItem[]
  purchaseOrderStatusSummary: StatusSummaryItem[]
  saleStatusSummary: StatusSummaryItem[]
}

type DashboardResponse = DashboardPayload | {
  payload?: Partial<DashboardPayload>
}

definePageMeta({
  title: 'Dashboard',
})

useSeoMeta({
  title: 'MINI POS - Dashboard',
})

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, LinearScale, Tooltip, Legend)

const endpoint = 'admin/dashboard'
const breadcrumbStore = useBreadcrumbStore()
const { t, locale } = useI18n()

const loading = ref(false)
const saleChartRef = ref<HTMLCanvasElement>()
const purchaseOrderStatusChartRef = ref<HTMLCanvasElement>()
const saleStatusChartRef = ref<HTMLCanvasElement>()
let saleChart: Chart<'bar'> | null = null
let purchaseOrderStatusChart: Chart<'doughnut'> | null = null
let saleStatusChart: Chart<'doughnut'> | null = null

const emptySummary = (): DashboardSummary => ({
  totalUser: 0,
  totalVendor: 0,
  totalCustomer: 0,
  totalCategory: 0,
  totalProduct: 0,
  totalSaling: 0,
  totalExpense: 0,
})

const dashboard = reactive<DashboardPayload>({
  summary: emptySummary(),
  saleChart: [],
  lowStocks: [],
  purchaseOrderStatusSummary: [],
  saleStatusSummary: [],
})

const summaryCards = computed(() => [
  {
    label: t('dashboard.total_saling'),
    value: dashboard.summary.totalSaling,
    icon: 'solar:cart-large-2-outline',
    iconClass: 'bg-cyan-100 text-cyan-700',
  },
  {
    label: t('dashboard.total_expense'),
    value: dashboard.summary.totalExpense,
    icon: 'solar:bill-list-outline',
    iconClass: 'bg-orange-100 text-orange-700',
  },
  {
    label: t('menu.user'),
    value: dashboard.summary.totalUser,
    icon: 'solar:user-id-outline',
    iconClass: 'bg-sky-100 text-sky-700',
  },
  {
    label: t('menu.vendor'),
    value: dashboard.summary.totalVendor,
    icon: 'solar:delivery-outline',
    iconClass: 'bg-violet-100 text-violet-700',
  },
  {
    label: t('menu.customer'),
    value: dashboard.summary.totalCustomer,
    icon: 'solar:users-group-rounded-outline',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: t('dashboard.category'),
    value: dashboard.summary.totalCategory,
    icon: 'solar:widget-5-outline',
    iconClass: 'bg-amber-100 text-amber-700',
  },
  {
    label: t('menu.product'),
    value: dashboard.summary.totalProduct,
    icon: 'solar:box-outline',
    iconClass: 'bg-rose-100 text-rose-700',
  },
])

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.dashboard'))
  breadcrumbStore.setBreadcrumbs([t('menu.dashboard')])
})

const formatNumber = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const formatAmount = (value: number) => {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

const displayProductName = (item: LowStockItem) => {
  return item.productNameEn || item.productNameKh || item.productCode || String(item.productId)
}

const normalizeDashboard = (response: DashboardResponse): DashboardPayload => {
  const payload = 'payload' in response ? response.payload : response

  return {
    summary: {
      ...emptySummary(),
      ...(payload?.summary ?? {}),
    },
    saleChart: payload?.saleChart ?? [],
    lowStocks: payload?.lowStocks ?? [],
    purchaseOrderStatusSummary: payload?.purchaseOrderStatusSummary ?? [],
    saleStatusSummary: payload?.saleStatusSummary ?? [],
  }
}

const renderSaleChart = () => {
  if (!saleChartRef.value) return

  saleChart?.destroy()
  saleChart = null

  if (!dashboard.saleChart.length) return

  saleChart = new Chart(saleChartRef.value, {
    type: 'bar',
    data: {
      labels: dashboard.saleChart.map(item => item.label),
      datasets: [
        {
          label: 'Total Amount',
          data: dashboard.saleChart.map(item => Number(item.totalAmount ?? 0)),
          backgroundColor: 'rgba(37, 99, 235, 0.72)',
          borderColor: 'rgb(37, 99, 235)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'amount',
        },
        {
          label: 'Total Quantity',
          data: dashboard.saleChart.map(item => Number(item.totalQuantity ?? 0)),
          backgroundColor: 'rgba(16, 185, 129, 0.64)',
          borderColor: 'rgb(5, 150, 105)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'quantity',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label ?? ''
              const value = Number(context.parsed.y ?? 0)

              return label === 'Total Amount'
                ? `${label}: ${formatAmount(value)}`
                : `${label}: ${formatNumber(value)}`
            },
          },
        },
      },
      scales: {
        amount: {
          beginAtZero: true,
          position: 'left',
          ticks: {
            callback: value => formatAmount(Number(value)),
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
        quantity: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: value => formatNumber(Number(value)),
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  })
}

const statusColor = (status: string) => {
  const normalized = status.toLowerCase()

  if (normalized === 'completed') return 'rgba(16, 185, 129, 0.82)'
  if (normalized === 'cancelled') return 'rgba(244, 63, 94, 0.82)'
  if (normalized === 'pending') return 'rgba(245, 158, 11, 0.82)'

  return 'rgba(100, 116, 139, 0.82)'
}

const renderStatusChart = (
  canvas: HTMLCanvasElement | undefined,
  chart: Chart<'doughnut'> | null,
  items: StatusSummaryItem[],
  label: string,
) => {
  chart?.destroy()

  if (!canvas || !items.length) return null

  const total = items.reduce((sum, item) => sum + Number(item.total ?? 0), 0)

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: items.map(item => item.status),
      datasets: [
        {
          label,
          data: items.map(item => Number(item.total ?? 0)),
          backgroundColor: items.map(item => statusColor(item.status)),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    plugins: [{
      id: `${label.replace(/\s+/g, '-').toLowerCase()}-center-total`,
      beforeDraw: (chartInstance) => {
        const { ctx, chartArea } = chartInstance
        if (!chartArea) return

        const centerX = (chartArea.left + chartArea.right) / 2
        const centerY = (chartArea.top + chartArea.bottom) / 2

        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#0f172a'
        ctx.font = '600 28px sans-serif'
        ctx.fillText(formatNumber(total), centerX, centerY - 8)
        ctx.fillStyle = '#64748b'
        ctx.font = '400 12px sans-serif'
        ctx.fillText('Total', centerX, centerY + 18)
        ctx.restore()
      },
    }],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = Number(context.parsed ?? 0)

              return `${context.label}: ${formatNumber(value)}`
            },
          },
        },
      },
    },
  })
}

const renderDashboardCharts = () => {
  renderSaleChart()
  purchaseOrderStatusChart = renderStatusChart(
    purchaseOrderStatusChartRef.value,
    purchaseOrderStatusChart,
    dashboard.purchaseOrderStatusSummary,
    'Purchase Orders',
  )
  saleStatusChart = renderStatusChart(
    saleStatusChartRef.value,
    saleStatusChart,
    dashboard.saleStatusSummary,
    'Sales',
  )
}

const loadDashboard = async () => {
  try {
    loading.value = true
    const response = await useApi<DashboardResponse>(endpoint, { method: 'get' })
    const data = normalizeDashboard(response)

    dashboard.summary = data.summary
    dashboard.saleChart = data.saleChart
    dashboard.lowStocks = data.lowStocks
    dashboard.purchaseOrderStatusSummary = data.purchaseOrderStatusSummary
    dashboard.saleStatusSummary = data.saleStatusSummary

    await nextTick()
    renderDashboardCharts()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard data'
    useNotification(message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})

onBeforeUnmount(() => {
  saleChart?.destroy()
  purchaseOrderStatusChart?.destroy()
  saleStatusChart?.destroy()
})
</script>
