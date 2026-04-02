'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CaptureRef() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      sessionStorage.setItem('gz_ref', ref);
    }
  }, [searchParams]);

  return null;
}

export default function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <CaptureRef />
    </Suspense>
  );
}
