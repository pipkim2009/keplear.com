/**
 * Utility functions for building AppliedScale[] and AppliedChord[] from serialized exercise data.
 *
 * This consolidates the duplicated scale/chord reconstruction logic that was repeated 5+ times
 * across Classroom.tsx (handleEditAssignment, handleSwitchExercise, handleSwitchLessonExercise,
 * pending selection effect, etc.), Sandbox.tsx, and DailyChallenge.tsx.
 */

import type { Note } from './notes'
import { generateNotesWithSeparateOctaves } from './notes'
import type { AppliedScale, AppliedChord } from '../components/common/ScaleChordOptions'
import type { SerializedScaleData, SerializedChordData } from '../types/exercise'
import { KEYBOARD_SCALES, applyScaleToKeyboard } from './instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, applyChordToKeyboard } from './instruments/keyboard/keyboardChords'
import { GUITAR_SCALES, getScalePositions } from './instruments/guitar/guitarScales'
import { getChordBoxes } from './instruments/guitar/guitarChords'
import { guitarNotes } from './instruments/guitar/guitarNotes'
import { BASS_SCALES, getBassScalePositions } from './instruments/bass/bassScales'
import { getBassChordBoxes } from './instruments/bass/bassChords'
import { bassNotes } from './instruments/bass/bassNotes'
import { getGuitarNoteById, getBassNoteById } from './practice/practiceNotes'

/**
 * Build AppliedScale[] from serialized data for keyboard.
 * Applies full octave range and filters to specific octave.
 */
export function buildKeyboardScales(scaleDataList: SerializedScaleData[]): AppliedScale[] {
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

/**
 * Build AppliedChord[] from serialized data for keyboard.
 */
export function buildKeyboardChords(chordDataList: SerializedChordData[]): AppliedChord[] {
  const fullRangeNotes = generateNotesWithSeparateOctaves(3, 3)
  return chordDataList
    .map(chordData => {
      const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
      if (!chordObj) return null
      const octave = chordData.octave || 4
      const displayName = `${chordData.root} ${chordObj.name} (Octave ${octave})`
      let chordNotes = applyChordToKeyboard(chordData.root, chordObj, fullRangeNotes)
      chordNotes = chordNotes.filter(note => {
        const noteOctave = parseInt(note.name.replace(/[^0-9]/g, ''), 10)
        return noteOctave === octave
      })
      return {
        id: `keyboard-${chordData.root}-${chordObj.name}-${octave}-${Date.now()}-${Math.random()}`,
        root: chordData.root,
        chord: chordObj,
        displayName,
        notes: chordNotes,
        octave,
      } as AppliedChord
    })
    .filter((c): c is AppliedChord => c !== null)
}

/** Parse fret range from a display name like "C Major (Frets 0-4)" */
function parseFretRange(displayName: string | undefined): {
  fretLow: number
  fretHigh: number
  match: RegExpMatchArray | null
} {
  const match = (displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
  return {
    fretLow: match ? parseInt(match[1], 10) : 0,
    fretHigh: match ? parseInt(match[2], 10) : 24,
    match,
  }
}

/** Strip fret range suffix from scale name */
function stripFretRangeSuffix(name: string): string {
  return name.replace(/\s*\(Frets \d+-\d+\)$/, '')
}

/**
 * Build AppliedScale[] from serialized data for guitar.
 */
export function buildGuitarScales(scaleDataList: SerializedScaleData[]): AppliedScale[] {
  const result: AppliedScale[] = []
  for (const scaleData of scaleDataList) {
    const { fretLow, fretHigh, match } = parseFretRange(scaleData.displayName)
    const baseScaleName = stripFretRangeSuffix(scaleData.scaleName)
    const scaleObj = GUITAR_SCALES.find(
      s => s.name === baseScaleName || s.name === scaleData.scaleName
    )
    if (!scaleObj) continue
    const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
    const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
    const scaleNotes: Note[] = positions.map(pos => {
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
    const fretInfo = match ? ` (Frets ${fretLow}-${fretHigh})` : ''
    result.push({
      id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
      root: scaleData.root,
      scale: scaleObj,
      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
      notes: scaleNotes,
    })
  }
  return result
}

/**
 * Build AppliedScale[] from serialized data for bass.
 */
export function buildBassScales(scaleDataList: SerializedScaleData[]): AppliedScale[] {
  const result: AppliedScale[] = []
  for (const scaleData of scaleDataList) {
    const { fretLow, fretHigh, match } = parseFretRange(scaleData.displayName)
    const baseScaleName = stripFretRangeSuffix(scaleData.scaleName)
    const scaleObj = BASS_SCALES.find(
      s => s.name === baseScaleName || s.name === scaleData.scaleName
    )
    if (!scaleObj) continue
    const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
    const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
    const scaleNotes: Note[] = positions.map(pos => {
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
    const fretInfo = match ? ` (Frets ${fretLow}-${fretHigh})` : ''
    result.push({
      id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
      root: scaleData.root,
      scale: scaleObj,
      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
      notes: scaleNotes,
    })
  }
  return result
}

/**
 * Build AppliedChord[] from serialized data for guitar.
 */
export function buildGuitarChords(chordDataList: SerializedChordData[]): AppliedChord[] {
  const result: AppliedChord[] = []
  for (const chordData of chordDataList) {
    const chordBoxes = getChordBoxes(chordData.root, chordData.chordName)
    const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
    if (!chordBox) continue
    const chordNotes: Note[] = chordBox.positions.map(pos => {
      const noteId = `g-s${pos.string}-f${pos.fret}`
      const guitarNote = getGuitarNoteById(noteId)
      return {
        id: noteId,
        name: guitarNote?.name || '',
        frequency: guitarNote?.frequency || 0,
        isBlack: guitarNote?.isBlack || false,
        position: guitarNote?.position || 0,
        __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
      }
    })
    result.push({
      id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
      root: chordData.root,
      chord: { name: chordData.chordName, intervals: [] },
      displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
      notes: chordNotes,
    })
  }
  return result
}

/**
 * Build AppliedChord[] from serialized data for bass.
 */
export function buildBassChords(chordDataList: SerializedChordData[]): AppliedChord[] {
  const result: AppliedChord[] = []
  for (const chordData of chordDataList) {
    const chordBoxes = getBassChordBoxes(chordData.root, chordData.chordName)
    const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
    if (!chordBox) continue
    const chordNotes: Note[] = chordBox.positions.map(pos => {
      const noteId = `b-s${pos.string}-f${pos.fret}`
      const bassNote = getBassNoteById(noteId)
      return {
        id: noteId,
        name: bassNote?.name || '',
        frequency: bassNote?.frequency || 0,
        isBlack: bassNote?.isBlack || false,
        position: bassNote?.position || 0,
        __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
      }
    })
    result.push({
      id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
      root: chordData.root,
      chord: { name: chordData.chordName, intervals: [] },
      displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
      notes: chordNotes,
    })
  }
  return result
}

/**
 * Build AppliedScale[] for any instrument from serialized data.
 * Dispatches to the instrument-specific builder.
 */
export function buildScalesForInstrument(
  instrument: string,
  scaleDataList: SerializedScaleData[]
): AppliedScale[] {
  if (!scaleDataList?.length) return []
  switch (instrument) {
    case 'keyboard':
      return buildKeyboardScales(scaleDataList)
    case 'guitar':
      return buildGuitarScales(scaleDataList)
    case 'bass':
      return buildBassScales(scaleDataList)
    default:
      return []
  }
}

/**
 * Build AppliedChord[] for any instrument from serialized data.
 * Dispatches to the instrument-specific builder.
 */
export function buildChordsForInstrument(
  instrument: string,
  chordDataList: SerializedChordData[]
): AppliedChord[] {
  if (!chordDataList?.length) return []
  switch (instrument) {
    case 'keyboard':
      return buildKeyboardChords(chordDataList)
    case 'guitar':
      return buildGuitarChords(chordDataList)
    case 'bass':
      return buildBassChords(chordDataList)
    default:
      return []
  }
}
