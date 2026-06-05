<template>
  <div class="space-y-2">
    <div
      v-if="previewLink"
      class="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50"
      :style="previewFrameStyle"
    >
      <img
        :src="previewLink"
        alt="Uploaded file"
        class="object-contain"
        :style="previewImageStyle"
      >
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-white p-2">
        <el-button
          size="small"
          :loading="previewLoading"
          @click="loadPreview"
        >
          <Icon name="solar:refresh-outline" size="16" />
        </el-button>
        <el-button
          size="small"
          type="danger"
          :loading="deleting"
          @click="deleteFile"
        >
          <Icon name="solar:trash-bin-trash-outline" size="16" />
        </el-button>
      </div>
    </div>

    <el-upload
      v-else
      ref="uploadRef"
      class="w-full"
      drag
      :action="uploadUrl"
      :headers="uploadHeaders"
      :multiple="false"
      :limit="1"
      :accept="accept"
      :on-success="handleSuccess"
      :on-error="handleError"
      :before-upload="beforeUpload"
      :show-file-list="showFileList"
    >
      <div
        v-if="loading"
        class="flex justify-center text-slate-500"
      >
        <Icon
          name="icon-park:loading-one"
          :size="25"
          class="animate-spin"
        />
      </div>
      <div v-else>
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          Drop file here or <em>click to upload</em>
        </div>
      </div>
      <template v-if="tip" #tip>
        <div class="el-upload__tip">
          {{ tip }}
        </div>
      </template>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadInstance, UploadProps } from 'element-plus'

type CloudinaryValue = string | {
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

const props = withDefaults(
  defineProps<{
    modelValue?: CloudinaryValue | null
    headers?: Record<string, string>
    accept?: string
    maxSizeMB?: number
    showFileList?: boolean
    tip?: string
    resourceType?: string
    previewWidth?: string
    previewHeight?: string
  }>(),
  {
    accept: 'image/*',
    maxSizeMB: 10,
    showFileList: false,
    resourceType: 'image',
    previewWidth: '100%',
    previewHeight: '176px',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: CloudinaryValue | null): void
  (e: 'success', value: unknown): void
  (e: 'error', value: unknown): void
}>()

const config = useRuntimeConfig()
const token = useCookie<string | null>('token')
const uploadRef = ref<UploadInstance>()
const loading = ref(false)
const deleting = ref(false)
const previewLoading = ref(false)
const fetchedPreviewLink = ref<string | null>(null)

const apiBaseUrl = computed(() => config.public.apiBaseUrl ?? '')
const uploadUrl = computed(() => `${apiBaseUrl.value}cloudinary/upload`)
const uploadHeaders = computed(() => ({
  ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  ...props.headers,
}))

const publicId = computed(() => {
  if (!props.modelValue) return null
  if (typeof props.modelValue === 'string') return props.modelValue

  return props.modelValue.publicId ?? props.modelValue.public_id ?? null
})

const directPreviewLink = computed(() => {
  if (!props.modelValue || typeof props.modelValue === 'string') return null

  return props.modelValue.secureUrl
    ?? props.modelValue.secure_url
    ?? props.modelValue.url
    ?? props.modelValue.path
    ?? null
})

const previewLink = computed(() => directPreviewLink.value ?? fetchedPreviewLink.value)
const previewFrameStyle = computed(() => ({
  width: props.previewWidth,
}))
const previewImageStyle = computed(() => ({
  width: props.previewWidth,
  height: props.previewHeight,
}))

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

const loadPreview = async () => {
  if (!publicId.value || directPreviewLink.value) return

  try {
    previewLoading.value = true
    const response = await $fetch('cloudinary/preview', {
      baseURL: apiBaseUrl.value,
      method: 'get',
      headers: uploadHeaders.value,
      query: {
        publicId: publicId.value,
        resourceType: props.resourceType,
      },
    })

    fetchedPreviewLink.value = getPreviewLinkFromResponse(response)
  } catch (error) {
    ElMessage.error('Preview failed')
    emit('error', error)
  } finally {
    previewLoading.value = false
  }
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  loading.value = true

  const isValidSize = file.size / 1024 / 1024 < props.maxSizeMB
  if (!isValidSize) {
    ElMessage.error(`File size must be less than ${props.maxSizeMB}MB`)
    loading.value = false
    uploadRef.value?.clearFiles()
    return false
  }

  return true
}

const handleSuccess: UploadProps['onSuccess'] = (response) => {
  const payload = (response as { payload?: CloudinaryValue })?.payload ?? response

  fetchedPreviewLink.value = getPreviewLinkFromResponse(payload)
  emit('update:modelValue', payload as CloudinaryValue)
  emit('success', response)
  loading.value = false
  uploadRef.value?.clearFiles()
}

const handleError: UploadProps['onError'] = (error) => {
  ElMessage.error('Upload failed')
  emit('error', error)
  loading.value = false
  uploadRef.value?.clearFiles()
}

const deleteFile = async () => {
  if (!publicId.value) {
    fetchedPreviewLink.value = null
    emit('update:modelValue', null)
    return
  }

  try {
    deleting.value = true
    await $fetch('cloudinary', {
      baseURL: apiBaseUrl.value,
      method: 'delete',
      headers: uploadHeaders.value,
      query: {
        publicId: publicId.value,
        resourceType: props.resourceType,
      },
    })

    fetchedPreviewLink.value = null
    emit('update:modelValue', null)
  } catch (error) {
    ElMessage.error('Delete failed')
    emit('error', error)
  } finally {
    deleting.value = false
  }
}

watch(
  () => props.modelValue,
  () => {
    fetchedPreviewLink.value = null
    loadPreview()
  },
  { immediate: true },
)
</script>
