import { describe, it, expect } from 'vitest';
import {
  canTransitionOrder,
  assertValidTransition,
  isTerminalStatus,
  isEligibleForCancellation,
  InvalidOrderStateTransitionError,
} from '@/modules/order/state-machine';

describe('Order Lifecycle State Machine', () => {
  it('allows valid progressive order transitions', () => {
    expect(canTransitionOrder('PENDING', 'PAID')).toBe(true);
    expect(canTransitionOrder('PAID', 'PROCESSING')).toBe(true);
    expect(canTransitionOrder('PROCESSING', 'SHIPPED')).toBe(true);
    expect(canTransitionOrder('SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('allows Cash on Delivery order flow transitions', () => {
    expect(canTransitionOrder('PENDING', 'AWAITING_PAYMENT')).toBe(true);
    expect(canTransitionOrder('AWAITING_PAYMENT', 'PROCESSING')).toBe(true);
    expect(canTransitionOrder('AWAITING_PAYMENT', 'PAID')).toBe(true);
  });

  it('allows cancellation from eligible initial states', () => {
    expect(canTransitionOrder('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransitionOrder('AWAITING_PAYMENT', 'CANCELLED')).toBe(true);
    expect(canTransitionOrder('PAID', 'CANCELLED')).toBe(true);
    expect(isEligibleForCancellation('PENDING')).toBe(true);
    expect(isEligibleForCancellation('PAID')).toBe(true);
    expect(isEligibleForCancellation('SHIPPED')).toBe(false);
  });

  it('allows refund transitions from authorized states', () => {
    expect(canTransitionOrder('PAID', 'REFUNDED')).toBe(true);
    expect(canTransitionOrder('PROCESSING', 'REFUNDED')).toBe(true);
    expect(canTransitionOrder('SHIPPED', 'REFUNDED')).toBe(true);
  });

  it('prevents any transitions from terminal states', () => {
    expect(isTerminalStatus('DELIVERED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('REFUNDED')).toBe(true);

    expect(canTransitionOrder('DELIVERED', 'SHIPPED')).toBe(false);
    expect(canTransitionOrder('CANCELLED', 'PAID')).toBe(false);
    expect(canTransitionOrder('REFUNDED', 'PAID')).toBe(false);
  });

  it('throws InvalidOrderStateTransitionError on illegal transitions', () => {
    expect(() => assertValidTransition('DELIVERED', 'PENDING')).toThrow(
      InvalidOrderStateTransitionError
    );
    expect(() => assertValidTransition('PENDING', 'DELIVERED')).toThrow(
      InvalidOrderStateTransitionError
    );
  });

  it('allows idempotent transition to the exact same status', () => {
    expect(canTransitionOrder('PAID', 'PAID')).toBe(true);
    expect(() => assertValidTransition('PAID', 'PAID')).not.toThrow();
  });
});
