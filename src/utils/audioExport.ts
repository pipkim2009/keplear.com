/**
 * Utility functions for audio export and file handling
 */

/**
 * Downloads a blob as a file
 * @param blob - The audio blob to download
 * @param filename - The filename for the download
 */
export const downloadAudioFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Converts a blob to a data URL for use with HTML audio elements
 * @param blob - The audio blob to convert
 * @returns Promise that resolves to a data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Generates a filename for exported melodies
 * @param instrument - The instrument type
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns A formatted filename
 */
export const generateMelodyFilename = (
  instrument: string,
  timestamp?: Date
): string => {
  const date = timestamp || new Date()
  const dateStr = date.toISOString().slice(0, 19).replace(/:/g, '-')
  return `melody-${instrument}-${dateStr}.wav`
}

/**
 * Creates an HTML audio element from a blob
 * @param blob - The audio blob
 * @returns Promise that resolves to an HTML audio element
 */
export const createAudioElement = async (blob: Blob): Promise<HTMLAudioElement> => {
  const dataUrl = await blobToDataUrl(blob)
  const audio = new Audio(dataUrl)
  audio.preload = 'auto'
  return audio
}

/**
 * Audio player state interface
 */
export interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
}

/**
 * Hook for managing audio file playback
 */
export class AudioFilePlayer {
  private audio: HTMLAudioElement | null = null
  private listeners: Array<(state: AudioPlayerState) => void> = []

  constructor() {
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this)
    this.handleLoadedMetadata = this.handleLoadedMetadata.bind(this)
    this.handlePlay = this.handlePlay.bind(this)
    this.handlePause = this.handlePause.bind(this)
    this.handleEnded = this.handleEnded.bind(this)
  }

  /**
   * Loads an audio file from a blob
   */
  async loadFromBlob(blob: Blob): Promise<void> {
    if (this.audio) {
      this.cleanup()
    }

    this.audio = await createAudioElement(blob)
    this.setupEventListeners()
  }

  /**
   * Sets up event listeners for the audio element
   */
  private setupEventListeners(): void {
    if (!this.audio) return

    this.audio.addEventListener('timeupdate', this.handleTimeUpdate)
    this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata)
    this.audio.addEventListener('play', this.handlePlay)
    this.audio.addEventListener('pause', this.handlePause)
    this.audio.addEventListener('ended', this.handleEnded)
  }

  /**
   * Removes event listeners from the audio element
   */
  private removeEventListeners(): void {
    if (!this.audio) return

    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate)
    this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata)
    this.audio.removeEventListener('play', this.handlePlay)
    this.audio.removeEventListener('pause', this.handlePause)
    this.audio.removeEventListener('ended', this.handleEnded)
  }

  /**
   * Event handlers
   */
  private handleTimeUpdate(): void {
    this.notifyListeners()
  }

  private handleLoadedMetadata(): void {
    this.notifyListeners()
  }

  private handlePlay(): void {
    this.notifyListeners()
  }

  private handlePause(): void {
    this.notifyListeners()
  }

  private handleEnded(): void {
    this.notifyListeners()
  }

  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    if (!this.audio) return

    const state: AudioPlayerState = {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.audio.volume
    }

    this.listeners.forEach(listener => listener(state))
  }

  /**
   * Adds a state change listener
   */
  addListener(listener: (state: AudioPlayerState) => void): void {
    this.listeners.push(listener)
  }

  /**
   * Removes a state change listener
   */
  removeListener(listener: (state: AudioPlayerState) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  /**
   * Playback controls
   */
  async play(): Promise<void> {
    if (!this.audio) return
    try {
      await this.audio.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }

  pause(): void {
    if (!this.audio) return
    this.audio.pause()
  }

  stop(): void {
    if (!this.audio) return
    this.audio.pause()
    this.audio.currentTime = 0
  }

  setVolume(volume: number): void {
    if (!this.audio) return
    this.audio.volume = Math.max(0, Math.min(1, volume))
    this.notifyListeners()
  }

  setCurrentTime(time: number): void {
    if (!this.audio) return
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration || 0, time))
  }

  /**
   * Gets the current state
   */
  getState(): AudioPlayerState {
    if (!this.audio) {
      return {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1
      }
    }

    return {
      isPlaying: !this.audio.paused,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.audio.volume
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.audio) {
      this.removeEventListeners()
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
    this.listeners = []
  }
}