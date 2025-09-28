import InstrumentControls from './InstrumentControls'
import InstrumentHeader from './InstrumentHeader'
import InstrumentRenderer from './InstrumentRenderer'
import { useState, useEffect } from 'react'
import type { Note } from '../../utils/notes'
import type { KeyboardSelectionMode } from './InstrumentControls'
import { useScaleChordManagement } from '../../hooks/useScaleChordManagement'
import { useKeyboardHighlighting } from '../../hooks/useKeyboardHighlighting'

interface InstrumentDisplayProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
  setGuitarNotes: (notes: Note[]) => void
  setBassNotes?: (notes: Note[]) => void
  clearSelection: () => void
  clearTrigger: number
  selectedNotes: Note[]
  selectNote?: (note: Note, selectionMode?: 'range' | 'multi') => void
  onOctaveRangeChange?: (lowerOctaves: number, higherOctaves: number) => void
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'notes' | 'mode', active: boolean) => void
  clearChordsAndScales?: number
  onGenerateMelody?: () => void
  onPlayMelody?: () => void
  onRecordMelody?: () => Promise<Blob | null>
  isPlaying?: boolean
  isRecording?: boolean
  hasGeneratedMelody?: boolean
  onToggleNotes?: () => void
  playbackProgress?: number
  melodyDuration?: number
  onProgressChange?: (progress: number) => void
  onClearRecordedAudio?: () => void
  recordedAudioBlob?: Blob | null
  generatedMelody?: Note[]
  hasChanges?: boolean
  isGeneratingMelody?: boolean
  isAutoRecording?: boolean
}

const InstrumentDisplay: React.FC<InstrumentDisplayProps> = ({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument,
  setGuitarNotes,
  setBassNotes,
  clearSelection,
  clearTrigger,
  selectedNotes,
  selectNote,
  onOctaveRangeChange,
  keyboardSelectionMode = 'range',
  onKeyboardSelectionModeChange,
  flashingInputs,
  triggerInputFlash,
  setInputActive,
  clearChordsAndScales,
  onGenerateMelody,
  onPlayMelody,
  onRecordMelody,
  isPlaying,
  isRecording,
  hasGeneratedMelody,
  onToggleNotes,
  playbackProgress,
  melodyDuration,
  onProgressChange,
  onClearRecordedAudio,
  recordedAudioBlob,
  generatedMelody,
  hasChanges = false,
  isGeneratingMelody = false,
  isAutoRecording = false
}) => {
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)

  // Use the scale/chord management hook
  const {
    appliedChords,
    appliedScales,
    selectedRoot,
    selectedChordRoot,
    currentKeyboardScale,
    setScaleHandlers,
    setBassScaleHandlers,
    setChordHandlers,
    setBassChordHandlers,
    handleScaleSelect,
    handleScaleBoxSelect,
    handleClearScale,
    handleChordSelect,
    handleChordShapeSelect,
    handleClearChord,
    handleKeyboardScaleApply,
    handleKeyboardScaleClear,
    handleScaleDelete,
    handleKeyboardChordApply,
    handleKeyboardChordClear,
    handleChordDelete,
    handleRootChange,
    handleChordRootChange
  } = useScaleChordManagement({
    instrument,
    selectedNotes,
    setGuitarNotes,
    selectNote,
    clearSelection,
    clearChordsAndScales,
    keyboardSelectionMode,
    onKeyboardSelectionModeChange,
    lowerOctaves,
    higherOctaves
  })

  // Use the keyboard highlighting hook
  const {
    isNoteInKeyboardScale,
    isNoteInKeyboardChord,
    isNoteKeyboardRoot,
    isNoteKeyboardChordRoot
  } = useKeyboardHighlighting({
    instrument,
    appliedScales,
    appliedChords,
    currentKeyboardScale,
    lowerOctaves,
    higherOctaves,
    setGuitarNotes
  })

  // Handle clear all selections
  const handleClearAllSelections = () => {
    // Clear all selections
    clearSelection()
    // Clear chord and scale state for keyboard
    if (instrument === 'keyboard') {
      handleKeyboardChordClear()
      handleKeyboardScaleClear()
    }
    // Clear applied chords and scales lists
    handleClearChord()
    handleClearScale()
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  return (
    <>
      <div className={`instrument-controls-container ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`} data-instrument={instrument}>
        <InstrumentControls
          bpm={bpm}
          setBpm={setBpm}
          numberOfNotes={numberOfNotes}
          setNumberOfNotes={setNumberOfNotes}
          instrument={instrument}
          setInstrument={setInstrument}
          clearSelection={clearSelection}
          hasSelectedNotes={selectedNotes.length > 0}
          onScaleSelect={handleScaleSelect}
          onScaleBoxSelect={handleScaleBoxSelect}
          onClearScale={handleClearScale}
          lowerOctaves={lowerOctaves}
          higherOctaves={higherOctaves}
          onAddLowerOctave={() => setLowerOctaves(Math.min(lowerOctaves + 1, 7))}
          onRemoveLowerOctave={() => setLowerOctaves(Math.max(lowerOctaves - 1, -4))}
          onAddHigherOctave={() => setHigherOctaves(Math.min(higherOctaves + 1, 7))}
          onRemoveHigherOctave={() => setHigherOctaves(Math.max(higherOctaves - 1, -4))}
          keyboardSelectionMode={keyboardSelectionMode}
          onKeyboardSelectionModeChange={onKeyboardSelectionModeChange}
          onKeyboardScaleApply={handleKeyboardScaleApply}
          onKeyboardScaleClear={handleKeyboardScaleClear}
          flashingInputs={flashingInputs}
          triggerInputFlash={triggerInputFlash}
          setInputActive={setInputActive}
          selectedNotesCount={selectedNotes.length}
          onGenerateMelody={onGenerateMelody}
          onPlayMelody={onPlayMelody}
          onRecordMelody={onRecordMelody}
          isPlaying={isPlaying}
          isRecording={isRecording}
          hasGeneratedMelody={hasGeneratedMelody}
          showNotes={showNotes}
          onToggleNotes={onToggleNotes}
          playbackProgress={playbackProgress}
          melodyDuration={melodyDuration}
          onProgressChange={onProgressChange}
          onClearRecordedAudio={onClearRecordedAudio}
          recordedAudioBlob={recordedAudioBlob}
          generatedMelody={generatedMelody}
          hasChanges={hasChanges}
          isGeneratingMelody={isGeneratingMelody}
          isAutoRecording={isAutoRecording}
        />
      </div>

      <div className="instrument-container">
        <InstrumentHeader
          instrument={instrument}
          keyboardSelectionMode={keyboardSelectionMode}
          onKeyboardSelectionModeChange={onKeyboardSelectionModeChange}
          flashingInputs={flashingInputs}
          selectedNotes={selectedNotes}
          appliedChords={appliedChords}
          appliedScales={appliedScales}
          selectedRoot={selectedRoot}
          selectedChordRoot={selectedChordRoot}
          onScaleSelect={handleScaleSelect}
          onScaleBoxSelect={handleScaleBoxSelect}
          onClearScale={handleClearScale}
          onChordSelect={handleChordSelect}
          onChordShapeSelect={handleChordShapeSelect}
          onClearChord={handleClearChord}
          onRootChange={handleRootChange}
          onChordRootChange={handleChordRootChange}
          onKeyboardScaleApply={handleKeyboardScaleApply}
          onKeyboardScaleClear={handleKeyboardScaleClear}
          onKeyboardChordApply={handleKeyboardChordApply}
          onKeyboardChordClear={handleKeyboardChordClear}
          onChordDelete={handleChordDelete}
          onScaleDelete={handleScaleDelete}
          onClearAllSelections={handleClearAllSelections}
        />

        <InstrumentRenderer
          instrument={instrument}
          onNoteClick={onNoteClick}
          isSelected={isSelected}
          isInMelody={isInMelody}
          showNotes={showNotes}
          setGuitarNotes={setGuitarNotes}
          setBassNotes={setBassNotes}
          clearTrigger={clearTrigger}
          lowerOctaves={lowerOctaves}
          higherOctaves={higherOctaves}
          keyboardSelectionMode={keyboardSelectionMode}
          isNoteInKeyboardScale={isNoteInKeyboardScale}
          isNoteKeyboardRoot={isNoteKeyboardRoot}
          isNoteInKeyboardChord={isNoteInKeyboardChord}
          isNoteKeyboardChordRoot={isNoteKeyboardChordRoot}
          onScaleHandlersReady={setScaleHandlers}
          onBassScaleHandlersReady={setBassScaleHandlers}
          onChordHandlersReady={setChordHandlers}
          onBassChordHandlersReady={setBassChordHandlers}
        />
      </div>
    </>
  )
}

export default InstrumentDisplay