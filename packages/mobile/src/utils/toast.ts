import Toast from 'react-native-toast-message';

export const showToast = {
  success: (message: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  
  error: (message: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  
  loading: (message: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      position: 'top',
      autoHide: false,
    });
  },
  
  dismiss: () => {
    Toast.hide();
  },
};