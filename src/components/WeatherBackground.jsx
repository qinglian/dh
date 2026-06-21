import { useEffect, useRef } from 'react';
import { getWeatherCache } from '../utils/weather';

/*
 * WeatherBackground - 全屏天气背景动画（Canvas 2D渲染）
 *
 * 功能：根据当前天气类型（晴/多云/阴/雨/雪/雾）实时绘制写实全屏天气背景。
 *       包含天空渐变、动态云层、太阳光晕、流星射线、飞鸟、雨滴溅落、涟漪、
 *       雪花飘落堆积、闪电闪烁、星光闪烁、极光等多层次视觉效果。
 *
 * 设计要点：
 *   - 所有粒子/对象在初始化时创建并循环复用，避免 GC 压力
 *   - 支持天气类型平滑过渡（transitionAlpha 控制0.3秒淡入）
 *   - 近景/远景分层渲染增强深度感
 *   - 60fps 流畅运行，requestAnimationFrame 驱动
 *   - 监听 localStorage 缓存变化，自动同步天气更新
 */

export default function WeatherBackground({ theme }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);

  // 初始化一次 stateRef（防止 resize 时重新创建）
  if (!stateRef.current) {
    stateRef.current = {
      particles: [],    // 雨滴/雪花/雾团/阳光射线
      clouds: [],
      ripples: [],
      birds: [],
      stars: [],
      aurora: [],
      dustMotes: [],    // 晴天浮尘
      splashParticles: [], // 雨滴溅落粒子
      snowGround: [],   // 雪地堆积点
      meteors: [],      // 流星
      transitionAlpha: 0,
      prevType: 'sunny',
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w, h;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const state = stateRef.current;
    state.time = 0;
    state.w = w;
    state.h = h;

    /* ---- 天气类型与时间 ---- */
    let weather = getWeatherCache()?.data;
    let type = weather?.type || 'sunny';
    let targetType = type;
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 19;

    // 监听缓存变化
    let lastCacheTime = localStorage.getItem('nav-weather-cache-time');
    const checkCacheUpdate = () => {
      const currentCacheTime = localStorage.getItem('nav-weather-cache-time');
      if (currentCacheTime !== lastCacheTime) {
        lastCacheTime = currentCacheTime;
        const newWeather = getWeatherCache()?.data;
        if (newWeather && newWeather.type !== targetType) {
          targetType = newWeather.type;
          state.transitionAlpha = 0;
        }
      }
    };

    /* ==================== 粒子工厂 ==================== */

    /** 雨滴 - 斜向快速下落 */
    const createRaindrop = (randomY = false) => ({
      x: Math.random() * w * 1.3 - w * 0.15,
      y: randomY ? Math.random() * h : -80,
      speed: 14 + Math.random() * 20,
      length: 20 + Math.random() * 35,
      opacity: 0.15 + Math.random() * 0.3,
      wind: -3 + Math.random() * 2,
      width: 1 + Math.random() * 2.5,
      layer: Math.random() > 0.6 ? 'far' : 'near',
    });

    /** 雪花 - 飘摇下落带旋转 */
    const createSnowflake = (randomY = false) => ({
      x: Math.random() * w * 1.1,
      y: randomY ? Math.random() * h : -30,
      speed: 0.4 + Math.random() * 2.2,
      radius: 1.2 + Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.03,
      wobbleAmp: 1 + Math.random() * 5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      type: Math.random() > 0.35 ? 'hex' : 'circle',
      layer: Math.random() > 0.5 ? 'far' : 'near',
      meltTimer: 0,
    });

    /** 雾团 - 缓慢漂移的椭圆 */
    const createFogBlob = (randomX = false) => ({
      x: randomX ? Math.random() * w : -500,
      y: Math.random() * h * 0.7 + h * 0.15,
      speed: 0.06 + Math.random() * 0.3,
      width: 180 + Math.random() * 450,
      height: 40 + Math.random() * 110,
      opacity: 0.03 + Math.random() * 0.09,
      phase: Math.random() * Math.PI * 2,
      layer: Math.random() > 0.5 ? 'far' : 'near',
    });

    /** 云朵 - 多团聚合 */
    const createCloud = (randomX = false) => {
      const scale = 0.45 + Math.random() * 1.8;
      const puffCount = 5 + Math.floor(Math.random() * 7);
      const puffs = [];
      for (let i = 0; i < puffCount; i++) {
        const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.9;
        const dist = 18 + Math.random() * 65;
        puffs.push({
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist * 0.35,
          r: 30 + Math.random() * 60,
        });
      }
      puffs.push({ dx: 0, dy: 0, r: 50 + Math.random() * 45 });
      return {
        x: randomX ? Math.random() * w : -600,
        y: 10 + Math.random() * h * 0.48,
        speed: 0.08 + Math.random() * 0.45,
        scale, puffs,
        opacity: 0.18 + Math.random() * 0.35,
        layer: scale < 0.8 ? 'far' : 'near',
      };
    };

    /** 阳光射线 */
    const createSunRay = () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.0002 + Math.random() * 0.0015,
      length: 0.4 + Math.random() * 0.8,
      opacity: 0.03 + Math.random() * 0.09,
      width: 1.5 + Math.random() * 6,
      pulsePhase: Math.random() * Math.PI * 2,
    });

    /** 涟漪 */
    const createRipple = (x, y) => ({
      x, y,
      radius: 1.5,
      maxRadius: 8 + Math.random() * 18,
      opacity: 0.45 + Math.random() * 0.4,
      speed: 0.3 + Math.random() * 0.7,
    });

    /** 溅落粒子 */
    const createSplashParticle = (x, y) => ({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: -(2 + Math.random() * 4),
      life: 1,
      decay: 0.02 + Math.random() * 0.06,
      size: 1 + Math.random() * 2,
    });

    /** 飞鸟 */
    const createBird = () => ({
      x: -40,
      y: 40 + Math.random() * h * 0.28,
      speed: 1 + Math.random() * 2.8,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.05 + Math.random() * 0.12,
      size: 2.5 + Math.random() * 5,
      flockOffset: Math.random() * Math.PI * 2,
      dy: (Math.random() - 0.5) * 50,
    });

    /** 星星 */
    const createStar = () => {
      const temp = Math.random();
      const color = temp < 0.7 ? 'rgba(255,255,255,0.95)' :
                    temp < 0.85 ? 'rgba(255,245,200,0.95)' : 'rgba(200,220,255,0.95)';
      return {
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        radius: 0.3 + Math.random() * 2.2,
        opacity: 0.2 + Math.random() * 0.8,
        twinkleSpeed: 0.001 + Math.random() * 0.008,
        twinklePhase: Math.random() * Math.PI * 2,
        hasSpikes: Math.random() > 0.65,
        color,
      };
    };

    /** 极光带 */
    const createAuroraBand = () => ({
      y: h * 0.12 + Math.random() * h * 0.28,
      amplitude: 25 + Math.random() * 70,
      frequency: 0.0015 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.0012,
      width: 35 + Math.random() * 85,
      hue: 100 + Math.random() * 80,
      opacity: 0.12 + Math.random() * 0.22,
    });

    /** 浮尘粒子（晴天光束中） */
    const createDustMote = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 0.05 + Math.random() * 0.2,
      radius: 0.4 + Math.random() * 1.2,
      opacity: 0.15 + Math.random() * 0.35,
      wobbleAmp: 0.3 + Math.random() * 1.5,
      wobbleSpeed: 0.008 + Math.random() * 0.025,
      wobblePhase: Math.random() * Math.PI * 2,
    });

    /* ==================== 初 始 化 ==================== */

    const init = () => {
      state.particles = [];
      state.clouds = [];
      state.ripples = [];
      state.birds = [];
      state.stars = [];
      state.aurora = [];
      state.dustMotes = [];
      state.splashParticles = [];
      state.snowGround = [];
      state.meteors = [];
      state.transitionAlpha = 0;
      state.prevType = type;
      state.lightning = 0;
      state.lightningTimer = 0;
      state.nextLightningAt = 480 + Math.random() * 1020;

      switch (type) {
        case 'rain':
          for (let i = 0; i < 300; i++) state.particles.push(createRaindrop(true));
          for (let i = 0; i < 12; i++) state.clouds.push(createCloud(true));
          break;
        case 'snow':
          for (let i = 0; i < 180; i++) state.particles.push(createSnowflake(true));
          for (let i = 0; i < 7; i++) state.clouds.push(createCloud(true));
          // 初始雪地堆积点
          for (let i = 0; i < 40; i++) state.snowGround.push({
            x: Math.random() * w, y: h - 2, r: 3 + Math.random() * 8, opacity: 0.2 + Math.random() * 0.4
          });
          break;
        case 'fog':
          for (let i = 0; i < 55; i++) state.particles.push(createFogBlob(true));
          break;
        case 'cloudy':
          for (let i = 0; i < 20; i++) state.clouds.push(createCloud(true));
          break;
        case 'overcast':
          for (let i = 0; i < 28; i++) state.clouds.push(createCloud(true));
          break;
        case 'sunny':
          for (let i = 0; i < 10; i++) state.clouds.push(createCloud(true));
          for (let i = 0; i < 30; i++) state.particles.push(createSunRay());
          for (let i = 0; i < 8; i++) state.birds.push(createBird());
          for (let i = 0; i < 40; i++) state.dustMotes.push(createDustMote());
          break;
      }

      if (!isDay && type !== 'rain' && type !== 'snow') {
        for (let i = 0; i < 180; i++) state.stars.push(createStar());
        if (type === 'sunny') {
          for (let i = 0; i < 4; i++) state.aurora.push(createAuroraBand());
        }
      }
    };

    /* ==================== 绘 制 工 具 ==================== */

    const drawHexagon = (x, y, r, rotation) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rotation + (i * Math.PI) / 3;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    };

    /** 绘制云朵 - 带光照阴影层次 */
    const drawCloud = (cloud) => {
      ctx.save();
      const isOvercast = type === 'overcast';
      const isRain = type === 'rain';
      const isSnow = type === 'snow';
      const cx = cloud.x, cy = cloud.y, s = cloud.scale;

      cloud.puffs.forEach(puff => {
        const px = cx + puff.dx * s, py = cy + puff.dy * s, pr = puff.r * s;

        // 底部阴影
        ctx.globalAlpha = cloud.opacity * 0.55;
        const shadowGrad = ctx.createRadialGradient(px, py + 10, 0, px, py + 10, pr * 1.3);
        if (isOvercast) {
          shadowGrad.addColorStop(0, 'rgba(85,90,100,0.4)');
          shadowGrad.addColorStop(1, 'rgba(85,90,100,0)');
        } else if (isRain) {
          shadowGrad.addColorStop(0, 'rgba(65,70,82,0.45)');
          shadowGrad.addColorStop(1, 'rgba(65,70,82,0)');
        } else if (isSnow) {
          shadowGrad.addColorStop(0, 'rgba(135,140,150,0.3)');
          shadowGrad.addColorStop(1, 'rgba(135,140,150,0)');
        } else {
          shadowGrad.addColorStop(0, 'rgba(170,170,170,0.25)');
          shadowGrad.addColorStop(1, 'rgba(170,170,170,0)');
        }
        ctx.fillStyle = shadowGrad;
        ctx.beginPath(); ctx.arc(px, py + 10, pr * 1.3, 0, Math.PI * 2); ctx.fill();

        // 主体
        ctx.globalAlpha = cloud.opacity;
        const mainGrad = ctx.createRadialGradient(px - pr * 0.15, py - pr * 0.2, 0, px, py, pr);
        if (isOvercast) {
          mainGrad.addColorStop(0, 'rgba(155,160,170,0.6)');
          mainGrad.addColorStop(0.45, 'rgba(135,140,150,0.35)');
          mainGrad.addColorStop(1, 'rgba(115,120,130,0)');
        } else if (isRain) {
          mainGrad.addColorStop(0, 'rgba(125,132,142,0.55)');
          mainGrad.addColorStop(0.45, 'rgba(105,110,122,0.32)');
          mainGrad.addColorStop(1, 'rgba(85,90,100,0)');
        } else if (isSnow) {
          mainGrad.addColorStop(0, 'rgba(200,205,215,0.5)');
          mainGrad.addColorStop(0.45, 'rgba(175,180,192,0.3)');
          mainGrad.addColorStop(1, 'rgba(155,160,172,0)');
        } else {
          mainGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
          mainGrad.addColorStop(0.45, 'rgba(255,255,255,0.4)');
          mainGrad.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = mainGrad;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();

        // 顶部高光
        if (!isOvercast && !isRain) {
          ctx.globalAlpha = cloud.opacity * (isSnow ? 0.3 : 0.55);
          const hlGrad = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.35, 0, px - pr * 0.2, py - pr * 0.25, pr * 0.55);
          hlGrad.addColorStop(0, isSnow ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)');
          hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = hlGrad;
          ctx.beginPath(); ctx.arc(px - pr * 0.2, py - pr * 0.2, pr * 0.55, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.restore();
    };

    /** 雨滴溅落效果 */
    const drawSplash = (x, y, count = 6) => {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = 'rgba(170,190,220,0.7)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        const len = 3 + Math.random() * 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.restore();
    };

    /** 生成锯齿闪电路径（递归中点位移） */
    const generateBoltPath = (x1, y1, x2, y2, depth, maxDepth) => {
      if (depth >= maxDepth) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * (y2 - y1) * 0.35;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * Math.abs(x2 - x1) * 0.1;
      const left = generateBoltPath(x1, y1, mx, my, depth + 1, maxDepth);
      const right = generateBoltPath(mx, my, x2, y2, depth + 1, maxDepth);
      return [...left, ...right.slice(1)];
    };

    /** 绘制闪电路径（多层辉光） */
    const drawBoltPath = (pts, alpha, baseWidth) => {
      if (pts.length < 2) return;
      // 外层辉光（蓝紫色）
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = 'rgba(100,140,255,0.8)';
      ctx.lineWidth = baseWidth * 4;
      ctx.shadowColor = 'rgba(80,120,255,0.6)';
      ctx.shadowBlur = 30;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // 中层辉光（青白色）
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = 'rgba(200,220,255,0.9)';
      ctx.lineWidth = baseWidth * 2;
      ctx.shadowColor = 'rgba(180,210,255,0.8)';
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // 核心亮白
      ctx.globalAlpha = alpha * 0.95;
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = baseWidth;
      ctx.shadowColor = 'rgba(220,240,255,0.9)';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };

    /** 生成分支 */
    const generateBranches = (mainPts, count, lengthRatio, depth) => {
      const branches = [];
      for (let b = 0; b < count; b++) {
        const si = 1 + Math.floor(Math.random() * (mainPts.length - 2));
        const sp = mainPts[si];
        const angle = (Math.random() - 0.5) * 1.2 + (sp.y > mainPts[0].y ? 0.3 : -0.3);
        const len = (h * 0.15 + Math.random() * h * 0.25) * lengthRatio;
        const ex = sp.x + Math.sin(angle) * len;
        const ey = sp.y + Math.cos(angle) * len * 0.6 + len * 0.4;
        const bPts = generateBoltPath(sp.x, sp.y, ex, ey, 0, 3 + depth);
        branches.push(bPts);
      }
      return branches;
    };

    /** 闪电 - 多种样式 */
    const drawLightning = () => {
      if (state.lightning <= 0) return;
      ctx.save();

      // 柔和环境闪光
      ctx.globalAlpha = state.lightning * 0.04;
      ctx.fillStyle = 'rgba(200,220,255,0.3)';
      ctx.fillRect(0, 0, w, h);

      const style = state.lightningStyle || 'bolt';

      if (style === 'bolt') {
        // 单根锯齿闪电 - 参考真实照片风格
        const sx = w * 0.1 + Math.random() * w * 0.8;
        const sy = 0;
        const ex = sx + (Math.random() - 0.5) * w * 0.3;
        const ey = h * (0.5 + Math.random() * 0.35);
        const mainPts = generateBoltPath(sx, sy, ex, ey, 0, 6);
        drawBoltPath(mainPts, state.lightning, 2.5);
        // 2~4条分支
        const branches = generateBranches(mainPts, 2 + Math.floor(Math.random() * 3), 0.4, 1);
        branches.forEach(bp => drawBoltPath(bp, state.lightning * 0.5, 1.2));
      } else if (style === 'sheet') {
        // 片状闪 - 云层弥漫光
        ctx.globalAlpha = state.lightning * 0.35;
        for (let i = 0; i < 6; i++) {
          const sx = Math.random() * w;
          const sy = Math.random() * h * 0.3;
          const sr = 60 + Math.random() * 180;
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
          grad.addColorStop(0, 'rgba(220,235,255,0.2)');
          grad.addColorStop(1, 'rgba(220,235,255,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
      } else if (style === 'distant') {
        // 远闪 - 细弱
        const sx = w * 0.15 + Math.random() * w * 0.7;
        const sy = h * 0.05;
        const ex = sx + (Math.random() - 0.5) * 60;
        const ey = h * (0.25 + Math.random() * 0.15);
        const pts = generateBoltPath(sx, sy, ex, ey, 0, 4);
        drawBoltPath(pts, state.lightning * 0.4, 0.8);
      }
      ctx.restore();
    };

    /** 飞鸟 */
    const drawBird = (bird) => {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = isDay ? 'rgba(45,45,45,0.55)' : 'rgba(160,160,160,0.4)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      const wingY = Math.sin(bird.wingPhase) * bird.size * 2.8;
      const bodyY = Math.sin(bird.flockOffset + state.time * 0.003) * 3;
      ctx.beginPath();
      ctx.moveTo(bird.x - bird.size * 2.5, bird.y + bodyY + bird.dy + wingY);
      ctx.quadraticCurveTo(bird.x - bird.size * 0.4, bird.y + bodyY + bird.dy - bird.size * 0.9, bird.x, bird.y + bodyY + bird.dy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bird.x, bird.y + bodyY + bird.dy);
      ctx.quadraticCurveTo(bird.x + bird.size * 0.4, bird.y + bodyY + bird.dy - bird.size * 0.9, bird.x + bird.size * 2.5, bird.y + bodyY + bird.dy + wingY);
      ctx.stroke();
      ctx.restore();
    };

    /* ==================== 天 空 背 景 ==================== */

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const t = state.transitionAlpha; // 过渡系数

      if (type === 'sunny') {
        if (isDay) {
          grad.addColorStop(0, 'rgba(95,170,255,0.47)');
          grad.addColorStop(0.3, 'rgba(155,210,255,0.33)');
          grad.addColorStop(0.6, 'rgba(205,235,255,0.2)');
          grad.addColorStop(1, 'rgba(250,240,215,0.12)');
        } else {
          grad.addColorStop(0, 'rgba(12,20,50,0.65)');
          grad.addColorStop(0.35, 'rgba(22,32,60,0.45)');
          grad.addColorStop(0.7, 'rgba(32,42,70,0.28)');
          grad.addColorStop(1, 'rgba(42,52,80,0.18)');
        }
      } else if (type === 'cloudy') {
        grad.addColorStop(0, 'rgba(135,162,200,0.42)');
        grad.addColorStop(0.35, 'rgba(165,188,215,0.3)');
        grad.addColorStop(0.7, 'rgba(195,208,222,0.18)');
        grad.addColorStop(1, 'rgba(215,222,230,0.1)');
      } else if (type === 'overcast') {
        grad.addColorStop(0, 'rgba(95,108,125,0.48)');
        grad.addColorStop(0.35, 'rgba(120,132,146,0.35)');
        grad.addColorStop(0.7, 'rgba(145,152,162,0.22)');
        grad.addColorStop(1, 'rgba(165,170,178,0.13)');
      } else if (type === 'rain') {
        grad.addColorStop(0, 'rgba(55,65,88,0.55)');
        grad.addColorStop(0.3, 'rgba(70,80,102,0.42)');
        grad.addColorStop(0.65, 'rgba(85,98,118,0.28)');
        grad.addColorStop(1, 'rgba(100,110,130,0.15)');
      } else if (type === 'snow') {
        grad.addColorStop(0, 'rgba(160,182,210,0.42)');
        grad.addColorStop(0.35, 'rgba(185,202,225,0.3)');
        grad.addColorStop(0.72, 'rgba(210,220,238,0.18)');
        grad.addColorStop(1, 'rgba(225,232,244,0.1)');
      } else if (type === 'fog') {
        grad.addColorStop(0, 'rgba(150,165,178,0.38)');
        grad.addColorStop(0.35, 'rgba(170,182,193,0.3)');
        grad.addColorStop(0.72, 'rgba(190,200,208,0.2)');
        grad.addColorStop(1, 'rgba(205,212,218,0.12)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    };

    /* ==================== 主 绘 制 循 环 ==================== */

    const draw = () => {
      state.time++;
      ctx.clearRect(0, 0, w, h);

      // 天气过渡
      if (state.transitionAlpha < 1) state.transitionAlpha = Math.min(1, state.transitionAlpha + 0.03);
      if (targetType !== state.prevType && state.transitionAlpha >= 1) {
        type = targetType;
        state.prevType = targetType;
        init();
        return;
      }

      drawSky();

      /* ---- 星星 ---- */
      if (!isDay && type !== 'rain' && type !== 'snow') {
        state.stars.forEach(star => {
          star.twinklePhase += star.twinkleSpeed;
          const twinkle = 0.3 + 0.7 * Math.sin(star.twinklePhase);
          ctx.save();
          ctx.globalAlpha = star.opacity * twinkle;
          // 星星颜色微偏黄/蓝，更自然
          ctx.fillStyle = star.color || 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
          // 大星星带柔和光晕
          if (star.radius > 1.2) {
            ctx.globalAlpha = star.opacity * twinkle * 0.25;
            const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4);
            glow.addColorStop(0, star.color || 'rgba(255,255,255,0.4)');
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2); ctx.fill();
          }
          if (star.hasSpikes) {
            ctx.globalAlpha = star.opacity * twinkle * 0.45;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(star.x - star.radius * 3, star.y);
            ctx.lineTo(star.x + star.radius * 3, star.y);
            ctx.moveTo(star.x, star.y - star.radius * 3);
            ctx.lineTo(star.x, star.y + star.radius * 3);
            ctx.stroke();
          }
          ctx.restore();
        });

        // 流星
        if (Math.random() < 0.003 && state.meteors.length < 2) {
          state.meteors.push({
            x: Math.random() * w * 0.8 + w * 0.1,
            y: Math.random() * h * 0.25,
            length: 60 + Math.random() * 100,
            speed: 4 + Math.random() * 6,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
            opacity: 1,
          });
        }
        state.meteors = state.meteors.filter(m => {
          m.x += Math.cos(m.angle) * m.speed;
          m.y += Math.sin(m.angle) * m.speed;
          m.opacity -= 0.008;
          if (m.opacity <= 0) return false;
          ctx.save();
          ctx.globalAlpha = m.opacity;
          const tailX = m.x - Math.cos(m.angle) * m.length;
          const tailY = m.y - Math.sin(m.angle) * m.length;
          const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(0.3, 'rgba(200,220,255,0.6)');
          grad.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY); ctx.stroke();
          ctx.restore();
          return true;
        });
      }

      /* ---- 极光 ---- */
      if (!isDay && type === 'sunny') {
        state.aurora.forEach(band => {
          band.phase += band.speed;
          ctx.save();
          ctx.globalAlpha = band.opacity;
          ctx.beginPath(); ctx.moveTo(0, h);
          const step = 4;
          for (let x = 0; x <= w; x += step) {
            const y = band.y + Math.sin(x * band.frequency + band.phase) * band.amplitude +
                      Math.sin(x * band.frequency * 0.33 + band.phase * 1.5) * band.amplitude * 0.4;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, band.y + band.width);
          ctx.lineTo(0, band.y + band.width);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.width);
          g.addColorStop(0, `hsla(${band.hue},80%,60%,0.25)`);
          g.addColorStop(0.5, `hsla(${band.hue + 20},70%,55%,0.12)`);
          g.addColorStop(1, `hsla(${band.hue + 30},60%,50%,0)`);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.restore();
        });
      }

      /* ===== 晴天 ===== */
      if (type === 'sunny') {
        const sunX = w * 0.78;
        const sunY = h * 0.14;

        if (isDay) {
          const pulse = 1 + Math.sin(state.time * 0.012) * 0.06;
          // 多层光晕
          for (let i = 9; i >= 0; i--) {
            const r = 20 + i * 32 * pulse;
            const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r);
            const alpha = (0.12 - i * 0.01) * pulse;
            sunGrad.addColorStop(0, `rgba(255,230,120,${alpha})`);
            sunGrad.addColorStop(0.4, `rgba(255,210,90,${alpha * 0.5})`);
            sunGrad.addColorStop(1, 'rgba(255,190,60,0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill();
          }
          // 日冕射线
          ctx.save();
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + state.time * 0.002;
            const rayLen = 60 + Math.sin(state.time * 0.008 + i) * 20;
            const rx = sunX + Math.cos(angle) * 35;
            const ry = sunY + Math.sin(angle) * 35;
            const ex = sunX + Math.cos(angle) * rayLen;
            const ey = sunY + Math.sin(angle) * rayLen;
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(ex, ey);
            ctx.strokeStyle = `rgba(255,230,150,${0.08 + Math.sin(state.time * 0.01 + i) * 0.04})`;
            ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
          }
          ctx.restore();
          // 太阳本体
          ctx.save();
          ctx.globalAlpha = 0.12; ctx.fillStyle = 'rgba(255,220,80,0.5)';
          ctx.beginPath(); ctx.arc(sunX, sunY, 32, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.25; ctx.fillStyle = 'rgba(255,230,120,0.6)';
          ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(255,245,200,0.9)';
          ctx.beginPath(); ctx.arc(sunX, sunY, 14, 0, Math.PI * 2); ctx.fill();
          ctx.restore();

          // 阳光射线
          state.particles.forEach(p => {
            p.angle += p.speed;
            p.pulsePhase += 0.015;
            const pulseVal = 0.25 + 0.75 * Math.sin(p.pulsePhase);
            const rayStart = 38;
            const rayEnd = 80 + p.length * 200;
            const sx = sunX + Math.cos(p.angle) * rayStart;
            const sy = sunY + Math.sin(p.angle) * rayStart;
            const ex = sunX + Math.cos(p.angle) * rayEnd;
            const ey = sunY + Math.sin(p.angle) * rayEnd;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.strokeStyle = `rgba(255,230,150,${p.opacity * pulseVal * 0.35})`;
            ctx.lineWidth = p.width * 3.5; ctx.lineCap = 'round'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.strokeStyle = `rgba(255,240,180,${p.opacity * pulseVal * 0.55})`;
            ctx.lineWidth = p.width; ctx.lineCap = 'round'; ctx.stroke();
          });
        }

        // 夜晚显示月亮
        if (!isDay) {
          const moonX = w * 0.82;
          const moonY = h * 0.12;
          // 月光晕
          for (let i = 5; i >= 0; i--) {
            const r = 18 + i * 22;
            const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, r);
            mg.addColorStop(0, `rgba(220,230,255,${0.06 - i * 0.008})`);
            mg.addColorStop(1, 'rgba(220,230,255,0)');
            ctx.fillStyle = mg;
            ctx.beginPath(); ctx.arc(moonX, moonY, r, 0, Math.PI * 2); ctx.fill();
          }
          // 月亮本体
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = 'rgba(240,242,255,1)';
          ctx.beginPath(); ctx.arc(moonX, moonY, 16, 0, Math.PI * 2); ctx.fill();
          // 月海阴影
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = 'rgba(180,190,220,1)';
          ctx.beginPath(); ctx.arc(moonX - 4, moonY + 2, 5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(moonX + 3, moonY - 3, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(moonX + 1, moonY + 5, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }

        // 蓝天白云 - 晴天云朵更白更亮
        state.clouds.forEach(c => {
          c.x += c.speed * 2;
          if (c.x > w + 500) c.x = -500;
          drawCloud(c);
        });

        // 浮尘
        state.dustMotes.forEach(m => {
          m.wobblePhase += m.wobbleSpeed;
          m.y -= m.speed;
          m.x += Math.sin(m.wobblePhase) * m.wobbleAmp;
          if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
          ctx.save();
          ctx.globalAlpha = m.opacity;
          ctx.fillStyle = 'rgba(255,245,200,0.6)';
          ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });

        // 飞鸟
        state.birds.forEach(bird => {
          bird.x += bird.speed; bird.wingPhase += bird.wingSpeed;
          drawBird(bird);
          if (bird.x > w + 60) {
            bird.x = -50; bird.y = 40 + Math.random() * h * 0.28; bird.dy = (Math.random() - 0.5) * 50;
          }
        });
      }

      /* ===== 多云 / 阴天 ===== */
      if (type === 'cloudy') {
        state.clouds.forEach(c => { c.x += c.speed; if (c.x > w + 500) c.x = -800; drawCloud(c); });
      }
      if (type === 'overcast') {
        state.clouds.forEach(c => { c.x += c.speed * 1.0; if (c.x > w + 550) c.x = -800; drawCloud(c); });
      }

      /* ===== 雨天 ===== */
      if (type === 'rain') {
        state.clouds.forEach(c => { c.x += c.speed * 0.4; if (c.x > w + 550) c.x = -800; drawCloud(c); });

        state.particles.forEach(p => {
          const isFar = p.layer === 'far';
          const sm = isFar ? 0.5 : 1;
          const om = isFar ? 0.4 : 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.wind * 3, p.y + p.length);
          const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.wind * 3, p.y + p.length);
          grad.addColorStop(0, 'rgba(155,180,215,0)');
          grad.addColorStop(0.25, `rgba(155,180,215,${p.opacity * om * 0.18})`);
          grad.addColorStop(1, `rgba(155,180,215,${p.opacity * om})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = p.width * (isFar ? 0.5 : 1);
          ctx.lineCap = 'round';
          ctx.stroke();

          p.x += p.wind * sm;
          p.y += p.speed * sm;

          // 溅落
          if (!isFar && p.y > h - 8 && Math.random() > 0.6) {
            drawSplash(p.x, h - 2, 5);
          }
          if (!isFar && p.y > h - 6 && Math.random() > 0.85) {
            state.ripples.push(createRipple(p.x, h - 3));
            // 溅落粒子
            for (let sp = 0; sp < 3; sp++) { state.splashParticles.push(createSplashParticle(p.x, h - 3)); }
          }
          if (p.y > h + 60) Object.assign(p, createRaindrop());
        });

        // 涟漪
        state.ripples = state.ripples.filter(r => {
          r.radius += r.speed; r.opacity -= 0.01;
          if (r.opacity <= 0) return false;
          ctx.save();
          ctx.globalAlpha = r.opacity;
          ctx.strokeStyle = 'rgba(165,185,218,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          return true;
        });

        // 溅落粒子
        state.splashParticles = state.splashParticles.filter(sp => {
          sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.1; sp.life -= sp.decay;
          if (sp.life <= 0) return false;
          ctx.save();
          ctx.globalAlpha = sp.life * 0.5;
          ctx.fillStyle = 'rgba(170,190,220,0.7)';
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          return true;
        });

        // 闪电 - 偶尔随机触发，多样化样式
        state.lightningTimer++;
        if (state.lightningTimer >= state.nextLightningAt) {
          state.lightning = 1;
          state.lightningTimer = 0;
          // 随机选择闪电样式：单根锯齿50%、远闪30%、片状闪20%
            const r = Math.random();
            state.lightningStyle = r < 0.5 ? 'bolt' : r < 0.8 ? 'distant' : 'sheet';
          // 下次闪电间隔：8~25秒（480~1500帧）
          state.nextLightningAt = 480 + Math.random() * 1020;
        }
        if (state.lightning > 0) {
          state.lightning -= 0.012;
          if (state.lightning < 0) state.lightning = 0;
        }
        drawLightning();
      }

      /* ===== 雪天 ===== */
      if (type === 'snow') {
        state.clouds.forEach(c => { c.x += c.speed * 0.25; if (c.x > w + 500) c.x = -800; drawCloud(c); });

        state.particles.forEach(p => {
          const isFar = p.layer === 'far';
          const sm = isFar ? 0.42 : 1;
          const om = isFar ? 0.4 : 1;
          p.wobble += p.wobbleSpeed;
          p.rotation += p.rotSpeed * sm;
          const wx = p.x + Math.sin(p.wobble) * p.wobbleAmp;

          ctx.save();
          ctx.globalAlpha = p.opacity * om * (0.55 + 0.45 * Math.sin(state.time * 0.01 + p.wobble));

          if (p.type === 'hex') {
            drawHexagon(wx, p.y, p.radius * (isFar ? 0.6 : 1), p.rotation);
            ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 0.8; ctx.stroke();
            // 内部冰晶纹
            ctx.beginPath();
            ctx.moveTo(wx - p.radius * 0.4, p.y); ctx.lineTo(wx + p.radius * 0.4, p.y);
            ctx.moveTo(wx, p.y - p.radius * 0.4); ctx.lineTo(wx, p.y + p.radius * 0.4);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 0.35; ctx.stroke();
          } else {
            ctx.beginPath(); ctx.arc(wx, p.y, p.radius * (isFar ? 0.6 : 1), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
            ctx.beginPath();
            ctx.arc(wx - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
          }
          ctx.restore();

          p.y += p.speed * sm;
          p.x += Math.sin(p.wobble * 0.5) * 0.3;

          // 地面堆积
          if (p.y > h - 3 && !isFar) {
            p.meltTimer++;
            if (p.meltTimer < 15) state.snowGround.push({ x: p.x, y: h - 2, r: p.radius, opacity: p.opacity * 0.5 });
          }

          if (p.y > h + 30) Object.assign(p, createSnowflake());
        });

        // 雪地堆积线
        state.snowGround = state.snowGround.filter(sg => {
          sg.opacity -= 0.00008;
          if (sg.opacity <= 0.05) return false;
          return true;
        });
        state.snowGround.forEach(sg => {
          ctx.save();
          ctx.globalAlpha = sg.opacity;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(sg.x, sg.y, sg.r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
        // 限制数量
        if (state.snowGround.length > 200) state.snowGround.splice(0, state.snowGround.length - 200);
      }

      /* ===== 雾天 ===== */
      if (type === 'fog') {
        state.particles.forEach(p => {
          const isFar = p.layer === 'far';
          const sm = isFar ? 0.4 : 1;
          const om = isFar ? 0.3 : 1;
          p.phase += 0.002;
          const driftY = Math.sin(p.phase) * 14;
          const driftX = Math.cos(p.phase * 0.5) * 9;
          ctx.save();
          ctx.globalAlpha = p.opacity * om * (0.35 + 0.65 * Math.sin(p.phase * 0.65));
          const cx = p.x + driftX + p.width / 2;
          const cy = p.y + driftY;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.width);
          grad.addColorStop(0, 'rgba(185,198,210,0.6)');
          grad.addColorStop(0.3, 'rgba(185,198,210,0.25)');
          grad.addColorStop(1, 'rgba(185,198,210,0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.ellipse(cx, cy, p.width, p.height, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          p.x += p.speed * sm;
          if (p.x > w + 600) Object.assign(p, createFogBlob());
        });
      }

      // 每 50 帧检查一次缓存更新
      if (state.time % 50 === 0) checkCacheUpdate();

      animRef.current = requestAnimationFrame(draw);
    };

    init();
    draw();

    window.addEventListener('resize', resize);
    // 监听城市变更，强制重新初始化天气效果
    const onCityChanged = () => {
      // 清除旧缓存检测状态，强制下一帧重新读取
      lastCacheTime = null;
      state.transitionAlpha = 0;
      // 延迟一帧让新缓存写入后再初始化
      setTimeout(() => {
        const newWeather = getWeatherCache()?.data;
        if (newWeather && newWeather.type !== type) {
          targetType = newWeather.type;
          initParticles(targetType);
        }
      }, 2000);
    };
    window.addEventListener('weatherCityChanged', onCityChanged);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('weatherCityChanged', onCityChanged);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
