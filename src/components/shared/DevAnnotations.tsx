'use client';

import { useEffect, useState, type ComponentType } from 'react';

export function DevAnnotations() {
  const [Component, setComponent] = useState<ComponentType<{ endpoint: string }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('agentation').then((m) => setComponent(() => m.Agentation)).catch(() => {});
    }
  }, []);

  if (!Component || process.env.NODE_ENV !== 'development') return null;
  return <Component endpoint="http://localhost:4747" />;
}
