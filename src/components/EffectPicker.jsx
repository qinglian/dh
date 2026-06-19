import { useEffect } from 'react';
import { Sparkles, Star, Waves, Snowflake, Circle, Bug, Zap, Mountain, Hexagon, RotateCw, Flame, CloudRain, Atom, CloudSun, Check, Lasso, Gauge, Grid3x3, Grid } from 'lucide-react';
import styles from './EffectPicker.module.css';

const effects = [
  { id: 'particles',  name: '粒子',   icon: Sparkles,  group: '2D' },
  { id: 'stars',      name: '星空',   icon: Star,      group: '2D' },
  { id: 'waves',      name: '波浪',   icon: Waves,     group: '2D' },
  { id: 'snow',       name: '雪花',   icon: Snowflake, group: '2D' },
  { id: 'bubbles',    name: '气泡',   icon: Circle,    group: '2D' },
  { id: 'fireflies',  name: '萤火虫',  icon: Bug,       group: '2D' },
  { id: 'meteors',    name: '流星',   icon: Zap,       group: '2D' },
  { id: 'aurora',     name: '极光',   icon: Mountain,  group: '2D' },
  { id: 'geometric',  name: '几何',   icon: Grid,      group: '2D' },
  { id: 'konami',     name: '光轨',   icon: Lasso,     group: '2D' },
  { id: 'gradientmesh',name: '渐变流', icon: Gauge,     group: '2D' },
  { id: 'neongrid',   name: '霓虹网格',icon: Grid3x3,   group: '2D' },
  { id: 'lightweb',   name: '光网',   icon: Hexagon,   group: '3D' },
  { id: 'vortex',     name: '漩涡',   icon: RotateCw,  group: '3D' },
  { id: 'firewave',   name: '焰浪',   icon: Flame,     group: '3D' },
  { id: 'rain',       name: '矩阵雨',  icon: CloudRain, group: '3D' },
  { id: 'dna',        name: 'DNA',    icon: Atom,      group: '3D' },
];
const weatherEffect = { id: 'weather', name: '实时天气', icon: CloudSun, group: '天气' };

export default function EffectPicker({ currentEffects, enabled, multiMode, onToggle, onToggleMulti, onToggleEffect, onCancel, onConfirm }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const groups = [
    { name: '2D 效果', items: effects.filter(e => e.group === '2D') },
    { name: '3D 效果', items: effects.filter(e => e.group === '3D') },
    { name: '天气效果', items: [weatherEffect] },
  ];
  const isActive = (id) => currentEffects.includes(id);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.picker} onClick={e => e.stopPropagation()}>

        {/* 固定顶部 */}
        <div className={styles.fixedTop}>
          <div className={styles.header}>
            <h3>动效背景</h3>
            <button className={`${styles.closeBtn} ${styles.pressable}`} onClick={onCancel}><span>×</span></button>
          </div>
          <div className={styles.controls}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>启用动效</span>
              <button className={`${styles.toggle} ${enabled ? styles.on : ''}`} onClick={onToggle}>
                <span className={styles.toggleDot} />
              </button>
            </div>
            {enabled && (
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>多效果叠加</span>
                <button className={`${styles.toggle} ${multiMode ? styles.on : ''}`} onClick={onToggleMulti}>
                  <span className={styles.toggleDot} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 滚动效果列表 */}
        <div className={styles.scrollBody}>
          {enabled && groups.map(group => (
            <div key={group.name} className={styles.group}>
              <div className={styles.groupTitle}>{group.name}</div>
              <div className={styles.effects}>
                {group.items.map(effect => {
                  const Icon = effect.icon;
                  const active = isActive(effect.id);
                  return (
                    <button key={effect.id}
                      className={`${styles.effect} ${active ? styles.active : ''}`}
                      onClick={() => onToggleEffect(effect.id)}>
                      <Icon size={22} />
                      <span>{effect.name}</span>
                      {active && <Check size={14} className={styles.checkIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部确认/取消 */}
        <div className={styles.footer}>
          <button className={`${styles.footerBtn} ${styles.cancelBtn} ${styles.pressable}`} onClick={onCancel}>取消</button>
          <button className={`${styles.footerBtn} ${styles.confirmBtn} ${styles.pressable}`} onClick={onConfirm}>确认</button>
        </div>

      </div>
    </div>
  );
}
