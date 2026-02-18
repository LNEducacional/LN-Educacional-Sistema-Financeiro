/**
 * Funções utilitárias de formatação
 * Centralizadas para evitar duplicação (DRY)
 */

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * @param value - Valor numérico a ser formatado
 * @param compact - Se true, usa notação compacta (ex: "R$ 1,2 mil")
 * @returns String formatada (ex: "R$ 1.234,56" ou "R$ 1,2 mil")
 */
export const formatCurrency = (value: number, compact = false): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    ...(compact && { notation: 'compact', maximumFractionDigits: 1 }),
  }).format(value);
};

/**
 * Formata uma string de data para formato brasileiro
 * @param dateString - String ISO ou data válida
 * @param options - Opções de formatação (opcional)
 * @returns String formatada (ex: "25/12/2023")
 */
export const formatDate = (
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('pt-BR', options ?? defaultOptions).format(
    new Date(dateString)
  );
};

/**
 * Formata uma string de data incluindo hora
 * @param dateString - String ISO ou data válida
 * @returns String formatada (ex: "25/12/2023 14:30")
 */
export const formatDateTime = (dateString: string): string => {
  return formatDate(dateString, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formata um número como porcentagem
 * @param value - Valor numérico (ex: 15)
 * @returns String formatada (ex: "15%")
 */
export const formatPercent = (value: number): string => {
  return `${value}%`;
};

/**
 * Formata uma data como tempo relativo (ex: "há 5 minutos")
 * @param dateString - String ISO ou data válida
 * @returns String formatada (ex: "há 2 horas", "há 3 dias")
 */
export const formatDistanceToNow = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'agora mesmo';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `há ${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'}`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `há ${diffInYears} ${diffInYears === 1 ? 'ano' : 'anos'}`;
};

/**
 * Formata tamanho de arquivo em bytes para formato legível
 * @param bytes - Tamanho em bytes
 * @returns String formatada (ex: "1.5 MB", "350 KB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
