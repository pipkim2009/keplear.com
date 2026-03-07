/**
 * Daily Challenge Page - Multi-exercise player for daily challenges
 * Matches Classroom.tsx lesson-taking patterns exactly for consistent UX
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { ExerciseData } from '../../types/exercise'
import type { InstrumentType } from '../../types/instrument'
import {
  KEYBOARD_SCALES,
  applyScaleToKeyboard,
} from '../../utils/instruments/keyboard/keyboardScales'
import { GUITAR_SCALES, getScalePositions } from '../../utils/instruments/guitar/guitarScales'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, getBassScalePositions } from '../../utils/instruments/bass/bassScales'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import {
  getGuitarNoteById,
  getBassNoteById,
  getKeyboardNoteById,
} from '../../utils/practice/practiceNotes'
import { useRecordPracticeSession } from '../../hooks/usePracticeSessions'
import AssignmentComplete from '../sandbox/AssignmentComplete'
import WelcomeSubtitle from '../sandbox/WelcomeSubtitle'
import type { AppliedScale } from '../common/ScaleChordOptions'
import { getExerciseCategoryInfo } from '../../utils/exercisePresets'
import {
  generateDailyChallenge,
  markDailyChallengeCompleted,
  getTodayDateString,
} from '../../utils/dailyChallengeGenerator'
import { PiBrainFill, PiPianoKeysFill, PiMusicNotesFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import practiceStyles from '../../styles/Practice.module.css'

// Serialized scale data shape (from exercise appliedScales)
interface SerializedScaleData {
  root: string
  scaleName: string
  octave?: number
  displayName?: string
}

// Build keyboard AppliedScale from serialized data (same as Classroom.tsx)
function buildAppliedScalesFromData(scaleDataList: SerializedScaleData[]): AppliedScale[] {
  const fullRangeNotes = generateNotesWithSeparateOctaves(3, 3)
  return scaleDataList
    .map(scaleData => {
      const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
      if (!scaleObj) return null
      const octave = scaleData.octave || 4
      const displayName = `${scaleData.root} ${scaleObj.name} (Octave ${octave})`
      let scaleNotes = applyScaleToKeyboard(scaleData.root, scaleObj, fullRangeNotes)
      scaleNotes = scaleNotes.filter(note => {
        const noteOctave = parseInt(note.name.replace(/[^0-9]/g, ''), 10)
        return noteOctave === octave
      })
      return {
        id: `${scaleData.root}-${scaleObj.name}-${octave}-${Date.now()}-${Math.random()}`,
        root: scaleData.root,
        scale: scaleObj,
        displayName,
        notes: scaleNotes,
        octave,
      } as AppliedScale
    })
    .filter((s): s is AppliedScale => s !== null)
}

function DailyChallenge() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recordPracticeSession = useRecordPracticeSession()

  // Read instrument from localStorage
  const savedInstrument = (localStorage.getItem('dailyChallengeInstrument') ||
    'keyboard') as InstrumentType

  // Generate challenge data
  const todayDate = getTodayDateString()
  const challenge = useMemo(
    () => generateDailyChallenge(savedInstrument, todayDate),
    [savedInstrument, todayDate]
  )

  // Exercise state (mirrors Classroom.tsx lesson state)
  const [exercises] = useState<ExerciseData[]>(challenge.exercises)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [showAssignmentComplete, setShowAssignmentComplete] = useState(false)
  const [externalSelectedNoteIds, setExternalSelectedNoteIds] = useState<string[]>([])
  const [pendingSelectionData, setPendingSelectionData] = useState<{
    instrument: string
    selectionData: ExerciseData
  } | null>(null)

  // Speech flow state (two-phase: generic welcome → exercise transcript)
  const [genericWelcomeDone, setGenericWelcomeDone] = useState(false)
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const [autoPlayAudio, setAutoPlayAudio] = useState(false)
  const hasAnnouncedMelody = useRef(false)

  // Refs (same pattern as Classroom.tsx)
  const completedExercisesRef = useRef(0)
  const hasInitializedNotes = useRef(false)
  const hasRecordedProgressRef = useRef(false)

  // useInstrument context
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
    setInstrument,
    setGuitarNotes,
    clearSelection,
    clearTrigger,
    selectedNotes,
    selectNote,
    handleOctaveRangeChange,
    flashingInputs,
    activeInputs,
    triggerInputFlash,
    setInputActive,
    clearChordsAndScalesTrigger,
    triggerClearChordsAndScales,
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
    handleCurrentlyPlayingNoteChange,
    scaleChordManagement,
  } = useInstrument()

  // Set instrument on mount
  useEffect(() => {
    if (savedInstrument !== instrument) {
      setInstrument(savedInstrument)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply first exercise on mount (same pattern as Classroom hasInitializedNotes)
  useEffect(() => {
    if (hasInitializedNotes.current || exercises.length === 0) return
    hasInitializedNotes.current = true

    const currentExercise = exercises[0]
    if (currentExercise.bpm) setBpm(currentExercise.bpm)
    if (currentExercise.beats) setNumberOfBeats(currentExercise.beats)
    if (currentExercise.chordMode) setChordMode(currentExercise.chordMode)

    if (savedInstrument === 'keyboard') {
      handleOctaveRangeChange(0, 0)
      if (currentExercise.appliedScales?.length > 0) {
        const scales = buildAppliedScalesFromData(currentExercise.appliedScales)
        scaleChordManagement.setAppliedScalesDirectly(scales)
      }
      if (currentExercise.selectedNoteIds?.length > 0) {
        currentExercise.selectedNoteIds.forEach(noteId => {
          const noteObj = getKeyboardNoteById(noteId, 0, 0)
          if (noteObj) selectNote(noteObj, 'multi')
        })
      }
    } else {
      setPendingSelectionData({
        instrument: savedInstrument,
        selectionData: currentExercise,
      })
    }
  }, [
    exercises,
    savedInstrument,
    setBpm,
    setNumberOfBeats,
    setChordMode,
    handleOctaveRangeChange,
    scaleChordManagement,
    selectNote,
  ])

  // Apply pending selection data for guitar/bass (same as Classroom lines 3692-3866)
  useEffect(() => {
    if (!pendingSelectionData) return

    const { instrument: pendingInstrument, selectionData } = pendingSelectionData

    const applyTimeoutId = setTimeout(() => {
      // Apply scales
      if (selectionData.appliedScales?.length > 0) {
        const scalesToApply: AppliedScale[] = []

        if (pendingInstrument === 'guitar') {
          selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
            const scaleObj = GUITAR_SCALES.find(s => s.name === scaleData.scaleName)
            if (scaleObj) {
              const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
              const positions = allPositions.filter(pos => pos.fret >= 0 && pos.fret <= 12)
              const scaleNotes = positions.map(pos => {
                const noteId = `g-s${pos.string}-f${pos.fret}`
                const guitarNote = getGuitarNoteById(noteId)
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: guitarNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: guitarNote?.position || 0,
                  __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                }
              })
              scalesToApply.push({
                id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj,
                displayName: scaleData.displayName || `${scaleData.root} ${scaleObj.name}`,
                notes: scaleNotes,
              })
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
            const scaleObj = BASS_SCALES.find(s => s.name === scaleData.scaleName)
            if (scaleObj) {
              const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
              const positions = allPositions.filter(pos => pos.fret >= 0 && pos.fret <= 12)
              const scaleNotes = positions.map(pos => {
                const noteId = `b-s${pos.string}-f${pos.fret}`
                const bassNote = getBassNoteById(noteId)
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: bassNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: bassNote?.position || 0,
                  __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                }
              })
              scalesToApply.push({
                id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj,
                displayName: scaleData.displayName || `${scaleData.root} ${scaleObj.name}`,
                notes: scaleNotes,
              })
            }
          })
        }

        if (scalesToApply.length > 0) {
          scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
        }
      }

      // Apply notes - set external note IDs for Guitar/Bass
      const validNoteIds = (selectionData.selectedNoteIds || []).filter(
        (id: string | null) => id !== null
      ) as string[]
      if (validNoteIds.length > 0) {
        setExternalSelectedNoteIds(validNoteIds)
      }

      setPendingSelectionData(null)
    }, 0)

    return () => clearTimeout(applyTimeoutId)
  }, [pendingSelectionData, scaleChordManagement])

  // Switch exercise (same pattern as Classroom handleSwitchLessonExercise)
  const handleSwitchExercise = useCallback(
    (index: number) => {
      if (index === exerciseIndex || index < 0 || index >= exercises.length) return

      // Clear current content
      clearSelection()
      triggerClearChordsAndScales()
      scaleChordManagement.setAppliedScalesDirectly([])
      scaleChordManagement.setAppliedChordsDirectly([])
      setExternalSelectedNoteIds([])

      // Reset melody and speech state for new exercise
      setHasGeneratedMelody(false)
      setAutoPlayAudio(false)
      hasAnnouncedMelody.current = false

      const targetExercise = exercises[index]

      // If no transcript, mark speech as done immediately
      if (!targetExercise?.transcript) {
        setWelcomeSpeechDone(true)
      } else {
        setWelcomeSpeechDone(false)
      }
      setGenericWelcomeDone(false)

      // Apply BPM, beats, chord mode
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      handleOctaveRangeChange(targetExercise.lowerOctaves ?? 0, targetExercise.higherOctaves ?? 0)

      if (savedInstrument === 'keyboard') {
        if (targetExercise.appliedScales?.length > 0) {
          const scales = buildAppliedScalesFromData(targetExercise.appliedScales)
          scaleChordManagement.setAppliedScalesDirectly(scales)
        }
        if (targetExercise.selectedNoteIds?.length > 0) {
          targetExercise.selectedNoteIds.forEach(noteId => {
            const noteObj = getKeyboardNoteById(
              noteId,
              targetExercise.lowerOctaves ?? 0,
              targetExercise.higherOctaves ?? 0
            )
            if (noteObj) selectNote(noteObj, 'multi')
          })
        }
      } else {
        setPendingSelectionData({
          instrument: savedInstrument,
          selectionData: targetExercise,
        })
      }

      setExerciseIndex(index)
    },
    [
      exerciseIndex,
      exercises,
      clearSelection,
      triggerClearChordsAndScales,
      scaleChordManagement,
      savedInstrument,
      setBpm,
      setNumberOfBeats,
      setChordMode,
      handleOctaveRangeChange,
      selectNote,
    ]
  )

  // Handle exercise completion (same pattern as Classroom handleExerciseComplete)
  const handleExerciseComplete = useCallback(() => {
    completedExercisesRef.current += 1

    if (exerciseIndex < exercises.length - 1) {
      handleSwitchExercise(exerciseIndex + 1)
    } else {
      // All exercises done - show completion
      setShowAssignmentComplete(true)
      markDailyChallengeCompleted(todayDate)
      hasRecordedProgressRef.current = true
      recordPracticeSession.mutate({
        type: 'generator',
        instrument: savedInstrument,
        melodiesCompleted: exercises.length,
      })
    }
  }, [
    exerciseIndex,
    exercises.length,
    handleSwitchExercise,
    todayDate,
    savedInstrument,
    recordPracticeSession,
  ])

  // Handle end lesson (back button — records partial progress like Classroom)
  const handleEndLesson = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    // Record partial progress if any exercises completed
    if (!hasRecordedProgressRef.current && completedExercisesRef.current > 0) {
      hasRecordedProgressRef.current = true
      recordPracticeSession.mutate({
        type: 'generator',
        instrument: savedInstrument,
        melodiesCompleted: completedExercisesRef.current,
      })
    }

    navigate('/dashboard')
  }, [navigate, savedInstrument, recordPracticeSession])

  // Auto-generate melody when notes are selected (same as Classroom)
  useEffect(() => {
    const hasContent = selectedNotes.length > 0 || scaleChordManagement.appliedScales.length > 0

    if (hasContent && !hasGeneratedMelody) {
      const timeoutId = setTimeout(() => {
        handleGenerateMelody()
        setHasGeneratedMelody(true)
      }, 150)
      return () => clearTimeout(timeoutId)
    }
  }, [
    selectedNotes.length,
    scaleChordManagement.appliedScales.length,
    hasGeneratedMelody,
    handleGenerateMelody,
  ])

  // When generic welcome is done, check if there's a transcript (same as Classroom)
  useEffect(() => {
    if (genericWelcomeDone && !welcomeSpeechDone) {
      const currentEx = exercises[exerciseIndex]
      const hasTranscript = (currentEx?.transcript || '').trim().length > 0
      if (!hasTranscript) {
        setWelcomeSpeechDone(true)
      }
    }
  }, [genericWelcomeDone, welcomeSpeechDone, exercises, exerciseIndex])

  // Auto-play when speech is done and melody ready (same as Classroom)
  useEffect(() => {
    if (
      welcomeSpeechDone &&
      generatedMelody.length > 0 &&
      recordedAudioBlob &&
      !hasAnnouncedMelody.current
    ) {
      hasAnnouncedMelody.current = true
      setAutoPlayAudio(true)
    }
  }, [welcomeSpeechDone, generatedMelody, recordedAudioBlob])

  // Handle completion animation done
  const handleAssignmentCompleteFinish = useCallback(() => {
    setShowAssignmentComplete(false)
    navigate('/dashboard')
  }, [navigate])

  // Computed values for render (same pattern as Classroom lines 4113-4139)
  const currentExercise = exercises[exerciseIndex]
  const genericWelcomeMessage = !genericWelcomeDone
    ? `${challenge.title}: ${challenge.description}`
    : ''
  const customTranscript = genericWelcomeDone ? currentExercise?.transcript || '' : ''

  const hasNoScalesOrChords =
    !currentExercise ||
    ((currentExercise.appliedScales?.length ?? 0) === 0 &&
      (currentExercise.appliedChords?.length ?? 0) === 0)
  const hasChords = currentExercise && (currentExercise.appliedChords?.length ?? 0) > 0
  const hasScales = currentExercise && (currentExercise.appliedScales?.length ?? 0) > 0
  const hasBothScalesAndChords = hasScales && hasChords
  const hasMultipleExercises = exercises.length > 1

  return (
    <>
      <SEOHead title="Daily Challenge | Keplear" description="Practice today's daily challenge" />

      {/* Back button (same as Classroom practiceStyles) */}
      <div className={practiceStyles.backButtonContainer}>
        <button
          className={practiceStyles.backButton}
          onClick={handleEndLesson}
          aria-label="End practice session"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Timeline for multi-exercise lessons (same as Classroom) */}
      {hasMultipleExercises && (
        <div className={practiceStyles.exerciseTimelineBar}>
          <span className={practiceStyles.exerciseTimelineLabel}>{t('classroom.timeline')}</span>
          <div
            className={`${practiceStyles.exerciseTimeline} ${practiceStyles.exerciseTimelineLesson}`}
          >
            <div className={practiceStyles.exerciseTimelineLine} />
            <div className={practiceStyles.exerciseCircles}>
              {exercises.map((exercise, index) => {
                const catInfo = getExerciseCategoryInfo(exercise)
                let LessonIcon = PiBrainFill
                let lColor = '#e53e3e'
                if (catInfo.category === 'practice' || catInfo.category === 'chord-progression') {
                  lColor = '#f59e0b'
                  if (instrument === 'keyboard') LessonIcon = PiPianoKeysFill
                  else if (instrument === 'guitar') LessonIcon = GiGuitarHead
                  else if (instrument === 'bass') LessonIcon = GiGuitarBassHead
                  else LessonIcon = PiMusicNotesFill
                }
                return (
                  <div
                    key={exercise.id}
                    className={`${practiceStyles.exerciseCircle} ${index === exerciseIndex ? practiceStyles.exerciseCircleActive : ''} ${index < exerciseIndex ? practiceStyles.exerciseCircleCompleted : ''}`}
                    title={exercise.name}
                    style={{
                      cursor: 'default',
                      background: index === exerciseIndex ? lColor : undefined,
                      borderColor: lColor,
                      color: '#fff',
                    }}
                  >
                    <LessonIcon size={14} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* InstrumentDisplay (same props as Classroom lesson-taking view) */}
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
        initialLowerOctaves={0}
        initialHigherOctaves={0}
        disableOctaveCleanup={true}
        externalSelectedNoteIds={externalSelectedNoteIds}
        flashingInputs={{
          bpm: flashingInputs.bpm || activeInputs.bpm,
          beats: flashingInputs.beats || activeInputs.beats,
          mode: flashingInputs.mode || activeInputs.mode,
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
        hideInstrumentSelector={true}
        hideOctaveRange={savedInstrument !== 'keyboard'}
        disableOctaveRange={true}
        hideBpmButtons={false}
        hideBeatsButtons={false}
        hideGenerateButton={true}
        hideDeselectAll={true}
        showOnlyAppliedList={true}
        hideChordMode={!hasChords}
        disableBpmInput={true}
        disableBeatsInput={true}
        disableChordMode={true}
        practiceMode={true}
        autoPlayAudio={autoPlayAudio}
        autoStartFeedback={true}
        lessonType={
          hasBothScalesAndChords
            ? undefined
            : hasScales
              ? 'melodies'
              : hasChords
                ? 'chords'
                : undefined
        }
        hideScalesChords={hasNoScalesOrChords}
        onLessonComplete={handleExerciseComplete}
      />

      {/* Two-phase speech: generic welcome → exercise transcript (same as Classroom) */}
      {genericWelcomeMessage && (
        <WelcomeSubtitle
          message={genericWelcomeMessage}
          onSpeechEnd={() => setGenericWelcomeDone(true)}
        />
      )}
      {customTranscript && (
        <WelcomeSubtitle
          message={customTranscript}
          onSpeechEnd={() => setWelcomeSpeechDone(true)}
        />
      )}

      {/* Assignment Complete Animation (portaled to body, same as Classroom) */}
      {showAssignmentComplete &&
        createPortal(
          <AssignmentComplete onComplete={handleAssignmentCompleteFinish} />,
          document.body
        )}
    </>
  )
}

export default DailyChallenge
