import React from 'react';
import { DotGrid } from './DotGrid';

export default function DotGridDemo() {
  return (
    <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
      <DotGrid
        dotSize={6}
        gap={15}
        baseColor="#2F293A"
        activeColor="#5227FF"
        proximity={120}
        speedTrigger={100}
        shockRadius={120}
        shockStrength={1.2}
        maxSpeed={5000}
        resistance={750}
        returnDuration={0.5}
      />
    </div>
  );
}
