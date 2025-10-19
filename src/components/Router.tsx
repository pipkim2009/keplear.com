import Home from './pages/Home'
import NotFound from './pages/NotFound'
import InstrumentDisplay from './keyboard/InstrumentDisplay'
import { useInstrument } from '../contexts/InstrumentContext'

/**
 * Router component that handles page navigation and renders appropriate content
 * Now uses InstrumentContext to eliminate prop drilling
 */
function Router() {
  const {
    currentPage,
    navigateToHome,
    navigateToSandbox,
    navigateToPractice,
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

  switch (currentPage) {
    case 'home':
      return (
        <Home
          onNavigateToSandbox={navigateToSandbox}
          onNavigateToPractice={navigateToPractice}
        />
      )

    case 'sandbox':
      return (
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
      )

    case 'practice':
      return (
        <div className="practice-page">
          <div className="coming-soon">
            <h2>Practice Mode</h2>
            <p>Coming soon! This will include structured exercises and progress tracking.</p>
            <button className="button" onClick={navigateToSandbox}>
              Try Sandbox Mode
            </button>
          </div>
        </div>
      )

    case '404':
      return (
        <NotFound
          onNavigateToHome={navigateToHome}
        />
      )

    default:
      // For unknown pages, show 404 instead of defaulting to Home
      if (currentPage !== 'home' && currentPage !== 'sandbox' && currentPage !== 'practice') {
        return (
          <NotFound
            onNavigateToHome={navigateToHome}
          />
        )
      }

      return (
        <Home
          onNavigateToSandbox={navigateToSandbox}
          onNavigateToPractice={navigateToPractice}
        />
      )
  }
}

export default Router