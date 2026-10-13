import { OrderStatus } from '@prisma/client';

export class InvalidOrderStateTransitionError extends Error {
  readonly currentStatus: OrderStatus;
  readonly targetStatus: OrderStatus;

  constructor(currentStatus: OrderStatus, targetStatus: OrderStatus) {
    super(
      `Invalid order state transition: Cannot transition order from '${currentStatus}' to '${targetStatus}'.`
    );
    this.name = 'InvalidOrderStateTransitionError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

/**
 * Valid allowed transitions map for Order lifecycle state machine.
 */
const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['PROCESSING', 'CANCELLED', 'PAID'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  REFUNDED: [],  // Terminal state
};

/**
 * Validate whether an order can transition from current to target status.
 */
export function canTransitionOrder(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
  if (currentStatus === targetStatus) {
    return true; // Idempotent same-state transition
  }
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

/**
 * Assert transition validity or throw InvalidOrderStateTransitionError.
 */
export function assertValidTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
  if (!canTransitionOrder(currentStatus, targetStatus)) {
    throw new InvalidOrderStateTransitionError(currentStatus, targetStatus);
  }
}

/**
 * Check if order status is a terminal state.
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

/**
 * Check if order is eligible for customer cancellation.
 * Only orders that have not yet been dispatched (PENDING, AWAITING_PAYMENT, or PAID before PROCESSING) can be cancelled.
 */
export function isEligibleForCancellation(status: OrderStatus): boolean {
  return ['PENDING', 'AWAITING_PAYMENT', 'PAID'].includes(status);
}
