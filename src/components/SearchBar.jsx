import { Search, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import styles from './SearchBar.module.css'

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={styles.wrapper}>
      <form 
        onSubmit={handleSubmit}
        className={`${styles.searchBar} ${isFocused ? styles.focused : ''}`}
      >
        <Search size={18} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="搜索网站..."
          className={styles.input}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearBtn}
          >
            <X size={14} />
          </button>
        )}
        <div className={styles.shortcut}>
          <span>⌘</span>
          <span>K</span>
        </div>
      </form>
    </div>
  )
}
