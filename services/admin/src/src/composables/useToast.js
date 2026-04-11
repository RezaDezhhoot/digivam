import { useToast as useVueToast } from 'vue-toastification';

export const useAppToast = () => {
  const toast = useVueToast();

  return {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    warning: (msg) => toast.warning(msg),
    info: (msg) => toast.info(msg)
  };
};
