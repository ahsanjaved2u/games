'use client';

import { useEffect, useRef } from 'react';

export default function AdBanner({ adKey, width, height, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const optScript = document.createElement('script');
    optScript.type = 'text/javascript';
    optScript.text = `atOptions = { 'key': '${adKey}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;

    container.appendChild(optScript);
    container.appendChild(invokeScript);

    return () => { container.innerHTML = ''; };
  }, [adKey, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, overflow: 'hidden' }}
      className={className}
    />
  );
}
