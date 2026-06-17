import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './Pet.module.css'

// 宠物状态
const PET_STATES = {
  IDLE: 'idle',      // 待机
  HAPPY: 'happy',    // 开心
  EATING: 'eating',  // 吃东西
  SLEEPY: 'sleepy',  // 困了
  PLAYING: 'playing' // 玩耍
}

// 宠物对话
const PET_DIALOGUES = {
  idle: ['你好呀~', '我在这里等你', '今天天气不错', '摸摸我呀'],
  happy: ['好开心！', '最喜欢你了', '耶~', '太棒了'],
  eating: ['好吃~', ' yummy', '谢谢款待', '美味'],
  sleepy: ['好困...', '想睡觉', 'zzz', '休息一会儿'],
  playing: ['来玩吧', '抓不到我', '哈哈', '真有趣']
}

export default function Pet() {
  const [state, setState] = useState(PET_STATES.IDLE)
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isJumping, setIsJumping] = useState(false)
  const [blink, setBlink] = useState(false)
  const [direction, setDirection] = useState(1) // 1 右, -1 左
  const containerRef = useRef(null)
  const messageTimerRef = useRef(null)
  const moveTimerRef = useRef(null)

  // 显示随机对话
  const showRandomMessage = useCallback((customState) => {
    const currentState = customState || state
    const messages = PET_DIALOGUES[currentState]
    const randomMsg = messages[Math.floor(Math.random() * messages.length)]
    setMessage(randomMsg)
    setShowMessage(true)
    
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    messageTimerRef.current = setTimeout(() => {
      setShowMessage(false)
    }, 3000)
  }, [state])

  // 眨眼动画
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(blinkInterval)
  }, [])

  // 随机移动
  useEffect(() => {
    const moveInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        const newX = (Math.random() - 0.5) * 60
        const newY = (Math.random() - 0.5) * 40
        setDirection(newX > position.x ? 1 : -1)
        setPosition({ x: newX, y: newY })
      }
      
      // 随机说话
      if (Math.random() > 0.8) {
        showRandomMessage()
      }
    }, 4000)
    
    return () => clearInterval(moveInterval)
  }, [position.x, position.y, showRandomMessage])

  // 点击互动
  const handleClick = () => {
    setIsJumping(true)
    setState(PET_STATES.HAPPY)
    showRandomMessage(PET_STATES.HAPPY)
    
    setTimeout(() => {
      setIsJumping(false)
      setState(PET_STATES.IDLE)
    }, 1000)
  }

  // 喂食
  const handleFeed = (e) => {
    e.stopPropagation()
    setState(PET_STATES.EATING)
    showRandomMessage(PET_STATES.EATING)
    setTimeout(() => setState(PET_STATES.IDLE), 2000)
  }

  // 玩耍
  const handlePlay = (e) => {
    e.stopPropagation()
    setState(PET_STATES.PLAYING)
    showRandomMessage(PET_STATES.PLAYING)
    setPosition({ x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 60 })
    setTimeout(() => setState(PET_STATES.IDLE), 2000)
  }

  // 获取宠物表情
  const getPetFace = () => {
    switch (state) {
      case PET_STATES.HAPPY:
        return { eye: '^', mouth: '◡', cheek: '◠' }
      case PET_STATES.EATING:
        return { eye: '◕', mouth: 'ω', cheek: '' }
      case PET_STATES.SLEEPY:
        return { eye: '−', mouth: 'ω', cheek: '' }
      case PET_STATES.PLAYING:
        return { eye: '◕', mouth: '▽', cheek: '◠' }
      default:
        return { eye: blink ? '−' : '◕', mouth: '◡', cheek: '◠' }
    }
  }

  const face = getPetFace()

  return (
    <div className={styles.petContainer} ref={containerRef}>
      {/* 气泡消息 */}
      {showMessage && (
        <div className={styles.messageBubble}>
          {message}
          <div className={styles.bubbleTail} />
        </div>
      )}
      
      {/* 宠物主体 */}
      <div 
        className={`${styles.pet} ${isJumping ? styles.jumping : ''}`}
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scaleX(${direction})`,
        }}
        onClick={handleClick}
      >
        {/* 身体 */}
        <div className={styles.body}>
          {/* 耳朵 */}
          <div className={`${styles.ear} ${styles.earLeft}`} />
          <div className={`${styles.ear} ${styles.earRight}`} />
          
          {/* 脸部 */}
          <div className={styles.face}>
            {/* 眼睛 */}
            <div className={styles.eyes}>
              <span className={styles.eye}>{face.eye}</span>
              <span className={styles.eye}>{face.eye}</span>
            </div>
            
            {/* 腮红 */}
            {face.cheek && (
              <div className={styles.cheeks}>
                <span className={styles.cheek}>{face.cheek}</span>
                <span className={styles.cheek}>{face.cheek}</span>
              </div>
            )}
            
            {/* 嘴巴 */}
            <div className={styles.mouth}>{face.mouth}</div>
          </div>
          
          {/* 小手 */}
          <div className={`${styles.hand} ${styles.handLeft}`} />
          <div className={`${styles.hand} ${styles.handRight}`} />
          
          {/* 脚 */}
          <div className={`${styles.foot} ${styles.footLeft}`} />
          <div className={`${styles.foot} ${styles.footRight}`} />
        </div>
        
        {/* 阴影 */}
        <div className={styles.shadow} />
      </div>
      
      {/* 互动按钮 */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={handleFeed} title="喂食">
          🍬
        </button>
        <button className={styles.actionBtn} onClick={handlePlay} title="玩耍">
          🎾
        </button>
      </div>
    </div>
  )
}
