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
        class="text-gray-600"
        v-if="loading"`
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
      :data="props.modelValue"
      stripe
    >
      <template #empty>{{ $t('no_data') }}</template>
      <el-table-column :label="$t('columns.file_name')" prop="fileName" />
      <el-table-column :label="$t('columns.action')" align="center" width="150">
        <template #default="scope">
          <div class="flex items-center gap-2 justify-center">
            <el-tag 
              type="success"
              @click="handleOpenFile(scope.row.fileName)"
              class="cursor-pointer"
            >
              <Icon name="solar:document-outline"/>
            </el-tag>
            <el-tag 
              type="danger"
              @click="handleDeleteFile(scope.row.fileName, scope.row.$index)"
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
const { appContext } = getCurrentInstance()!

  const { t: $t } = useI18n()

  const uploadRef = ref<UploadInstance>();

  interface FileData {
    fileName: string
    
  }

  const props = withDefaults(
     defineProps<{
      modelValue: FileData[]
    }>(),
    {
      modelValue: ()=> [],
    }
  )

  const emit = defineEmits(['update:modelValue']);
   const accessToken = useCookie('token');
  const uploadHeaders  = computed(() => ({
    Authorization: `Bearer ${accessToken.value}`
  }));

  const config = useRuntimeConfig();
  const uploadUrl = `${config.public.apiBaseUrl}admin/minio/upload`;
  
  const loading = ref<boolean>(false);

  const beforeUpload: UploadProps['beforeUpload'] = file => {
    loading.value = true;

    return true;
  }

  const handleSuccess: UploadProps['onSuccess'] = (response) => {
    const file: FileData = {
      fileName: response.payload,
    }
    emit('update:modelValue', [...props.modelValue, file]);
    console.log(response);
    loading.value = false;
  }

  const handleError: UploadProps['onError'] = (error) => {
    console.log(error);
    useMessage('Upload failed', 'error');
    loading.value = false;
  }

  const handleOpenFile = async (fileName: string) => {
    try {
      const response: any = await useApi(`admin/minio/${fileName}`);
      if (response) {
        window.open(response.payload, '_blank', 'noopener,noreferrer')
      }
    } catch (error: any) {
      const message =
          error?.data?.message ||
          error?.message ||
          'Something went wrong'

        useNotification(message, 'error');
    }
  }

  const handleDeleteFile = (fileName: string, index: number) => {
    ElMessageBox.confirm(
      `${$t('confirm_delete_file', { fileName: fileName})}`,
      $t('are_you_sure'),
      {
        confirmButtonText: $t('ok'),
        cancelButtonText: $t('cancel'),
        draggable: true,
        type: 'warning',
        center: true,
        appendTo: document.body
      },
      appContext,
    )
    .then( async() => {
      try {
        const response: any = await useApi(`admin/minio/delete?bucket=images&object=${fileName}`, {
          method: 'delete',
        });
        if (response) {
          useMessage($t('file_deleted_successfully'));
          props.modelValue.splice(index, 1);
        }
      } catch (error: any) {
        const message =
            error?.data?.message ||
            error?.message ||
            'Something went wrong'
          useNotification(message, 'error');
      }
    }).catch(() => {
      useMessage($t('delete_canceled'), 'info');
    })
  }


</script>
