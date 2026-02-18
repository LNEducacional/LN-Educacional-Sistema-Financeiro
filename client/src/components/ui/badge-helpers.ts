/**
 * Helper functions para mapear status específicos para props de Badge
 * Refatorado com Factory Pattern (DRY, OCP)
 * Separado do Badge.tsx para evitar erro de fast-refresh
 */

import type { BadgeProps } from './Badge';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_VARIANTS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_VARIANTS,
  type BadgeVariant,
} from '@/lib/constants';

/**
 * Função factory genérica para criar badge props getters
 * Reduz duplicação de código e facilita extensão
 */
function createBadgePropsGetter<T extends string>(
  labels: Record<string, string>,
  variants: Record<string, BadgeVariant>
): (status: T) => BadgeProps {
  return (status: T): BadgeProps => ({
    label: labels[status] || status,
    variant: variants[status] || 'default',
  });
}

/**
 * Mapeia OrderStatus para props de Badge
 * Usa labels e variantes centralizados
 */
export const getOrderStatusBadgeProps = createBadgePropsGetter<string>(
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS
);

/**
 * Mapeia PaymentStatus para props de Badge
 * Usa labels e variantes centralizados
 */
export const getPaymentStatusBadgeProps = createBadgePropsGetter<string>(
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS
);

/**
 * Mapeia DisputeStatus para props de Badge
 * Usa labels e variantes centralizados
 */
export const getDisputeStatusBadgeProps = createBadgePropsGetter<string>(
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_VARIANTS
);

/**
 * Mapeia ProductionStatus para props de Badge (deprecated - migrating to orders)
 * Usa labels e variantes centralizados
 */
export const getProductionStatusBadgeProps = createBadgePropsGetter<string>(
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_VARIANTS
);
