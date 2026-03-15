import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { setPrivyAccessToken } from "@/lib/auth";

export function PrivyAuthSync() {
  const { authenticated, getAccessToken } = usePrivy();

  useEffect(() => {
    if (!authenticated) {
      setPrivyAccessToken(null);
      return;
    }

    let cancelled = false;

    const syncToken = async () => {
      try {
        const token = await getAccessToken();
        if (!cancelled) {
          setPrivyAccessToken(token);
        }
      } catch {
        if (!cancelled) {
          setPrivyAccessToken(null);
        }
      }
    };

    syncToken();

    const interval = setInterval(syncToken, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authenticated, getAccessToken]);

  return null;
}
