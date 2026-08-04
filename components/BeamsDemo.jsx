'use client';

import React from 'react';
import Beams from './Beams';

/**
 * 完整调用演示组件 (1080px x 1080px 相对视窗)
 */
export default function BeamsDemo() {
  return (
    <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
      <Beams
        beamWidth={2}
        beamHeight={15}
        beamNumber={12}
        lightColor="#dac5ff"
        speed={2}
        noiseIntensity={1.75}
        scale={0.2}
        rotation={0}
      />
    </div>
  );
}
