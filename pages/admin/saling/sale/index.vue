<template>
  <section class="space-y-5">
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ t('sale.title') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('sale.description') }}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <el-input
            v-model="params.search"
            clearable
            :placeholder="t('sale.search_placeholder')"
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

      <el-table v-loading="loading" :data="items" stripe class="w-full" row-key="id">
        <template #empty>{{ t('no_data') }}</template>
        <el-table-column prop="code" :label="t('columns.code')" min-width="140" />
        <el-table-column :label="t('columns.sale_date')" min-width="170">
          <template #default="{ row }">{{ displayDate(row.saleDate) }}</template>
        </el-table-column>
        <el-table-column :label="t('menu.customer')" min-width="220">
          <template #default="{ row }">{{ displayCustomer(row.customer, row.customerId) }}</template>
        </el-table-column>
        <el-table-column :label="t('sale.payment_type')" min-width="190">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                <img
                  v-if="paymentTypeLogoUrl(row.paymentType, row.paymentTypeId)"
                  :src="paymentTypeLogoUrl(row.paymentType, row.paymentTypeId) ?? ''"
                  :alt="displayPaymentType(row.paymentType, row.paymentTypeId)"
                  class="h-full w-full object-contain"
                >
                <Icon v-else name="solar:card-2-outline" size="16" class="text-slate-400" />
              </div>
              <span class="truncate">{{ displayPaymentType(row.paymentType, row.paymentTypeId) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.status')" min-width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ displayStatus(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('columns.total_quantity')" min-width="150" align="right">
          <template #default="{ row }">{{ formatNumber(getTotalQuantity(row.items)) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.total_amount')" min-width="150" align="right">
          <template #default="{ row }">{{ formatAmount(getTotalAmount(row.items)) }}</template>
        </el-table-column>
        <el-table-column prop="note" :label="t('columns.note')" min-width="220" show-overflow-tooltip />
        <el-table-column :label="t('columns.attachments')" min-width="140" align="center">
          <template #default="{ row }">{{ getAttachmentCount(row) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.created_at')" min-width="190">
          <template #default="{ row }">{{ displayCreatedAt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('columns.action')" fixed="right" width="190" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <el-tooltip content="Print invoice" placement="top">
                <el-button type="primary" circle :loading="printLoadingId === row.id" @click="printInvoice(row)">
                  <Icon v-if="printLoadingId !== row.id" name="fluent:print-20-regular" size="17" />
                </el-button>
              </el-tooltip>
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
            <el-option v-for="size in pageSizes" :key="size" :label="size" :value="size" />
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
      :title="editingItem ? t('sale.edit_title') : t('sale.create_title')"
      width="1080px"
      align-center
      append-to-body
      modal-class="admin-dialog-mask"
      fullscreen
    >
      <el-form
        id="sale-form"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <template v-if="!editingItem">
          <div class="grid gap-4 xl:grid-cols-[1fr_420px]">
            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-3">
                <el-form-item :label="t('columns.code')" prop="code">
                  <el-input v-model="form.code" :disabled="codeLoading" placeholder="SALE-001" />
                </el-form-item>
                <el-form-item :label="t('columns.sale_date')" prop="saleDate">
                  <el-date-picker
                    v-model="form.saleDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    :placeholder="t('columns.sale_date')"
                    :teleported="false"
                    popper-class="sale-popper"
                    class="!w-full"
                  />
                </el-form-item>
                <el-form-item :label="t('columns.status')" prop="status">
                  <el-select v-model="form.status" :teleported="false" popper-class="sale-popper" class="w-full">
                    <el-option v-for="status in statusOptions" :key="status" :label="displayStatus(status)" :value="status" />
                  </el-select>
                </el-form-item>
              </div>

              <div class="grid gap-4 sm:grid-cols-[240px_1fr]">
                <el-select
                  v-model="productCategoryFilter"
                  clearable
                  filterable
                  :loading="categoryLoading"
                  :placeholder="t('sale.all_categories')"
                  :teleported="false"
                  popper-class="sale-popper"
                  class="w-full"
                >
                  <el-option v-for="category in categoryOptions" :key="category.id" :label="category.name" :value="category.id" />
                </el-select>
                <el-input v-model="productSearch" clearable :placeholder="t('sale.search_product_placeholder')">
                  <template #prefix>
                    <Icon name="solar:magnifer-outline" />
                  </template>
                </el-input>
              </div>

              <el-scrollbar height="calc(100vh - 330px)" class="rounded-md border border-slate-200">
                <div class="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  <button
                    v-for="product in filteredProducts"
                    :key="product.id"
                    type="button"
                    class="min-h-[138px] rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-primary hover:shadow-sm"
                    @click="addProductToCart(product)"
                  >
                    <div class="flex h-full flex-col justify-between gap-3">
                      <div>
                        <div class="mb-3 flex items-start gap-3">
                          <div class="h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                            <img
                              v-if="thumbnailUrl(product.thumbnail)"
                              :src="thumbnailUrl(product.thumbnail) ?? ''"
                              :alt="displayProductName(product)"
                              class="h-full w-full object-cover"
                            >
                            <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                              <Icon name="solar:gallery-minimalistic-outline" size="20" />
                            </div>
                          </div>
                          <div class="min-w-0 flex-1">
                            <div class="mb-2 flex items-start justify-between gap-2">
                              <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {{ displayCategory(product.category, product.categoryId) }}
                              </span>
                              <span class="shrink-0 text-sm font-semibold text-primary">{{ formatAmount(product.unitPrice) }}</span>
                            </div>
                            <p class="line-clamp-2 text-sm font-semibold text-slate-900">{{ displayProductName(product) }}</p>
                            <p class="mt-1 text-xs text-slate-500">{{ product.code }}</p>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center justify-between text-xs text-slate-500">
                        <span>{{ getCartQuantity(product.id) }} {{ t('sale.in_cart') }}</span>
                        <Icon name="solar:add-circle-outline" size="18" class="text-primary" />
                      </div>
                    </div>
                  </button>
                </div>
                <template v-if="!filteredProducts.length">
                  <div class="flex h-40 items-center justify-center text-sm text-slate-400">{{ t('no_data') }}</div>
                </template>
              </el-scrollbar>
            </div>

            <div class="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <el-form-item :label="t('menu.customer')" prop="customerId">
                  <el-select
                    v-model="form.customerId"
                    filterable
                    :loading="customerLoading"
                    :placeholder="t('sale.select_customer')"
                    :teleported="false"
                    popper-class="sale-popper"
                    class="w-full"
                  >
                    <el-option v-for="customer in customerOptions" :key="customer.id" :label="customer.name" :value="customer.id" />
                  </el-select>
                </el-form-item>
                <el-form-item :label="t('sale.payment_type')" prop="paymentTypeId">
                  <el-select
                    v-model="form.paymentTypeId"
                    filterable
                    :loading="paymentTypeLoading"
                    :placeholder="t('sale.select_payment_type')"
                    :teleported="false"
                    popper-class="sale-popper"
                    class="w-full"
                  >
                    <el-option v-for="paymentType in paymentTypeOptions" :key="paymentType.id" :label="paymentType.name" :value="paymentType.id">
                      <div class="flex items-center gap-2">
                        <div class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                          <img
                            v-if="paymentTypeLogoUrl(paymentType)"
                            :src="paymentTypeLogoUrl(paymentType) ?? ''"
                            :alt="paymentType.name"
                            class="h-full w-full object-contain"
                          >
                          <Icon v-else name="solar:card-2-outline" size="14" class="text-slate-400" />
                        </div>
                        <span>{{ paymentType.name }}</span>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
                <el-form-item :label="t('columns.note')" prop="note">
                  <el-input v-model="form.note" type="textarea" :rows="2" :placeholder="t('columns.note')" />
                </el-form-item>
              </div>

              <div class="rounded-md border border-slate-200 bg-white">
                <div class="flex items-center justify-between border-b border-slate-200 p-3">
                  <span class="text-sm font-semibold text-slate-900">{{ t('sale.cart') }}</span>
                  <span class="text-xs text-slate-500">{{ form.items.length }} {{ t('columns.items') }}</span>
                </div>
                <el-scrollbar height="calc(100vh - 455px)">
                  <div class="divide-y divide-slate-100">
                    <div v-for="(item, index) in form.items" :key="item.localKey ?? item.id ?? item.productId ?? index" class="p-3">
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-start gap-3">
                          <div class="h-12 w-12 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                            <img
                              v-if="thumbnailUrl(itemThumbnail(item))"
                              :src="thumbnailUrl(itemThumbnail(item)) ?? ''"
                              :alt="displayProduct(item.product, item.productId)"
                              class="h-full w-full object-cover"
                            >
                            <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                              <Icon name="solar:gallery-minimalistic-outline" size="18" />
                            </div>
                          </div>
                          <div class="min-w-0">
                            <p class="truncate text-sm font-medium text-slate-900">{{ displayProduct(item.product, item.productId) }}</p>
                            <p class="text-xs text-slate-500">{{ formatAmount(item.unitPrice) }}</p>
                          </div>
                        </div>
                        <el-button type="danger" text circle @click="removeSaleItemByProduct(item.productId)">
                          <Icon name="solar:trash-bin-trash-outline" size="17" />
                        </el-button>
                      </div>
                      <div class="mt-3 grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                        <el-input-number v-model="item.quantity" :min="1" size="small" />
                        <el-input-number v-model="item.discount" :min="0" :precision="2" step="any" size="small" />
                        <span class="text-sm font-semibold text-slate-900">{{ formatAmount(getItemTotalAmount(item)) }}</span>
                      </div>
                    </div>
                    <div v-if="!form.items.length" class="p-6 text-center text-sm text-slate-400">{{ t('sale.empty_cart') }}</div>
                  </div>
                </el-scrollbar>
              </div>

              <div class="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                <div 
                    v-if="!isCashed"
                    class="flex items-center justify-center w-full mt-2"
                  >
                    <el-image 
                      v-loading="paymentMethodLoading"
                      :src="qrImage"
                    />
                  </div>
                <div class="flex items-center justify-between text-sm text-slate-600">
                  <span>{{ t('columns.total_quantity') }}</span>
                  <span>{{ formatNumber(totalQuantity) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm text-slate-600">
                  <span>{{ t('columns.total_discount') }}</span>
                  <span>$ {{ formatAmount(totalDiscount) }}</span>
                </div>
                <div class="flex items-center justify-between text-lg font-semibold text-slate-900">
                  <span>{{ t('columns.grand_total') }}</span>
                  <span>$ {{ formatAmount(totalAmount) }}</span>
                </div>
              </div>

              <el-tabs v-model="activeFormTab" type="border-card">
                <el-tab-pane :label="t('columns.attachment')" name="attachment">
                  <DropZone v-model="form.attachments" />
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-2">
            <el-form-item :label="t('columns.code')" prop="code">
              <el-input v-model="form.code" />
            </el-form-item>
            <el-form-item :label="t('columns.sale_date')" prop="saleDate">
              <el-date-picker
                v-model="form.saleDate"
                type="date"
                value-format="YYYY-MM-DD"
                :placeholder="t('columns.sale_date')"
                :teleported="false"
                popper-class="sale-popper"
                class="!w-full"
              />
            </el-form-item>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <el-form-item :label="t('menu.customer')" prop="customerId">
              <el-select
                v-model="form.customerId"
                filterable
                :loading="customerLoading"
                :placeholder="t('sale.select_customer')"
                :teleported="false"
                popper-class="sale-popper"
                class="w-full"
              >
                <el-option v-for="customer in customerOptions" :key="customer.id" :label="customer.name" :value="customer.id" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('sale.payment_type')" prop="paymentTypeId">
              <el-select
                v-model="form.paymentTypeId"
                filterable
                :loading="paymentTypeLoading"
                :placeholder="t('sale.select_payment_type')"
                :teleported="false"
                popper-class="sale-popper"
                class="w-full"
              >
                <el-option v-for="paymentType in paymentTypeOptions" :key="paymentType.id" :label="paymentType.name" :value="paymentType.id">
                  <div class="flex items-center gap-2">
                    <div class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                      <img
                        v-if="paymentTypeLogoUrl(paymentType)"
                        :src="paymentTypeLogoUrl(paymentType) ?? ''"
                        :alt="paymentType.name"
                        class="h-full w-full object-contain"
                      >
                      <Icon v-else name="solar:card-2-outline" size="14" class="text-slate-400" />
                    </div>
                    <span>{{ paymentType.name }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item :label="t('columns.status')" prop="status">
              <el-select v-model="form.status" :teleported="false" popper-class="sale-popper" class="w-full">
                <el-option v-for="status in statusOptions" :key="status" :label="displayStatus(status)" :value="status" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item :label="t('columns.note')" prop="note">
            <el-input v-model="form.note" type="textarea" :rows="3" :placeholder="t('columns.note')" />
          </el-form-item>

          <div class="grid gap-4 sm:grid-cols-3">
            <el-form-item :label="t('columns.total_quantity')">
              <el-input :model-value="formatNumber(totalQuantity)" disabled />
            </el-form-item>
            <el-form-item :label="t('columns.total_discount')">
              <el-input :model-value="formatAmount(totalDiscount)" disabled />
            </el-form-item>
            <el-form-item :label="t('columns.total_amount')">
              <el-input :model-value="formatAmount(totalAmount)" disabled />
            </el-form-item>
          </div>

          <el-tabs v-model="activeFormTab" type="border-card">
            <el-tab-pane :label="t('columns.items')" name="items">
              <div class="space-y-3">
                <div class="flex justify-end">
                  <el-button type="primary" @click="addSaleItem">
                    <Icon name="solar:add-circle-outline" size="18" />
                    <span class="ml-1">{{ t('sale.add_item') }}</span>
                  </el-button>
                </div>

                <el-table :data="form.items" stripe row-key="localKey">
                  <template #empty>{{ t('no_data') }}</template>
                  <el-table-column :label="t('columns.product_name')" min-width="260">
                    <template #default="{ row, $index }">
                      <div class="flex items-center gap-3">
                        <div class="h-11 w-11 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                          <img
                            v-if="thumbnailUrl(itemThumbnail(row))"
                            :src="thumbnailUrl(itemThumbnail(row)) ?? ''"
                            :alt="displayProduct(row.product, row.productId)"
                            class="h-full w-full object-cover"
                          >
                          <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                            <Icon name="solar:gallery-minimalistic-outline" size="17" />
                          </div>
                        </div>
                        <el-form-item :prop="`items.${$index}.productId`" :rules="itemProductRules" class="!mb-0 flex-1">
                          <el-select
                            v-model="row.productId"
                            filterable
                            :loading="productLoading"
                            :placeholder="t('sale.select_product')"
                            :teleported="false"
                            popper-class="sale-popper"
                            class="w-full"
                            @change="handleProductChange(row)"
                          >
                            <el-option v-for="product in productOptions" :key="product.id" :label="product.name" :value="product.id">
                              <div class="flex items-center gap-2">
                                <div class="h-7 w-7 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                                  <img
                                    v-if="thumbnailUrl(product.thumbnail)"
                                    :src="thumbnailUrl(product.thumbnail) ?? ''"
                                    :alt="product.name"
                                    class="h-full w-full object-cover"
                                  >
                                  <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                                    <Icon name="solar:gallery-minimalistic-outline" size="14" />
                                  </div>
                                </div>
                                <span class="truncate">{{ product.name }}</span>
                              </div>
                            </el-option>
                          </el-select>
                        </el-form-item>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('columns.quantity')" min-width="150">
                    <template #default="{ row, $index }">
                      <el-form-item :prop="`items.${$index}.quantity`" :rules="itemQuantityRules" class="!mb-0">
                        <el-input-number v-model="row.quantity" :min="1" class="!w-full" />
                      </el-form-item>
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('columns.unit_price')" min-width="170">
                    <template #default="{ row, $index }">
                      <el-form-item :prop="`items.${$index}.unitPrice`" :rules="itemUnitPriceRules" class="!mb-0">
                        <el-input-number v-model="row.unitPrice" :min="0" :precision="2" step="any" class="!w-full" />
                      </el-form-item>
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('columns.discount')" min-width="170">
                    <template #default="{ row }">
                      <el-input-number v-model="row.discount" :min="0" :precision="2" step="any" class="!w-full" />
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('columns.total_amount')" min-width="150">
                    <template #default="{ row }">{{ formatAmount(getItemTotalAmount(row)) }}</template>
                  </el-table-column>
                  <el-table-column :label="t('columns.note')" min-width="220">
                    <template #default="{ row }">
                      <el-input v-model="row.note" :placeholder="t('columns.note')" />
                    </template>
                  </el-table-column>
                  <el-table-column :label="t('columns.action')" width="100" align="center">
                    <template #default="{ $index }">
                      <el-button type="danger" circle @click="removeSaleItem($index)">
                        <Icon name="solar:trash-bin-trash-outline" size="17" />
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
            <el-tab-pane :label="t('columns.attachment')" name="attachment">
              <DropZone v-model="form.attachments" />
            </el-tab-pane>
          </el-tabs>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('cancel') }}</el-button>
        <el-button type="primary" native-type="submit" form="sale-form" :loading="submitting">
          {{ t('save') }}
        </el-button>
      </template>
    </el-dialog>

    <div v-if="printItem" class="sale-print-root fixed inset-0 z-50 hidden bg-white print:block">
      <div class="mx-auto max-w-[760px] bg-white p-8 text-slate-900">
        <div class="flex items-start justify-between gap-6 border-b border-slate-300 pb-5">
          <div class="flex items-center gap-3">
            <img :src="logoUrl" alt="Mini POS" class="h-14 w-14 object-contain">
            <div>
              <h1 class="text-xl font-bold uppercase tracking-normal">Mini POS</h1>
              <p class="text-xs text-slate-500">Customer Invoice</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold uppercase tracking-normal">Invoice</p>
            <p class="mt-1 text-sm text-slate-500">{{ printItem.code }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6 border-b border-slate-200 py-5 text-sm">
          <div>
            <p class="text-xs font-semibold uppercase tracking-normal text-slate-500">Bill To</p>
            <p class="mt-2 font-semibold text-slate-900">{{ displayCustomer(printItem.customer, printItem.customerId) }}</p>
            <p class="mt-1 text-slate-600">{{ customerPhone(printItem) }}</p>
            <p class="mt-1 whitespace-pre-line text-slate-600">{{ customerAddress(printItem) }}</p>
          </div>
          <div class="space-y-2 text-right">
            <div>
              <p class="text-xs font-semibold uppercase tracking-normal text-slate-500">{{ t('columns.sale_date') }}</p>
              <p class="font-medium">{{ displayDate(printItem.saleDate) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-normal text-slate-500">{{ t('columns.status') }}</p>
              <p class="font-medium">{{ displayStatus(printItem.status) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-normal text-slate-500">{{ t('sale.payment_type') }}</p>
              <p class="font-medium">{{ displayPaymentType(printItem.paymentType, printItem.paymentTypeId) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-normal text-slate-500">Printed At</p>
              <p class="font-medium">{{ printIssuedAt }}</p>
            </div>
          </div>
        </div>

        <table class="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-300 text-left text-xs uppercase tracking-normal text-slate-500">
              <th class="py-2 pr-3">#</th>
              <th class="py-2 pr-3">{{ t('columns.product_name') }}</th>
              <th class="py-2 pr-3 text-right">{{ t('columns.quantity') }}</th>
              <th class="py-2 pr-3 text-right">{{ t('columns.unit_price') }}</th>
              <th class="py-2 pr-3 text-right">{{ t('columns.discount') }}</th>
              <th class="py-2 text-right">{{ t('columns.total_amount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in printItem.items ?? []" :key="item.id ?? item.productId ?? index" class="border-b border-slate-100">
              <td class="py-3 pr-3 align-top text-slate-500">{{ index + 1 }}</td>
              <td class="py-3 pr-3 align-top">
                <p class="font-medium text-slate-900">{{ displayProduct(item.product, item.productId) }}</p>
                <p v-if="item.note" class="mt-1 text-xs text-slate-500">{{ item.note }}</p>
              </td>
              <td class="py-3 pr-3 text-right align-top">{{ formatNumber(Number(item.quantity ?? 0)) }}</td>
              <td class="py-3 pr-3 text-right align-top">{{ formatAmount(Number(item.unitPrice ?? 0)) }}</td>
              <td class="py-3 pr-3 text-right align-top">{{ formatAmount(Number(item.discount ?? 0)) }}</td>
              <td class="py-3 text-right align-top font-medium">{{ formatAmount(getItemTotalAmount(item)) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6 flex justify-end">
          <div class="w-72 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Subtotal</span>
              <span class="font-medium">{{ formatAmount(getTotalSubtotal(printItem.items)) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">{{ t('columns.total_discount') }}</span>
              <span class="font-medium">{{ formatAmount(getTotalDiscount(printItem.items)) }}</span>
            </div>
            <div class="flex justify-between border-t border-slate-300 pt-3 text-lg font-bold">
              <span>{{ t('columns.grand_total') }}</span>
              <span>{{ formatAmount(getTotalAmount(printItem.items)) }}</span>
            </div>
          </div>
        </div>

        <div class="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          <p>Thank you for your purchase.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import DropZone from '~/@core/components/DropZone.vue'
import logoUrl from '~/assets/images/logo/logo.png'
import QRCode from "qrcode";

type SaleStatus = 'Pending' | 'Cancelled' | 'Completed'

interface SelectOption {
  id: number
  name: string
  code?: string
  nameEn?: string
  nameKh?: string
  phoneNumber?: string | null
  address?: string | null
  unitPrice?: number
  discount?: number
  thumbnail?: ThumbnailValue
  logo?: ThumbnailValue
}

interface SelectOptionPayload {
  id?: number
  value?: number
  name?: string
  label?: string
  code?: string
  nameEn?: string
  nameKh?: string
  phoneNumber?: string | null
  address?: string | null
  unitPrice?: number
  discount?: number
  thumbnail?: ThumbnailValue
  logo?: ThumbnailValue
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

interface Product {
  id: number
  categoryId?: number
  code: string
  nameEn?: string
  nameKh?: string
  name?: string
  unitPrice: number
  discount?: number
  thumbnail?: ThumbnailValue
  category?: SelectOption | string | null
}

interface SaleItem {
  localKey?: string
  id?: number
  saleId?: number
  productId?: number
  quantity: number
  unitPrice: number
  discount?: number
  note?: string | null
  thumbnail?: ThumbnailValue
  product?: SelectOption | string | null
}

interface Sale {
  id: number
  code: string
  saleDate: string | Date
  customerId: number
  note?: string | null
  attachment?: AttachmentFile[]
  attachments?: AttachmentFile[]
  status: SaleStatus
  items?: SaleItem[]
  customer?: SelectOption | string | null
  paymentTypeId?: number
  paymentType?: SelectOption | string | null
  createdAt?: string | Date | null
}

interface ListMeta {
  totalItems: number
  currentPage: number
  totalPages: number
}

interface ListResponse {
  payload: {
    data: Sale[]
    meta?: Partial<ListMeta>
  }
}

interface ProductListResponse {
  payload: {
    data: Product[]
  }
}

interface ItemResponse {
  payload: Sale
}

interface GenerateCodeResponse {
  payload?: {
    code?: string
  }
}

interface RawSelectResponse {
  payload?: SelectOptionPayload[] | {
    data?: SelectOptionPayload[]
    items?: SelectOptionPayload[]
  }
  data?: SelectOptionPayload[]
  items?: SelectOptionPayload[]
}

const endpoint = 'admin/saling/sales'
const productEndpoint = 'admin/master-data/products'
const productSelectEndpoint = 'admin/master-data/products/select-options'
const customerEndpoint = 'admin/master-data/customers/select-options'
const categoryEndpoint = 'admin/master-data/categories/select-options'
const paymentTypeEndpoint = 'admin/system/payment-setting/select-options'
const pageSizes = [10, 20, 50, 100]
const statusOptions: SaleStatus[] = ['Pending', 'Cancelled', 'Completed']

const { t, locale } = useI18n()
const breadcrumbStore = useBreadcrumbStore()

const loading = ref(false)
const submitting = ref(false)
const codeLoading = ref(false)
const printLoadingId = ref<number | null>(null)
const customerLoading = ref(false)
const productLoading = ref(false)
const categoryLoading = ref(false)
const paymentTypeLoading = ref(false)
const items = ref<Sale[]>([])
const customerOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const products = ref<Product[]>([])
const categoryOptions = ref<SelectOption[]>([])
const paymentTypeOptions = ref<SelectOption[]>([])
const productSearch = ref('')
const productCategoryFilter = ref<number | undefined>()
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
const editingItem = ref<Sale | null>(null)
const printItem = ref<Sale | null>(null)
const printIssuedAt = ref('')
const activeFormTab = ref('items')
const thumbnailPreviewMap = ref<Record<string, string>>({})
let saleItemKey = 0

const createSaleItemKey = () => `sale-item-${++saleItemKey}`

const emptySaleItem = (): SaleItem => ({
  localKey: createSaleItemKey(),
  productId: undefined,
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  note: '',
})

const emptyForm = () => ({
  code: '',
  saleDate: new Date().toISOString().slice(0, 10),
  customerId: undefined as number | undefined,
  paymentTypeId: undefined as number | undefined,
  note: '',
  attachments: [] as AttachmentFile[],
  status: 'Pending' as SaleStatus,
  items: [] as SaleItem[],
})

const form = reactive(emptyForm())

const totalQuantity = computed(() => getTotalQuantity(form.items))
const totalDiscount = computed(() => getTotalDiscount(form.items))
const totalAmount = computed(() => getTotalAmount(form.items))

const filteredProducts = computed(() => {
  const search = productSearch.value.trim().toLowerCase()

  return products.value.filter((product) => {
    const matchesCategory = !productCategoryFilter.value || Number(product.categoryId) === productCategoryFilter.value
    const name = `${product.name ?? ''} ${product.nameEn ?? ''} ${product.nameKh ?? ''} ${product.code ?? ''}`.toLowerCase()

    return matchesCategory && (!search || name.includes(search))
  })
})

const itemProductRules = computed(() => [{ required: true, message: t('sale.product_required'), trigger: 'change' }])
const itemQuantityRules = computed(() => [{ required: true, type: 'number', min: 1, message: t('sale.quantity_required'), trigger: 'blur' }])
const itemUnitPriceRules = computed(() => [{ required: true, type: 'number', min: 0, message: t('sale.unit_price_required'), trigger: 'blur' }])

const rules = computed<FormRules>(() => ({
  code: [{ required: true, message: t('sale.code_required'), trigger: 'blur' }],
  saleDate: [{ required: true, message: t('sale.sale_date_required'), trigger: 'change' }],
  customerId: [{ required: true, message: t('sale.customer_required'), trigger: 'change' }],
  paymentTypeId: [{ required: true, message: t('sale.payment_type_required'), trigger: 'change' }],
  status: [{ required: true, message: t('sale.status_required'), trigger: 'change' }],
  items: [{
    type: 'array',
    min: 1,
    message: t('sale.items_required'),
    trigger: 'change',
  }],
}))

watchEffect(() => {
  breadcrumbStore.setPageTitle(t('menu.sale'))
  breadcrumbStore.setBreadcrumbs([t('menu.saling'), t('menu.sale')])
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
  nameEn: option.nameEn,
  nameKh: option.nameKh,
  phoneNumber: option.phoneNumber ?? null,
  address: option.address ?? null,
  unitPrice: typeof option.unitPrice === 'number' ? option.unitPrice : undefined,
  discount: typeof option.discount === 'number' ? option.discount : undefined,
  thumbnail: option.thumbnail ?? null,
  logo: option.logo ?? null,
})

const normalizeStatus = (status?: SaleStatus | string | null): SaleStatus => {
  const normalized = String(status ?? 'Pending').toLowerCase()

  if (normalized === 'cancelled') return 'Cancelled'
  if (normalized === 'completed') return 'Completed'

  return 'Pending'
}

const statusTranslationKey = (status: SaleStatus | string) => normalizeStatus(status).toLowerCase()

const displayStatus = (status: SaleStatus | string) => t(`sale.status_${statusTranslationKey(status)}`)

const statusTagType = (status: SaleStatus | string) => {
  const normalized = normalizeStatus(status)

  if (normalized === 'Completed') return 'success'
  if (normalized === 'Cancelled') return 'danger'

  return 'warning'
}

const displayDate = (value: Sale['saleDate']) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

const displayCreatedAt = (createdAt: Sale['createdAt']) => {
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

const displayCustomer = (customer: Sale['customer'], customerId: number | undefined) => {
  if (typeof customer === 'string') return customer
  if (customer && typeof customer === 'object') return customer.name ?? customer.nameEn ?? customer.nameKh ?? customer.code ?? String(customer.id)
  if (!customerId) return '-'

  return customerOptions.value.find(option => option.id === customerId)?.name ?? String(customerId)
}

const displayPaymentType = (paymentType: Sale['paymentType'], paymentTypeId?: number) => {
  if (typeof paymentType === 'string') return paymentType
  if (paymentType && typeof paymentType === 'object') return paymentType.name ?? paymentType.nameEn ?? paymentType.nameKh ?? paymentType.code ?? String(paymentType.id)
  if (!paymentTypeId) return '-'

  return paymentTypeOptions.value.find(option => option.id === paymentTypeId)?.name ?? String(paymentTypeId)
}

const customerOption = (sale: Pick<Sale, 'customer' | 'customerId'>) => {
  if (sale.customer && typeof sale.customer === 'object') return sale.customer
  if (!sale.customerId) return null

  return customerOptions.value.find(option => option.id === sale.customerId) ?? null
}

const customerPhone = (sale: Pick<Sale, 'customer' | 'customerId'>) => {
  return customerOption(sale)?.phoneNumber || '-'
}

const customerAddress = (sale: Pick<Sale, 'customer' | 'customerId'>) => {
  return customerOption(sale)?.address || '-'
}

const displayCategory = (category: Product['category'], categoryId: number | undefined) => {
  if (typeof category === 'string') return category
  if (category && typeof category === 'object') return category.name ?? category.code ?? String(category.id)
  if (!categoryId) return t('sale.uncategorized')

  return categoryOptions.value.find(option => option.id === categoryId)?.name ?? t('sale.uncategorized')
}

const displayProductName = (product: Product) => {
  return product.name ?? product.nameEn ?? product.nameKh ?? product.code
}

const displayProduct = (product: SaleItem['product'], productId: number | undefined) => {
  if (typeof product === 'string') return product
  if (product && typeof product === 'object') return product.name ?? product.code ?? String(product.id)
  if (!productId) return '-'

  return productOptions.value.find(option => option.id === productId)?.name
    ?? products.value.find(option => option.id === productId)?.nameEn
    ?? String(productId)
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
  } catch {
    // Keep the form usable with the placeholder if a preview URL cannot be resolved.
  }
}

const productThumbnailById = (productId?: number) => {
  if (!productId) return null

  return products.value.find(product => product.id === productId)?.thumbnail
    ?? productOptions.value.find(product => product.id === productId)?.thumbnail
    ?? null
}

const itemThumbnail = (item: SaleItem): ThumbnailValue => {
  if (item.thumbnail) return item.thumbnail
  if (item.product && typeof item.product === 'object' && item.product.thumbnail) return item.product.thumbnail

  return productThumbnailById(item.productId)
}

const paymentTypeLogo = (paymentType?: Sale['paymentType'] | SelectOption, paymentTypeId?: number): ThumbnailValue => {
  if (paymentType && typeof paymentType === 'object' && paymentType.logo) return paymentType.logo
  if (!paymentTypeId) return null

  return paymentTypeOptions.value.find(option => option.id === paymentTypeId)?.logo ?? null
}

const paymentTypeLogoUrl = (paymentType?: Sale['paymentType'] | SelectOption, paymentTypeId?: number) => {
  return thumbnailUrl(paymentTypeLogo(paymentType, paymentTypeId))
}

const loadThumbnailPreviews = (saleItems: SaleItem[] = form.items) => {
  productOptions.value.forEach(product => loadThumbnailPreview(product.thumbnail))
  products.value.forEach(product => loadThumbnailPreview(product.thumbnail))
  paymentTypeOptions.value.forEach(paymentType => loadThumbnailPreview(paymentType.logo))
  saleItems.forEach(item => loadThumbnailPreview(itemThumbnail(item)))
}

const getAttachmentCount = (item: Pick<Sale, 'attachment' | 'attachments'>) => {
  return (item.attachments ?? item.attachment ?? []).length
}

const getItemSubtotal = (item: Pick<SaleItem, 'quantity' | 'unitPrice'>) => {
  return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
}

const getItemDiscount = (item: Pick<SaleItem, 'discount'>) => {
  return Math.max(Number(item.discount ?? 0), 0)
}

const getItemTotalAmount = (item: Pick<SaleItem, 'quantity' | 'unitPrice' | 'discount'>) => {
  return Math.max(getItemSubtotal(item) - getItemDiscount(item), 0)
}

const getTotalQuantity = (saleItems: SaleItem[] = []) => {
  return saleItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
}

const getTotalAmount = (saleItems: SaleItem[] = []) => {
  return saleItems.reduce((total, item) => total + getItemTotalAmount(item), 0)
}

const getTotalDiscount = (saleItems: SaleItem[] = []) => {
  return saleItems.reduce((total, item) => total + getItemDiscount(item), 0)
}

const getTotalSubtotal = (saleItems: SaleItem[] = []) => {
  return saleItems.reduce((total, item) => total + getItemSubtotal(item), 0)
}

const getCartQuantity = (productId: number) => {
  return form.items.find(item => item.productId === productId)?.quantity ?? 0
}

const resetForm = (value: Partial<Sale> = emptyForm()) => {
  form.code = value.code ?? ''
  form.saleDate = value.saleDate ? String(value.saleDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  form.customerId = value.customerId
  form.paymentTypeId = value.paymentTypeId ?? (value.paymentType && typeof value.paymentType === 'object' ? value.paymentType.id : undefined)
  form.note = value.note ?? ''
  form.attachments = [...(value.attachments ?? value.attachment ?? [])]
  form.status = normalizeStatus(value.status)
  form.items = (value.items ?? []).map(item => ({
    localKey: item.localKey ?? createSaleItemKey(),
    id: item.id,
    saleId: item.saleId,
    productId: item.productId,
    quantity: Number(item.quantity ?? 1),
    unitPrice: Number(item.unitPrice ?? 0),
    discount: Number(item.discount ?? 0),
    note: item.note ?? '',
    thumbnail: item.thumbnail ?? (item.product && typeof item.product === 'object' ? item.product.thumbnail : null),
    product: item.product,
  }))
  loadThumbnailPreviews(form.items)
  activeFormTab.value = 'items'
  productSearch.value = ''
  productCategoryFilter.value = undefined
  nextTick(() => formRef.value?.clearValidate())
}

const loadGeneratedCode = async () => {
  try {
    codeLoading.value = true
    const response = await useApi<GenerateCodeResponse>(`${endpoint}/generate-code`, { method: 'get' })
    form.code = response.payload?.code ?? form.code
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.generate_code_failed')), 'error')
  } finally {
    codeLoading.value = false
  }
}

const loadCustomerOptions = async () => {
  try {
    customerLoading.value = true
    const response = await useApi<RawSelectResponse>(customerEndpoint, { method: 'get' })
    customerOptions.value = selectPayloadItems(response).map(normalizeOption).filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_customers_failed')), 'error')
  } finally {
    customerLoading.value = false
  }
}

const loadProductOptions = async () => {
  try {
    productLoading.value = true
    const response = await useApi<RawSelectResponse>(productSelectEndpoint, { method: 'get' })
    productOptions.value = selectPayloadItems(response).map(normalizeOption).filter(option => Number.isFinite(option.id))
    loadThumbnailPreviews()
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_products_failed')), 'error')
  } finally {
    productLoading.value = false
  }
}

const loadProducts = async () => {
  try {
    productLoading.value = true
    const response = await useApi<ProductListResponse>(`${productEndpoint}?page=1&limit=10000&search=`, { method: 'get' })
    products.value = response.payload.data ?? []
    loadThumbnailPreviews()
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_products_failed')), 'error')
  } finally {
    productLoading.value = false
  }
}

const loadCategoryOptions = async () => {
  try {
    categoryLoading.value = true
    const response = await useApi<RawSelectResponse>(categoryEndpoint, { method: 'get' })
    categoryOptions.value = selectPayloadItems(response).map(normalizeOption).filter(option => Number.isFinite(option.id))
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_categories_failed')), 'error')
  } finally {
    categoryLoading.value = false
  }
}

const loadPaymentTypeOptions = async () => {
  try {
    paymentTypeLoading.value = true
    const response = await useApi<RawSelectResponse>(paymentTypeEndpoint, { method: 'get' })
    paymentTypeOptions.value = selectPayloadItems(response).map(normalizeOption).filter(option => Number.isFinite(option.id))
    paymentTypeOptions.value.forEach(paymentType => loadThumbnailPreview(paymentType.logo))
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_payment_types_failed')), 'error')
  } finally {
    paymentTypeLoading.value = false
  }
}

const loadSelectOptions = async () => {
  await Promise.all([
    loadCustomerOptions(),
    loadProductOptions(),
    loadProducts(),
    loadCategoryOptions(),
    loadPaymentTypeOptions(),
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
    items.value.forEach(item => loadThumbnailPreview(paymentTypeLogo(item.paymentType, item.paymentTypeId)))
    meta.totalItems = response.payload.meta?.totalItems ?? items.value.length
    meta.currentPage = response.payload.meta?.currentPage ?? params.page
    meta.totalPages = response.payload.meta?.totalPages ?? 1
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_failed')), 'error')
  } finally {
    loading.value = false
  }
}

const handleLimitChange = () => {
  params.page = 1
  loadItems()
}

const addProductToCart = (product: Product) => {
  const existingItem = form.items.find(item => item.productId === product.id)

  if (existingItem) {
    existingItem.quantity += 1
    return
  }

  form.items.push({
    localKey: createSaleItemKey(),
    productId: product.id,
    quantity: 1,
    unitPrice: Number(product.unitPrice ?? 0),
    discount: Number(product.discount ?? 0),
    note: '',
    thumbnail: product.thumbnail ?? null,
    product: {
      id: product.id,
      name: displayProductName(product),
      code: product.code,
      discount: Number(product.discount ?? 0),
      thumbnail: product.thumbnail ?? null,
    },
  })
  loadThumbnailPreview(product.thumbnail)
}

const addSaleItem = () => {
  form.items.push(emptySaleItem())
}

const removeSaleItem = (index: number) => {
  form.items.splice(index, 1)

  if (!form.items.length) {
    addSaleItem()
  }
}

const removeSaleItemByProduct = (productId?: number) => {
  const index = form.items.findIndex(item => item.productId === productId)
  if (index >= 0) form.items.splice(index, 1)
}

const handleProductChange = (item: SaleItem) => {
  const product = productOptions.value.find(option => option.id === item.productId)
    ?? products.value.find(option => option.id === item.productId)

  if (!product) return

  item.product = {
    id: product.id,
    name: 'name' in product ? product.name : displayProductName(product),
    code: product.code,
    discount: Number(product.discount ?? 0),
    thumbnail: product.thumbnail ?? null,
  }
  item.thumbnail = product.thumbnail ?? null
  item.unitPrice = Number(product.unitPrice ?? item.unitPrice ?? 0)
  item.discount = Number(product.discount ?? item.discount ?? 0)
  loadThumbnailPreview(product.thumbnail)
}

const openCreateDialog = async () => {
  editingItem.value = null
  resetForm()
  dialogVisible.value = true

  await Promise.all([
    loadGeneratedCode(),
    loadSelectOptions(),
  ])
}

const openEditDialog = async (item: Sale) => {
  editingItem.value = item
  resetForm(item)
  dialogVisible.value = true

  if (!customerOptions.value.length || !productOptions.value.length || !products.value.length || !categoryOptions.value.length || !paymentTypeOptions.value.length) {
    await loadSelectOptions()
  }

  try {
    submitting.value = true
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    resetForm(response.payload)

    if (!form.items.length) {
      addSaleItem()
    }
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const printInvoice = async (item: Sale) => {
  try {
    printLoadingId.value = item.id
    const response = await useApi<ItemResponse>(`${endpoint}/${item.id}`, { method: 'get' })
    printItem.value = response.payload
    printIssuedAt.value = displayCreatedAt(new Date())
    loadThumbnailPreviews(response.payload.items ?? [])
    loadThumbnailPreview(paymentTypeLogo(response.payload.paymentType, response.payload.paymentTypeId))

    await nextTick()
    window.print()
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.load_failed')), 'error')
  } finally {
    printLoadingId.value = null
  }
}

const clearPrintItem = () => {
  printItem.value = null
}

const submit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid || !form.items.length) {
    activeFormTab.value = 'items'
    if (!form.items.length) {
      useNotification(t('sale.items_required'), 'error')
    }
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
          saleDate: form.saleDate,
          customerId: form.customerId,
          paymentTypeId: form.paymentTypeId,
          note: form.note || null,
          attachments: form.attachments,
          status: form.status,
          items: form.items.map(item => ({
            ...(item.id ? { id: item.id } : {}),
            ...(item.saleId ? { saleId: item.saleId } : {}),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            note: item.note || null,
          })),
        },
      },
    )

    useMessage(editingItem.value ? t('sale.updated') : t('sale.created'))
    dialogVisible.value = false
    loadItems()
  } catch (error) {
    useNotification(getErrorMessage(error, t('sale.save_failed')), 'error')
  } finally {
    submitting.value = false
  }
}

const deleteItem = async (item: Sale) => {
  try {
    await ElMessageBox.confirm(
      t('sale.confirm_delete', { code: item.code }),
      t('sale.delete_title'),
      {
        confirmButtonText: t('delete'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      },
    )

    await useApi(`${endpoint}/${item.id}`, { method: 'delete' })
    useMessage(t('sale.deleted'))
    loadItems()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      useMessage(t('delete_canceled'), 'info')
      return
    }

    useNotification(getErrorMessage(error, t('sale.delete_failed')), 'error')
  }
}

onMounted(() => {
  loadItems()
  loadSelectOptions()
  window.addEventListener('afterprint', clearPrintItem)
})

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', clearPrintItem)
});

const qrImage = ref("");

const qrCodeGenerate =  async (qrStr: string) => {
  qrImage.value = await QRCode.toDataURL(qrStr, {
    width: 150,
       margin: 1,
      //  color: {
      //   dark: "#fa1f7e",   // 🔥 QR Code color
      //    light: "#ffffff00" // transparent background (optional)
      //  },
  });
};

const playSuccessSound = async () => {
  try {
    const audio = new Audio('/success-sound.mp3');

    audio.volume = 1;

    await audio.play();
  } catch (error) {
    console.error('Failed to play sound', error);
  }
};

const isCashed = ref(true);
const paymentMethodLoading = ref(false);
const khqr = ref('');

let verifyInterval: ReturnType<typeof setInterval> | null = null;
let isVerifying = false;

/**
 * Verify KHQR Payment
 *
 * Return:
 * true  = continue polling
 * false = payment successful, stop polling
 */
const verifyKHQR = async (): Promise<boolean> => {
  if (!khqr.value) return false;

  try {
    const response = await useApi<any>(
      `admin/system/payment-setting/verify-khqr/${khqr.value}/${form.code}`
    );

    // console.log('VERIFY KHQR', response);

    return response.payload;
  } catch (error) {
    console.error('Verify KHQR Error:', error);

    // Continue polling if API temporarily fails
    return true;
  }
};

/**
 * Stop polling
 */
const stopVerifyKHQR = () => {
  if (verifyInterval) {
    clearInterval(verifyInterval);
    verifyInterval = null;
  }

  isVerifying = false;

  console.log('KHQR polling stopped');
};

/**
 * Start polling
 */
const startVerifyKHQR = () => {
  // Prevent duplicate intervals
  stopVerifyKHQR();

  console.log('KHQR polling started');

  verifyInterval = setInterval(async () => {
    // Prevent concurrent requests
    if (isVerifying) return;

    try {
      isVerifying = true;

      const shouldContinuePolling = await verifyKHQR();

      // Payment success
      if (!shouldContinuePolling) {
        stopVerifyKHQR();
        form.status = 'Completed';
        playSuccessSound();
        useNotification('Payment successful');

        // Optional actions
        // await submit();
        // await refreshData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      isVerifying = false;
    }
  }, 3000);
};

/**
 * Generate KHQR when payment method changes
 */
watch(
  () => form.paymentTypeId,
  async () => {
    stopVerifyKHQR();

    isCashed.value = true;
    khqr.value = '';

    if (!form.paymentTypeId) return;

    try {
      paymentMethodLoading.value = true;

      const response = await useApi<any>(
        'admin/system/payment-setting/generate-khqr',
        {
          params: {
            id: form.paymentTypeId,
            billNumber: form.code,
            amount: formatAmount(totalAmount.value),
          },
        }
      );

      console.log('Payment response', response);

      // Cash payment
      if (response.payload.isCashed) {
        isCashed.value = true;
        form.status = 'Completed';
        return;
      }

      // KHQR payment
      isCashed.value = false;
      khqr.value = response.payload.data.qr;

      await qrCodeGenerate(khqr.value);

      startVerifyKHQR();
    } catch (error: any) {
      useMessage(error, 'error');
    } finally {
      paymentMethodLoading.value = false;
    }
  },
  {
    immediate: true,
  }
);

/**
 * Cleanup
 */
onBeforeUnmount(() => {
  stopVerifyKHQR();
});
</script>

<style>
@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  body * {
    visibility: hidden;
  }

  .sale-print-root,
  .sale-print-root * {
    visibility: visible;
  }

  .sale-print-root {
    position: absolute !important;
    inset: 0 !important;
    display: block !important;
    background: #ffffff !important;
  }
}
</style>
