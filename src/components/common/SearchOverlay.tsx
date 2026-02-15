import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { PiMagnifyingGlass, PiX } from 'react-icons/pi'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/SearchOverlay.module.css'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  videoId: string
  title: string
  author: string
}

const IS_PRODUCTION = import.meta.env.PROD

const PIPED_PROXIES = IS_PRODUCTION
  ? ['/api/piped']
  : ['/api/piped1', '/api/piped2', '/api/piped3', '/api/piped4']

const WORKING_INSTANCE_KEY = 'keplear_working_piped_instance'

const PAGES = [
  {
    path: '/generator',
    labelKey: 'nav.generator',
    keywords: [
      'keyboard',
      'guitar',
      'bass',
      'piano',
      'scales',
      'chords',
      'melody',
      'practice',
      'instrument',
      'bpm',
      'tempo',
      'tuning',
      'fretboard',
      'octave',
      'arpeggiator',
      'progression',
      'ear training',
      'notes',
      'intervals',
    ],
  },
  {
    path: '/songs',
    labelKey: 'nav.songs',
    keywords: [
      'youtube',
      'video',
      'music',
      'play',
      'search',
      'song',
      'playback',
      'speed',
      'loop',
      'a-b repeat',
      'practice',
    ],
  },
  {
    path: '/instruments',
    labelKey: 'nav.instrument',
    keywords: ['keyboard', 'guitar', 'bass', 'piano', 'virtual', 'fretboard', 'keys', 'strings'],
  },
  {
    path: '/isolater',
    labelKey: 'nav.stems',
    keywords: [
      'separate',
      'audio',
      'isolate',
      'vocals',
      'drums',
      'bass',
      'mix',
      'tracks',
      'stem separation',
    ],
  },
  {
    path: '/classroom',
    labelKey: 'nav.classroom',
    keywords: [
      'class',
      'lesson',
      'assignment',
      'teacher',
      'student',
      'learn',
      'course',
      'education',
      'join',
      'create',
    ],
  },
  {
    path: '/metronome',
    labelKey: 'nav.metronome',
    keywords: ['tempo', 'beat', 'time', 'rhythm', 'bpm', 'click', 'time signature', 'tap'],
  },
  {
    path: '/tuner',
    labelKey: 'nav.tuner',
    keywords: [
      'tune',
      'pitch',
      'note',
      'frequency',
      'microphone',
      'cents',
      'intonation',
      'chromatic',
    ],
  },
  {
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    keywords: ['stats', 'progress', 'activity', 'assignments', 'classes', 'profile', 'overview'],
  },
]

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [songResults, setSongResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter pages client-side — match label or keywords
  const pageResults = query.trim()
    ? PAGES.filter(p => {
        const q = query.toLowerCase()
        return t(p.labelKey).toLowerCase().includes(q) || p.keywords.some(k => k.includes(q))
      })
    : []

  const totalResults = pageResults.length + songResults.length

  // Search songs via Piped API
  const searchSongs = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSongResults([])
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsSearching(true)

    const cachedProxy = sessionStorage.getItem(WORKING_INSTANCE_KEY)
    const proxies = cachedProxy
      ? [cachedProxy, ...PIPED_PROXIES.filter(p => p !== cachedProxy)]
      : PIPED_PROXIES

    for (const proxy of proxies) {
      if (controller.signal.aborted) return

      try {
        const url = IS_PRODUCTION
          ? `${proxy}?q=${encodeURIComponent(q)}&filter=videos`
          : `${proxy}/search?q=${encodeURIComponent(q)}&filter=videos`

        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timeoutId)

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON')
        }

        const data = await response.json()
        const items = data.items || data
        const results: SearchResult[] = items
          .filter((item: { url?: string }) => item.url && item.url.includes('/watch?v='))
          .slice(0, 10)
          .map((item: { url: string; title: string; uploaderName: string }) => {
            const match = item.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
            return {
              videoId: match ? match[1] : '',
              title: item.title || 'Unknown',
              author: item.uploaderName || 'Unknown',
            }
          })
          .filter((item: SearchResult) => item.videoId)

        setSongResults(results)
        sessionStorage.setItem(WORKING_INSTANCE_KEY, proxy)
        setIsSearching(false)
        return
      } catch {
        // Try next proxy
      }
    }

    if (!controller.signal.aborted) {
      setSongResults([])
      setIsSearching(false)
    }
  }, [])

  // Debounced song search
  useEffect(() => {
    if (!isOpen) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSongResults([])
      setIsSearching(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      searchSongs(query)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isOpen, searchSongs])

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSongResults([])
      setActiveIndex(-1)
      setIsSearching(false)
      setTimeout(() => inputRef.current?.focus(), 10)
    } else {
      abortRef.current?.abort()
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [pageResults.length, songResults.length])

  const navigateAndClose = useCallback(
    (path: string) => {
      navigate(path)
      onClose()
    },
    [navigate, onClose]
  )

  const handleSelect = useCallback(
    (index: number) => {
      if (index < pageResults.length) {
        navigateAndClose(pageResults[index].path)
      } else {
        const songIndex = index - pageResults.length
        if (songIndex < songResults.length) {
          navigateAndClose(`/songs?v=${songResults[songIndex].videoId}`)
        }
      }
    },
    [pageResults, songResults, navigateAndClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1 >= totalResults ? 0 : prev + 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 < 0 ? totalResults - 1 : prev - 1))
      return
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(activeIndex)
    }
  }

  const hasQuery = query.trim().length > 0
  const hasResults = pageResults.length > 0 || songResults.length > 0
  const showDropdown = isOpen && hasQuery

  return (
    <div className={`${styles.wrapper} ${isOpen ? styles.wrapperOpen : ''}`} ref={wrapperRef}>
      {isOpen ? (
        <div className={styles.inputWrapper} onKeyDown={handleKeyDown}>
          <PiMagnifyingGlass size={16} className={styles.inputIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label={t('common.close')}
          >
            <PiX size={16} />
          </button>
        </div>
      ) : null}

      {showDropdown && (
        <div className={styles.dropdown}>
          {pageResults.length > 0 && (
            <>
              <div className={styles.sectionHeader}>{t('search.pages')}</div>
              {pageResults.map((page, i) => (
                <button
                  key={page.path}
                  className={`${styles.resultItem} ${activeIndex === i ? styles.active : ''}`}
                  onClick={() => navigateAndClose(page.path)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className={styles.resultTitle}>{t(page.labelKey)}</span>
                </button>
              ))}
            </>
          )}

          {(songResults.length > 0 || isSearching) && (
            <>
              <div className={styles.sectionHeader}>{t('search.songs')}</div>
              {isSearching && songResults.length === 0 && (
                <div className={styles.statusMessage}>{t('search.searching')}</div>
              )}
              {songResults.map((song, i) => {
                const idx = pageResults.length + i
                return (
                  <button
                    key={song.videoId}
                    className={`${styles.resultItem} ${styles.songResult} ${activeIndex === idx ? styles.active : ''}`}
                    onClick={() => navigateAndClose(`/songs?v=${song.videoId}`)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span className={styles.resultTitle}>{song.title}</span>
                    <span className={styles.resultMeta}>{song.author}</span>
                  </button>
                )
              })}
            </>
          )}

          {!isSearching && !hasResults && (
            <div className={styles.statusMessage}>{t('search.noResults')}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchOverlay
