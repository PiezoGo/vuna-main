import * as React from "react";

/** Returns a function that runs `callback` once input has paused for `delay` ms. */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 400,
) {
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = React.useRef(callback);
  React.useEffect(() => {
    latest.current = callback;
  }, [callback]);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return React.useCallback(
    (...args: A) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(...args), delay);
    },
    [delay],
  );
}
