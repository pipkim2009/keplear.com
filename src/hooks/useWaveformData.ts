/**
 * useWaveformData - React hook for waveform display.
 *
 * Returns null peaks — components use generateFallbackWaveform() to show
 * a deterministic waveform based on the video ID.
 */

interface UseWaveformDataResult {
  peaks: number[] | null
  isLoading: boolean
}

export function useWaveformData(videoId: string | null): UseWaveformDataResult {
  void videoId
  return { peaks: null, isLoading: false }
}
