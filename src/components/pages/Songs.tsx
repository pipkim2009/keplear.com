/**
 * Songs Page - YouTube-based practice tool
 * Paste YouTube URLs and practice with loop, speed, and A-B repeat controls
 * Uses YouTube IFrame API for reliable playback
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import {
  PiPlay,
  PiPause,
  PiRepeat,
  PiSpeakerHigh,
  PiSpeakerLow,
  PiSpeakerNone,
  PiArrowCounterClockwise,
  PiArrowClockwise,
  PiTrash,
  PiX,
  PiMagnifyingGlass,
} from 'react-icons/pi'
import SEOHead from '../common/SEOHead'
import { useWaveformData } from '../../hooks/useWaveformData'
import { generateFallbackWaveform, resamplePeaks } from '../../utils/waveformUtils'
import styles from '../../styles/Songs.module.css'
import { apiUrl } from '../../lib/api'

// Piped API proxy endpoints for search
const IS_PRODUCTION = import.meta.env.PROD

const PIPED_PROXIES = IS_PRODUCTION
  ? [apiUrl('/api/piped')] // Single serverless endpoint handles all fallback logic
  : [
      '/api/piped1', // api.piped.private.coffee
      '/api/piped2', // pipedapi.kavin.rocks
      '/api/piped3', // pipedapi.adminforge.de
      '/api/piped4', // fallback
    ]

// Session storage key for working instance
const WORKING_INSTANCE_KEY = 'keplear_working_piped_instance'

interface SearchResult {
  videoId: string
  title: string
  author: string
  lengthSeconds: number
  viewCount: number
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height: string
          width: string
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number; target: YTPlayer }) => void
            onError?: (event: { data: number }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        PLAYING: number
        PAUSED: number
        ENDED: number
        BUFFERING: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  getPlayerState: () => number
  getVideoData: () => { title: string; author: string; video_id: string }
  destroy: () => void
}

interface VideoInfo {
  videoId: string
  title: string
  author?: string
}

// Recent videos stored in localStorage
const RECENT_VIDEOS_KEY = 'keplear_recent_videos'
const MAX_RECENT_VIDEOS = 10

const Songs = () => {
  const { t } = useTranslation()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [recentVideos, setRecentVideos] = useState<VideoInfo[]>([])

  // Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const suggestionsTimerRef = useRef<number | null>(null)
  const searchWrapperRef = useRef<HTMLDivElement>(null)

  // Player state
  const [currentVideo, setCurrentVideo] = useState<VideoInfo | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isApiLoaded, setIsApiLoaded] = useState(false)

  // A-B repeat state
  const [markerA, setMarkerA] = useState<number | null>(null)
  const [markerB, setMarkerB] = useState<number | null>(null)
  const [isABLooping, setIsABLooping] = useState(false)

  // Waveform color extracted from thumbnail
  const [waveformColor, setWaveformColor] = useState<string | null>(null)

  // Real waveform data hook
  const { peaks: realPeaks } = useWaveformData(currentVideo?.videoId ?? null)

  // Refs
  const playerRef = useRef<YTPlayer | null>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const timeUpdateInterval = useRef<number | null>(null)
  const currentVideoIdRef = useRef<string | null>(null)

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setIsApiLoaded(true)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      setIsApiLoaded(true)
    }

    return () => {
      window.onYouTubeIframeAPIReady = () => {}
    }
  }, [])

  // Load recent videos from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_VIDEOS_KEY)
      if (stored) {
        setRecentVideos(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load recent videos:', e)
    }
  }, [])

  // Analyze thumbnail to extract average color for waveform
  useEffect(() => {
    if (!currentVideo) {
      setWaveformColor(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = 64
        canvas.height = 36
        ctx.drawImage(img, 0, 0, 64, 36)

        const imageData = ctx.getImageData(0, 0, 64, 36)
        const data = imageData.data
        let r = 0,
          g = 0,
          b = 0
        const pixelCount = data.length / 4

        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }

        r = Math.round(r / pixelCount)
        g = Math.round(g / pixelCount)
        b = Math.round(b / pixelCount)

        // Boost brightness if too dark so waveform stays visible
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        if (brightness < 80) {
          const boost = 80 / Math.max(brightness, 1)
          r = Math.min(255, Math.round(r * boost))
          g = Math.min(255, Math.round(g * boost))
          b = Math.min(255, Math.round(b * boost))
        }

        setWaveformColor(`${r}, ${g}, ${b}`)
      } catch {
        // CORS or other error — keep default colors
        setWaveformColor(null)
      }
    }
    img.onerror = () => setWaveformColor(null)
    img.src = `https://i.ytimg.com/vi/${currentVideo.videoId}/mqdefault.jpg`
  }, [currentVideo?.videoId])

  // Save video to recent list
  const saveToRecent = useCallback((video: VideoInfo) => {
    setRecentVideos(prev => {
      const filtered = prev.filter(v => v.videoId !== video.videoId)
      const updated = [video, ...filtered].slice(0, MAX_RECENT_VIDEOS)
      try {
        localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save recent videos:', e)
      }
      return updated
    })
  }, [])

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Search YouTube via Invidious API with instance fallback
  const searchYouTube = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      setSearchError('')

      // Get cached working proxy or start from beginning
      const cachedProxy = sessionStorage.getItem(WORKING_INSTANCE_KEY)
      const proxies = cachedProxy
        ? [cachedProxy, ...PIPED_PROXIES.filter(p => p !== cachedProxy)]
        : PIPED_PROXIES

      for (const proxy of proxies) {
        try {
          // Piped API search endpoint
          // Production: /api/piped?q=query (serverless function)
          // Development: /api/pipedN/search?q=query (Vite proxy)
          const url = IS_PRODUCTION
            ? `${proxy}?q=${encodeURIComponent(query)}&filter=videos`
            : `${proxy}/search?q=${encodeURIComponent(query)}&filter=videos`

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000)

          const response = await fetch(url, {
            signal: controller.signal,
            credentials: 'omit', // Prevent auth dialogs
            headers: {
              Accept: 'application/json',
            },
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          // Verify response is JSON, not HTML login page
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON')
          }

          const data = await response.json()

          // Parse Piped API results
          // Piped returns { items: [...] } with url like "/watch?v=VIDEO_ID"
          const items = data.items || data
          const results: SearchResult[] = items
            .filter(
              (item: { type?: string; url?: string }) => item.url && item.url.includes('/watch?v=')
            )
            .slice(0, 20)
            .map(
              (item: {
                url: string
                title: string
                uploaderName: string
                duration: number
                views: number
              }) => {
                // Extract video ID from URL like "/watch?v=dQw4w9WgXcQ"
                const videoIdMatch = item.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
                return {
                  videoId: videoIdMatch ? videoIdMatch[1] : '',
                  title: item.title || 'Unknown',
                  author: item.uploaderName || 'Unknown',
                  lengthSeconds: item.duration || 0,
                  viewCount: item.views || 0,
                }
              }
            )
            .filter((item: SearchResult) => item.videoId) // Filter out any without valid videoId

          setSearchResults(results)

          // Cache working proxy for this session
          sessionStorage.setItem(WORKING_INSTANCE_KEY, proxy)

          setIsSearching(false)
          return
        } catch (err) {
          console.warn(`Piped proxy ${proxy} failed:`, err)
          // Continue to next proxy
        }
      }

      // All instances failed
      setSearchError(t('songs.searchError'))
      setIsSearching(false)
    },
    [t]
  )

  // Fetch search suggestions (debounced)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const cachedProxy = sessionStorage.getItem(WORKING_INSTANCE_KEY)
    const proxies = cachedProxy
      ? [cachedProxy, ...PIPED_PROXIES.filter(p => p !== cachedProxy)]
      : PIPED_PROXIES

    for (const proxy of proxies) {
      try {
        const url = IS_PRODUCTION
          ? `${proxy}?q=${encodeURIComponent(query)}&type=suggestions`
          : `${proxy}/suggestions?query=${encodeURIComponent(query)}`

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        })

        clearTimeout(timeoutId)

        if (!response.ok) continue

        const data = await response.json()
        if (Array.isArray(data)) {
          setSuggestions(data.slice(0, 8))
          return
        }
      } catch {
        // Continue to next proxy
      }
    }
  }, [])

  // Debounce suggestions on input change
  useEffect(() => {
    if (suggestionsTimerRef.current) {
      clearTimeout(suggestionsTimerRef.current)
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([])
      return
    }

    suggestionsTimerRef.current = window.setTimeout(() => {
      fetchSuggestions(searchQuery)
    }, 100)

    return () => {
      if (suggestionsTimerRef.current) {
        clearTimeout(suggestionsTimerRef.current)
      }
    }
  }, [searchQuery, fetchSuggestions])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search submission - also detects YouTube URLs automatically
  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      setShowSuggestions(false)
      setSelectedSuggestion(-1)
      const trimmed = searchQuery.trim()

      // Empty search → if no song playing, load most recent; otherwise just clear search results
      if (!trimmed) {
        setSearchResults([])
        if (!currentVideo && recentVideos.length > 0) {
          setCurrentVideo(recentVideos[0])
          saveToRecent(recentVideos[0])
        }
        return
      }

      // Check if it's a YouTube URL or video ID
      const videoId = extractVideoId(trimmed)
      if (videoId) {
        const video: VideoInfo = {
          videoId,
          title: `Video ${videoId}`,
        }
        setCurrentVideo(video)
        saveToRecent(video)
        setSearchQuery('')
        setSearchResults([])
        return
      }

      searchYouTube(trimmed)
    },
    [searchQuery, searchYouTube, saveToRecent, recentVideos, currentVideo]
  )

  // Select a suggestion and trigger search
  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setSearchQuery(suggestion)
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedSuggestion(-1)
      searchYouTube(suggestion)
    },
    [searchYouTube]
  )

  // Handle keyboard navigation in suggestions
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestion(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[selectedSuggestion])
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        setSelectedSuggestion(-1)
      }
    },
    [showSuggestions, suggestions, selectedSuggestion, selectSuggestion]
  )

  // Load a search result
  const loadSearchResult = useCallback(
    (result: SearchResult) => {
      const video: VideoInfo = {
        videoId: result.videoId,
        title: result.title,
        author: result.author,
      }
      setCurrentVideo(video)
      saveToRecent(video)
    },
    [saveToRecent]
  )

  // Format duration from seconds
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format view count
  const formatViews = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  // Time update loop - uses rAF for smooth waveform playhead tracking
  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      cancelAnimationFrame(timeUpdateInterval.current)
    }

    const tick = () => {
      const player = playerRef.current
      if (player) {
        try {
          setCurrentTime(player.getCurrentTime())
        } catch {
          // Player might not be ready yet
        }
      }
      timeUpdateInterval.current = requestAnimationFrame(tick)
    }
    timeUpdateInterval.current = requestAnimationFrame(tick)
  }, [])

  const stopTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      cancelAnimationFrame(timeUpdateInterval.current)
      timeUpdateInterval.current = null
    }
  }, [])

  // Handle A-B loop and regular loop
  useEffect(() => {
    const player = playerRef.current
    if (!player || !isPlayerReady) return

    // Handle A-B loop
    if (isABLooping && markerA !== null && markerB !== null) {
      if (currentTime >= markerB) {
        player.seekTo(markerA, true)
      }
    }
  }, [currentTime, isABLooping, markerA, markerB, isPlayerReady])

  // Initialize player when video is selected
  useEffect(() => {
    if (!isApiLoaded || !currentVideo || !playerContainerRef.current) return

    // Skip if we're already playing this video (title update shouldn't recreate player)
    if (currentVideoIdRef.current === currentVideo.videoId && playerRef.current) {
      return
    }
    currentVideoIdRef.current = currentVideo.videoId

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    setIsPlayerReady(false)
    setCurrentTime(0)
    setDuration(0)
    setVideoTitle('')
    setMarkerA(null)
    setMarkerB(null)
    setIsABLooping(false)

    // Create player container div
    const containerId = 'yt-player-' + Date.now()
    const playerDiv = document.createElement('div')
    playerDiv.id = containerId
    playerContainerRef.current.innerHTML = ''
    playerContainerRef.current.appendChild(playerDiv)

    playerRef.current = new window.YT.Player(containerId, {
      height: '0',
      width: '0',
      videoId: currentVideo.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: event => {
          setIsPlayerReady(true)
          setDuration(event.target.getDuration())
          event.target.setVolume(volume)
          event.target.setPlaybackRate(playbackRate)
          startTimeUpdate()

          // Get video title from YouTube (with slight delay to ensure data is ready)
          setTimeout(() => {
            try {
              const videoData = event.target.getVideoData()
              if (videoData?.title) {
                setVideoTitle(videoData.title)
                saveToRecent({
                  videoId: currentVideo.videoId,
                  title: videoData.title,
                  author: videoData.author || currentVideo.author,
                })
              }
            } catch (e) {
              console.error('Failed to get video data:', e)
            }
          }, 500)
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true)
            startTimeUpdate()
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false)
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false)
            if (isLooping) {
              event.target.seekTo(0, true)
              event.target.playVideo()
            }
          }
        },
        onError: event => {
          console.error('YouTube player error:', event.data)
          console.error(t('songs.playbackError'))
        },
      },
    })

    return () => {
      stopTimeUpdate()
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [isApiLoaded, currentVideo])

  // Update volume
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(volume)
    }
  }, [volume, isPlayerReady])

  // Update playback rate
  useEffect(() => {
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setPlaybackRate(playbackRate)
    }
  }, [playbackRate, isPlayerReady])

  // Load a recent video
  const loadRecentVideo = useCallback(
    (video: VideoInfo) => {
      setCurrentVideo(video)
      saveToRecent(video)
    },
    [saveToRecent]
  )

  // Player controls
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !isPlayerReady) return

    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }, [isPlaying, isPlayerReady])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      setCurrentTime(time)
      if (playerRef.current && isPlayerReady) {
        playerRef.current.seekTo(time, true)
      }
    },
    [isPlayerReady]
  )

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value))
  }, [])

  const toggleLoop = useCallback(() => {
    setIsLooping(!isLooping)
  }, [isLooping])

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed)
  }, [])

  const skipTime = useCallback(
    (seconds: number) => {
      if (!playerRef.current || !isPlayerReady) return
      const target = Math.max(0, Math.min(duration, currentTime + seconds))
      setCurrentTime(target)
      playerRef.current.seekTo(target, true)
    },
    [isPlayerReady, duration, currentTime]
  )

  // A-B repeat controls
  const setMarkerAAtCurrent = useCallback(() => {
    const t = currentTime
    if (markerB !== null && t >= markerB) {
      // A moved past B — swap: old B becomes A, current becomes new B
      setMarkerA(markerB)
      setMarkerB(t)
    } else {
      setMarkerA(t)
    }
  }, [currentTime, markerB])

  const setMarkerBAtCurrent = useCallback(() => {
    const t = currentTime
    if (markerA !== null && t <= markerA) {
      // B moved before A — swap: current becomes new A, old A becomes B
      setMarkerB(markerA)
      setMarkerA(t)
    } else {
      setMarkerB(t)
      if (markerA !== null) setIsABLooping(true)
    }
  }, [currentTime, markerA])

  const clearABMarkers = useCallback(() => {
    setMarkerA(null)
    setMarkerB(null)
    setIsABLooping(false)
  }, [])

  const toggleABLoop = useCallback(() => {
    if (markerA !== null && markerB !== null) {
      setIsABLooping(!isABLooping)
    }
  }, [markerA, markerB, isABLooping])

  // Keyboard shortcuts: Space=play/pause, Arrows=skip, L=loop, A/B=markers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!currentVideo) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTime(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTime(10)
          break
        case 'l':
        case 'L':
          toggleLoop()
          break
        case 'a':
        case 'A':
          setMarkerAAtCurrent()
          break
        case 'b':
        case 'B':
          setMarkerBAtCurrent()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    currentVideo,
    togglePlayPause,
    skipTime,
    toggleLoop,
    setMarkerAAtCurrent,
    setMarkerBAtCurrent,
    markerA,
  ])

  // Format time display (0.1 second precision)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const secsWhole = Math.floor(secs)
    const secsTenth = Math.floor((secs - secsWhole) * 10)
    return `${mins}:${secsWhole.toString().padStart(2, '0')}.${secsTenth}`
  }

  // Get volume icon
  const VolumeIcon = volume === 0 ? PiSpeakerNone : volume < 50 ? PiSpeakerLow : PiSpeakerHigh

  // Close player
  const closePlayer = useCallback(() => {
    stopTimeUpdate()
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
    currentVideoIdRef.current = null
    setCurrentVideo(null)
    setVideoTitle('')
    setIsPlaying(false)
    setIsPlayerReady(false)
    setCurrentTime(0)
    setDuration(0)
    setMarkerA(null)
    setMarkerB(null)
    setIsABLooping(false)
  }, [stopTimeUpdate])

  // Remove from recent
  const removeFromRecent = useCallback((videoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRecentVideos(prev => {
      const updated = prev.filter(v => v.videoId !== videoId)
      try {
        localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save recent videos:', err)
      }
      return updated
    })
  }, [])

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  return (
    <div className={styles.songsContainer}>
      <SEOHead
        title="Songs"
        description="Practice along with your favorite songs. Loop sections, adjust speed, and train your ear with real music."
        path="/songs"
      />
      {/* Header */}
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('songs.title')}</h1>
        <p className={styles.pageSubtitle}>{t('songs.searchSubtitle')}</p>
      </div>

      {/* Search Section */}
      <form className={styles.searchSection} onSubmit={handleSearch} ref={searchWrapperRef}>
        <div className={styles.searchInputWrapper}>
          <PiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('songs.searchPlaceholder')}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
              setSelectedSuggestion(-1)
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => {
                setSearchQuery('')
                setSuggestions([])
                setShowSuggestions(false)
              }}
              aria-label={t('common.clear')}
            >
              <PiX />
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestionsDropdown}>
              {suggestions.map((suggestion, i) => (
                <button
                  key={suggestion}
                  type="button"
                  className={`${styles.suggestionItem} ${i === selectedSuggestion ? styles.suggestionItemActive : ''}`}
                  onMouseDown={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedSuggestion(i)}
                >
                  <PiMagnifyingGlass className={styles.suggestionIcon} />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className={styles.loadButton} disabled={isSearching}>
          {isSearching ? t('songs.searching') : t('songs.search')}
        </button>
      </form>

      {/* Search Error */}
      {searchError && <div className={styles.searchError}>{searchError}</div>}

      {/* Recent Videos (shown when no search results) */}
      {recentVideos.length > 0 && !currentVideo && searchResults.length === 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSectionHeader}>
            <h2 className={styles.sectionTitle}>{t('songs.recentVideos')}</h2>
          </div>
          <div className={styles.recentList}>
            {recentVideos.map(video => (
              <div
                key={video.videoId}
                className={styles.recentItem}
                onClick={() => loadRecentVideo(video)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && loadRecentVideo(video)}
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.title}
                  className={styles.recentThumbnail}
                />
                <span className={styles.recentVideoId}>{video.title || video.videoId}</span>
                <button
                  className={styles.removeRecentButton}
                  onClick={e => removeFromRecent(video.videoId, e)}
                  aria-label={t('common.remove')}
                >
                  <PiX />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden YouTube Player Container */}
      <div ref={playerContainerRef} style={{ position: 'absolute', left: '-9999px' }} />

      {/* Player Section */}
      {currentVideo && (
        <div
          className={styles.playerSection}
          style={
            waveformColor
              ? ({ '--waveform-color': waveformColor } as React.CSSProperties)
              : undefined
          }
        >
          {/* Thumbnail background */}
          <div
            className={styles.playerThumbnailBg}
            style={{
              backgroundImage: `url(https://i.ytimg.com/vi/${currentVideo.videoId}/mqdefault.jpg)`,
            }}
          />
          {/* Header: track info, volume, close */}
          <div className={styles.playerHeader}>
            <div className={styles.playerTrackInfo}>
              <img
                src={`https://i.ytimg.com/vi/${currentVideo.videoId}/mqdefault.jpg`}
                alt={currentVideo.title}
                className={styles.playerArtwork}
              />
              <div className={styles.playerTrackDetails}>
                <h2 className={styles.nowPlaying}>{videoTitle || currentVideo.videoId}</h2>
                <p className={styles.playerArtist}>{currentVideo.author || 'YouTube'}</p>
              </div>
            </div>
            <button
              className={`${styles.controlButton} ${isLooping ? styles.controlButtonActive : ''}`}
              onClick={toggleLoop}
              aria-label={t('songs.loop')}
              title={t('songs.loop')}
            >
              <PiRepeat />
            </button>
            <div className={styles.volumeControl}>
              <VolumeIcon className={styles.volumeIcon} />
              <input
                type="range"
                className={styles.volumeSlider}
                min={0}
                max={100}
                step={1}
                value={volume}
                onChange={handleVolumeChange}
                style={{ '--volume-percent': `${volume}%` } as React.CSSProperties}
              />
            </div>
            <button
              className={styles.closePlayerButton}
              onClick={closePlayer}
              aria-label={t('common.close')}
            >
              <PiX />
            </button>
          </div>

          {/* Loading indicator */}
          {!isPlayerReady && <div className={styles.audioLoading}>{t('songs.loadingAudio')}</div>}

          {/* Transport: centered play/pause with skip */}
          <div className={styles.transportSection}>
            <div className={styles.transportRow}>
              <button
                className={styles.controlButtonSmall}
                onClick={() => skipTime(-10)}
                disabled={!isPlayerReady}
                aria-label="Rewind 10 seconds"
                title="Rewind 10s"
              >
                <PiArrowCounterClockwise />
              </button>
              <button
                className={styles.playButton}
                onClick={togglePlayPause}
                disabled={!isPlayerReady}
                aria-label={isPlaying ? t('common.stop') : t('sandbox.play')}
              >
                {isPlaying ? <PiPause /> : <PiPlay />}
              </button>
              <button
                className={styles.controlButtonSmall}
                onClick={() => skipTime(10)}
                disabled={!isPlayerReady}
                aria-label="Forward 10 seconds"
                title="Forward 10s"
              >
                <PiArrowClockwise />
              </button>
            </div>
            <div className={styles.speedControl}>
              <div className={styles.speedButtons}>
                {speedOptions.map(speed => (
                  <button
                    key={speed}
                    className={`${styles.speedButton} ${playbackRate === speed ? styles.speedButtonActive : ''}`}
                    onClick={() => changeSpeed(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Looper */}
          <div className={styles.abControls}>
            <span className={styles.controlLabel}>Looper</span>
            <div className={styles.abButtons}>
              <button
                className={`${styles.markerButton} ${markerA !== null ? styles.markerButtonSet : ''}`}
                onClick={setMarkerAAtCurrent}
                disabled={!isPlayerReady}
                title={t('songs.setMarkerA')}
              >
                A {markerA !== null && `(${formatTime(markerA)})`}
              </button>
              <button
                className={`${styles.markerButton} ${markerB !== null ? styles.markerButtonSet : ''}`}
                onClick={setMarkerBAtCurrent}
                disabled={markerA === null || !isPlayerReady}
                title={t('songs.setMarkerB')}
              >
                B {markerB !== null && `(${formatTime(markerB)})`}
              </button>
              <button
                className={`${styles.abToggleButton} ${isABLooping ? styles.abToggleButtonActive : ''}`}
                onClick={toggleABLoop}
                disabled={markerA === null || markerB === null}
                title={t('songs.toggleABLoop')}
              >
                <PiRepeat />
              </button>
              <button
                className={styles.clearMarkersButton}
                onClick={clearABMarkers}
                disabled={markerA === null && markerB === null}
                title={t('songs.clearMarkers')}
              >
                <PiTrash />
              </button>
            </div>
          </div>

          {/* Timeline / waveform at the bottom */}
          <div className={styles.timelineSection}>
            <div className={styles.timelineWrapper}>
              <div className={styles.waveformContainer}>
                {(() => {
                  const numBars = Math.min(600, Math.max(1, Math.ceil(duration * 10)))
                  const videoId = currentVideo!.videoId
                  const bars = realPeaks
                    ? resamplePeaks(realPeaks, numBars)
                    : generateFallbackWaveform(videoId, numBars)

                  return bars.map((height, i) => {
                    const barProgress = (i + 1) / numBars
                    const currentProgress = duration > 0 ? currentTime / duration : 0
                    const isPassed = barProgress <= currentProgress

                    return (
                      <div
                        key={i}
                        className={`${styles.waveformBar} ${isPassed ? styles.waveformBarPassed : ''}`}
                        style={{ height: `${height * 100}%` }}
                      />
                    )
                  })
                })()}
              </div>
              {markerA !== null && duration > 0 && (
                <div
                  className={styles.markerA}
                  style={{ left: `${(markerA / duration) * 100}%` }}
                  title={`A: ${formatTime(markerA)}`}
                />
              )}
              {markerB !== null && duration > 0 && (
                <div
                  className={styles.markerB}
                  style={{ left: `${(markerB / duration) * 100}%` }}
                  title={`B: ${formatTime(markerB)}`}
                />
              )}
              {markerA !== null && markerB !== null && duration > 0 && (
                <div
                  className={styles.abRange}
                  style={{
                    left: `${(markerA / duration) * 100}%`,
                    width: `${((markerB - markerA) / duration) * 100}%`,
                  }}
                />
              )}
              <input
                type="range"
                className={styles.timeline}
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                step={0.1}
                disabled={!isPlayerReady}
              />
            </div>
            <div className={styles.timeDisplay}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Results (shown below player if playing) */}
      {searchResults.length > 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSectionHeader}>
            <h2 className={styles.sectionTitle}>{t('songs.searchResults')}</h2>
            <span className={styles.resultsCount}>
              {searchResults.length} {t('songs.results')}
            </span>
          </div>
          <div className={styles.searchResultsList}>
            {searchResults.map(result => (
              <div
                key={result.videoId}
                className={styles.searchResultItem}
                onClick={() => loadSearchResult(result)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && loadSearchResult(result)}
              >
                <img
                  src={`https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`}
                  alt={result.title}
                  className={styles.resultThumbnail}
                />
                <div className={styles.resultInfo}>
                  <span className={styles.resultTitle}>{result.title}</span>
                  <span className={styles.resultAuthor}>{result.author}</span>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultDuration}>
                      {formatDuration(result.lengthSeconds)}
                    </span>
                    <span className={styles.resultViews}>
                      {formatViews(result.viewCount)} views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Videos (shown below player when no search results) */}
      {recentVideos.length > 0 && currentVideo && searchResults.length === 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSectionHeader}>
            <h2 className={styles.sectionTitle}>{t('songs.recentVideos')}</h2>
          </div>
          <div className={styles.recentList}>
            {recentVideos
              .filter(video => video.videoId !== currentVideo.videoId)
              .map(video => (
                <div
                  key={video.videoId}
                  className={styles.recentItem}
                  onClick={() => loadRecentVideo(video)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && loadRecentVideo(video)}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                    alt={video.title}
                    className={styles.recentThumbnail}
                  />
                  <span className={styles.recentVideoId}>{video.title || video.videoId}</span>
                  <button
                    className={styles.removeRecentButton}
                    onClick={e => removeFromRecent(video.videoId, e)}
                    aria-label={t('common.remove')}
                  >
                    <PiX />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Songs
