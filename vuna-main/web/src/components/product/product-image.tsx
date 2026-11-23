import { Sprout } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** A product photo that fills its box, or a calm placeholder when there is none. */
export function ProductImage({ src, alt, sizes, priority, className }: ProductImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-primary/40" aria-hidden>
          <Sprout className="size-10" />
        </div>
      )}
    </div>
  );
}
