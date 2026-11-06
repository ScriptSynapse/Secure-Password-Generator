import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Polite screen-reader announcements ("Password copied", "New password generated").
 * Announcements never contain the password itself.
 */
const Ctx = createContext<(msg: string) => void>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const n = useRef(0);
  const announce = useCallback((m: string) => {
    n.current += 1;
    // Toggle a zero-width suffix so repeated identical messages are re-announced.
    setMsg(m + (n.current % 2 ? '​' : ''));
  }, []);
  return (
    <Ctx.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="announcer">
        {msg}
      </div>
    </Ctx.Provider>
  );
}

export const useAnnounce = () => useContext(Ctx);
