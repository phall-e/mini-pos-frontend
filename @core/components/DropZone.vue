<template>
  <div> 
    <el-upload
      ref="uploadRef"
      class="w-full"
      drag
      :action="uploadUrl"
      :headers="uploadHeaders"
      :multiple="true"
      :on-success="handleSuccess"
      :on-error="handleError"
      :before-upload="beforeUpload"
      :show-file-list="false"
    >
      <div
        v-if="loading"
        class="text-gray-600"
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
          {{ $t('drop_file_here_or') }} <em>{{ $t('click_to_upload') }}</em>
        </div>
      </div>
    </el-upload>
    <el-table
      :data="files"
      stripe
    >
      <template #empty>{{ $t('no_data') }}</template>
      <el-table-column :label="$t('columns.file_name')">
        <template #default="{ row }">
          {{ getDisplayFileName(row) }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('columns.action')" align="center" width="150">
        <template #default="scope">
          <div class="flex items-center gap-2 justify-center">
            <el-tag 
              type="success"
              @click.stop="handleOpenFile(scope.row)"
              class="cursor-pointer"
            >
              <Icon name="solar:document-outline"/>
            </el-tag>
            <el-tag 
              type="danger"
              @click.stop="handleDeleteFile(scope.row, scope.$index)"
              class="cursor-pointer"
            >
              <Icon name="material-symbols-light:delete-outline-rounded"/>
            </el-tag>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadInstance, UploadProps } from 'element-plus';

  const { t: $t } = useI18n()

  const uploadRef = ref<UploadInstance>();

  interface CloudinaryPayload {
    publicId?: string
    public_id?: string
    fileName?: string
    filename?: string
    name?: string
    displayName?: string
    display_name?: string
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

  type FileData = CloudinaryPayload | string

  const props = withDefaults(
     defineProps<{
      modelValue: FileData[]
      resourceType?: string
    }>(),
    {
      modelValue: ()=> [],
      resourceType: 'raw',
    }
  )

  const emit = defineEmits(['update:modelValue']);
   const accessToken = useCookie('token');
  const uploadHeaders  = computed(() => accessToken.value
    ? { Authorization: `Bearer ${accessToken.value}` }
    : {}
  );

  const config = useRuntimeConfig();
  const apiBaseUrl = computed(() => config.public.apiBaseUrl ?? '');
  const uploadUrl = computed(() => `${apiBaseUrl.value}cloudinary/upload`);
  
  const files = ref<FileData[]>([]);
  const uploadingCount = ref(0);
  const loading = computed(() => uploadingCount.value > 0);

  watch(
    () => props.modelValue,
    value => {
      if (!loading.value) {
        files.value = value.map(file => normalizeFileData(file));
      }
    },
    { deep: true },
  )

  const finishUpload = () => {
    uploadingCount.value = Math.max(uploadingCount.value - 1, 0);

    if (!loading.value) {
      uploadRef.value?.clearFiles();
    }
  }

  const beforeUpload: UploadProps['beforeUpload'] = file => {
    uploadingCount.value += 1;

    return true;
  }

  const getCloudinaryPayload = (response: unknown): CloudinaryPayload | string | null => {
    if (typeof response === 'string') return response

    if (typeof response === 'object' && response !== null) {
      const result = response as {
        payload?: CloudinaryPayload | string | { data?: CloudinaryPayload | string }
        data?: CloudinaryPayload | string
      }

      if (typeof result.payload === 'object' && result.payload !== null && 'data' in result.payload) {
        return result.payload.data ?? null
      }

      return result.payload ?? result.data ?? result as CloudinaryPayload
    }

    return null
  }

  const getPublicId = (file: FileData | CloudinaryPayload | string) => {
    if (typeof file === 'string') return file

    return file.publicId || file.public_id || file.fileName || file.filename || null
  }

  const getDisplayFileName = (file: FileData | CloudinaryPayload | string) => {
    if (typeof file === 'string') return file

    return file.fileName
      || file.filename
      || file.originalFilename
      || file.original_filename
      || file.displayName
      || file.display_name
      || file.name
      || file.publicId
      || file.public_id
      || '-'
  }

  const getDirectPreviewLink = (file: FileData | CloudinaryPayload | string) => {
    if (typeof file === 'string') return null

    return file.secureUrl ?? file.secure_url ?? file.url ?? file.path ?? null
  }

  const getResourceType = (file: FileData | CloudinaryPayload | string) => {
    if (typeof file === 'string') return props.resourceType

    return file.resourceType ?? file.resource_type ?? props.resourceType
  }

  const normalizeFileData = (file: FileData | CloudinaryPayload | string): FileData => {
    if (typeof file === 'string') return file

    const publicId = getPublicId(file)

    return {
      ...file,
      ...(publicId ? { publicId } : {}),
      fileName: getDisplayFileName(file),
    }
  }

  files.value = props.modelValue.map(file => normalizeFileData(file))

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

  const handleSuccess: UploadProps['onSuccess'] = (response) => {
    const payload = getCloudinaryPayload(response)
    const publicId = payload && typeof payload === 'object'
      ? payload.publicId ?? payload.public_id
      : payload

    if (!publicId) {
      useMessage('Upload failed', 'error')
      finishUpload()
      return
    }

    const file: FileData = {
      ...(typeof payload === 'object' ? payload : {}),
      publicId,
      fileName: typeof payload === 'object'
        ? getDisplayFileName({ ...payload, publicId })
        : publicId,
    }
    files.value = [...files.value, file];
    emit('update:modelValue', [...files.value]);
    finishUpload()
  }

  const handleError: UploadProps['onError'] = (error) => {
    console.log(error);
    useMessage('Upload failed', 'error');
    finishUpload()
  }

  const handleOpenFile = async (file: FileData) => {
    const publicId = getPublicId(file)

    if (!publicId) {
      useNotification('Missing file public id', 'error')
      return
    }

    try {
      const directPreviewLink = getDirectPreviewLink(file)

      if (directPreviewLink) {
        window.open(directPreviewLink, '_blank', 'noopener,noreferrer')
        return
      }

      const response: any = await $fetch('cloudinary/preview', {
        baseURL: apiBaseUrl.value,
        method: 'get',
        headers: uploadHeaders.value,
        query: {
          publicId,
          resourceType: getResourceType(file),
        },
      });
      const previewLink = getPreviewLinkFromResponse(response)

      if (previewLink) {
        window.open(previewLink, '_blank', 'noopener,noreferrer')
      }
    } catch (error: any) {
      const message =
          error?.data?.message ||
          error?.message ||
          'Something went wrong'

        useNotification(message, 'error');
    }
  }
  
  const handleDeleteFile = async (file: FileData, index: number) => {
    const publicId = getPublicId(file)
    const fileName = getDisplayFileName(file)

    if (!publicId) {
      useNotification('Missing file public id', 'error')
      return
    }

    const bringConfirmToFront = () => {
      window.requestAnimationFrame(() => {
        const messageBox = document.querySelector('.dropzone-delete-confirm')
        const overlay = messageBox?.closest('.el-overlay') as HTMLElement | null
        const overlayDialog = messageBox?.closest('.el-overlay-dialog') as HTMLElement | null

        overlay?.classList.add('dropzone-delete-confirm-overlay')
        overlay?.style.setProperty('z-index', '99999', 'important')
        overlayDialog?.style.setProperty('z-index', '100000', 'important')
        ;(messageBox as HTMLElement | null)?.style.setProperty('z-index', '100001', 'important')
      })
    }

    try {
      const confirmPromise = ElMessageBox.confirm(
        $t('confirm_delete_file', { fileName }),
        $t('are_you_sure'),
        {
          confirmButtonText: $t('ok'),
          cancelButtonText: $t('cancel'),
          type: 'warning',
          draggable: true,
          center: true,
          appendTo: document.body,
          zIndex: 99999,
          customClass: 'dropzone-delete-confirm',
          modalClass: 'dropzone-delete-confirm-overlay',
        },
      )

      bringConfirmToFront()
      window.setTimeout(bringConfirmToFront, 50)

      await confirmPromise
    } catch (error) {
      if (
        error === 'cancel' ||
        error === 'close' ||
        (typeof error === 'object' && error !== null && (error as { action?: string }).action === 'cancel')
      ) {
        useMessage($t('delete_canceled'), 'info')
        return
      }

      throw error
    }

    try {
      await useApi(`cloudinary?publicId=${encodeURIComponent(publicId)}`, {
        method: 'delete',
      })

      useMessage($t('file_deleted_successfully', { fileName }))
      files.value = files.value.filter((_, fileIndex) => fileIndex !== index)
      emit('update:modelValue', [...files.value])
    } catch (error: any) {
      const message =
        error?.data?.message ||
        error?.message ||
        'Something went wrong'

      useNotification(message, 'error')
    }
  }


</script>
