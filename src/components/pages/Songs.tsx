/**
 * Songs Page - YouTube-based practice tool
 * Paste YouTube URLs and practice with loop, speed, and A-B repeat controls
 * Uses YouTube IFrame API for reliable playback
 * Analyzes audio with Web Audio API for real waveform visualization
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { PiPlay, PiPause, PiRepeat, PiSpeakerHigh, PiSpeakerLow, PiSpeakerNone, PiArrowCounterClockwise, PiX, PiMagnifyingGlass, PiLink } from 'react-icons/pi'
import styles from '../../styles/Songs.module.css'

// Piped API proxy endpoints
// In development: use Vite proxy (multiple instances for fallback)
// In production: use Vercel serverless function (handles fallback server-side)
const IS_PRODUCTION = import.meta.env.PROD

const PIPED_PROXIES = IS_PRODUCTION
  ? ['/api/piped'] // Single serverless endpoint handles all fallback logic
  : [
      '/api/piped1', // api.piped.private.coffee (BEST - 99.89% uptime)
      '/api/piped2', // pipedapi.kavin.rocks (Official)
      '/api/piped3', // pipedapi.adminforge.de (Germany)
      '/api/piped4'  // watchapi.whatever.social (Community)
    ]

// Session storage key for working instance
const WORKING_INSTANCE_KEY = 'keplear_working_piped_instance'

// Audio URL cache
const AUDIO_URL_CACHE_KEY = 'keplear_audio_url_cache'
const MAX_CACHED_URLS = 30

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
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  getPlayerState: () => number
  getVideoData: () => { title: string; author: string; video_id: string }
  destroy: () => void
}

interface VideoInfo {
  videoId: string
  title: string
}

// Recent videos stored in localStorage
const RECENT_VIDEOS_KEY = 'keplear_recent_videos'
const MAX_RECENT_VIDEOS = 10

// Waveform cache in localStorage
const WAVEFORM_CACHE_KEY = 'keplear_waveform_cache'
const MAX_CACHED_WAVEFORMS = 50

const getCachedWaveform = (videoId: string): number[] | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(WAVEFORM_CACHE_KEY) || '{}')
    return cache[videoId] || null
  } catch {
    return null
  }
}

const cacheWaveform = (videoId: string, waveform: number[]) => {
  try {
    const cache = JSON.parse(localStorage.getItem(WAVEFORM_CACHE_KEY) || '{}')
    const keys = Object.keys(cache)

    // Remove oldest entries if cache is full
    if (keys.length >= MAX_CACHED_WAVEFORMS) {
      delete cache[keys[0]]
    }

    cache[videoId] = waveform
    localStorage.setItem(WAVEFORM_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full or unavailable, ignore
  }
}

// Analyze audio buffer to generate waveform data
const analyzeAudioBuffer = (audioBuffer: AudioBuffer, numBars: number = 150): number[] => {
  const channelData = audioBuffer.getChannelData(0) // Get first channel
  const samplesPerBar = Math.floor(channelData.length / numBars)
  const waveform: number[] = []

  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar
    const end = start + samplesPerBar

    // Calculate RMS (root mean square) for this segment
    let sum = 0
    for (let j = start; j < end && j < channelData.length; j++) {
      sum += channelData[j] * channelData[j]
    }
    const rms = Math.sqrt(sum / samplesPerBar)

    // Normalize and boost for visibility (RMS values are typically small)
    const normalized = Math.min(1, rms * 4)
    waveform.push(Math.max(0.08, normalized)) // Minimum height for visibility
  }

  return waveform
}

// Try to get audio URL from Cobalt API (via serverless proxy)
const fetchAudioUrlFromCobalt = async (videoId: string): Promise<string | null> => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(`/api/cobalt?videoId=${videoId}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const data = await response.json()
    return data.url || null
  } catch (e) {
    console.warn('Cobalt API failed:', e)
    return null
  }
}

// Try to get audio URL from Piped API (fallback)
const fetchAudioUrlFromPiped = async (videoId: string): Promise<string | null> => {
  const pipedProxies = IS_PRODUCTION
    ? ['/api/piped-streams']
    : ['/api/piped1', '/api/piped2', '/api/piped3', '/api/piped4']

  for (const proxy of pipedProxies) {
    try {
      const url = IS_PRODUCTION
        ? `${proxy}?videoId=${videoId}`
        : `${proxy}/streams/${videoId}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      })

      clearTimeout(timeoutId)

      if (!response.ok) continue

      const data = await response.json()

      // Find the lowest bitrate audio stream
      const audioStreams = data.audioStreams || []
      const sortedStreams = audioStreams
        .filter((s: { mimeType?: string; url?: string }) => s.mimeType?.includes('audio') && s.url)
        .sort((a: { bitrate?: number }, b: { bitrate?: number }) => (a.bitrate || 0) - (b.bitrate || 0))

      if (sortedStreams[0]?.url) {
        return sortedStreams[0].url
      }
    } catch (e) {
      console.warn(`Piped proxy ${proxy} failed:`, e)
    }
  }

  return null
}

// Fetch and analyze audio to generate real waveform data
const fetchAndAnalyzeAudio = async (
  videoId: string,
  numBars: number = 150
): Promise<{ waveform: number[]; isReal: boolean }> => {
  // Check cache first
  const cached = getCachedWaveform(videoId)
  if (cached) {
    return { waveform: cached, isReal: true }
  }

  // Try Cobalt first (more reliable via serverless), then Piped as fallback
  let audioUrl = await fetchAudioUrlFromCobalt(videoId)

  if (!audioUrl) {
    audioUrl = await fetchAudioUrlFromPiped(videoId)
  }

  if (!audioUrl) {
    return { waveform: generatePseudoWaveform(videoId, numBars), isReal: false }
  }

  // Fetch audio with size limit (500KB = fast download, enough for waveform)
  const MAX_BYTES = 512 * 1024

  try {
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      return { waveform: generatePseudoWaveform(videoId, numBars), isReal: false }
    }

    // Read the stream with size limit
    const reader = audioResponse.body?.getReader()
    if (!reader) {
      return { waveform: generatePseudoWaveform(videoId, numBars), isReal: false }
    }

    const chunks: Uint8Array[] = []
    let loaded = 0

    while (loaded < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break

      chunks.push(value)
      loaded += value.length
    }

    // Cancel remaining download
    reader.cancel()

    // Combine chunks
    const audioData = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      audioData.set(chunk, offset)
      offset += chunk.length
    }

    // Decode and analyze audio
    const audioContext = new AudioContext()
    try {
      const audioBuffer = await audioContext.decodeAudioData(audioData.buffer)
      const waveform = analyzeAudioBuffer(audioBuffer, numBars)

      // Cache for future use
      cacheWaveform(videoId, waveform)

      return { waveform, isReal: true }
    } finally {
      audioContext.close()
    }
  } catch (e) {
    console.warn('Audio analysis failed:', e)
    return { waveform: generatePseudoWaveform(videoId, numBars), isReal: false }
  }
}

// Generate a deterministic waveform based on video ID (fallback)
// Creates a unique, consistent pattern for each video
const generatePseudoWaveform = (videoId: string, numBars: number = 150): number[] => {
  // Seeded random based on video ID
  const seed = videoId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
  const seededRandom = (n: number) => {
    const x = Math.sin(seed + n) * 10000
    return x - Math.floor(x)
  }

  const waveform: number[] = []
  for (let i = 0; i < numBars; i++) {
    // Create realistic-looking pattern with multiple frequencies
    const base = 0.35 + seededRandom(i * 3) * 0.15
    const low = Math.sin(i * 0.08 + seed) * 0.12
    const mid = Math.sin(i * 0.25 + seed * 1.5) * 0.18
    const high = seededRandom(i * 2) * 0.2
    const spike = seededRandom(i * 7) > 0.88 ? seededRandom(i * 11) * 0.25 : 0

    const value = Math.max(0.12, Math.min(1, base + low + mid + high + spike))
    waveform.push(value)
  }
  return waveform
}

const Songs = () => {
  const { t } = useTranslation()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  // URL input state
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [recentVideos, setRecentVideos] = useState<VideoInfo[]>([])

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

  // Waveform state
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [waveformLoading, setWaveformLoading] = useState(false)
  const [isRealWaveform, setIsRealWaveform] = useState(false)

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
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Search YouTube via Invidious API with instance fallback
  const searchYouTube = useCallback(async (query: string) => {
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
            'Accept': 'application/json'
          }
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
          .filter((item: { type?: string; url?: string }) =>
            item.url && item.url.includes('/watch?v=')
          )
          .slice(0, 20)
          .map((item: { url: string; title: string; uploaderName: string; duration: number; views: number }) => {
            // Extract video ID from URL like "/watch?v=dQw4w9WgXcQ"
            const videoIdMatch = item.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
            return {
              videoId: videoIdMatch ? videoIdMatch[1] : '',
              title: item.title || 'Unknown',
              author: item.uploaderName || 'Unknown',
              lengthSeconds: item.duration || 0,
              viewCount: item.views || 0
            }
          })
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
  }, [t])

  // Handle search submission
  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    searchYouTube(searchQuery)
  }, [searchQuery, searchYouTube])

  // Load a search result
  const loadSearchResult = useCallback((result: SearchResult) => {
    const video: VideoInfo = {
      videoId: result.videoId,
      title: result.title
    }
    setCurrentVideo(video)
    saveToRecent(video)
    setSearchResults([])
    setSearchQuery('')
  }, [saveToRecent])

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

  // Time update loop - uses refs to avoid stale closure issues
  const startTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current)
    }

    timeUpdateInterval.current = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return

      try {
        const current = player.getCurrentTime()
        setCurrentTime(current)
      } catch {
        // Player might not be ready yet
      }
    }, 250)
  }, [])

  const stopTimeUpdate = useCallback(() => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current)
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

    // Reset waveform state and start loading
    setWaveformLoading(true)
    setIsRealWaveform(false)

    // Show pseudo waveform immediately while real one loads
    setWaveformData(generatePseudoWaveform(currentVideo.videoId, 150))

    // Fetch and analyze audio in background (instant analysis at "10000x speed")
    fetchAndAnalyzeAudio(currentVideo.videoId, 150)
      .then(({ waveform, isReal }) => {
        setWaveformData(waveform)
        setIsRealWaveform(isReal)
      })
      .catch(() => {
        // Keep pseudo waveform on error
        setIsRealWaveform(false)
      })
      .finally(() => {
        setWaveformLoading(false)
      })

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
        showinfo: 0
      },
      events: {
        onReady: (event) => {
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
                saveToRecent({ videoId: currentVideo.videoId, title: videoData.title })
              }
            } catch (e) {
              console.error('Failed to get video data:', e)
            }
          }, 500)
        },
        onStateChange: (event) => {
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
        onError: (event) => {
          console.error('YouTube player error:', event.data)
          setUrlError(t('songs.playbackError'))
        }
      }
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

  // Handle URL submission
  const handleUrlSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    setUrlError('')

    const videoId = extractVideoId(urlInput.trim())
    if (!videoId) {
      setUrlError(t('songs.invalidUrl'))
      return
    }

    const video: VideoInfo = {
      videoId,
      title: `Video ${videoId}` // Will be updated if we can get title
    }

    setCurrentVideo(video)
    saveToRecent(video)
    setUrlInput('')
  }, [urlInput, t, saveToRecent])

  // Load a recent video
  const loadRecentVideo = useCallback((video: VideoInfo) => {
    setCurrentVideo(video)
    saveToRecent(video)
  }, [saveToRecent])

  // Player controls
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !isPlayerReady) return

    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }, [isPlaying, isPlayerReady])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(time, true)
    }
  }, [isPlayerReady])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseInt(e.target.value))
  }, [])

  const toggleLoop = useCallback(() => {
    setIsLooping(!isLooping)
  }, [isLooping])

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed)
  }, [])

  // A-B repeat controls
  const setMarkerAAtCurrent = useCallback(() => {
    setMarkerA(currentTime)
    if (markerB !== null && currentTime >= markerB) {
      setMarkerB(null)
      setIsABLooping(false)
    }
  }, [currentTime, markerB])

  const setMarkerBAtCurrent = useCallback(() => {
    if (markerA !== null && currentTime > markerA) {
      setMarkerB(currentTime)
      setIsABLooping(true)
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

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
    // Reset waveform state
    setWaveformData([])
    setWaveformLoading(false)
    setIsRealWaveform(false)
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

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div className={styles.songsContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('songs.title')}</h1>
        <p className={styles.pageSubtitle}>{t('songs.searchSubtitle')}</p>
      </div>

      {/* Search Section */}
      <form className={styles.searchSection} onSubmit={handleSearch}>
        <div className={styles.searchInputWrapper}>
          <PiMagnifyingGlass className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('songs.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => {
                setSearchQuery('')
                setSearchResults([])
              }}
              aria-label={t('common.clear')}
            >
              <PiX />
            </button>
          )}
        </div>
        <button type="submit" className={styles.loadButton} disabled={isSearching}>
          {isSearching ? t('songs.searching') : t('songs.search')}
        </button>
      </form>

      {/* Search Error */}
      {searchError && (
        <div className={styles.searchError}>{searchError}</div>
      )}

      {/* URL Toggle */}
      <button
        className={styles.urlToggle}
        onClick={() => setShowUrlInput(!showUrlInput)}
      >
        <PiLink /> {showUrlInput ? t('songs.hideUrl') : t('songs.pasteUrl')}
      </button>

      {/* URL Input Section (collapsible) */}
      {showUrlInput && (
        <form className={styles.urlSection} onSubmit={handleUrlSubmit}>
          <div className={styles.searchInputWrapper}>
            <PiLink className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('songs.urlPlaceholder')}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            {urlInput && (
              <button
                type="button"
                className={styles.clearSearchButton}
                onClick={() => setUrlInput('')}
                aria-label={t('common.clear')}
              >
                <PiX />
              </button>
            )}
          </div>
          <button type="submit" className={styles.loadButton}>
            {t('songs.load')}
          </button>
        </form>
      )}

      {/* URL Error */}
      {urlError && (
        <div className={styles.searchError}>{urlError}</div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !currentVideo && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSectionHeader}>
            <h2 className={styles.sectionTitle}>{t('songs.searchResults')}</h2>
            <span className={styles.resultsCount}>{searchResults.length} {t('songs.results')}</span>
          </div>
          <div className={styles.searchResultsList}>
            {searchResults.map((result) => (
              <div
                key={result.videoId}
                className={styles.searchResultItem}
                onClick={() => loadSearchResult(result)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && loadSearchResult(result)}
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
                    <span className={styles.resultDuration}>{formatDuration(result.lengthSeconds)}</span>
                    <span className={styles.resultViews}>{formatViews(result.viewCount)} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && !currentVideo && searchResults.length === 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsSectionHeader}>
            <h2 className={styles.sectionTitle}>{t('songs.recentVideos')}</h2>
          </div>
          <div className={styles.recentList}>
            {recentVideos.map((video) => (
              <div
                key={video.videoId}
                className={styles.recentItem}
                onClick={() => loadRecentVideo(video)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && loadRecentVideo(video)}
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.title}
                  className={styles.recentThumbnail}
                />
                <span className={styles.recentVideoId}>{video.title || video.videoId}</span>
                <button
                  className={styles.removeRecentButton}
                  onClick={(e) => removeFromRecent(video.videoId, e)}
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
        <div className={styles.playerSection}>
          <div className={styles.playerHeader}>
            <div className={styles.playerTrackInfo}>
              <img
                src={`https://i.ytimg.com/vi/${currentVideo.videoId}/mqdefault.jpg`}
                alt={currentVideo.title}
                className={styles.playerArtwork}
              />
              <div className={styles.playerTrackDetails}>
                <h2 className={styles.nowPlaying}>{videoTitle || currentVideo.videoId}</h2>
                <p className={styles.playerArtist}>YouTube</p>
              </div>
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
          {!isPlayerReady && (
            <div className={styles.audioLoading}>{t('songs.loadingAudio')}</div>
          )}

          {/* Timeline with A-B markers */}
          <div className={styles.timelineSection}>
            {/* Live waveform badge - only shown when using real analyzed waveform */}
            {isRealWaveform && !waveformLoading && (
              <div className={styles.liveWaveformBadge}>Live waveform</div>
            )}
            <div className={styles.timelineWrapper}>
              {/* Waveform visualization */}
              <div className={`${styles.waveformContainer} ${waveformLoading ? styles.waveformLoading : ''}`}>
                {waveformData.map((height, i) => {
                  const barProgress = (i + 1) / waveformData.length
                  const currentProgress = duration > 0 ? currentTime / duration : 0
                  const isPassed = barProgress <= currentProgress

                  return (
                    <div
                      key={i}
                      className={`${styles.waveformBar} ${isPassed ? styles.waveformBarPassed : ''}`}
                      style={{ height: `${height * 100}%` }}
                    />
                  )
                })}
              </div>
              {/* A-B marker visualization */}
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
                    width: `${((markerB - markerA) / duration) * 100}%`
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

          {/* Practice Controls */}
          <div className={styles.practiceControls}>
            {/* Play/Pause */}
            <button
              className={styles.controlButton}
              onClick={togglePlayPause}
              disabled={!isPlayerReady}
              aria-label={isPlaying ? t('common.stop') : t('sandbox.play')}
            >
              {isPlaying ? <PiPause /> : <PiPlay />}
            </button>

            {/* Volume */}
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
              />
            </div>

            {/* Speed Control */}
            <div className={styles.speedControl}>
              <span className={styles.controlLabel}>{t('songs.speed')}</span>
              <div className={styles.speedButtons}>
                {speedOptions.map((speed) => (
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

            {/* Loop Toggle */}
            <button
              className={`${styles.controlButton} ${isLooping ? styles.controlButtonActive : ''}`}
              onClick={toggleLoop}
              aria-label={t('songs.loop')}
              title={t('songs.loop')}
            >
              <PiRepeat />
            </button>
          </div>

          {/* A-B Repeat Controls */}
          <div className={styles.abControls}>
            <span className={styles.controlLabel}>{t('songs.abRepeat')}</span>
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
                <PiArrowCounterClockwise />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentVideo && recentVideos.length === 0 && searchResults.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>{t('songs.emptyState')}</p>
        </div>
      )}
    </div>
  )
}

export default Songs
