import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Anis logo, in the variant that suits the surface behind it.
 *
 * The wordmark is near-black (#060807), so on the dark till it all but vanishes.
 * logo-on-dark.png is the same mark with the wordmark lightened and the red
 * ribbon and orange spoon left exactly as they are.
 *
 * Both are rendered and one is hidden by CSS on the nearest [data-theme]
 * ancestor, so flipping the theme in Settings swaps the logo too — no JavaScript
 * and no flash of the wrong one on first paint.
 */
export default function AnisLogo({
  className,
  priority = false,
  width = 240,
  height = 182,
}: {
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <>
      <Image
        src="/images/logo.png"
        alt="Anis Food and Drink"
        width={width}
        height={height}
        priority={priority}
        className={cn("logo-for-light", className)}
      />
      {/* The same mark, so it is decorative: announcing it twice would make a
          screen reader read the business name on every logo. */}
      <Image
        src="/images/logo-on-dark.png"
        alt=""
        aria-hidden
        width={width}
        height={height}
        priority={priority}
        className={cn("logo-for-dark", className)}
      />
    </>
  );
}
