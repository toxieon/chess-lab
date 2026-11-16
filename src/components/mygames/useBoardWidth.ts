/**
 * Chess Lab — size a board to its column.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect, useRef, useState } from 'react';

export function useBoardWidth(min = 240) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(min);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const apply = () => setWidth(Math.max(min, Math.floor(element.clientWidth)));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [min]);

  return { ref, width };
}
