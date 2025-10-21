import type { Note } from '../utils/notes'
import { GUITAR_CHORDS } from '../utils/instruments/guitar/guitarChords'
import '../styles/MelodyDisplay.css'

interface MelodyDisplayProps {
  generatedMelody: Note[]
  showNotes: boolean
  chordMode?: 'arpeggiator' | 'progression'
  currentlyPlayingNoteIndex?: number | null
}

// Function to detect chord name from a set of notes
const detectChordName = (notes: string[]): string => {
  // Remove octave numbers and get unique note names
  const uniqueNotes = [...new Set(notes.map(n => n.replace(/\d+$/, '')))].sort()

  if (uniqueNotes.length === 0) return ''
  if (uniqueNotes.length === 1) return uniqueNotes[0]

  // Try to match against known chords
  const possibleRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  // Find best matching chord - prioritize exact matches, then by number of matching notes
  let bestMatch: { root: string; chordType: typeof GUITAR_CHORDS[0]; matchScore: number } | null = null

  for (const root of possibleRoots) {
    for (const chordType of GUITAR_CHORDS) {
      // Get the notes for this chord
      const chordNotes = chordType.intervals.map(interval => {
        const rootIndex = possibleRoots.indexOf(root)
        const noteIndex = (rootIndex + interval) % 12
        return possibleRoots[noteIndex]
      })

      // Check if melody notes are a subset of chord notes
      const allMelodyNotesInChord = uniqueNotes.every(note => chordNotes.includes(note))

      if (allMelodyNotesInChord) {
        // Calculate match score:
        // - Exact match (all chord notes present) = highest priority
        // - Partial match with root note = medium priority
        // - Other partial matches = low priority

        const hasRoot = uniqueNotes.includes(root)
        const matchedNotes = uniqueNotes.length
        const totalChordNotes = chordNotes.length
        const isExactMatch = matchedNotes === totalChordNotes &&
                            chordNotes.every(note => uniqueNotes.includes(note))

        let matchScore = 0

        if (isExactMatch) {
          matchScore = 1000 + matchedNotes // Exact match gets highest score
        } else if (hasRoot && matchedNotes >= 2) {
          matchScore = 100 + matchedNotes // Has root and at least 2 notes
        } else if (matchedNotes >= 3) {
          matchScore = 50 + matchedNotes // Has at least 3 notes (even without root)
        } else if (hasRoot) {
          matchScore = 10 + matchedNotes // Has root but only 1-2 notes
        } else {
          matchScore = matchedNotes // Just matching notes
        }

        // Prefer shorter chord types (Major over Major 9th for same notes)
        matchScore += (10 - totalChordNotes) * 0.1

        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = { root, chordType, matchScore }
        }
      }
    }
  }

  if (bestMatch) {
    // Format chord name
    if (bestMatch.chordType.name === 'Major') {
      return `${bestMatch.root}`
    } else {
      return `${bestMatch.root} ${bestMatch.chordType.name}`
    }
  }

  // If no match found, just return the notes
  return uniqueNotes.join(', ')
}

const MelodyDisplay: React.FC<MelodyDisplayProps> = ({
  generatedMelody,
  showNotes,
  chordMode = 'arpeggiator',
  currentlyPlayingNoteIndex
}) => {
  if (generatedMelody.length === 0 || !showNotes) {
    return null
  }

  if (chordMode === 'progression') {
    return (
      <div className="melody-display">
        <div className="melody-title">Generated Melody:</div>
        <div className="melody-notes">
          {generatedMelody.map((note, index) => {
            const isCurrentlyPlaying = currentlyPlayingNoteIndex === index
            // Check if note has chord group info - display chord name
            // Otherwise display individual note name (for mixed mode)
            if (note.chordGroup?.displayName) {
              return (
                <span
                  key={`prog-${index}`}
                  className={`melody-note chord-indicator ${isCurrentlyPlaying ? 'currently-playing' : ''}`}
                >
                  {note.chordGroup.displayName}
                </span>
              )
            } else {
              return (
                <span
                  key={`prog-${index}`}
                  className={`melody-note ${isCurrentlyPlaying ? 'currently-playing' : ''}`}
                >
                  {note.name}
                </span>
              )
            }
          })}
        </div>
      </div>
    )
  }

  // Arpeggiator mode - show individual notes
  return (
    <div className="melody-display">
      <div className="melody-title">Generated Melody:</div>
      <div className="melody-notes">
        {generatedMelody.map((note, index) => {
          const isCurrentlyPlaying = currentlyPlayingNoteIndex === index
          return (
            <span
              key={`${note.name}-${index}`}
              className={`melody-note ${isCurrentlyPlaying ? 'currently-playing' : ''}`}
            >
              {note.name}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default MelodyDisplay