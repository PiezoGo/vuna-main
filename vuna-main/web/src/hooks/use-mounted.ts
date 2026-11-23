import * as React from "react";

const subscribe = () => () => {};

/** False during server render and hydration, true after: for values that only exist in the browser. */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
