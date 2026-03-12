/**
 * Web Navigation Context
 * Kept as a minimal provider for backward compatibility.
 * Navigation now uses standard Expo Router (router.push / router.back)
 * with a persistent Sidebar rendered in _layout.tsx on web.
 */

import React, { ReactNode } from 'react';

export function WebNavigationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
