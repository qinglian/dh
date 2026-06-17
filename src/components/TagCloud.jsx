import styles from './TagCloud.module.css'

const tags = [
  { name: '数字资产交易', color: '#ff6b6b' },
  { name: '微信商户平台', color: '#ff9f43' },
  { name: '一码通服务商', color: '#feca57' },
  { name: '24小时自助发卡', color: '#1dd1a1' },
  { name: '批充批采', color: '#ff6b6b' },
  { name: '加拿大看中国电视', color: '#ff9f43' },
  { name: '办公协作', color: '#54a0ff' },
  { name: '聚合码付', color: '#1dd1a1' },
  { name: '个人支付API', color: '#5f27cd' },
  { name: 'CareerBuilder', color: '#54a0ff' },
  { name: '衣柜字幕组', color: '#ff9ff3' },
  { name: 'MMD', color: '#ff6b6b' },
  { name: '卡牌交易', color: '#5f27cd' },
  { name: '员工派遣', color: '#ff6b6b' },
  { name: '奈飞', color: '#00d2d3' },
  { name: 'e签宝', color: '#feca57' },
  { name: '免费搭建发卡网', color: '#ff9f43' },
  { name: '女生游戏', color: '#ff9ff3' },
  { name: '游民驿站社区', color: '#ff9f43' },
  { name: '趣站', color: '#54a0ff' },
  { name: '靠谱店铺', color: '#1dd1a1' },
  { name: 'Newegg', color: '#5f27cd' },
  { name: '发霉啦', color: '#ff6b6b' },
  { name: 'Zlibrary', color: '#00d2d3' },
  { name: '电子签约', color: '#feca57' },
  { name: 'ebay收款', color: '#54a0ff' },
  { name: '图表', color: '#ff9f43' },
  { name: '微信收款', color: '#1dd1a1' },
]

export default function TagCloud() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.tagCloud}>
          {tags.map((tag, index) => (
            <a
              key={index}
              href="#"
              className={styles.tag}
              style={{
                backgroundColor: `${tag.color}15`,
                color: tag.color,
                borderColor: `${tag.color}30`,
              }}
            >
              {tag.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
