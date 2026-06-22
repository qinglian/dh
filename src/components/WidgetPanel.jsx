import { useState } from 'react'
import { X, Plus } from 'lucide-react'

/* 小部件定义（目前为空，预留扩展） */
const WIDGET_DEFS = [
  // 未来添加小部件定义，例如：
  // { type: 'weather', name: '天气', icon: '🌤️', sizes: ['1x1', '2x1', '2x2'] },
  // { type: 'clock', name: '时钟', icon: '🕐', sizes: ['1x1', '2x1'] },
  // { type: 'note', name: '便签', icon: '📝', sizes: ['1x1', '2x2'] },
]

/* 尺寸选项 */
const SIZE_OPTIONS = [
  { value: '1x1', label: '1×1', cols: 1, rows: 1 },
  { value: '2x1', label: '2×1', cols: 2, rows: 1 },
  { value: '1x2', label: '1×2', cols: 1, rows: 2 },
  { value: '2x2', label: '2×2', cols: 2, rows: 2 },
]

export default function WidgetPanel({ onClose, onAdd }) {
  const [selectedWidget, setSelectedWidget] = useState(null)
  const [selectedSize, setSelectedSize] = useState('1x1')

  const handleAdd = () => {
    if (!selectedWidget) return
    const sizeDef = SIZE_OPTIONS.find(s => s.value === selectedSize)
    onAdd({
      type: 'widget',
      widgetType: selectedWidget.type,
      name: selectedWidget.name,
      size: selectedSize,
      cols: sizeDef.cols,
      rows: sizeDef.rows,
    })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={onClose} />
      {/* 弹窗 */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--card-bg, rgba(255,255,255,0.95))',
        backdropFilter: 'blur(48px) saturate(180%)', WebkitBackdropFilter: 'blur(48px) saturate(180%)',
        borderRadius: 20, border: '1px solid var(--glass-border)',
        padding: 24, width: 380, maxHeight: '80vh',
        boxShadow: '0 40px 120px rgba(0,0,0,0.3), 0 2px 12px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* 标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>添加小部件</div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.04)', color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={16} /></button>
        </div>

        {/* 小部件列表 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {WIDGET_DEFS.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text-tertiary)', fontSize: 14, lineHeight: 1.6,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📦</div>
              <div>暂无可用小部件</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>更多小部件即将推出</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {WIDGET_DEFS.map(w => (
                <div
                  key={w.type}
                  onClick={() => { setSelectedWidget(w); setSelectedSize(w.sizes[0]) }}
                  style={{
                    padding: 16, borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                    border: selectedWidget?.type === w.type ? '2px solid var(--accent-primary)' : '1.5px solid var(--glass-border)',
                    background: selectedWidget?.type === w.type ? 'rgba(0,122,255,0.06)' : 'rgba(0,0,0,0.02)',
                    transition: 'all .15s ease',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{w.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 尺寸选择（选中 widget 后显示） */}
        {selectedWidget && selectedWidget.sizes.length > 1 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 600 }}>选择尺寸</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedWidget.sizes.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    background: selectedSize === s ? 'var(--accent-primary)' : 'rgba(0,0,0,0.04)',
                    color: selectedSize === s ? '#fff' : 'var(--text-secondary)',
                    transition: 'all .15s ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 添加按钮 */}
        <button
          onClick={handleAdd}
          disabled={!selectedWidget || WIDGET_DEFS.length === 0}
          style={{
            width: '100%', height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 600,
            background: selectedWidget ? 'var(--accent-primary)' : 'rgba(0,0,0,0.06)',
            color: selectedWidget ? '#fff' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all .15s ease',
          }}
        >
          <Plus size={16} />
          添加
        </button>
      </div>
    </div>
  )
}
