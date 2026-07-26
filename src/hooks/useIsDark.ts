"use client";

import { useSyncExternalStore } from "react";

/**
 * html 요소의 dark 클래스를 외부 스토어로 취급해 구독한다.
 * 테마는 React 밖(layout 의 인라인 스크립트, ThemeToggle)에서 바뀌므로
 * useEffect + setState 대신 useSyncExternalStore 로 읽는다.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");

// 정적 export 시점에는 다크 여부를 알 수 없으므로 라이트로 가정한다.
const getServerSnapshot = () => false;

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 하이드레이션이 끝났는지 여부 (서버 스냅샷과 클라이언트 스냅샷이 다른 상수) */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
