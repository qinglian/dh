import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './PetSystem.module.css'

// ==================== 宠物定义 ====================
const PET_DEFS = {
  cat: {
    name: '小猫咪',
    icon: '🐱',
    color: '#FFB347',
    colorDark: '#E8941A',
    bodyParts: {
      body: '🐱',
      sleep: '😴',
      happy: '😺',
      sad: '😿',
      love: '😻',
      angry: '🙀',
      eat: '😼',
      play: '😸',
      drag: '😿',
      run: '🐈',
      wave: '🐱',
    },
    personality: { energy: 0.6, affection: 0.8, mischief: 0.7, lazy: 0.5 },
    dialogues: {
      idle: ['喵~', '摸摸我嘛', '好无聊呀...', '有鱼吃吗？', '喵呜~', '蹭蹭你'],
      happy: ['喵喵喵！', '好开心！', '呼噜呼噜~', '最喜欢你了喵！', '尾巴摇摇~'],
      hungry: ['饿了喵...', '想吃小鱼干', '肚子咕咕叫', '给点吃的嘛~'],
      sleepy: ['好困喵...', '想睡觉了', '打个盹儿...', 'zzZ...喵'],
      playful: ['来追我呀！', '抓不到我喵~', '嘻嘻嘻', '好玩好玩！'],
      dragged: ['放开我喵！', '不要拽我！', '呜呜...挣扎', '我要跑了！', '别闹了喵~'],
      love: ['蹭蹭~', '最喜欢主人了', '呼噜呼噜', '喵~爱你'],
      greet: ['喵！你回来啦！', '等你好久了喵~', '终于来陪我啦'],
    },
    interactWith: {
      dog: ['别过来喵！', '哼，狗狗', '走开走开'],
      bird: ['想吃鸟...忍住', '那个...看起来好吃', '别飞走呀！'],
      mouse: ['哼，小老鼠', '别跑！', '抓到了喵！'],
      cat: ['一起玩吧~', '喵喵~', '你也是猫猫呀'],
    }
  },
  dog: {
    name: '小狗狗',
    icon: '🐶',
    color: '#C4A882',
    colorDark: '#A0845C',
    bodyParts: {
      body: '🐶', sleep: '😴', happy: '😃', sad: '🐶', love: '🥰',
      angry: '😤', eat: '😋', play: '🐕', drag: '🥺', run: '🐕‍🦺', wave: '🐶',
    },
    personality: { energy: 0.9, affection: 1.0, mischief: 0.4, lazy: 0.2 },
    dialogues: {
      idle: ['汪汪！', '陪我玩嘛', '要散步吗？', '主人主人！', '好无聊...'],
      happy: ['汪汪汪！', '太棒了！', '摇尾巴~', '开心开心！', '耶耶耶！'],
      hungry: ['想吃骨头', '饿了汪...', '有肉肉吗？', '汪...好饿'],
      sleepy: ['趴一会...', '好困汪', 'zzZ...', '眯一会儿'],
      playful: ['接住我！', '来玩飞盘！', '汪汪追你！', '跑起来！'],
      dragged: ['呜呜汪...', '不要拽我', '我乖我乖！', '放开嘛~', '好晕汪...'],
      love: ['舔舔你~', '最爱主人！', '蹭蹭主人', '汪！爱你！'],
      greet: ['汪汪！主人回来啦！', '好想你呀！', '终于回来了！'],
    },
    interactWith: {
      cat: ['猫咪朋友！', '一起玩嘛~', '别挠我汪！', '嘿嘿嘿'],
      bird: ['那个能吃吗？', '飞好高！', '追追追！'],
      mouse: ['什么味道？', '小老鼠！', '汪汪！发现了！'],
      dog: ['兄弟！', '一起跑！', '汪汪！'],
    }
  },
  mouse: {
    name: '小老鼠',
    icon: '🐭',
    color: '#D4C4B0',
    colorDark: '#B0A090',
    bodyParts: {
      body: '🐭', sleep: '😴', happy: '🐹', sad: '🐭', love: '🥺',
      angry: '🐭', eat: '😋', play: '🐹', drag: '😱', run: '🐭', wave: '🐭',
    },
    personality: { energy: 0.7, affection: 0.5, mischief: 0.9, lazy: 0.3 },
    dialogues: {
      idle: ['吱吱~', '找吃的', '东看看西看看', '有奶酪吗？', '小心翼翼...'],
      happy: ['吱吱吱！', '找到吃的了！', '好开心~', '吱！吱！'],
      hungry: ['好饿吱...', '想吃奶酪', '肚子好空', '吱...食物'],
      sleepy: ['困了吱...', '找个洞睡觉', '缩成一团', 'zzZ...吱'],
      playful: ['跑跑跑！', '追尾巴！', '吱吱好玩', '转圈圈~'],
      dragged: ['吱！！', '放开我！', '救命吱！', '好害怕！', '别抓我！'],
      love: ['蹭蹭~', '吱吱喜欢你', '温暖...', '信任你吱'],
      greet: ['吱？你好！', '有吃的吗？', '小心翼翼靠近'],
    },
    interactWith: {
      cat: ['啊啊猫！快跑！', '别吃我！', '吱吱吱！救命！'],
      dog: ['狗来了！', '快跑吱！', '好可怕汪'],
      bird: ['你好呀~', '一起玩？', '吱吱'],
      mouse: ['朋友吱！', '一起找吃的', '吱吱~'],
    }
  },
  bird: {
    name: '小鸟',
    icon: '🐦',
    color: '#87CEEB',
    colorDark: '#5BA3C9',
    bodyParts: {
      body: '🐦', sleep: '😴', happy: '🐤', sad: '🐦', love: '💗',
      angry: '🐦', eat: '😋', play: '🕊️', drag: '😱', run: '🕊️', wave: '🐦',
    },
    personality: { energy: 0.8, affection: 0.6, mischief: 0.8, lazy: 0.1 },
    dialogues: {
      idle: ['啾啾~', '梳理羽毛', '左看右看', '想唱歌~', '扑棱扑棱'],
      happy: ['啾啾啾！', '唱首歌！', '飞起来啦！', '好开心~'],
      hungry: ['想吃虫虫', '啾...饿了', '有种子吗？', '找吃的啾'],
      sleepy: ['缩进翅膀', '困了啾...', '站在一只脚上', 'zzZ...啾'],
      playful: ['飞飞飞！', '啾啾追你！', '扑棱扑棱！', '空中转圈！'],
      dragged: ['啾！！', '放开我！', '羽毛掉了！', '我要飞走！', '别抓翅膀！'],
      love: ['蹭蹭你~', '啾啾爱你', '给你唱歌~', '啾~'],
      greet: ['啾！你好！', '飞过来啦~', '欢迎欢迎！'],
    },
    interactWith: {
      cat: ['别看我！', '小心猫！', '啾啾快跑！'],
      dog: ['大狗好可怕', '飞高一点', '啾啾~'],
      mouse: ['小老鼠~', '你好呀啾', '一起玩？'],
      bird: ['一起唱歌！', '啾啾啾~', '比比谁飞得高'],
    }
  }
}

// ==================== AI 行为引擎 ====================
class PetAI {
  constructor(petId, personality) {
    this.petId = petId
    this.personality = personality
    this.state = 'idle'
    this.mood = 50 // 0-100
    this.energy = 80
    this.hunger = 30
    this.boredom = 20
    this.lastAction = Date.now()
    this.lastInteraction = Date.now()
    this.stateTimer = null
    this.isDragging = false
    this.isChasingMouse = false
    this.targetPos = null
    this.velocity = { x: 0, y: 0 }
    this.facing = 1
    this.jumpVelocity = 0
    this.isJumping = false
    this.expression = 'body'
    this.expressionTimer = null
    this.bubbleMessage = ''
    this.bubbleTimer = null
    this.wanderAngle = Math.random() * Math.PI * 2
    this.idleTime = 0
    this.patience = 0
    this.isExcited = false
    this.exciteTimer = null
  }

  update(dt, mousePos, allPets, containerBounds) {
    const now = Date.now()
    const timeSinceAction = now - this.lastAction
    const timeSinceInteraction = now - this.lastInteraction

    // 更新属性
    this.hunger = Math.min(100, this.hunger + dt * 0.3)
    this.energy = Math.max(0, this.energy - dt * 0.1)
    this.boredom = Math.min(100, this.boredom + dt * 0.2)

    if (this.isDragging) return this

    // 决策树
    if (this.isChasingMouse && mousePos) {
      this.state = 'chasing'
      this.expression = 'run'
      this.chaseMouse(mousePos, dt)
    } else if (timeSinceInteraction > 15000 && Math.random() < 0.002) {
      // 长时间没互动，主动找鼠标
      this.isChasingMouse = true
      this.state = 'chasing'
      this.expression = 'play'
      this.showBubble(PET_DEFS[this.petId].dialogues.playful)
    } else if (this.hunger > 70 && Math.random() < 0.01) {
      this.state = 'hungry'
      this.expression = 'eat'
      this.showBubble(PET_DEFS[this.petId].dialogues.hungry)
    } else if (this.energy < 20 && Math.random() < 0.01) {
      this.state = 'sleepy'
      this.expression = 'sleep'
    } else if (this.boredom > 60 && Math.random() < 0.02) {
      this.state = 'playful'
      this.expression = 'play'
      this.showBubble(PET_DEFS[this.petId].dialogues.playful)
      this.boredom = 0
    } else if (this.state === 'sleepy' && this.energy > 50) {
      this.state = 'idle'
      this.expression = 'body'
    } else if (this.state === 'hungry' && this.hunger < 40) {
      this.state = 'idle'
      this.expression = 'body'
    } else if (this.state === 'playful' && Math.random() < 0.01) {
      this.state = 'idle'
      this.expression = 'body'
    } else if (this.state === 'chasing' && (!mousePos || Math.random() < 0.005)) {
      this.isChasingMouse = false
      this.state = 'idle'
      this.expression = 'body'
      this.velocity = { x: 0, y: 0 }
    } else if (this.state === 'idle') {
      this.idleBehavior(dt, allPets, containerBounds)
    }

    // 随机说话
    if (Math.random() < 0.001 && !this.bubbleMessage) {
      const def = PET_DEFS[this.petId]
      const msgs = def.dialogues[this.state] || def.dialogues.idle
      this.showBubble(msgs[Math.floor(Math.random() * msgs.length)])
    }

    // 宠物间互动
    this.checkPetInteraction(allPets)

    return this
  }

  idleBehavior(dt, allPets, bounds) {
    this.idleTime += dt

    // 随机漫游
    if (Math.random() < 0.005) {
      this.wanderAngle += (Math.random() - 0.5) * 1.5
    }

    const speed = 0.3 * this.personality.energy
    this.velocity.x += Math.cos(this.wanderAngle) * speed * dt * 0.01
    this.velocity.y += Math.sin(this.wanderAngle) * speed * dt * 0.01

    // 阻尼
    this.velocity.x *= 0.98
    this.velocity.y *= 0.98

    // 边界反弹
    if (bounds) {
      if (this.x < bounds.left + 40) { this.velocity.x += 0.5; this.wanderAngle = 0 }
      if (this.x > bounds.right - 40) { this.velocity.x -= 0.5; this.wanderAngle = Math.PI }
      if (this.y < bounds.top + 40) { this.velocity.y += 0.5; this.wanderAngle = Math.PI / 2 }
      if (this.y > bounds.bottom - 40) { this.velocity.y -= 0.5; this.wanderAngle = -Math.PI / 2 }
    }

    // 面朝方向
    if (Math.abs(this.velocity.x) > 0.1) {
      this.facing = this.velocity.x > 0 ? 1 : -1
    }
  }

  chaseMouse(mousePos, dt) {
    if (!this.targetPos) this.targetPos = { x: 0, y: 0 }

    const dx = mousePos.x - this.targetPos.x
    const dy = mousePos.y - this.targetPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 5) {
      const speed = 2.5 * this.personality.energy
      this.velocity.x = (dx / dist) * speed
      this.velocity.y = (dy / dist) * speed
      this.facing = dx > 0 ? 1 : -1
    } else {
      // 到达鼠标位置
      this.velocity.x *= 0.9
      this.velocity.y *= 0.9
      this.patience++

      if (this.patience > 60) {
        this.isChasingMouse = false
        this.state = 'idle'
        this.expression = 'body'
        this.patience = 0
      }
    }
  }

  checkPetInteraction(allPets) {
    if (!allPets || allPets.length < 2) return

    allPets.forEach(otherPet => {
      if (otherPet.petId === this.petId) return

      const dx = (otherPet.x || 0) - (this.x || 0)
      const dy = (otherPet.y || 0) - (this.y || 0)
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 80 && Math.random() < 0.003) {
        const def = PET_DEFS[this.petId]
        const msgs = def.interactWith[otherPet.petId]
        if (msgs) {
          this.showBubble(msgs[Math.floor(Math.random() * msgs.length)])
          this.state = 'playful'
          this.expression = 'happy'
          this.isExcited = true
          clearTimeout(this.exciteTimer)
          this.exciteTimer = setTimeout(() => {
            this.isExcited = false
            this.state = 'idle'
            this.expression = 'body'
          }, 3000)
        }
      }

      // 猫追老鼠
      if (this.petId === 'cat' && otherPet.petId === 'mouse' && dist < 120 && Math.random() < 0.01) {
        this.isChasingMouse = false
        this.velocity.x = dx * 0.05
        this.velocity.y = dy * 0.05
        this.expression = 'play'
        this.showBubble('抓到你了喵！')
      }

      // 老鼠看到猫逃跑
      if (this.petId === 'mouse' && otherPet.petId === 'cat' && dist < 150) {
        this.velocity.x = -dx * 0.08
        this.velocity.y = -dy * 0.08
        this.expression = 'drag'
        this.showBubble('啊啊猫！快跑！')
        this.facing = dx > 0 ? -1 : 1
      }

      // 狗追猫
      if (this.petId === 'dog' && otherPet.petId === 'cat' && dist < 100 && Math.random() < 0.005) {
        this.velocity.x = dx * 0.03
        this.velocity.y = dy * 0.03
        this.expression = 'play'
        this.showBubble('猫咪别跑！一起玩！')
      }
    })
  }

  onDragStart() {
    this.isDragging = true
    this.state = 'dragged'
    this.expression = 'drag'
    this.velocity = { x: 0, y: 0 }
    this.isChasingMouse = false
    const msgs = PET_DEFS[this.petId].dialogues.dragged
    this.showBubble(msgs[Math.floor(Math.random() * msgs.length)])
  }

  onDragEnd() {
    this.isDragging = false
    this.state = 'idle'
    this.expression = 'body'
    this.lastInteraction = Date.now()
    this.boredom = Math.max(0, this.boredom - 20)
    this.mood = Math.min(100, this.mood + 10)
  }

  onClick() {
    this.lastInteraction = Date.now()
    this.mood = Math.min(100, this.mood + 15)
    this.boredom = Math.max(0, this.boredom - 30)
    this.energy = Math.max(0, this.energy - 5)

    const rand = Math.random()
    if (rand < 0.3) {
      this.state = 'happy'
      this.expression = 'happy'
      this.showBubble(PET_DEFS[this.petId].dialogues.happy)
    } else if (rand < 0.5) {
      this.state = 'love'
      this.expression = 'love'
      this.showBubble(PET_DEFS[this.petId].dialogues.love)
    } else {
      this.state = 'playful'
      this.expression = 'play'
      this.isJumping = true
      this.jumpVelocity = -8
      this.showBubble(PET_DEFS[this.petId].dialogues.playful)
      setTimeout(() => { this.isJumping = false }, 500)
    }

    clearTimeout(this.stateTimer)
    this.stateTimer = setTimeout(() => {
      this.state = 'idle'
      this.expression = 'body'
    }, 2000)
  }

  onFeed() {
    this.hunger = Math.max(0, this.hunger - 40)
    this.mood = Math.min(100, this.mood + 20)
    this.energy = Math.min(100, this.energy + 10)
    this.state = 'happy'
    this.expression = 'eat'
    this.showBubble('好吃！谢谢~')
    clearTimeout(this.stateTimer)
    this.stateTimer = setTimeout(() => {
      this.state = 'idle'
      this.expression = 'body'
    }, 2000)
  }

  showBubble(msg) {
    this.bubbleMessage = msg
    clearTimeout(this.bubbleTimer)
    this.bubbleTimer = setTimeout(() => {
      this.bubbleMessage = ''
    }, 3000)
  }
}

// ==================== 单个宠物组件 ====================
function PetCreature({ petId, ai, containerRef, allPets, onRemove }) {
  const petRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const animFrame = useRef(null)
  const [pos, setPos] = useState({ x: 80 + Math.random() * 100, y: 200 + Math.random() * 200 })
  const [renderKey, setRenderKey] = useState(0)

  const def = PET_DEFS[petId]

  // 初始化AI位置
  useEffect(() => {
    ai.x = pos.x
    ai.y = pos.y
  }, [])

  // 主循环
  useEffect(() => {
    let lastTime = Date.now()

    const loop = () => {
      const now = Date.now()
      const dt = Math.min((now - lastTime) / 16, 3) // 归一化到60fps
      lastTime = now

      const container = containerRef.current
      const bounds = container ? container.getBoundingClientRect() : null

      // 更新AI
      const mousePos = window._petMousePos || null
      ai.update(dt, mousePos, allPets, bounds)

      if (!ai.isDragging) {
        ai.x = (ai.x || pos.x) + ai.velocity.x * dt
        ai.y = (ai.y || pos.y) + ai.velocity.y * dt

        // 跳跃物理
        if (ai.isJumping) {
          ai.jumpVelocity += 0.5
          ai.y += ai.jumpVelocity * dt * 0.3
          if (ai.jumpVelocity > 0 && ai.y > pos.y) {
            ai.isJumping = false
            ai.jumpVelocity = 0
            ai.y = pos.y
          }
        }

        // 限制在容器内
        if (bounds) {
          ai.x = Math.max(30, Math.min(bounds.width - 60, ai.x))
          ai.y = Math.max(30, Math.min(bounds.height - 60, ai.y))
        }

        setPos({ x: ai.x, y: ai.y })
      }

      // 强制刷新表情
      setRenderKey(k => k + 1)

      animFrame.current = requestAnimationFrame(loop)
    }

    animFrame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrame.current)
  }, [ai, containerRef])

  // 拖拽事件
  const handleMouseDown = (e) => {
    e.preventDefault()
    isDragging.current = true
    const rect = petRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    ai.onDragStart()

    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      const container = containerRef.current
      if (!container) return
      const cRect = container.getBoundingClientRect()
      const newX = e.clientX - cRect.left - dragOffset.current.x
      const newY = e.clientY - cRect.top - dragOffset.current.y
      ai.x = Math.max(10, Math.min(cRect.width - 60, newX))
      ai.y = Math.max(10, Math.min(cRect.height - 60, newY))
      setPos({ x: ai.x, y: ai.y })
    }

    const handleMouseUp = () => {
      isDragging.current = false
      ai.onDragEnd()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleClick = (e) => {
    if (isDragging.current) return
    ai.onClick()
  }

  const getEmoji = () => {
    return def.bodyParts[ai.expression] || def.bodyParts.body
  }

  const getStateClass = () => {
    const classes = []
    if (ai.isDragging) classes.push(styles.dragging)
    if (ai.isJumping) classes.push(styles.jumping)
    if (ai.isExcited) classes.push(styles.excited)
    if (ai.state === 'sleepy') classes.push(styles.sleeping)
    if (ai.state === 'chasing') classes.push(styles.chasing)
    if (ai.state === 'playful') classes.push(styles.playful)
    return classes.join(' ')
  }

  return (
    <div
      ref={petRef}
      className={`${styles.petCreature} ${getStateClass()}`}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `scaleX(${ai.facing})`,
        '--pet-color': def.color,
        '--pet-color-dark': def.colorDark,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* 气泡 */}
      {ai.bubbleMessage && (
        <div className={styles.bubble}>
          <span>{ai.bubbleMessage}</span>
          <div className={styles.bubbleTail} />
        </div>
      )}

      {/* 3D毛绒身体 */}
      <div className={styles.plushBody}>
        <div className={styles.plushInner}>
          <span className={styles.petEmoji}>{getEmoji()}</span>
        </div>
        {/* 毛绒纹理 */}
        <div className={styles.furOverlay} />
        {/* 光泽 */}
        <div className={styles.sheen} />
      </div>

      {/* 阴影 */}
      <div className={styles.petShadow} />

      {/* 状态指示器 */}
      <div className={styles.statusBar}>
        {ai.hunger > 60 && <span className={styles.statusIcon} title="饿了">🍖</span>}
        {ai.energy < 25 && <span className={styles.statusIcon} title="困了">💤</span>}
        {ai.boredom > 50 && <span className={styles.statusIcon} title="无聊">❓</span>}
      </div>

      {/* 名字 */}
      <div className={styles.petName}>{def.name}</div>

      {/* 关闭按钮 */}
      <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onRemove(petId) }}>×</button>
    </div>
  )
}

// ==================== 宠物选择面板 ====================
function PetPicker({ activePets, onToggle, onClose }) {
  return (
    <div className={styles.pickerPanel}>
      <div className={styles.pickerHeader}>
        <span>🐾 选择萌宠</span>
        <button className={styles.pickerClose} onClick={onClose}>×</button>
      </div>
      <div className={styles.pickerGrid}>
        {Object.entries(PET_DEFS).map(([id, def]) => {
          const isActive = activePets.includes(id)
          return (
            <button
              key={id}
              className={`${styles.pickerCard} ${isActive ? styles.pickerActive : ''}`}
              onClick={() => onToggle(id)}
            >
              <span className={styles.pickerEmoji}>{def.icon}</span>
              <span className={styles.pickerName}>{def.name}</span>
              <span className={styles.pickerCheck}>{isActive ? '✓' : '+'}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.pickerTip}>点击添加/移除宠物，可同时开启多个</div>
    </div>
  )
}

// ==================== 主系统组件 ====================
export default function PetSystem() {
  const [activePets, setActivePets] = useState([])
  const [showPicker, setShowPicker] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const containerRef = useRef(null)
  const aiRefs = useRef({})
  const mousePosRef = useRef({ x: 0, y: 0 })

  // 全局鼠标跟踪
  useEffect(() => {
    const handleMouseMove = (e) => {
      window._petMousePos = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // 管理AI实例
  const togglePet = useCallback((petId) => {
    setActivePets(prev => {
      const next = prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
      // 清理移除的AI
      if (!next.includes(petId) && aiRefs.current[petId]) {
        delete aiRefs.current[petId]
      }
      // 创建新的AI
      if (next.includes(petId) && !aiRefs.current[petId]) {
        const def = PET_DEFS[petId]
        aiRefs.current[petId] = new PetAI(petId, def.personality)
      }
      return next
    })
  }, [])

  const removePet = useCallback((petId) => {
    setActivePets(prev => prev.filter(id => id !== petId))
    delete aiRefs.current[petId]
  }, [])

  // 获取所有AI实例
  const getAllAIs = useCallback(() => {
    return Object.values(aiRefs.current)
  }, [])

  return (
    <div className={styles.systemContainer} ref={containerRef}>
      {/* 宠物活动区域 */}
      <div className={styles.petArea}>
        {activePets.map(petId => {
          if (!aiRefs.current[petId]) {
            const def = PET_DEFS[petId]
            aiRefs.current[petId] = new PetAI(petId, def.personality)
          }
          return (
            <PetCreature
              key={petId}
              petId={petId}
              ai={aiRefs.current[petId]}
              containerRef={containerRef}
              allPets={getAllAIs().map(a => ({ petId: a.petId, x: a.x, y: a.y }))}
              onRemove={removePet}
            />
          )
        })}
      </div>

      {/* 控制按钮 */}
      <div className={styles.controlBar}>
        <button
          className={styles.toggleBtn}
          onClick={() => setShowPanel(!showPanel)}
          title={showPanel ? '隐藏面板' : '显示面板'}
        >
          🐾
        </button>

        {showPanel && (
          <div className={styles.panelContent}>
            <button
              className={styles.mainBtn}
              onClick={() => setShowPicker(!showPicker)}
            >
              {showPicker ? '✕ 关闭' : '🐾 萌宠'}
            </button>

            {activePets.length > 0 && (
              <div className={styles.activeList}>
                {activePets.map(id => (
                  <span key={id} className={styles.activeTag}>
                    {PET_DEFS[id].icon} {PET_DEFS[id].name}
                    <button className={styles.tagClose} onClick={() => removePet(id)}>×</button>
                  </span>
                ))}
              </div>
            )}

            {showPicker && (
              <PetPicker
                activePets={activePets}
                onToggle={togglePet}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
