/**
 * Sandbox Page - Free play mode with optional pitch detection feedback
 */

import { useEffect } from 'react'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useAIPitchDetection, usePerformanceGrading } from '../../hooks'
import { LiveFeedback } from '../practice'

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

  // AI Pitch detection and performance grading hooks
  const pitchDetection = useAIPitchDetection({ instrument })
  const performanceGrading = usePerformanceGrading()

  // Keep pitch detection in sync with current instrument
  useEffect(() => {
    pitchDetection.setInstrument(instrument)
  }, [instrument, pitchDetection.setInstrument])

  // Pass pitch detection results to grading system
  useEffect(() => {
    if (pitchDetection.currentPitch && performanceGrading.state.isActive) {
      performanceGrading.processPitch(pitchDetection.currentPitch)
    }
  }, [pitchDetection.currentPitch, performanceGrading.state.isActive, performanceGrading.processPitch])

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
            currentPitch={pitchDetection.currentPitch}
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
