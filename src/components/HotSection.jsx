import { Flame } from 'lucide-react'
import styles from './HotSection.module.css'

const hotSites = [
  { id: 1, name: 'AI女友💋', desc: '在线畅玩', color: '#ff6b6b' },
  { id: 2, name: '豆包', desc: 'AI助手', color: '#4ecdc4' },
  { id: 3, name: 'TRAE', desc: 'AI编程', color: '#45b7d1' },
  { id: 4, name: '扣子空间', desc: 'AI平台', color: '#96ceb4' },
  { id: 5, name: '即梦', desc: 'AI绘画', color: '#feca57' },
  { id: 6, name: '剪映', desc: '视频剪辑', color: '#ff9ff3' },
]

export default function HotSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>
            <Flame size={18} className={styles.icon} />
            <span>热门</span>
          </div>
          <button className={styles.joinBtn}>
            <span>📢</span>
            <span>立即入驻</span>
          </button>
        </div>
        
        <div className={styles.scrollContainer}>
          {hotSites.map((site) => (
            <a 
              key={site.id} 
              href="#" 
              className={styles.hotCard}
              style={{ '--card-color': site.color }}
            >
              <div className={styles.cardIcon} style={{ background: site.color }}>
                {site.name.charAt(0)}
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{site.name}</span>
                <span className={styles.cardDesc}>{site.desc}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
