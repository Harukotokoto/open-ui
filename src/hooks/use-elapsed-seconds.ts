import { useEffect, useState } from "react";

/** `active`になってからの経過秒数(整数)。`active`が偽になると止まり、再び真になると0から数え直す。 */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    setSeconds(0);
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(timer);
  }, [active]);

  return seconds;
}
