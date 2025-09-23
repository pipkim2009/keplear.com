import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import InstrumentControls from './InstrumentControls'
import ScaleChordOptions, { type AppliedChord } from '../common/ScaleChordOptions'
import NotesToggle from '../common/NotesToggle'
import { useRef, useState, useEffect } from 'react'
import type { Note } from '../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../utils/guitarScales'
import type { BassScale, BassScaleBox } from '../../utils/bassScales'
import type { KeyboardSelectionMode } from './InstrumentControls'
import { applyScaleToKeyboard, isKeyboardNoteInScale, isKeyboardNoteRoot, type KeyboardScale } from '../../utils/keyboardScales'
import { applyChordToKeyboard, isKeyboardNoteInChord, isKeyboardNoteChordRoot, type KeyboardChord } from '../../utils/keyboardChords'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { GuitarChord, ChordShape } from '../../utils/guitarChords'
import type { BassChord, BassChordShape } from '../../utils/bassChords'

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
  recordedAudioBlob
}) => {
  const guitarRef = useRef<any>(null)
  const bassRef = useRef<any>(null)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)
  const [currentKeyboardScale, setCurrentKeyboardScale] = useState<{ root: string; scale: KeyboardScale } | null>(null)
  const [currentKeyboardChord, setCurrentKeyboardChord] = useState<{ root: string; chord: KeyboardChord } | null>(null)
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedChordRoot, setSelectedChordRoot] = useState<string>('C')
  const [appliedChords, setAppliedChords] = useState<AppliedChord[]>([])
  const [scaleHandlers, setScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
  } | null>(null)
  const [bassScaleHandlers, setBassScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
  } | null>(null)
  const [chordHandlers, setChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null>(null)
  const [bassChordHandlers, setBassChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null>(null)

  const handleScaleSelect = (rootNote: string, scale: GuitarScale) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleSelect(rootNote, scale)
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleScaleSelect(rootNote, scale as any)
    }
  }

  const handleScaleBoxSelect = (scaleBox: ScaleBox) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleBoxSelect(scaleBox)
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleScaleBoxSelect(scaleBox as any)
    }
  }

  const handleClearScale = () => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleClearScale()
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleClearScale()
    }
  }

  // Chord handlers
  const handleChordSelect = (rootNote: string, chord: GuitarChord) => {
    // Apply the chord first
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordSelect(rootNote, chord)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordSelect(rootNote, chord as any)
    }

    // For now, just track the chord without note keys - we'll implement removal differently
    const chordId = `${instrument}-${rootNote}-${chord.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: rootNote,
      chord: chord,
      displayName: `${rootNote}${chord.name}`
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }

  const handleChordShapeSelect = (chordShape: ChordShape) => {
    // Apply the chord shape first
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordShapeSelect(chordShape)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordShapeSelect(chordShape as any)
    }

    // Track the chord shape
    const chordId = `${instrument}-shape-${chordShape.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: chordShape.root,
      chord: { name: chordShape.name, intervals: [] } as any, // Simplified for shapes
      displayName: chordShape.name
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }

  const handleClearChord = () => {
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    }
    // Clear applied chords list
    setAppliedChords([])
  }

  // Keyboard scale handlers
  const handleKeyboardScaleApply = (rootNote: string, scale: KeyboardScale) => {
    // Switch to multi-select mode automatically
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi')
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply scale to get scale notes
    const scaleNotes = applyScaleToKeyboard(rootNote, scale, currentNotes)

    // Add each scale note individually using selectNote in multi mode
    if (selectNote) {
      scaleNotes.forEach(note => {
        // Only add if not already selected
        if (!selectedNotes.some(selectedNote => selectedNote.name === note.name)) {
          selectNote(note, 'multi')
        }
      })
    } else {
      // Fallback to the old method if selectNote is not available
      setGuitarNotes(scaleNotes)
    }

    // Store current scale info for visual highlighting
    setCurrentKeyboardScale({ root: rootNote, scale })
  }

  const handleKeyboardScaleClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear scale info
    setCurrentKeyboardScale(null)
  }

  // Keyboard chord handlers
  const handleKeyboardChordApply = (rootNote: string, chord: KeyboardChord) => {
    // Switch to multi-select mode automatically
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi')
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply chord to get chord notes
    const chordNotes = applyChordToKeyboard(rootNote, chord, currentNotes)

    // Add each chord note individually using selectNote in multi mode
    if (selectNote) {
      chordNotes.forEach(note => {
        // Only add if not already selected
        if (!selectedNotes.some(selectedNote => selectedNote.name === note.name)) {
          selectNote(note, 'multi')
        }
      })
    } else {
      // Fallback to the old method if selectNote is not available
      const combinedNotes = [...selectedNotes, ...chordNotes]
      const uniqueNotes = Array.from(
        new Map(combinedNotes.map(note => [note.position, note])).values()
      )
      setGuitarNotes(uniqueNotes)
    }

    // Store current chord info for visual highlighting
    setCurrentKeyboardChord({ root: rootNote, chord })
    // Clear scale highlighting when chord is applied
    setCurrentKeyboardScale(null)

    // Add keyboard chord to applied chords list with the actual notes
    const chordId = `keyboard-${rootNote}-${chord.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: rootNote,
      chord: chord,
      displayName: `${rootNote}${chord.name}`,
      notes: chordNotes
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }

  const handleKeyboardChordClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear chord info
    setCurrentKeyboardChord(null)
    // Clear applied chords list
    setAppliedChords([])
  }

  // Handle deleting individual chords
  const handleChordDelete = (chordId: string) => {
    // For now, just clear all chords - we can implement selective removal later
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    } else if (instrument === 'keyboard') {
      // For keyboard, clear all selected notes
      clearSelection()
      setCurrentKeyboardChord(null)
    }

    // Remove from applied chords list
    setAppliedChords(prev => prev.filter(chord => chord.id !== chordId))
  }

  // Clear applied chords when instrument changes
  useEffect(() => {
    setAppliedChords([])
  }, [instrument])

  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
    // Update scale handlers if they exist (for guitar)
    // The selected root will be used when applying scales
  }

  const handleChordRootChange = (rootNote: string) => {
    setSelectedChordRoot(rootNote)
    // The selected root will be used when applying chords
  }

  // Helper functions for keyboard scale and chord highlighting
  const isNoteInKeyboardScale = (note: Note): boolean => {
    if (currentKeyboardScale) {
      return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
    }
    return false
  }

  const isNoteInKeyboardChord = (note: Note): boolean => {
    if (currentKeyboardChord) {
      return isKeyboardNoteInChord(note, currentKeyboardChord.root, currentKeyboardChord.chord)
    }
    return false
  }

  const isNoteKeyboardRoot = (note: Note): boolean => {
    if (currentKeyboardScale) {
      return isKeyboardNoteRoot(note, currentKeyboardScale.root)
    }
    return false
  }

  const isNoteKeyboardChordRoot = (note: Note): boolean => {
    if (currentKeyboardChord) {
      return isKeyboardNoteChordRoot(note, currentKeyboardChord.root)
    }
    return false
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  // Auto-reapply keyboard scale/chord when octave range changes (but not on initial application)
  useEffect(() => {
    if (currentKeyboardScale) {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Apply scale to get scale notes
      const scaleNotes = applyScaleToKeyboard(currentKeyboardScale.root, currentKeyboardScale.scale, currentNotes)

      // Set these notes as selected (this will trigger the melody system)
      setGuitarNotes(scaleNotes)
    } else if (currentKeyboardChord) {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Apply chord to get chord notes
      const chordNotes = applyChordToKeyboard(currentKeyboardChord.root, currentKeyboardChord.chord, currentNotes)

      // Set these notes as selected (this will trigger the melody system)
      setGuitarNotes(chordNotes)
    }
  }, [lowerOctaves, higherOctaves]) // Only depend on octave changes, not the scale/chord state

  return (
    <>
      <div className={`instrument-controls-container ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`}>
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
          />
      </div>

      <div className="instrument-container">
        {/* Instrument-specific controls above the instrument */}
        <div className="instrument-header-controls">
          <div className="header-controls-left">
            {instrument === 'keyboard' && (
              <div className="control-group">
                <label className="control-label">Selection Mode</label>
                <select
                  value={keyboardSelectionMode}
                  onChange={(e) => onKeyboardSelectionModeChange && onKeyboardSelectionModeChange(e.target.value as KeyboardSelectionMode)}
                  className={`control-input ${flashingInputs.mode ? 'flashing' : ''}`}
                >
                  <option value="range">Range Select</option>
                  <option value="multi">Multi Select</option>
                </select>
              </div>
            )}

            {/* Scale/Chord Options */}
            <div className="control-group scale-chord-options">
              <ScaleChordOptions
                instrument={instrument}
                onScaleSelect={handleScaleSelect}
                onScaleBoxSelect={handleScaleBoxSelect}
                onClearScale={handleClearScale}
                onChordSelect={handleChordSelect}
                onChordShapeSelect={handleChordShapeSelect}
                onClearChord={handleClearChord}
                onRootChange={handleRootChange}
                onChordRootChange={handleChordRootChange}
                selectedRoot={selectedRoot}
                selectedChordRoot={selectedChordRoot}
                onKeyboardScaleApply={handleKeyboardScaleApply}
                onKeyboardScaleClear={handleKeyboardScaleClear}
                onKeyboardChordApply={handleKeyboardChordApply}
                onKeyboardChordClear={handleKeyboardChordClear}
                appliedChords={appliedChords}
                onChordDelete={handleChordDelete}
              />
            </div>

            {/* Deselect All button */}
            {selectedNotes.length > 0 && (
              <div className="control-group">
                <button
                  onClick={() => {
                    clearSelection()
                  }}
                  className="control-button delete-selection"
                  title="Clear selected notes and scales"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
                  </svg>
                  Deselect All
                </button>
              </div>
            )}

            {hasGeneratedMelody && (
              <div className="control-group">
                <button
                  className="notes-toggle-container control-input"
                  onClick={onToggleNotes}
                  title={showNotes ? 'Hide notes' : 'Reveal notes'}
                  aria-label={showNotes ? 'Hide notes' : 'Reveal notes'}
                >
                  <NotesToggle showNotes={showNotes} onToggle={() => {}} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="instrument-wrapper">
          {instrument === 'keyboard' ? (
            <Keyboard
              onNoteClick={onNoteClick}
              isSelected={isSelected}
              isInMelody={isInMelody}
              showNotes={showNotes}
              lowerOctaves={lowerOctaves}
              higherOctaves={higherOctaves}
              selectionMode={keyboardSelectionMode}
              isNoteInScale={isNoteInKeyboardScale}
              isNoteRoot={isNoteKeyboardRoot}
              isNoteInChord={isNoteInKeyboardChord}
              isNoteChordRoot={isNoteKeyboardChordRoot}
            />
          ) : instrument === 'guitar' ? (
            <Guitar
              setGuitarNotes={setGuitarNotes}
              isInMelody={isInMelody}
              showNotes={showNotes}
              onNoteClick={onNoteClick}
              clearTrigger={clearTrigger}
              onScaleHandlersReady={setScaleHandlers}
              onChordHandlersReady={setChordHandlers}
            />
          ) : (
            <Bass
              setBassNotes={setBassNotes || setGuitarNotes}
              isInMelody={isInMelody}
              showNotes={showNotes}
              onNoteClick={onNoteClick}
              clearTrigger={clearTrigger}
              onScaleHandlersReady={setBassScaleHandlers}
              onChordHandlersReady={setBassChordHandlers}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default InstrumentDisplay