import Home from './pages/Home'
import InstrumentDisplay from './keyboard/InstrumentDisplay'
import type { Note } from '../utils/notes'
import type { KeyboardSelectionMode } from './keyboard/InstrumentControls'

interface RouterProps {
  currentPage: string
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void

  // Sandbox page props
  onNoteClick: (note: Note) => Promise<void>
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (notes: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
  setGuitarNotes: (notes: Note[]) => void
  clearSelection: () => void
  clearTrigger: number
  selectedNotes: Note[]
  selectNote: (note: Note, selectionMode?: 'range' | 'multi') => void
  onOctaveRangeChange: (lower: number, higher: number) => void
  keyboardSelectionMode: KeyboardSelectionMode
  onKeyboardSelectionModeChange: (mode: KeyboardSelectionMode) => void
  flashingInputs: {
    bpm: boolean
    notes: boolean
    mode: boolean
  }
  triggerInputFlash: (inputType: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'notes' | 'mode', active: boolean) => void
  clearChordsAndScales: number
  onGenerateMelody: () => void
  onPlayMelody: () => void
  onRecordMelody: () => Promise<Blob | null>
  isPlaying: boolean
  isRecording: boolean
  hasGeneratedMelody: boolean
  onToggleNotes: () => void
  playbackProgress: number
  melodyDuration: number
  onProgressChange: (progress: number) => void
  onClearRecordedAudio: () => void
  recordedAudioBlob: Blob | null
  generatedMelody: Note[]
}

/**
 * Router component that handles page navigation and renders appropriate content
 * Extracted from App.tsx to reduce complexity and improve separation of concerns
 */
function Router({
  currentPage,
  onNavigateToSandbox,
  onNavigateToPractice,
  ...sandboxProps
}: RouterProps) {
  switch (currentPage) {
    case 'home':
      return (
        <Home
          onNavigateToSandbox={onNavigateToSandbox}
          onNavigateToPractice={onNavigateToPractice}
        />
      )

    case 'sandbox':
      return (
        <InstrumentDisplay
          onNoteClick={(note: Note) => sandboxProps.onNoteClick(note)}
          isSelected={sandboxProps.isSelected}
          isInMelody={sandboxProps.isInMelody}
          showNotes={sandboxProps.showNotes}
          bpm={sandboxProps.bpm}
          setBpm={sandboxProps.setBpm}
          numberOfNotes={sandboxProps.numberOfNotes}
          setNumberOfNotes={sandboxProps.setNumberOfNotes}
          instrument={sandboxProps.instrument}
          setInstrument={sandboxProps.setInstrument}
          setGuitarNotes={sandboxProps.setGuitarNotes}
          clearSelection={sandboxProps.clearSelection}
          clearTrigger={sandboxProps.clearTrigger}
          selectedNotes={sandboxProps.selectedNotes}
          selectNote={sandboxProps.selectNote}
          onOctaveRangeChange={sandboxProps.onOctaveRangeChange}
          keyboardSelectionMode={sandboxProps.keyboardSelectionMode}
          onKeyboardSelectionModeChange={sandboxProps.onKeyboardSelectionModeChange}
          flashingInputs={sandboxProps.flashingInputs}
          triggerInputFlash={sandboxProps.triggerInputFlash}
          setInputActive={sandboxProps.setInputActive}
          clearChordsAndScales={sandboxProps.clearChordsAndScales}
          onGenerateMelody={sandboxProps.onGenerateMelody}
          onPlayMelody={sandboxProps.onPlayMelody}
          onRecordMelody={sandboxProps.onRecordMelody}
          isPlaying={sandboxProps.isPlaying}
          isRecording={sandboxProps.isRecording}
          hasGeneratedMelody={sandboxProps.hasGeneratedMelody}
          onToggleNotes={sandboxProps.onToggleNotes}
          playbackProgress={sandboxProps.playbackProgress}
          melodyDuration={sandboxProps.melodyDuration}
          onProgressChange={sandboxProps.onProgressChange}
          onClearRecordedAudio={sandboxProps.onClearRecordedAudio}
          recordedAudioBlob={sandboxProps.recordedAudioBlob}
          generatedMelody={sandboxProps.generatedMelody}
        />
      )

    case 'practice':
      return (
        <div className="practice-page">
          <div className="coming-soon">
            <h2>Practice Mode</h2>
            <p>Coming soon! This will include structured exercises and progress tracking.</p>
            <button className="button" onClick={onNavigateToSandbox}>
              Try Sandbox Mode
            </button>
          </div>
        </div>
      )

    default:
      return (
        <Home
          onNavigateToSandbox={onNavigateToSandbox}
          onNavigateToPractice={onNavigateToPractice}
        />
      )
  }
}

export default Router