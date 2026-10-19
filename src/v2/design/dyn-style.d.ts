// R10: the only inline style a v2 component may set is a --dyn-* custom property its module reads.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--dyn-${string}`]: string | number | undefined;
  }
}
