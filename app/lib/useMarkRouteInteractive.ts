import { useObserve } from "expo-observe";
import { useEffect } from "react";

/** Marks the current route interactive for EAS Observe (call from screen components). */
export function useMarkRouteInteractive(when = true) {
  const { markInteractive } = useObserve();

  useEffect(() => {
    if (when) {
      markInteractive();
    }
  }, [when, markInteractive]);
}
