'use client';
import { useState, useCallback } from 'react';
import { ToastMsg } from '@/components/ui/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const push = useCallback((msg: Omit<ToastMsg, 'id'>) => {
    const id = Date.now().toString();
    setToasts(p => [...p, { ...msg, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, push, remove };
}
