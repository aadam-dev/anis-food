import { Banknote, Building2, Clock, CreditCard, Split } from "lucide-react";

/**
 * Payment marks. Cash and card stay line icons. MoMo and Bolt use the real
 * marks, held in a small white well so the yellow square and green circle
 * do not take over a light tile — including when the tile itself is selected.
 */
const ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK_TRANSFER: Building2,
  SPLIT: Split,
  UNPAID: Clock,
} as const;

const LOGOS: Record<string, string> = {
  MOMO: "/brand/momo.png",
  BOLT_FOOD: "/brand/bolt-food.png",
};

export default function MethodMark({ method }: { method: string }) {
  const logo = LOGOS[method];
  if (logo) {
    return (
      <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-lg bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand marks, sized for a tile */}
        <img src={logo} alt="" className="h-7 w-7 object-contain" />
      </span>
    );
  }
  const Icon = ICONS[method as keyof typeof ICONS] ?? Banknote;
  return <Icon className="h-5 w-5" aria-hidden />;
}
