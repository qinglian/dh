import { useState, useEffect, useRef } from 'react'
import styles from './CategoryNav.module.css'

export default function CategoryNav({ categories }) {
  const [activeId, setActiveId] = useState(null)
  const navRef = useRef(null)

  // 滚动监听：高亮当前可见的分类
  useEffect(() => {
    if (!categories.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    )

    // 延迟一帧确保 DOM 已渲染
    const raf = requestAnimationFrame(() => {
      categories.forEach(cat => {
        const el = document.getElementById(`category-${cat.id}`)
        if (el) observer.observe(el)
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [categories])

  // 点击滚动到对应分类
  const scrollToCategory = (categoryId) => {
    const el = document.getElementById(`category-${categoryId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!categories.length) return null

  return (
    <nav className={styles.nav} ref={navRef}>
      <div className={styles.track}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.item} ${activeId === `category-${cat.id}` ? styles.itemActive : ''}`}
            onClick={() => scrollToCategory(cat.id)}
            title={cat.name}
          >
            <span className={styles.itemIcon}>{cat.name.charAt(0)}</span>
            <span className={styles.itemLabel}>{cat.name}</span>
            <span className={styles.itemCount}>{cat.sites.length}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
