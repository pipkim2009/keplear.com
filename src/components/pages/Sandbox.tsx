/**
 * Sandbox Page - Free play mode with optional pitch detection feedback
 */

import { useEffect, useMemo } from 'react'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useDSPPitchDetection, usePerformanceGrading } from '../../hooks'
import { LiveFeedback } from '../practice'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'

function Sandbox() {
  const {
    handleNoteClick,
    isSelected,
    isInMelody,
    showNotes,
    bpm,
    setBpm,
    numberOfBeats,
    setNumberOfBeats,
    chordMode,
    setChordMode,
    instrument,
    handleInstrumentChange,
    setGuitarNotes,
    clearSelection,
    clearTrigger,
    selectedNotes,
    selectNote,
    handleOctaveRangeChange,
    keyboardSelectionMode,
    handleKeyboardSelectionModeChange,
    flashingInputs,
    activeInputs,
    triggerInputFlash,
    setInputActive,
    clearChordsAndScalesTrigger,
    handleGenerateMelody,
    handlePlayMelody,
    handleRecordMelody,
    isPlaying,
    isRecording,
    generatedMelody,
    toggleShowNotes,
    playbackProgress,
    melodyDuration,
    setPlaybackProgress,
    handleClearRecordedAudio,
    recordedAudioBlob,
    hasChanges,
    isGeneratingMelody,
    isAutoRecording,
    currentlyPlayingNoteIndex,
    handleCurrentlyPlayingNoteChange
  } = useInstrument()

  // DSP-based pitch detection and performance grading hooks
  const pitchDetection = useDSPPitchDetection({ instrument: instrument as 'keyboard' | 'guitar' | 'bass' })
  const performanceGrading = usePerformanceGrading()

  // Convert DSP pitch result to the format expected by grading system
  const currentPitchForGrading = useMemo((): PitchDetectionResult | null => {
    if (!pitchDetection.currentPitch) return null
    return {
      frequency: pitchDetection.currentPitch.frequency,
      note: pitchDetection.currentPitch.note,
      confidence: pitchDetection.currentPitch.confidence,
      centsOffset: pitchDetection.currentPitch.cents,
      timestamp: pitchDetection.currentPitch.timestamp,
      isOnset: pitchDetection.currentPitch.isOnset
    }
  }, [pitchDetection.currentPitch])

  // Keep pitch detection in sync with current instrument
  useEffect(() => {
    pitchDetection.setInstrument(instrument as 'keyboard' | 'guitar' | 'bass')
  }, [instrument, pitchDetection.setInstrument])

  // Pass pitch detection results to grading system
  useEffect(() => {
    if (currentPitchForGrading && performanceGrading.state.isActive) {
      performanceGrading.processPitch(currentPitchForGrading)
    }
  }, [currentPitchForGrading, performanceGrading.state.isActive, performanceGrading.processPitch])

  // Stop listening when a new melody is being generated
  useEffect(() => {
    if (isGeneratingMelody) {
      pitchDetection.stopListening()
      performanceGrading.stopPerformance()
    }
  }, [isGeneratingMelody, pitchDetection, performanceGrading])

  // Start performance grading when user starts listening and melody is ready
  const handleStartPracticeWithFeedback = () => {
    if (generatedMelody.length > 0) {
      performanceGrading.startPerformance(generatedMelody, bpm)
      pitchDetection.startListening()
    } else {
      // Just start listening without grading if no melody
      pitchDetection.startListening()
    }
  }

  // Stop practice session
  const handleStopPracticeWithFeedback = () => {
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
  }

  return (
    <>
      <InstrumentDisplay
        onNoteClick={handleNoteClick}
        isSelected={isSelected}
        isInMelody={isInMelody}
        showNotes={showNotes}
        bpm={bpm}
        setBpm={setBpm}
        numberOfBeats={numberOfBeats}
        setNumberOfBeats={setNumberOfBeats}
        chordMode={chordMode}
        setChordMode={setChordMode}
        instrument={instrument}
        setInstrument={handleInstrumentChange}
        setGuitarNotes={setGuitarNotes}
        clearSelection={clearSelection}
        clearTrigger={clearTrigger}
        selectedNotes={selectedNotes}
        selectNote={selectNote}
        onOctaveRangeChange={handleOctaveRangeChange}
        keyboardSelectionMode={keyboardSelectionMode}
        onKeyboardSelectionModeChange={handleKeyboardSelectionModeChange}
        flashingInputs={{
          bpm: flashingInputs.bpm || activeInputs.bpm,
          beats: flashingInputs.beats || activeInputs.beats,
          mode: flashingInputs.mode || activeInputs.mode
        }}
        triggerInputFlash={triggerInputFlash}
        setInputActive={setInputActive}
        clearChordsAndScales={clearChordsAndScalesTrigger}
        onGenerateMelody={handleGenerateMelody}
        onPlayMelody={handlePlayMelody}
        onRecordMelody={handleRecordMelody}
        isPlaying={isPlaying}
        isRecording={isRecording}
        hasGeneratedMelody={generatedMelody.length > 0}
        onToggleNotes={toggleShowNotes}
        playbackProgress={playbackProgress}
        melodyDuration={melodyDuration}
        onProgressChange={setPlaybackProgress}
        onClearRecordedAudio={handleClearRecordedAudio}
        recordedAudioBlob={recordedAudioBlob}
        generatedMelody={generatedMelody}
        hasChanges={hasChanges}
        isGeneratingMelody={isGeneratingMelody}
        isAutoRecording={isAutoRecording}
        currentlyPlayingNoteIndex={currentlyPlayingNoteIndex}
        onCurrentlyPlayingNoteChange={handleCurrentlyPlayingNoteChange}
      />

      {/* Pitch Feedback Section */}
      <div style={{ width: '100%', maxWidth: '600px', margin: '2rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Live Feedback - pitch detection controls and notes history */}
        {generatedMelody.length > 0 && !isGeneratingMelody && (
          <LiveFeedback
            isListening={pitchDetection.isListening}
            onStartListening={handleStartPracticeWithFeedback}
            onStopListening={handleStopPracticeWithFeedback}
            currentPitch={currentPitchForGrading}
            volumeLevel={pitchDetection.volumeLevel}
            performanceState={performanceGrading.state}
            lastNoteResult={performanceGrading.lastNoteResult}
            error={pitchDetection.error}
            permission={pitchDetection.permission}
            totalNotes={generatedMelody.length}
            melody={generatedMelody}
          />
        )}
      </div>
    </>
  )
}

export default Sandbox
