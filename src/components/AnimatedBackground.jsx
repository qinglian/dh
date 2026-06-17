/**
 * AnimatedBackground.jsx — 动效背景系统
 *
 * 分为三层渲染：
 * 1. 2D Canvas 效果（multiEffectCanvas）：12 种效果共享一个 canvas
 *    particles/stars/waves/snow/bubbles/fireflies/meteors/aurora/geometric/konami/gradientmesh/neongrid
 * 2. 3D Three.js 效果（ThreeScene）：5 种效果各占一个 WebGL 渲染器
 *    lightweb/vortex/firewave/rain/dna
 * 3. 天气背景（WeatherBackground）：独立的 Canvas 天气动画
 *
 * 所有效果支持鼠标交互（吸引/排斥/偏移）和亮暗主题颜色自适应。
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import WeatherBackground from './WeatherBackground';
import styles from './AnimatedBackground.module.css';

// ========== Canvas 2D 效果 ==========

function drawParticles(ctx, canvas, particles, theme, mouse) {
  const isDark = theme === 'dark';
  const color = isDark ? '140, 220, 255' : '80, 150, 255';
  particles.forEach((p, i) => {
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 180) {
      p.vx += dx * 0.00008;
      p.vy += dy * 0.00008;
    }
    
    p.x += p.vx; p.y += p.vy;
    // 阻尼
    p.vx *= 0.99; p.vy *= 0.99;
    
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
    g.addColorStop(0, `rgba(${color}, 0.6)`);
    g.addColorStop(0.4, `rgba(${color}, 0.2)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, 1)`; ctx.fill();
    
    for (let j = i + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx2 = p.x - p2.x, dy2 = p.y - p2.y;
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < 120) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(${color}, ${0.25 * (1 - dist2 / 120)})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
    }
  });
}

function drawStars(ctx, canvas, stars, theme, mouse) {
  const isDark = theme === 'dark';
  const color = isDark ? '220, 240, 255' : '60, 120, 220';
  stars.forEach(star => {
    star.twinkle += star.twinkleSpeed;
    const opacity = 0.5 + Math.sin(star.twinkle) * 0.5;
    
    // 鼠标交互 - 星星被鼠标推开
    const dx = star.x - mouse.x;
    const dy = star.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let offsetX = 0, offsetY = 0;
    if (dist < 100) {
      offsetX = (dx / dist) * (100 - dist) * 0.3;
      offsetY = (dy / dist) * (100 - dist) * 0.3;
    }
    
    const g = ctx.createRadialGradient(star.x + offsetX, star.y + offsetY, 0, star.x + offsetX, star.y + offsetY, star.radius * 6);
    g.addColorStop(0, `rgba(${color}, ${opacity})`);
    g.addColorStop(0.3, `rgba(${color}, ${opacity * 0.3})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(star.x + offsetX, star.y + offsetY, star.radius * 6, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(star.x + offsetX, star.y + offsetY, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${opacity})`; ctx.fill();
    if (star.radius > 1.2) {
      ctx.beginPath();
      ctx.moveTo(star.x + offsetX - star.radius * 4, star.y + offsetY); ctx.lineTo(star.x + offsetX + star.radius * 4, star.y + offsetY);
      ctx.moveTo(star.x + offsetX, star.y + offsetY - star.radius * 4); ctx.lineTo(star.x + offsetX, star.y + offsetY + star.radius * 4);
      ctx.strokeStyle = `rgba(${color}, ${opacity * 0.7})`; ctx.lineWidth = 1; ctx.stroke();
    }
  });
}

function drawWaves(ctx, canvas, waves, theme, time, mouse) {
  const isDark = theme === 'dark';
  const colors = isDark
    ? ['rgba(0, 200, 255, 0.6)', 'rgba(150, 0, 255, 0.5)', 'rgba(0, 255, 150, 0.4)']
    : ['rgba(0, 150, 255, 0.5)', 'rgba(100, 50, 200, 0.4)', 'rgba(0, 200, 200, 0.35)'];
  
  // 鼠标影响波浪高度
  const mouseInfluence = (mouse.y / canvas.height - 0.5) * 50;
  
  waves.forEach((wave, index) => {
    ctx.beginPath(); ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 4) {
      ctx.lineTo(x, wave.y + Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * (wave.amplitude + mouseInfluence * (index + 1) * 0.3));
    }
    ctx.lineTo(canvas.width, canvas.height); ctx.closePath();
    const g = ctx.createLinearGradient(0, wave.y - wave.amplitude, 0, canvas.height);
    g.addColorStop(0, colors[index]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 4) {
      const y = wave.y + Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * (wave.amplitude + mouseInfluence * (index + 1) * 0.3);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = colors[index].replace(/[\d.]+\)$/, '1)'); ctx.lineWidth = 2; ctx.stroke();
  });
}

function drawSnow(ctx, canvas, snowflakes, theme, mouse) {
  const isDark = theme === 'dark';
  const color = isDark ? '220, 240, 255' : '180, 210, 255';
  snowflakes.forEach(flake => {
    // 鼠标交互 - 雪花被鼠标吹散
    const dx = flake.x - mouse.x;
    const dy = flake.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      flake.vx = (dx / dist) * 2;
      flake.vy = (dy / dist) * 2;
    }
    
    flake.y += flake.speed + (flake.vy || 0); 
    flake.x += Math.sin(flake.y * 0.008 + flake.rotation) * 0.6 + (flake.vx || 0);
    flake.rotation += 0.015;
    flake.vx *= 0.95; flake.vy *= 0.95;
    
    if (flake.y > canvas.height) { flake.y = -15; flake.x = Math.random() * canvas.width; }
    
    ctx.save(); ctx.translate(flake.x, flake.y); ctx.rotate(flake.rotation);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, flake.radius * 2);
      ctx.strokeStyle = `rgba(${color}, ${flake.opacity})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, flake.radius * 0.6); ctx.lineTo(-flake.radius * 0.4, flake.radius * 1.2);
      ctx.moveTo(0, flake.radius * 0.6); ctx.lineTo(flake.radius * 0.4, flake.radius * 1.2);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, flake.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${flake.opacity * 0.8})`; ctx.fill();
    ctx.restore();
  });
}

function drawBubbles(ctx, canvas, bubbles, theme, mouse) {
  const isDark = theme === 'dark';
  const colors = isDark ? ['80, 200, 255', '180, 100, 255', '100, 255, 200'] : ['0, 150, 255', '150, 100, 255', '50, 200, 200'];
  bubbles.forEach((b, i) => {
    // 鼠标交互 - 气泡被鼠标推开
    const dx = b.x - mouse.x;
    const dy = b.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      b.vx = (dx / dist) * 3;
      b.vy = (dy / dist) * 3;
    }
    
    b.y -= b.speed + (b.vy || 0); 
    b.x += Math.sin(b.y * 0.015 + i) * 0.4 + (b.vx || 0);
    b.vx *= 0.95; b.vy *= 0.95;
    
    if (b.y < -b.radius * 2) { b.y = canvas.height + b.radius * 2; b.x = Math.random() * canvas.width; }
    
    const color = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(b.x - b.radius * 0.35, b.y - b.radius * 0.35, 0, b.x, b.y, b.radius);
    g.addColorStop(0, `rgba(${color}, ${b.opacity})`);
    g.addColorStop(0.7, `rgba(${color}, ${b.opacity * 0.4})`);
    g.addColorStop(1, `rgba(${color}, ${b.opacity * 0.1})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color}, ${b.opacity * 0.8})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${b.opacity})`; ctx.fill();
  });
}

function drawFireflies(ctx, canvas, fireflies, theme, mouse) {
  const isDark = theme === 'dark';
  const color = isDark ? '200, 255, 100' : '150, 220, 50';
  fireflies.forEach(f => {
    // 鼠标交互 - 萤火虫被鼠标吸引
    const dx = mouse.x - f.x;
    const dy = mouse.y - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200 && dist > 30) {
      f.vx += dx * 0.0002;
      f.vy += dy * 0.0002;
    }
    
    f.x += Math.sin(f.angle) * f.speed + (f.vx || 0); 
    f.y += Math.cos(f.angle) * f.speed * 0.5 + (f.vy || 0);
    f.angle += (Math.random() - 0.5) * 0.15; 
    f.glow += f.glowSpeed;
    f.vx *= 0.98; f.vy *= 0.98;
    
    const opacity = 0.4 + Math.sin(f.glow) * 0.5;
    if (f.x < -30) f.x = canvas.width + 30; if (f.x > canvas.width + 30) f.x = -30;
    if (f.y < -30) f.y = canvas.height + 30; if (f.y > canvas.height + 30) f.y = -30;
    
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius * 8);
    g.addColorStop(0, `rgba(${color}, ${opacity})`);
    g.addColorStop(0.2, `rgba(${color}, ${opacity * 0.5})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * 8, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, ${opacity + 0.3})`; ctx.fill();
  });
}

function drawMeteors(ctx, canvas, meteors, theme, mouse) {
  const isDark = theme === 'dark';
  const color = isDark ? '200, 220, 255' : '100, 150, 255';
  meteors.forEach(m => {
    // 鼠标交互 - 流星被鼠标吸引
    const dx = mouse.x - m.x;
    const dy = mouse.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 150) {
      m.vx += dx * 0.001;
      m.vy += dy * 0.001;
    }
    
    m.x += m.vx; m.y += m.vy; m.life -= 0.006;
    if (m.life <= 0) {
      m.x = Math.random() * canvas.width * 1.5; m.y = -30;
      m.vx = -(4 + Math.random() * 5); m.vy = 4 + Math.random() * 5;
      m.life = 0.7 + Math.random() * 0.3; m.length = 80 + Math.random() * 100;
    }
    const tailX = m.x - m.vx * m.length * 0.25; const tailY = m.y - m.vy * m.length * 0.25;
    const g = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
    g.addColorStop(0, `rgba(255,255,255,${m.life})`);
    g.addColorStop(0.3, `rgba(${color}, ${m.life * 0.8})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY);
    ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.stroke();
    const g2 = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 15);
    g2.addColorStop(0, `rgba(255,255,255,${m.life})`);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = g2; ctx.fill();
  });
}

function drawAurora(ctx, canvas, time, theme, mouse) {
  const isDark = theme === 'dark';
  const colors = isDark
    ? ['rgba(0, 255, 150, 0.25)', 'rgba(0, 200, 255, 0.2)', 'rgba(180, 0, 255, 0.18)', 'rgba(0, 150, 255, 0.15)']
    : ['rgba(0, 180, 100, 0.15)', 'rgba(0, 150, 200, 0.12)', 'rgba(100, 0, 180, 0.1)', 'rgba(0, 120, 180, 0.08)'];
  
  // 鼠标影响极光波动
  const mouseOffsetX = (mouse.x / canvas.width - 0.5) * 100;
  const mouseOffsetY = (mouse.y / canvas.height - 0.5) * 50;
  
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 6) {
      const y = canvas.height * (0.25 + i * 0.08) + mouseOffsetY +
        Math.sin((x + mouseOffsetX) * 0.002 + time * (0.3 + i * 0.15) + i * 1.2) * (60 + i * 20) +
        Math.sin((x + mouseOffsetX) * 0.005 + time * (0.2 + i * 0.1)) * 30 +
        Math.cos((x + mouseOffsetX) * 0.001 + time * 0.15 + i * 0.8) * 40;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height); ctx.closePath();
    ctx.fillStyle = colors[i]; ctx.fill();
  }
}

// ========== 新增 2D 效果 ==========

function drawGeometric(ctx, canvas, shapes, theme, time, mouse) {
  const isDark = theme === 'dark';
  const colors = isDark
    ? ['rgba(130,220,255,0.18)', 'rgba(200,150,255,0.15)', 'rgba(100,255,200,0.14)', 'rgba(255,180,100,0.12)']
    : ['rgba(80,160,255,0.1)',  'rgba(160,100,255,0.08)', 'rgba(50,200,150,0.07)', 'rgba(255,140,60,0.06)'];

  shapes.forEach((s, i) => {
    s.angle += s.speed * 0.008;
    s.y -= s.fall * 0.6;

    // 鼠标吸引
    const dx = mouse.x - s.x, dy = mouse.y - s.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist < 150) { s.x += dx * 0.015; s.y += dy * 0.015; }

    if (s.y < -60) { s.y = canvas.height + 60; s.x = Math.random() * canvas.width; }

    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    ctx.globalAlpha = 0.35 + Math.sin(time + i) * 0.2;
    ctx.beginPath();
    // 根据类型画不同形状
    if (s.type === 0) { // 六边形
      for (let a = 0; a < 6; a++) {
        const x = Math.cos(a * Math.PI/3) * s.size, y = Math.sin(a * Math.PI/3) * s.size;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (s.type === 1) { // 三角形
      ctx.moveTo(0, -s.size); ctx.lineTo(-s.size*0.866, s.size*0.5); ctx.lineTo(s.size*0.866, s.size*0.5); ctx.closePath();
    } else { // 菱形
      ctx.moveTo(0, -s.size); ctx.lineTo(s.size*0.7, 0); ctx.lineTo(0, s.size); ctx.lineTo(-s.size*0.7, 0); ctx.closePath();
    }
    ctx.strokeStyle = colors[i % 4]; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = colors[i % 4]; ctx.fill();
    ctx.restore();
  });
}

function drawKonami(ctx, canvas, trails, theme, time, mouse) {
  const isDark = theme === 'dark';
  trails.forEach(t => {
    // 添加新点
    const px = t.x + (mouse.x - t.x) * 0.008 + Math.sin(time * 0.7 + t.phase) * 1.5;
    const py = t.y + (mouse.y - t.y) * 0.008 + Math.cos(time * 0.6 + t.phase) * 1.5;
    t.x = px; t.y = py;
    t.points.push({ x: px, y: py, life: 1 });
    if (t.points.length > 40) t.points.shift();

    // 画尾迹
    if (t.points.length < 2) return;
    for (let i = 1; i < t.points.length; i++) {
      const prev = t.points[i-1], curr = t.points[i];
      curr.life -= 0.025;
      if (curr.life <= 0) continue;
      const alpha = curr.life * 0.5;
      const hue = (t.hue + time * 15 + i * 3) % 360;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `hsla(${hue}, 80%, ${isDark ? 65 : 45}%, ${alpha})`;
      ctx.lineWidth = curr.life * 2.5; ctx.lineCap = 'round'; ctx.stroke();
    }
    // 清理过期点
    t.points = t.points.filter(p => p.life > 0);
  });
}

function drawGradientMesh(ctx, canvas, blobs, theme, time, mouse) {
  const isDark = theme === 'dark';
  blobs.forEach((b, i) => {
    // 缓慢移动
    b.x += Math.sin(time * 0.5 + b.phase) * 0.4;
    b.y += Math.cos(time * 0.4 + b.phase) * 0.3;
    // 鼠标温和影响
    b.x += (mouse.x - b.x) * 0.0003;
    b.y += (mouse.y - b.y) * 0.0003;

    if (b.x < -b.r) b.x = canvas.width + b.r; if (b.x > canvas.width + b.r) b.x = -b.r;
    if (b.y < -b.r) b.y = canvas.height + b.r; if (b.y > canvas.height + b.r) b.y = -b.r;

    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    const hue = (b.hue + time * 3) % 360;
    g.addColorStop(0, `hsla(${hue}, 60%, ${isDark ? 55 : 45}%, 0.15)`);
    g.addColorStop(0.5, `hsla(${hue}, 50%, ${isDark ? 45 : 40}%, 0.06)`);
    g.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
  });
}

function drawNeonGrid(ctx, canvas, gridlines, theme, time, mouse) {
  const isDark = theme === 'dark';
  const opacity = isDark ? 0.08 : 0.04;
  const spacing = 80;
  // 鼠标影响网格偏移
  const ox = (mouse.x / canvas.width - 0.5) * 20;
  const oy = (mouse.y / canvas.height - 0.5) * 20;
  const shift = Math.sin(time * 0.3) * 5;

  ctx.strokeStyle = isDark ? 'rgba(100,180,255,0.1)' : 'rgba(30,100,200,0.06)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = -spacing; x < canvas.width + spacing; x += spacing) {
    const cx = x + ox + shift + Math.sin(time * 0.5 + x * 0.01) * 3;
    ctx.moveTo(cx, -10); ctx.lineTo(cx + oy * 0.3, canvas.height + 10);
  }
  for (let y = -spacing; y < canvas.height + spacing; y += spacing) {
    const cy = y + oy + Math.cos(time * 0.4 + y * 0.01) * 3;
    ctx.moveTo(-10, cy); ctx.lineTo(canvas.width + 10, cy + ox * 0.3);
  }
  ctx.stroke();

  // 交叉点的微弱光点
  for (let x = 0; x < canvas.width + spacing; x += spacing) {
    for (let y = 0; y < canvas.height + spacing; y += spacing) {
      const cx = x + ox + shift + Math.sin(time * 0.5 + x * 0.01) * 3;
      const cy = y + oy + Math.cos(time * 0.4 + y * 0.01) * 3;
      if (cx > -10 && cx < canvas.width + 10 && cy > -10 && cy < canvas.height + 10) {
        const dotOpacity = (0.3 + Math.sin(time * 2 + x * 0.05 + y * 0.05) * 0.2) * (isDark ? 0.4 : 0.25);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 4);
        g.addColorStop(0, `rgba(${isDark ? '120,200,255' : '30,120,220'},${dotOpacity})`);
        g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
      }
    }
  }
}

// ========== Three.js 3D 效果 ==========

function ThreeScene({ effect, theme }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;
    sceneRef.current = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    const isDark = theme === 'dark';
    let objects = [];
    let time = 0;

    // 鼠标跟踪
    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1
      };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    if (effect === 'lightweb') {
      // 光网 - 全屏六边形网格，更大范围
      const cols = Math.ceil(window.innerWidth / 60) + 4;
      const rows = Math.ceil(window.innerHeight / 60) + 4;
      const spacingX = window.innerWidth / (cols - 3);
      const spacingY = window.innerHeight / (rows - 3);
      const nodes = [];

      for (let i = -1; i < cols + 1; i++) {
        for (let j = -1; j < rows + 1; j++) {
          const x = (i - cols / 2) * spacingX * 0.8;
          const y = (j - rows / 2) * spacingY * 0.8;
          nodes.push({ x, y, index: i * rows + j, originalX: x, originalY: y });
        }
      }

      const nodeGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x00ffff : 0x0088ff, transparent: true, opacity: 0.9 });
      nodes.forEach(node => {
        const mesh = new THREE.Mesh(nodeGeo, nodeMat.clone());
        mesh.position.set(node.x, node.y, -8 + Math.sin(node.x * 0.2 + node.y * 0.2) * 3);
        mesh.userData = { baseZ: mesh.position.z, phase: Math.random() * Math.PI * 2, originalX: node.x, originalY: node.y };
        scene.add(mesh);
        objects.push(mesh);
      });

      const lineMat = new THREE.LineBasicMaterial({ color: isDark ? 0x00ffff : 0x0088ff, transparent: true, opacity: 0.25 });
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const connections = [];
          if (j < rows - 1) connections.push(idx + 1);
          if (i < cols - 1) connections.push(idx + rows);
          if (i < cols - 1 && j < rows - 1) connections.push(idx + rows + 1);
          if (i < cols - 1 && j > 0) connections.push(idx + rows - 1);
          connections.forEach(to => {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
            const line = new THREE.Line(geo, lineMat.clone());
            line.userData = { from: idx, to };
            scene.add(line);
            objects.push(line);
          });
        }
      }
      camera.position.z = 20;

    } else if (effect === 'vortex') {
      // 漩涡 - 全屏螺旋粒子，更大范围
      const count = 8000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const aspect = window.innerWidth / window.innerHeight;
      const maxRadius = Math.max(15, 12 * aspect);

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 30;
        const radius = t * maxRadius;
        const height = (t - 0.5) * 12;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height + Math.sin(angle * 3) * 0.5;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        const color = new THREE.Color().setHSL(t * 0.65 + 0.48, 0.8, isDark ? 0.55 : 0.45);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      objects.push(points);

      const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x00ffff : 0x0088ff, transparent: true, opacity: 0.5 });
      scene.add(new THREE.Mesh(coreGeo, coreMat));
      const glowGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({ color: isDark ? 0xff00ff : 0xcc00cc, transparent: true, opacity: 0.15 });
      scene.add(new THREE.Mesh(glowGeo, glowMat));

      camera.position.set(0, 4, 18);
      camera.lookAt(0, 0, 0);

    } else if (effect === 'firewave') {
      // 焰浪 - 全屏粒子火焰波浪
      const count = 5000;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const aspect = window.innerWidth / window.innerHeight;
      const spreadX = Math.max(25, 20 * aspect);

      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * spreadX;
        const z = (Math.random() - 0.5) * 15;
        const y = -8 + Math.random() * 3;
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;

        const t = Math.random();
        const color = new THREE.Color();
        if (t < 0.3) color.setHSL(0.08, 1, 0.6);
        else if (t < 0.6) color.setHSL(0.04, 1, 0.5);
        else if (t < 0.85) color.setHSL(0.12, 1, 0.7);
        else color.setHSL(0.6, 0.8, 0.7);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      objects.push(points);

      camera.position.set(0, 3, 12);
      camera.lookAt(0, 0, 0);

    } else if (effect === 'rain') {
      // 矩阵雨 - 全屏数字雨
      const columns = 80;
      const rows = 50;
      const count = columns * rows;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const aspect = window.innerWidth / window.innerHeight;
      const spreadX = Math.max(20, 16 * aspect);

      for (let i = 0; i < count; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = (col / columns - 0.5) * spreadX;
        const y = (row / rows - 0.5) * 15;
        const z = -3 + Math.random() * 3;
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;

        const brightness = Math.random();
        const color = new THREE.Color();
        if (isDark) color.setHSL(0.35, 1, brightness * 0.6);
        else color.setHSL(0.35, 0.8, brightness * 0.4);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      objects.push(points);

      camera.position.set(0, 0, 12);

    } else if (effect === 'dna') {
      // DNA双螺旋 - 全屏
      const count = 2500;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const aspect = window.innerWidth / window.innerHeight;
      const radius = Math.max(4, 3 * aspect);

      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 15;
        const y = (i / count - 0.5) * 20;
        const strand = i % 2;
        const offset = strand * Math.PI;
        const x = Math.cos(t + offset) * radius;
        const z = Math.sin(t + offset) * radius;

        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;

        const color = new THREE.Color();
        if (strand === 0) color.setHSL(0.55, 1, isDark ? 0.6 : 0.5);
        else color.setHSL(0.8, 1, isDark ? 0.6 : 0.5);
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
      }

      for (let i = 0; i < 120; i++) {
        const t = (i / 120) * Math.PI * 15;
        const y = (i / 120 - 0.5) * 20;
        const x1 = Math.cos(t) * radius, z1 = Math.sin(t) * radius;
        const x2 = Math.cos(t + Math.PI) * radius, z2 = Math.sin(t + Math.PI) * radius;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x1, y, z1, x2, y, z2]), 3));
        const lineMat = new THREE.LineBasicMaterial({ color: isDark ? 0x4466ff : 0x3344cc, transparent: true, opacity: 0.3 });
        const line = new THREE.Line(geo, lineMat);
        scene.add(line);
        objects.push(line);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      // 45度倾斜，填满屏幕两侧
      points.rotation.z = Math.PI / 4;
      scene.add(points);
      objects.push(points);

      camera.position.set(0, 0, 15);
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.016;
      
      const mouse = mouseRef.current;

      if (effect === 'lightweb') {
        const nodes = objects.filter(o => o.type === 'Mesh');
        const lines = objects.filter(o => o.type === 'Line');
        
        nodes.forEach(node => {
          // 鼠标交互 - 节点被鼠标吸引
          const dx = mouse.x * 20 - node.userData.originalX;
          const dy = mouse.y * 15 - node.userData.originalY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = Math.max(0, 1 - dist / 10) * 2;
          
          node.position.x = node.userData.originalX + dx * pull * 0.1;
          node.position.y = node.userData.originalY + dy * pull * 0.1;
          node.position.z = node.userData.baseZ + Math.sin(time * 2 + node.userData.phase) * 0.5;
          node.material.opacity = 0.6 + Math.sin(time * 3 + node.userData.phase) * 0.3;
        });
        
        lines.forEach(line => {
          const from = nodes[line.userData.from];
          const to = nodes[line.userData.to];
          if (from && to) {
            const p = line.geometry.attributes.position.array;
            p[0] = from.position.x; p[1] = from.position.y; p[2] = from.position.z;
            p[3] = to.position.x; p[4] = to.position.y; p[5] = to.position.z;
            line.geometry.attributes.position.needsUpdate = true;
            line.material.opacity = 0.15 + Math.sin(time * 2 + line.userData.from * 0.1) * 0.1;
          }
        });

      } else if (effect === 'vortex') {
        objects.forEach(obj => {
          if (obj.type === 'Points') { 
            obj.rotation.y += 0.004; 
            obj.rotation.z = Math.sin(time * 0.3) * 0.05;
            // 鼠标交互 - 漩涡倾斜
            obj.rotation.x = mouse.y * 0.3;
            obj.rotation.z += mouse.x * 0.2;
          }
          else { obj.rotation.y += 0.008; }
        });

      } else if (effect === 'firewave') {
        objects.forEach(obj => {
          if (obj.type === 'Points') {
            const pos = obj.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
              // 鼠标交互 - 火焰被鼠标吹散
              const dx = pos[i] - mouse.x * 15;
              const dz = pos[i + 2] - mouse.y * 10;
              const dist = Math.sqrt(dx * dx + dz * dz);
              const push = Math.max(0, 1 - dist / 5) * 0.5;
              
              pos[i + 1] += 0.03 + Math.sin(time * 3 + pos[i] * 0.5) * 0.02 + push;
              pos[i] += dx * push * 0.1;
              if (pos[i + 1] > 8) pos[i + 1] = -8;
            }
            obj.geometry.attributes.position.needsUpdate = true;
          }
        });

      } else if (effect === 'rain') {
        objects.forEach(obj => {
          if (obj.type === 'Points') {
            const pos = obj.geometry.attributes.position.array;
            const cols = 80, rows = 50;
            for (let i = 0; i < cols * rows; i++) {
              // 鼠标交互 - 雨被鼠标推开
              const dx = pos[i * 3] - mouse.x * 15;
              const dz = pos[i * 3 + 2] - mouse.y * 10;
              const dist = Math.sqrt(dx * dx + dz * dz);
              const push = Math.max(0, 1 - dist / 3) * 0.3;
              
              pos[i * 3 + 1] -= 0.05 + Math.random() * 0.02;
              pos[i * 3] += dx * push * 0.5;
              if (pos[i * 3 + 1] < -8) pos[i * 3 + 1] = 8;
            }
            obj.geometry.attributes.position.needsUpdate = true;
          }
        });

      } else if (effect === 'dna') {
        objects.forEach(obj => {
          if (obj.type === 'Points') { 
            // 保持45度倾斜 + Y轴旋转
            obj.rotation.y += 0.005;
            obj.rotation.y += mouse.x * 0.02;
            obj.rotation.x = mouse.y * 0.3;
            // 保持45度Z轴倾斜
            obj.rotation.z = Math.PI / 4 + mouse.x * 0.1;
          }
          else if (obj.type === 'Line') { 
            obj.rotation.y += 0.005;
            obj.rotation.y += mouse.x * 0.02;
            obj.rotation.x = mouse.y * 0.3;
            obj.rotation.z = Math.PI / 4 + mouse.x * 0.1;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      sceneRef.current = false;
    };
  }, [effect, theme]);

  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}

// ========== 多效果 Canvas 渲染器 ==========

const THREE_EFFECTS = ['lightweb', 'vortex', 'firewave', 'rain', 'dna'];
const TWO_D_EFFECTS = ['particles', 'stars', 'waves', 'snow', 'bubbles', 'fireflies', 'meteors', 'aurora', 'geometric', 'konami', 'gradientmesh', 'neongrid'];

function MultiEffectCanvas({ effects, theme }) {
  const canvasRef = useRef(null);
  const itemsRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId = null;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initAllItems();
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const initItemsForEffect = (effectId, w, h) => {
      const items = [];
      switch (effectId) {
        case 'particles':
          for (let i = 0; i < 50; i++) items.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, radius: Math.random() * 2.5 + 1 });
          break;
        case 'stars':
          for (let i = 0; i < 80; i++) items.push({ x: Math.random() * w, y: Math.random() * h, radius: Math.random() * 2.5 + 0.8, twinkle: Math.random() * Math.PI * 2, twinkleSpeed: 0.015 + Math.random() * 0.03 });
          break;
        case 'waves':
          for (let i = 0; i < 3; i++) items.push({ y: h * (0.45 + i * 0.2), amplitude: 50 + i * 20, frequency: 0.0015 + i * 0.0003, speed: 0.025 + i * 0.01, offset: i * 2.5 });
          break;
        case 'snow':
          for (let i = 0; i < 60; i++) items.push({ x: Math.random() * w, y: Math.random() * h, radius: Math.random() * 2.5 + 1.5, speed: 0.8 + Math.random() * 1.8, rotation: Math.random() * Math.PI * 2, opacity: 0.5 + Math.random() * 0.4, vx: 0, vy: 0 });
          break;
        case 'bubbles':
          for (let i = 0; i < 35; i++) items.push({ x: Math.random() * w, y: Math.random() * h, radius: 10 + Math.random() * 25, speed: 0.4 + Math.random() * 0.8, opacity: 0.12 + Math.random() * 0.2, vx: 0, vy: 0 });
          break;
        case 'fireflies':
          for (let i = 0; i < 30; i++) items.push({ x: Math.random() * w, y: Math.random() * h, radius: 2 + Math.random() * 2, speed: 0.25 + Math.random() * 0.4, angle: Math.random() * Math.PI * 2, glow: Math.random() * Math.PI * 2, glowSpeed: 0.025 + Math.random() * 0.03, vx: 0, vy: 0 });
          break;
        case 'meteors':
          for (let i = 0; i < 6; i++) items.push({ x: Math.random() * w * 1.5, y: Math.random() * h * 0.4, vx: -(4 + Math.random() * 5), vy: 4 + Math.random() * 5, life: Math.random(), length: 80 + Math.random() * 100 });
          break;
        case 'aurora':
          break;
        case 'geometric':
          for (let i = 0; i < 30; i++) items.push({ x: Math.random() * w, y: Math.random() * h, size: 15 + Math.random() * 25, speed: 0.4 + Math.random() * 0.6, fall: 0.3 + Math.random() * 0.5, angle: Math.random() * Math.PI * 2, type: Math.floor(Math.random() * 3) });
          break;
        case 'konami':
          for (let i = 0; i < 6; i++) items.push({ x: Math.random() * w, y: Math.random() * h, phase: Math.random() * Math.PI * 2, hue: Math.random() * 360, points: [] });
          break;
        case 'gradientmesh':
          for (let i = 0; i < 8; i++) items.push({ x: Math.random() * w, y: Math.random() * h, r: 100 + Math.random() * 180, hue: Math.random() * 360, phase: Math.random() * Math.PI * 2 });
          break;
        case 'neongrid':
          items.push({});  // 无需状态对象，draw 中直接计算
          break;
      }
      return items;
    };

    const initAllItems = () => {
      const w = canvas.width, h = canvas.height;
      effects.forEach(effectId => {
        if (TWO_D_EFFECTS.includes(effectId)) {
          itemsRef.current[effectId] = initItemsForEffect(effectId, w, h);
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;
      const mouse = mouseRef.current;

      effects.forEach(effectId => {
        switch (effectId) {
          case 'particles': drawParticles(ctx, canvas, itemsRef.current['particles'], theme, mouse); break;
          case 'stars': drawStars(ctx, canvas, itemsRef.current['stars'], theme, mouse); break;
          case 'waves': drawWaves(ctx, canvas, itemsRef.current['waves'], theme, time, mouse); break;
          case 'snow': drawSnow(ctx, canvas, itemsRef.current['snow'], theme, mouse); break;
          case 'bubbles': drawBubbles(ctx, canvas, itemsRef.current['bubbles'], theme, mouse); break;
          case 'fireflies': drawFireflies(ctx, canvas, itemsRef.current['fireflies'], theme, mouse); break;
          case 'meteors': drawMeteors(ctx, canvas, itemsRef.current['meteors'], theme, mouse); break;
          case 'aurora': drawAurora(ctx, canvas, time, theme, mouse); break;
          case 'geometric': drawGeometric(ctx, canvas, itemsRef.current['geometric'], theme, time, mouse); break;
          case 'konami': drawKonami(ctx, canvas, itemsRef.current['konami'], theme, time, mouse); break;
          case 'gradientmesh': drawGradientMesh(ctx, canvas, itemsRef.current['gradientmesh'], theme, time, mouse); break;
          case 'neongrid': drawNeonGrid(ctx, canvas, itemsRef.current['neongrid'], theme, time, mouse); break;
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animationId = requestAnimationFrame(draw);
    setIsReady(true);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [effects, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
}

// ========== 主组件 ==========

export default function AnimatedBackground({ enabled, theme, effects = ['particles'], multiMode = false }) {
  if (!enabled) return null;

  // 过滤出 2D 和 3D 效果
  const twoDEffects = effects.filter(e => TWO_D_EFFECTS.includes(e));
  const threeDEffects = effects.filter(e => THREE_EFFECTS.includes(e));
  const hasWeather = effects.includes('weather');

  return (
    <>
      {/* 2D 效果统一在一个 Canvas 中渲染 */}
      {twoDEffects.length > 0 && <MultiEffectCanvas effects={twoDEffects} theme={theme} />}

      {/* 3D 效果各自独立渲染 */}
      {threeDEffects.map(effect => (
        <ThreeScene key={effect} effect={effect} theme={theme} />
      ))}

      {/* 天气背景效果 */}
      {hasWeather && <WeatherBackground theme={theme} />}
    </>
  );
}
