import { suggestCheckout } from '../engine/checkouts';

interface Props {
  remaining: number;
  dartsLeft?: number; // 1..3, defaults to 3 (start of visit)
}

export function CheckoutHint({ remaining, dartsLeft = 3 }: Props) {
  const sequence = suggestCheckout(remaining, dartsLeft);
  if (!sequence) return null;
  return (
    <div className="rounded-md border border-red-600/50 bg-red-50 px-3 py-2 text-sm dark:bg-red-950/30">
      <span className="mr-2 font-semibold text-red-600">Checkout:</span>
      <span className="font-medium tabular-nums">{sequence.join(' · ')}</span>
    </div>
  );
}
