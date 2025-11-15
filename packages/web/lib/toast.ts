import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages);
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
};