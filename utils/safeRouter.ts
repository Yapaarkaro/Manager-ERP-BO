import { router } from 'expo-router';

let _locked = false;
let _timer: ReturnType<typeof setTimeout> | null = null;

function lock(ms = 800) {
  _locked = true;
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _locked = false;
    _timer = null;
  }, ms);
}

export function isNavLocked() {
  return _locked;
}

/**
 * Drop-in replacement for expo-router's `router` with built-in
 * double-tap / double-navigation prevention.
 *
 * Usage: import { safeRouter } from '@/utils/safeRouter';
 *        safeRouter.push('/some-screen');
 */
export const safeRouter = {
  push: (...args: Parameters<typeof router.push>) => {
    if (_locked) return;
    lock();
    router.push(...args);
  },
  replace: (...args: Parameters<typeof router.replace>) => {
    if (_locked) return;
    lock();
    router.replace(...args);
  },
  back: () => {
    if (_locked) return;
    lock(400);
    router.back();
  },
  navigate: (...args: Parameters<typeof router.navigate>) => {
    if (_locked) return;
    lock();
    router.navigate(...args);
  },
};
