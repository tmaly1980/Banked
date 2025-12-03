import { useState, useCallback } from 'react';

export interface AlertState {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
}

export const useInlineAlert = () => {
  const [alert, setAlert] = useState<AlertState>({
    type: 'info',
    message: '',
    visible: false,
  });

  const showAlert = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setAlert({ type, message, visible: true });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((message: string) => {
    showAlert('success', message);
  }, [showAlert]);

  const showError = useCallback((message: string) => {
    showAlert('error', message);
  }, [showAlert]);

  const showInfo = useCallback((message: string) => {
    showAlert('info', message);
  }, [showAlert]);

  return {
    alert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showInfo,
  };
};
