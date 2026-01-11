/**
 * Utility functions for determining guitar/bass note styling classes
 * Extracts complex conditional logic from component rendering
 */

export interface NoteStyleContext {
  isCurrentlyPlaying: boolean
  isInGeneratedMelody: boolean
  isInManual: boolean
  isInScale: boolean
  isInChord: boolean
  isScaleRoot: boolean
  isChordRoot: boolean
}

/**
 * Determines the CSS class for a note based on its various states
 * Handles all combinations of manual selection, scale/chord membership, and root status
 */
export function getNoteStyleClass(context: NoteStyleContext): string {
  const {
    isCurrentlyPlaying,
    isInGeneratedMelody,
    isInManual,
    isInScale,
    isInChord,
    isScaleRoot,
    isChordRoot
  } = context

  let noteClass = 'note-circle'

  if (isCurrentlyPlaying) {
    return noteClass + ' currently-playing'
  }

  if (isInGeneratedMelody) {
    return noteClass + ' melody-note'
  }

  const isAnyRoot = isChordRoot || isScaleRoot

  if (isInManual) {
    noteClass += getManualNoteClass(isScaleRoot, isChordRoot, isAnyRoot, isInScale, isInChord)
  } else {
    noteClass += getNonManualNoteClass(isScaleRoot, isChordRoot, isInScale, isInChord)
  }

  return noteClass
}

/**
 * Gets the style class suffix for notes in the manual layer
 */
function getManualNoteClass(
  isScaleRoot: boolean,
  isChordRoot: boolean,
  isAnyRoot: boolean,
  isInScale: boolean,
  isInChord: boolean
): string {
  // Both roots - just red + blue
  if (isScaleRoot && isChordRoot) {
    return ' manual-scale-root'
  }

  // Root + scale note + chord note - all 4 colors
  if (isAnyRoot && isInChord && isInScale) {
    return ' manual-scale-chord-root-note'
  }

  // Root + chord note - red + purple + blue
  if (isAnyRoot && isInChord) {
    return ' manual-chord-root-note'
  }

  // Scale note + chord note - purple + orange + blue
  if (isInChord && isInScale) {
    return ' manual-scale-chord-note'
  }

  // Just root - red + blue
  if (isAnyRoot) {
    return isScaleRoot ? ' manual-scale-root' : ' manual-chord-root'
  }

  // Just scale - orange + blue
  if (isInScale) {
    return ' manual-scale-note'
  }

  // Just chord - purple + blue
  if (isInChord) {
    return ' manual-chord-note'
  }

  // Just manual - blue
  return ' manual-note'
}

/**
 * Gets the style class suffix for notes not in the manual layer
 */
function getNonManualNoteClass(
  isScaleRoot: boolean,
  isChordRoot: boolean,
  isInScale: boolean,
  isInChord: boolean
): string {
  // Both roots - stays red
  if (isChordRoot && isScaleRoot) {
    return ' chord-root-scale-root'
  }

  // Chord root + scale note - red + orange mix
  if (isChordRoot && isInScale) {
    return ' chord-root-scale-note'
  }

  // Chord note + scale root - purple + red mix
  if (isInChord && isScaleRoot) {
    return ' chord-note-scale-root'
  }

  // Just chord root
  if (isChordRoot) {
    return ' chord-root-note'
  }

  // Just scale root
  if (isScaleRoot) {
    return ' scale-root-note'
  }

  // Regular chord note + scale note - purple + orange mix
  if (isInChord && isInScale) {
    return ' chord-scale-note'
  }

  // Just chord note
  if (isInChord) {
    return ' chord-note'
  }

  // Just scale note
  if (isInScale) {
    return ' scale-note'
  }

  return ''
}
