import InstrumentControls from './InstrumentControls'
import InstrumentHeader from './InstrumentHeader'
import InstrumentRenderer from './InstrumentRenderer'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { generateNotesWithSeparateOctaves, type Note } from '../../../utils/notes'
import type { KeyboardSelectionMode } from './InstrumentControls'
import type { ChordMode } from '../../../reducers/uiReducer'
import { useInstrument } from '../../../contexts/InstrumentContext'
import { useKeyboardHighlighting } from '../../../hooks/useKeyboardHighlighting'
import type { FretboardPreview, KeyboardPreview } from '../../common/ScaleChordOptions'

interface InstrumentDisplayProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  bpm: number
  setBpm: (bpm: number) => void
  numberOfBeats: number
  setNumberOfBeats: (count: number) => void
  chordMode?: ChordMode
  setChordMode?: (mode: ChordMode) => void
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
  initialLowerOctaves?: number
  initialHigherOctaves?: number
  disableOctaveCleanup?: boolean
  flashingInputs: { bpm: boolean; beats: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'beats' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'beats' | 'mode', active: boolean) => void
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
  currentlyPlayingNoteIndex?: number | null
  onCurrentlyPlayingNoteChange?: (index: number | null) => void
  hideInstrumentSelector?: boolean
  hideOctaveRange?: boolean
  hideBpmButtons?: boolean
  hideBeatsButtons?: boolean
  hideGenerateButton?: boolean
  hideDeselectAll?: boolean
  showOnlyAppliedList?: boolean
  hideChordMode?: boolean
  disableBpmInput?: boolean
  disableBeatsInput?: boolean
  disableChordMode?: boolean
  disableSelectionMode?: boolean
  hideSelectionMode?: boolean
  practiceMode?: boolean
  onLessonComplete?: () => void
}

const InstrumentDisplay = memo(function InstrumentDisplay({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  bpm,
  setBpm,
  numberOfBeats,
  setNumberOfBeats,
  chordMode = 'arpeggiator',
  setChordMode,
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
  initialLowerOctaves = 0,
  initialHigherOctaves = 0,
  disableOctaveCleanup = false,
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
  isAutoRecording = false,
  currentlyPlayingNoteIndex,
  onCurrentlyPlayingNoteChange,
  hideInstrumentSelector = false,
  hideOctaveRange = false,
  hideBpmButtons = false,
  hideBeatsButtons = false,
  hideGenerateButton = false,
  hideDeselectAll = false,
  showOnlyAppliedList = false,
  hideChordMode = false,
  disableBpmInput = false,
  disableBeatsInput = false,
  disableChordMode = false,
  disableSelectionMode = false,
  hideSelectionMode = false,
  practiceMode = false,
  onLessonComplete
}: InstrumentDisplayProps) {
  const [lowerOctaves, setLowerOctaves] = useState<number>(initialLowerOctaves)
  const [higherOctaves, setHigherOctaves] = useState<number>(initialHigherOctaves)

  // Preview state for scale/chord menu
  const [fretboardPreview, setFretboardPreview] = useState<FretboardPreview | null>(null)
  const [keyboardPreview, setKeyboardPreview] = useState<KeyboardPreview | null>(null)

  // Calculate available keyboard notes for preview
  const availableKeyboardNotes = useMemo(() => {
    if (instrument !== 'keyboard') return []
    return generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
  }, [instrument, lowerOctaves, higherOctaves])

  // Memoize the currently playing note(s) calculation
  const currentlyPlayingNoteNames = useMemo<string[]>(() => {
    if (currentlyPlayingNoteIndex === null || currentlyPlayingNoteIndex === undefined || !generatedMelody) {
      return []
    }

    const currentNote = generatedMelody[currentlyPlayingNoteIndex]
    if (!currentNote) {
      return []
    }

    // If this note has chord information, return all chord notes
    if (currentNote.chordGroup?.allNotes?.length) {
      return [...currentNote.chordGroup.allNotes]
    }

    // Otherwise, just return the single note
    return [currentNote.name]
  }, [currentlyPlayingNoteIndex, generatedMelody])

  // Memoize chord ID calculation for guitar/bass
  const currentlyPlayingChordId = useMemo<string | null>(() => {
    if (currentlyPlayingNoteIndex === null || currentlyPlayingNoteIndex === undefined || !generatedMelody) {
      return null
    }

    const currentNote = generatedMelody[currentlyPlayingNoteIndex]
    return currentNote?.chordGroup?.id ?? null
  }, [currentlyPlayingNoteIndex, generatedMelody])

  // Memoize the single note for backward compatibility
  const currentlyPlayingNote = useMemo(() => {
    if (currentlyPlayingNoteIndex === null || currentlyPlayingNoteIndex === undefined || !generatedMelody) {
      return null
    }
    return generatedMelody[currentlyPlayingNoteIndex] ?? null
  }, [currentlyPlayingNoteIndex, generatedMelody])

  // Get scale/chord management from context
  const { appliedChords, appliedScales, scaleChordManagement } = useInstrument()

  const {
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
  } = scaleChordManagement

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
    higherOctaves
  })

  // Memoize clear all selections handler
  const handleClearAllSelections = useCallback(() => {
    clearSelection()
    if (instrument === 'keyboard') {
      handleKeyboardChordClear()
      handleKeyboardScaleClear()
    }
    handleClearChord()
    handleClearScale()
  }, [clearSelection, instrument, handleKeyboardChordClear, handleKeyboardScaleClear, handleClearChord, handleClearScale])

  // Memoize octave change handlers
  const handleAddLowerOctave = useCallback(() => {
    setLowerOctaves(prev => Math.min(prev + 1, 7))
  }, [])

  const handleRemoveLowerOctave = useCallback(() => {
    setLowerOctaves(prev => Math.max(prev - 1, -4))
  }, [])

  const handleAddHigherOctave = useCallback(() => {
    setHigherOctaves(prev => Math.min(prev + 1, 7))
  }, [])

  const handleRemoveHigherOctave = useCallback(() => {
    setHigherOctaves(prev => Math.max(prev - 1, -4))
  }, [])

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  // Clean up notes, chords, and scales when octave range changes (keyboard only)
  useEffect(() => {
    if (instrument !== 'keyboard' || disableOctaveCleanup) return

    // Calculate visible octave range (base is 4-5, can be expanded)
    const minVisibleOctave = Math.max(1, 4 - lowerOctaves)
    const maxVisibleOctave = Math.min(8, 5 + higherOctaves)

    // Helper to extract octave from note name (e.g., "C4" -> 4)
    const getNoteOctave = (noteName: string): number => {
      const octaveMatch = noteName.match(/\d+$/)
      return octaveMatch ? parseInt(octaveMatch[0]) : 0
    }

    // Helper to check if a note is in visible range
    const isNoteInVisibleRange = (note: Note): boolean => {
      const octave = getNoteOctave(note.name)
      return octave >= minVisibleOctave && octave <= maxVisibleOctave
    }

    // Remove selected notes outside visible range
    const notesToRemove = selectedNotes.filter(note => !isNoteInVisibleRange(note))
    if (notesToRemove.length > 0 && selectNote) {
      // Remove each note that's outside the range
      notesToRemove.forEach(note => {
        selectNote(note, keyboardSelectionMode)
      })
    }

    // Remove applied chords that have any notes outside visible range
    const chordsToRemove = appliedChords.filter(chord => {
      if (!chord.notes || chord.notes.length === 0) return false
      // If any note in the chord is outside the visible range, remove the chord
      return chord.notes.some((note: Note) => !isNoteInVisibleRange(note))
    })
    chordsToRemove.forEach(chord => {
      handleChordDelete(chord.id)
    })

    // Remove applied scales that have any notes outside visible range
    const scalesToRemove = appliedScales.filter(scale => {
      if (!scale.notes || scale.notes.length === 0) return false
      // If any note in the scale is outside the visible range, remove the scale
      return scale.notes.some((note: Note) => !isNoteInVisibleRange(note))
    })
    scalesToRemove.forEach(scale => {
      handleScaleDelete(scale.id)
    })
  }, [lowerOctaves, higherOctaves, instrument, selectedNotes, appliedChords, appliedScales, selectNote, keyboardSelectionMode, handleChordDelete, handleScaleDelete])

  return (
    <>
      <div className={`instrument-controls-container ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`} data-instrument={instrument}>
        <InstrumentControls
          bpm={bpm}
          setBpm={setBpm}
          numberOfBeats={numberOfBeats}
          setNumberOfBeats={setNumberOfBeats}
          chordMode={chordMode}
          setChordMode={setChordMode}
          instrument={instrument}
          setInstrument={setInstrument}
          clearSelection={clearSelection}
          hasSelectedNotes={selectedNotes.length > 0}
          onScaleSelect={handleScaleSelect}
          onScaleBoxSelect={handleScaleBoxSelect}
          onClearScale={handleClearScale}
          lowerOctaves={lowerOctaves}
          higherOctaves={higherOctaves}
          onAddLowerOctave={handleAddLowerOctave}
          onRemoveLowerOctave={handleRemoveLowerOctave}
          onAddHigherOctave={handleAddHigherOctave}
          onRemoveHigherOctave={handleRemoveHigherOctave}
          keyboardSelectionMode={keyboardSelectionMode}
          onKeyboardSelectionModeChange={onKeyboardSelectionModeChange}
          onKeyboardScaleApply={handleKeyboardScaleApply}
          onKeyboardScaleClear={handleKeyboardScaleClear}
          flashingInputs={flashingInputs}
          triggerInputFlash={triggerInputFlash}
          setInputActive={setInputActive}
          selectedNotesCount={selectedNotes.length}
          appliedChordsCount={appliedChords.length}
          appliedScalesCount={appliedScales.length}
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
          onCurrentlyPlayingNoteChange={onCurrentlyPlayingNoteChange}
          currentlyPlayingNoteIndex={currentlyPlayingNoteIndex}
          hideInstrumentSelector={hideInstrumentSelector}
          hideOctaveRange={hideOctaveRange}
          hideBpmButtons={hideBpmButtons}
          hideBeatsButtons={hideBeatsButtons}
          hideGenerateButton={hideGenerateButton}
          hideChordMode={hideChordMode}
          disableBpmInput={disableBpmInput}
          disableBeatsInput={disableBeatsInput}
          disableChordMode={disableChordMode}
          onLessonComplete={onLessonComplete}
        />
      </div>

      <div className="instrument-container" data-practice-mode={practiceMode}>
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
          lowerOctaves={lowerOctaves}
          higherOctaves={higherOctaves}
          hideDeselectAll={hideDeselectAll}
          showOnlyAppliedList={showOnlyAppliedList}
          disableSelectionMode={disableSelectionMode}
          hideSelectionMode={hideSelectionMode}
          onFretboardPreviewChange={setFretboardPreview}
          onKeyboardPreviewChange={setKeyboardPreview}
          availableKeyboardNotes={availableKeyboardNotes}
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
          currentlyPlayingNote={currentlyPlayingNote}
          currentlyPlayingNoteNames={currentlyPlayingNoteNames}
          currentlyPlayingChordId={currentlyPlayingChordId}
          onScaleHandlersReady={setScaleHandlers}
          onBassScaleHandlersReady={setBassScaleHandlers}
          onChordHandlersReady={setChordHandlers}
          onBassChordHandlersReady={setBassChordHandlers}
          appliedScales={appliedScales}
          appliedChords={appliedChords}
          fretboardPreview={fretboardPreview}
          keyboardPreview={keyboardPreview}
        />
      </div>
    </>
  )
})

export default InstrumentDisplay