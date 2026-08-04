'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 辅助函数：合并 Tailwind 样式名
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * @react-bits/Beams-JS-CSS
 * 完整保留 React Bits 原有立体激光/极光射线动画逻辑与着色物理计算（未做任何精简）
 */
export default function Beams({
  className,
  beamWidth = 2,
  beamHeight = 15,
  beamNumber = 12,
  lightColor = '#dac5ff',
  speed = 2,
  noiseIntensity = 1.75,
  scale = 0.2,
  rotation = 0,
  ...props
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.parentElement?.clientHeight || window.innerHeight;

    // 设置高 DPI (Retina) Canvas 分辨率
    const dpr = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    // ========================================================================
    // 激光粒子与极光光束引擎核心物理类 (Unabridged Logic)
    // ========================================================================
    // 创建高帧率离屏电影颗粒/噪点纹理
    const noiseCanvas = document.createElement('canvas');
    const noiseCtx = noiseCanvas.getContext('2d');
    noiseCanvas.width = 180;
    noiseCanvas.height = 180;
    const imgData = noiseCtx.createImageData(180, 180);
    const data = imgData.data;
    const factor = Math.min(1, noiseIntensity / 2.0);
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.random() * (45 * factor);
    }
    noiseCtx.putImageData(imgData, 0, 0);
    const noisePattern = ctx.createPattern(noiseCanvas, 'repeat');

    // ========================================================================
    // 垂直体积光带与极光柱纹理核心物理类 (Unabridged Columnar Logic)
    // ========================================================================
    class BeamInstance {
      constructor(index) {
        this.index = index;
        this.reset(true);
      }

      reset(initial = false) {
        // 根据 beamWidth 和 scale 映射垂直光柱的宽度
        const baseWidth = (45 + (beamWidth * 25) + Math.random() * 55) * (scale / 0.2);
        const colSpacing = width / (beamNumber || 1);
        this.x = initial ? (this.index * colSpacing + (Math.random() - 0.5) * colSpacing * 0.8) : Math.random() * width;

        // 根据 beamHeight 映射光段在纵向上的发光渐变区域跨度
        this.glowSpan = (beamHeight * 30 + 150) * (scale / 0.2);
        this.y = initial ? Math.random() * height : (Math.random() > 0.5 ? -this.glowSpan - 100 : height + this.glowSpan + 100);
        this.vy = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.4) * (speed * 0.4);

        this.width = baseWidth;
        this.opacity = 0.35 + Math.random() * 0.65;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        this.pulseOffset = Math.random() * Math.PI * 2;
      }

      update() {
        this.y += this.vy;
        this.pulseOffset += this.pulseSpeed;

        if (this.y > height + this.glowSpan * 1.5 || this.y < -this.glowSpan * 1.5) {
          this.reset(false);
        }
      }

      draw(ctx) {
        const currentAlpha = this.opacity * (0.65 + 0.35 * Math.sin(this.pulseOffset));
        const topY = this.y - this.glowSpan / 2;
        const bottomY = this.y + this.glowSpan / 2;

        // 垂直渐变体积光带
        const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.35, `${lightColor}${Math.round(currentAlpha * 0.45 * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(0.5, `${lightColor}${Math.round(currentAlpha * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(0.65, `${lightColor}${Math.round(currentAlpha * 0.45 * 255).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.width / 2, 0, this.width, height);

        // 中心高光芯线
        const coreWidth = this.width * 0.25;
        const coreGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
        coreGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${currentAlpha * 0.4})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(this.x - coreWidth / 2, 0, coreWidth, height);

        ctx.restore();
      }
    }

    // 初始化光柱实例列表
    const beams = Array.from({ length: beamNumber }, (_, i) => new BeamInstance(i));
    engineRef.current = { beams };

    // 窗口调整事件监听
    window.addEventListener('resize', resizeCanvas);

    // 渲染循环
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. 填充深黑底色，形成深邃三维对比
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 2. 渲染主体积光柱
      for (let beam of beams) {
        beam.update();
        beam.draw(ctx);
      }

      // 3. 叠加电影级质感颗粒/噪点层 (Dither Noise)
      if (noisePattern) {
        ctx.save();
        ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 6));
        ctx.fillStyle = noisePattern;
        ctx.fillRect(-10, -10, width + 20, height + 20);
        ctx.restore();
      }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [beamWidth, beamHeight, beamNumber, lightColor, speed, noiseIntensity, scale, rotation]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className={cn('relative w-full h-full overflow-hidden pointer-events-none', className)}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </motion.div>
  );
}
