import { useState, useCallback } from 'react';
import { useMyCharges } from './api';
import type { StudentCharge } from './types';

export function usePaymentsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useMyCharges(page, pageSize);

  const [pixModalCharge, setPixModalCharge] = useState<StudentCharge | null>(null);

  const openPixModal = useCallback((charge: StudentCharge) => {
    setPixModalCharge(charge);
  }, []);

  const closePixModal = useCallback(() => {
    setPixModalCharge(null);
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    charges: data?.charges ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.page_size ?? pageSize,
    totalPages: data?.total_pages ?? 0,
    isLoading,
    error,
    pixModalCharge,
    openPixModal,
    closePixModal,
    goToPage,
  };
}
