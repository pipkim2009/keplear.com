/**
 * useStemPlayer - Web Audio API multi-stem playback with volume, mute, and solo controls.
 *
 * Audio graph per stem:
 *   AudioBufferSourceNode → GainNode → AudioContext.destination
 *
 * When stems are active, YouTube is muted and this player provides audio.
 * Position is synced to YouTube's timeline.
 *
 * Design: uses refs for playback state so play/pause/seek functions are STABLE
 * (never change identity). This avoids stale closure issues when called from
 * event handlers or effects.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { StemType, StemData } from './useStemSeparation'

const STEM_TYPES: StemType[] = ['vocals', 'drums', 'bass', 'other']

interface StemNodes {
  source: AudioBufferSourceNode
  gain: GainNode
}

export function useStemPlayer(stems: StemData | null, onStemsEnded?: () => void) {
  const [volumes, setVolumes] = useState<Record<StemType, number>>({
    vocals: 1,
    drums: 1,
    bass: 1,
    other: 1,
  })
  const [mutes, setMutes] = useState<Record<StemType, boolean>>({
    vocals: false,
    drums: false,
    bass: false,
    other: false,
  })
  const [soloed, setSoloed] = useState<StemType | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Refs for stable function access (no stale closures)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<Map<StemType, StemNodes>>(new Map())
  const stemsRef = useRef<StemData | null>(null)
  const volumesRef = useRef(volumes)
  const mutesRef = useRef(mutes)
  const soloedRef = useRef(soloed)
  const playingRef = useRef(false)
  const generationRef = useRef(0) // Incremented on each play() to invalidate stale onended handlers
  const onStemsEndedRef = useRef(onStemsEnded)

  // Keep refs in sync with state
  onStemsEndedRef.current = onStemsEnded
  stemsRef.current = stems
  volumesRef.current = volumes
  mutesRef.current = mutes
  soloedRef.current = soloed

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  // Compute effective volume using current ref values
  const getEffectiveVolume = useCallback((stemType: StemType): number => {
    let vol = volumesRef.current[stemType]
    if (mutesRef.current[stemType]) vol = 0
    if (soloedRef.current !== null && soloedRef.current !== stemType) vol = 0
    return vol
  }, [])

  // Update all gain nodes to match current volume/mute/solo state
  const updateGains = useCallback(() => {
    for (const stemType of STEM_TYPES) {
      const node = nodesRef.current.get(stemType)
      if (!node) continue
      node.gain.gain.value = getEffectiveVolume(stemType)
    }
  }, [getEffectiveVolume])

  // Stop all source nodes
  const stopSources = useCallback(() => {
    for (const [, node] of nodesRef.current) {
      try {
        // Null out onended BEFORE stopping to prevent stale callbacks
        node.source.onended = null
        node.source.stop()
        node.source.disconnect()
        node.gain.disconnect()
      } catch {
        // Source may have already been stopped
      }
    }
    nodesRef.current.clear()
    playingRef.current = false
    setIsPlaying(false)
  }, [])

  // Create and start source nodes at a given offset (STABLE — reads from refs)
  const play = useCallback(
    (offset: number) => {
      const currentStems = stemsRef.current
      if (!currentStems) return

      const ctx = getAudioContext()

      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Stop any existing sources first
      stopSources()

      // Increment generation so any lingering onended from old sources is ignored
      const thisGeneration = ++generationRef.current

      for (const stemType of STEM_TYPES) {
        const buffer = currentStems[stemType]
        if (!buffer) continue

        const source = ctx.createBufferSource()
        source.buffer = buffer

        const gain = ctx.createGain()
        source.connect(gain)
        gain.connect(ctx.destination)

        gain.gain.value = getEffectiveVolume(stemType)

        nodesRef.current.set(stemType, { source, gain })

        const clampedOffset = Math.max(0, Math.min(offset, buffer.duration))
        source.start(0, clampedOffset)

        // Detect natural end of playback on first stem only
        if (stemType === 'vocals') {
          source.onended = () => {
            // Only fire if this is still the current generation AND we're still playing
            if (generationRef.current === thisGeneration && playingRef.current) {
              playingRef.current = false
              setIsPlaying(false)
              nodesRef.current.clear()
              onStemsEndedRef.current?.()
            }
          }
        }
      }

      playingRef.current = true
      setIsPlaying(true)
    },
    [getAudioContext, stopSources, getEffectiveVolume]
  )

  const pause = useCallback(() => {
    stopSources()
  }, [stopSources])

  const seek = useCallback(
    (time: number) => {
      if (playingRef.current) {
        play(time)
      }
    },
    [play]
  )

  // Volume/mute/solo controls — update state AND immediately apply to gain nodes
  const setVolume = useCallback((stem: StemType, volume: number) => {
    setVolumes(prev => {
      const next = { ...prev, [stem]: Math.max(0, Math.min(1, volume)) }
      volumesRef.current = next
      // Immediately update the gain node
      const node = nodesRef.current.get(stem)
      if (node) {
        let vol = next[stem]
        if (mutesRef.current[stem]) vol = 0
        if (soloedRef.current !== null && soloedRef.current !== stem) vol = 0
        node.gain.gain.value = vol
      }
      return next
    })
  }, [])

  const toggleMute = useCallback(
    (stem: StemType) => {
      setMutes(prev => {
        const next = { ...prev, [stem]: !prev[stem] }
        mutesRef.current = next
        updateGains()
        return next
      })
    },
    [updateGains]
  )

  const toggleSolo = useCallback(
    (stem: StemType) => {
      setSoloed(prev => {
        const next = prev === stem ? null : stem
        soloedRef.current = next
        updateGains()
        return next
      })
    },
    [updateGains]
  )

  const resetMixer = useCallback(() => {
    const vols = { vocals: 1, drums: 1, bass: 1, other: 1 }
    const ms = { vocals: false, drums: false, bass: false, other: false }
    setVolumes(vols)
    setMutes(ms)
    setSoloed(null)
    volumesRef.current = vols
    mutesRef.current = ms
    soloedRef.current = null
    updateGains()
  }, [updateGains])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSources()
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    }
  }, [stopSources])

  // Stop playback when stems change (new song loaded)
  useEffect(() => {
    stopSources()
  }, [stems, stopSources])

  return {
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    toggleSolo,
    resetMixer,
    volumes,
    mutes,
    soloed,
    isPlaying,
    duration: stems?.duration ?? 0,
  }
}
