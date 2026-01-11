/**
 * Focused selector hooks for InstrumentContext
 *
 * These hooks allow components to subscribe to specific slices of state
 * instead of the entire context, improving performance by reducing unnecessary re-renders.
 *
 * Components should use these focused hooks when they only need a subset of the context.
 * The full useInstrument() hook is still available for components that need everything.
 */

import { useMemo } from 'react'
import { useInstrument } from '../contexts/InstrumentContext'

/**
 * Hook for navigation-related state and actions
 * Use this in components that only handle page routing (e.g., Header, NavBar)
 */
export const useNavigation = () => {
  const context = useInstrument()

  return useMemo(() => ({
    currentPage: context.currentPage,
    navigateToHome: context.navigateToHome,
    navigateToSandbox: context.navigateToSandbox,
    navigateToClassroom: context.navigateToClassroom,
    setCurrentPage: context.setCurrentPage
  }), [
    context.currentPage,
    context.navigateToHome,
    context.navigateToSandbox,
    context.navigateToClassroom,
    context.setCurrentPage
  ])
}

/**
 * Hook for instrument selection state and actions
 * Use this in components that only handle instrument switching (e.g., InstrumentSelector)
 */
export const useInstrumentType = () => {
  const context = useInstrument()

  return useMemo(() => ({
    instrument: context.instrument,
    handleInstrumentChange: context.handleInstrumentChange,
    setInstrument: context.setInstrument
  }), [
    context.instrument,
    context.handleInstrumentChange,
    context.setInstrument
  ])
}

/**
 * Hook for melody settings (BPM, beats, chord mode)
 * Use this in components that control melody parameters (e.g., ParameterControls)
 */
export const useMelodySettings = () => {
  const context = useInstrument()

  return useMemo(() => ({
    bpm: context.bpm,
    numberOfBeats: context.numberOfBeats,
    chordMode: context.chordMode,
    flashingInputs: context.flashingInputs,
    activeInputs: context.activeInputs,
    setBpm: context.setBpm,
    setNumberOfBeats: context.setNumberOfBeats,
    setChordMode: context.setChordMode,
    triggerInputFlash: context.triggerInputFlash,
    setInputActive: context.setInputActive
  }), [
    context.bpm,
    context.numberOfBeats,
    context.chordMode,
    context.flashingInputs,
    context.activeInputs,
    context.setBpm,
    context.setNumberOfBeats,
    context.setChordMode,
    context.triggerInputFlash,
    context.setInputActive
  ])
}

/**
 * Hook for melody playback controls
 * Use this in components that control playback (e.g., MelodyControls, AudioPlayer)
 */
export const useMelodyPlayback = () => {
  const context = useInstrument()

  return useMemo(() => ({
    isPlaying: context.isPlaying,
    isRecording: context.isRecording,
    playbackProgress: context.playbackProgress,
    melodyDuration: context.melodyDuration,
    recordedAudioBlob: context.recordedAudioBlob,
    showNotes: context.showNotes,
    currentlyPlayingNoteIndex: context.currentlyPlayingNoteIndex,
    isGeneratingMelody: context.isGeneratingMelody,
    isAutoRecording: context.isAutoRecording,
    hasChanges: context.hasChanges,
    generatedMelody: context.generatedMelody,
    handlePlayMelody: context.handlePlayMelody,
    handleGenerateMelody: context.handleGenerateMelody,
    handleRecordMelody: context.handleRecordMelody,
    handleClearRecordedAudio: context.handleClearRecordedAudio,
    toggleShowNotes: context.toggleShowNotes,
    setPlaybackProgress: context.setPlaybackProgress,
    setMelodyDuration: context.setMelodyDuration,
    calculateMelodyDuration: context.calculateMelodyDuration,
    handleCurrentlyPlayingNoteChange: context.handleCurrentlyPlayingNoteChange,
    clearChanges: context.clearChanges
  }), [
    context.isPlaying,
    context.isRecording,
    context.playbackProgress,
    context.melodyDuration,
    context.recordedAudioBlob,
    context.showNotes,
    context.currentlyPlayingNoteIndex,
    context.isGeneratingMelody,
    context.isAutoRecording,
    context.hasChanges,
    context.generatedMelody,
    context.handlePlayMelody,
    context.handleGenerateMelody,
    context.handleRecordMelody,
    context.handleClearRecordedAudio,
    context.toggleShowNotes,
    context.setPlaybackProgress,
    context.setMelodyDuration,
    context.calculateMelodyDuration,
    context.handleCurrentlyPlayingNoteChange,
    context.clearChanges
  ])
}

/**
 * Hook for note selection and melody generation
 * Use this in components that handle note selection (e.g., Keyboard, Guitar, Fretboard)
 */
export const useNoteSelection = () => {
  const context = useInstrument()

  return useMemo(() => ({
    selectedNotes: context.selectedNotes,
    generatedMelody: context.generatedMelody,
    clearTrigger: context.clearTrigger,
    selectNote: context.selectNote,
    setGuitarNotes: context.setGuitarNotes,
    isSelected: context.isSelected,
    isInMelody: context.isInMelody,
    clearSelection: context.clearSelection,
    generateMelody: context.generateMelody,
    handleNoteClick: context.handleNoteClick
  }), [
    context.selectedNotes,
    context.generatedMelody,
    context.clearTrigger,
    context.selectNote,
    context.setGuitarNotes,
    context.isSelected,
    context.isInMelody,
    context.clearSelection,
    context.generateMelody,
    context.handleNoteClick
  ])
}

/**
 * Hook for audio playback functions
 * Use this in components that play audio (e.g., note visualizers, preview components)
 */
export const useAudioPlayback = () => {
  const context = useInstrument()

  return useMemo(() => ({
    playNote: context.playNote,
    playGuitarNote: context.playGuitarNote,
    playBassNote: context.playBassNote,
    playMelody: context.playMelody,
    playGuitarMelody: context.playGuitarMelody,
    playBassMelody: context.playBassMelody,
    stopMelody: context.stopMelody,
    recordMelody: context.recordMelody,
    isPlaying: context.isPlaying,
    isRecording: context.isRecording
  }), [
    context.playNote,
    context.playGuitarNote,
    context.playBassNote,
    context.playMelody,
    context.playGuitarMelody,
    context.playBassMelody,
    context.stopMelody,
    context.recordMelody,
    context.isPlaying,
    context.isRecording
  ])
}

/**
 * Hook for scale and chord management
 * Use this in components that handle scales/chords (e.g., ScaleChordOptions)
 */
export const useScaleChordState = () => {
  const context = useInstrument()

  return useMemo(() => ({
    appliedChords: context.appliedChords,
    appliedScales: context.appliedScales,
    scaleChordManagement: context.scaleChordManagement,
    clearChordsAndScalesTrigger: context.clearChordsAndScalesTrigger,
    triggerClearChordsAndScales: context.triggerClearChordsAndScales
  }), [
    context.appliedChords,
    context.appliedScales,
    context.scaleChordManagement,
    context.clearChordsAndScalesTrigger,
    context.triggerClearChordsAndScales
  ])
}

/**
 * Hook for octave range state
 * Use this in components that handle keyboard octave settings
 */
export const useOctaveRange = () => {
  const context = useInstrument()

  return useMemo(() => ({
    lowerOctaves: context.lowerOctaves,
    higherOctaves: context.higherOctaves,
    keyboardOctaves: context.keyboardOctaves,
    handleOctaveRangeChange: context.handleOctaveRangeChange
  }), [
    context.lowerOctaves,
    context.higherOctaves,
    context.keyboardOctaves,
    context.handleOctaveRangeChange
  ])
}
