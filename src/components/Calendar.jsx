import { useState, useEffect } from 'react'
import styles from './Calendar.module.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewDate, setViewDate] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000) // 每分钟更新
    return () => clearInterval(timer)
  }, [])

  // 获取月份天数
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // 获取月份第一天是星期几
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  // 生成日历数据
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    
    const days = []
    
    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, isCurrentMonth: false })
    }
    
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = 
        i === currentDate.getDate() && 
        month === currentDate.getMonth() && 
        year === currentDate.getFullYear()
      days.push({ day: i, isCurrentMonth: true, isToday })
    }
    
    return days
  }

  // 上个月
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  // 下个月
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  // 回到今天
  const goToToday = () => {
    setViewDate(new Date())
  }

  const days = generateCalendarDays()
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  return (
    <div className={styles.calendar}>
      {/* 头部 - 日期显示 */}
      <div className={styles.header}>
        <div className={styles.dateDisplay}>
          <span className={styles.weekday}>
            周{WEEKDAYS[currentDate.getDay()]}
          </span>
          <span className={styles.fullDate}>
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月{currentDate.getDate()}日
          </span>
        </div>
        <div className={styles.timeDisplay}>
          {currentDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* 月份导航 */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={prevMonth}>
          ‹
        </button>
        <span className={styles.monthTitle} onClick={goToToday}>
          {MONTHS[month]} {year}
        </span>
        <button className={styles.navBtn} onClick={nextMonth}>
          ›
        </button>
      </div>

      {/* 星期标题 */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map(day => (
          <span key={day} className={styles.weekdayLabel}>{day}</span>
        ))}
      </div>

      {/* 日期网格 */}
      <div className={styles.daysGrid}>
        {days.map((item, index) => (
          <div 
            key={index}
            className={`${styles.day} ${item.isCurrentMonth ? '' : styles.otherMonth} ${item.isToday ? styles.today : ''}`}
          >
            {item.day}
          </div>
        ))}
      </div>

      {/* 今天按钮 */}
      <button className={styles.todayBtn} onClick={goToToday}>
        今天
      </button>
    </div>
  )
}
