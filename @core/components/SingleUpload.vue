<template>
  <el-upload
    v-if="!previewLink"
    ref="uploadRef"
    class="w-full"
    drag
    :action="uploadUrl"
    :headers="uploadHeaders"
    :multiple="multiple"
    :limit="limit"
    :accept="accept"
    :on-success="handleSuccess"
    :on-error="handleError"
    :before-upload="beforeUpload"
    :show-file-list="showFileList"
  >

    <div
      class="text-gray-600"
      v-if="loading"
    >
      <Icon 
        name="icon-park:loading-one"
        :size="25"
        class="animate-spin"
      />
    </div>
    <div
      v-else
    >
      <el-icon class="el-icon--upload">
        <UploadFilled />
      </el-icon>
      <div 
        class="el-upload__text"
      >
        Drop file here or <em>click to upload</em>
      </div>
    </div>
    <template v-if="tip" #tip>
      <div class="el-upload__tip">
        {{ tip }}
      </div>
    </template>
  </el-upload>
  <div v-else> 
    {{ previewLink }}
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadProps, UploadInstance } from 'element-plus'

const uploadRef = ref<UploadInstance>()

const auth = useAuthenticationStore();
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${auth.token?.accessToken}`,
  ...props.headers,
}))

/* ---------------- props ---------------- */
const props = withDefaults(
  defineProps<{
    modelValue?: any
    action?: string
    headers?: Record<string, string>
    multiple?: boolean
    limit?: number
    accept?: string
    maxSizeMB?: number
    showFileList?: boolean
    tip?: string
  }>(),
  {
    multiple: false,
    limit: 1,
    accept: '*',
    maxSizeMB: 10,
    showFileList: true,
  }
)

/* ---------------- emits ---------------- */
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'success', value: any): void
  (e: 'error', value: any): void
}>()

/* ---------------- runtime config ---------------- */
const config = useRuntimeConfig()

const uploadUrl =
  props.action ??
  `${config.public.apiBaseUrl}admin/minio/upload`

const loading = ref<boolean>(false);

/* ---------------- handlers ---------------- */
const beforeUpload: UploadProps['beforeUpload'] = file => {
  loading.value = true

  const isValidSize = file.size / 1024 / 1024 < props.maxSizeMB
  if (!isValidSize) {
    ElMessage.error(`File size must be less than ${props.maxSizeMB}MB`)
    loading.value = false

    // ✅ clear rejected file
    uploadRef.value?.clearFiles()
    return false
  }

  return true
}


const handleSuccess: UploadProps['onSuccess'] = (response) => {
  emit('update:modelValue', response.payload)
  emit('success', response)
  console.log(response);
  loading.value = false;
  uploadRef.value?.clearFiles()
}

const handleError: UploadProps['onError'] = (error) => {
  ElMessage.error('Upload failed')
  emit('error', error)
  loading.value = false;
  uploadRef.value?.clearFiles()
}

const previewLink = computed(() => {
  if (!props.modelValue) return null

  return (
    props.modelValue ?? '--',
    props.modelValue.path ?? '-----',
    null
  );
})
</script>
