# Sandbox Mode - AI Agent Interaction Specification

**Purpose**: This document describes all functionality, interactions, and states within Sandbox Mode to enable an AI agent to guide users and understand the system completely.

**Target Audience**: AI assistants, chatbots, and automated agents helping users navigate Keplear's Sandbox Mode.

---

## System Overview

### What is Sandbox Mode?

Sandbox Mode is an interactive music practice environment where users:
- Select musical notes on virtual instruments (keyboard, guitar, bass)
- Apply music theory concepts (scales and chords)
- Generate randomized melodies based on selections
- Record and play back audio
- Practice ear training through note visibility toggles

### Access Path
```
Navigation: Home Page → Click "Sandbox" button in header → Sandbox Mode loads
Route: currentPage = 'sandbox'
```

---

## Complete State Model

### Global State Structure

```typescript
{
  // Navigation
  currentPage: 'home' | 'sandbox' | 'practice'

  // Instrument Configuration
  instrument: 'keyboard' | 'guitar' | 'bass'
  keyboardOctaves: { lower: number, higher: number }
  keyboardSelectionMode: 'range' | 'multi'

  // Generation Parameters
  bpm: number                    // Range: 1-999, Default: 120
  numberOfBeats: number          // Range: 1-100, Default: 5
  chordMode: 'arpeggiator' | 'progression'

  // Note Selection
  selectedNotes: Note[]          // User-selected notes

  // Applied Theory
  appliedScales: AppliedScale[]  // Active scales on instrument
  appliedChords: AppliedChord[]  // Active chords on instrument

  // Generated Content
  generatedMelody: Note[]        // Generated note sequence
  recordedAudioBlob: Blob | null // Recorded audio data

  // Playback State
  isPlaying: boolean
  isRecording: boolean
  isGeneratingMelody: boolean
  isAutoRecording: boolean
  playbackProgress: number       // Milliseconds
  melodyDuration: number         // Milliseconds
  showNotes: boolean             // Note visibility toggle

  // UI Feedback
  flashingInputs: { bpm: boolean, beats: boolean, mode: boolean }
  activeInputs: { bpm: boolean, beats: boolean, mode: boolean }
}
```

### Note Data Structure

```typescript
interface Note {
  name: string              // e.g., "C4", "F#5"
  frequency: number         // Hertz
  position: number          // Sequential position in note array
  chordGroup?: {            // Present when note is part of chord in Progression Mode
    id: string
    displayName: string     // e.g., "C Major"
    rootNote: string        // e.g., "C"
    allNotes: string[]      // All notes in the chord
  }
}
```

### Applied Scale Structure

```typescript
interface AppliedScale {
  id: string                    // Unique identifier
  root: string                  // Root note (C, C#, D, etc.)
  scaleName: string             // "Major", "Minor", etc.
  displayName: string           // "C Major"
  notes: Note[]                 // All notes in the scale
  position?: {                  // Guitar/Bass only
    startFret: number
    endFret: number
    label: string               // "Frets 0-4"
  }
}
```

### Applied Chord Structure

```typescript
interface AppliedChord {
  id: string                    // Unique identifier
  root: string                  // Root note (C, C#, D, etc.)
  chordName: string             // "Major", "Minor", "Dom7", etc.
  displayName: string           // "C Major"
  notes: Note[]                 // All notes in the chord
  shape?: {                     // Guitar/Bass only
    position: string            // "Open", "Barre at 3rd", etc.
    frets: number[][]           // Fret positions per string
  }
}
```

---

## Complete Action Reference

### 1. Navigation Actions

#### Navigate to Sandbox
```
Action: navigateToSandbox()
Effect: Sets currentPage = 'sandbox', loads Sandbox interface
Precondition: None
Result: Sandbox Mode displayed
```

#### Navigate Away from Sandbox
```
Action: navigateToHome() or navigateToPractice()
Effect: Leaves Sandbox Mode
Warning: Unsaved work is lost
Result: Returns to selected page
```

---

### 2. Instrument Actions

#### Switch Instrument
```
Action: handleInstrumentChange(newInstrument: 'keyboard' | 'guitar' | 'bass')
Effect:
  - Changes active instrument
  - Clears selectedNotes
  - Clears appliedScales
  - Clears appliedChords
  - Clears generatedMelody
  - Aborts any active recording
  - Stops playback if active
Precondition: None
Result: New instrument displayed, all selections reset
Location: InstrumentContext.tsx:295
```

---

### 3. Note Selection Actions

#### Keyboard: Select Note in Range Mode
```
Action: selectNote(note: Note, mode: 'range')
Behavior:
  - If 0 notes selected: Add note (now 1 selected)
  - If 1 note selected: Add note (now 2 selected)
  - If 2 notes selected: Clear all, add new note (now 1 selected)
Effect: Updates selectedNotes array
Precondition: keyboardSelectionMode = 'range'
Result: Up to 2 notes selected defining a range
Location: useMelodyGenerator.ts:40
```

#### Keyboard: Select Note in Multi Mode
```
Action: selectNote(note: Note, mode: 'multi')
Behavior:
  - If note not in selectedNotes: Add note
  - If note already in selectedNotes: Remove note
Effect: Toggles note in selectedNotes array
Precondition: keyboardSelectionMode = 'multi'
Result: Any number of notes can be selected
Location: useMelodyGenerator.ts:44
```

#### Guitar/Bass: Toggle Note
```
Action: Click on fret → handleNoteClick(note: Note)
Behavior: Same as Multi Mode (toggle)
Effect: Adds or removes note from selectedNotes
Precondition: instrument = 'guitar' or 'bass'
Result: Note selection toggled
Location: InstrumentContext.tsx:232
```

#### Keyboard: Change Selection Mode
```
Action: handleKeyboardSelectionModeChange(mode: 'range' | 'multi', clearSelections: boolean = true)
Effect:
  - Sets keyboardSelectionMode to new mode
  - If clearSelections = true: Clears selectedNotes
  - Triggers flash animation on mode indicator
Precondition: instrument = 'keyboard'
Result: Selection behavior changes
Location: InstrumentContext.tsx:190
```

#### Keyboard: Adjust Octave Range
```
Action: handleOctaveRangeChange(lowerOctaves: number, higherOctaves: number)
Range: -4 to +7 for each parameter
Effect: Expands or contracts visible keyboard range
Default: lowerOctaves = 0, higherOctaves = 0 (C4-C5)
Result: More or fewer keys visible
Location: InstrumentContext.tsx:314
```

#### Clear All Selections
```
Action: clearSelection()
Effect:
  - Clears selectedNotes array
  - Does NOT clear generatedMelody
  - Does NOT clear appliedScales/appliedChords
  - Increments clearTrigger counter
Result: No notes selected
Location: useMelodyGenerator.ts:291
```

---

### 4. Scale Actions

#### Apply Scale (All Instruments)
```
Action Sequence:
  1. handleRootChange(rootNote: string)
     - Sets selectedRoot for scale
     - Options: 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'

  2. handleScaleSelect(scaleName: string)
     - Sets selectedScale
     - Options: 'Major', 'Natural Minor', 'Pentatonic Major', 'Pentatonic Minor',
                'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian',
                'Harmonic Minor', 'Blues', 'Chromatic' (bass only)

  3. [Guitar/Bass only] handleScaleBoxSelect(startFret: number, endFret: number)
     - Sets scale position on fretboard
     - Common positions: (0,4), (5,9), (7,11), (12,16), or entire fretboard

  4. Apply:
     - Keyboard: handleKeyboardScaleApply()
     - Guitar: (handled by guitar scale apply handler)
     - Bass: (handled by bass scale apply handler)

Effect:
  - Generates notes for scale based on root + type + position
  - Adds new AppliedScale to appliedScales array
  - Visual: Scale notes highlight on instrument
  - Notes from scale included in melody generation

Precondition: root and scaleName must be selected
Result: Scale active and visible
Location: useScaleChordManagement.ts
```

#### Remove Scale
```
Action: handleScaleDelete(scaleId: string)
Effect: Removes scale from appliedScales array
Result: Scale notes no longer highlighted
Location: useScaleChordManagement.ts
```

#### Clear All Scales
```
Action: handleClearScale()
Effect: Clears entire appliedScales array
Result: All scale highlighting removed
Location: useScaleChordManagement.ts
```

---

### 5. Chord Actions

#### Apply Chord (All Instruments)
```
Action Sequence:
  1. handleChordRootChange(rootNote: string)
     - Sets selectedChordRoot
     - Options: Same as scale roots (C through B)

  2. handleChordSelect(chordName: string)
     - Sets selectedChord
     - Options: 'Major', 'Minor', 'Dom7', 'Maj7', 'Min7', 'Diminished',
                'Augmented', 'Sus2', 'Sus4', 'Add9', 'Min9', 'Maj9'

  3. [Guitar/Bass only] handleChordShapeSelect(shape: string)
     - Sets chord voicing/position
     - Examples: "Open", "Barre at 1st", "Barre at 3rd", etc.

  4. Apply:
     - Keyboard: handleKeyboardChordApply()
     - Guitar: (handled by guitar chord apply handler)
     - Bass: (handled by bass chord apply handler)

Effect:
  - Generates notes for chord based on root + type + shape
  - Adds new AppliedChord to appliedChords array
  - Visual: Chord notes highlight on instrument
  - Chord used in melody generation (mode-dependent)

Precondition: root and chordName must be selected
Result: Chord active and visible
Location: useScaleChordManagement.ts
```

#### Remove Chord
```
Action: handleChordDelete(chordId: string)
Effect: Removes chord from appliedChords array
Result: Chord notes no longer highlighted
Location: useScaleChordManagement.ts
```

#### Clear All Chords
```
Action: handleClearChord()
Effect: Clears entire appliedChords array
Result: All chord highlighting removed
Location: useScaleChordManagement.ts
```

---

### 6. Generation Parameter Actions

#### Set BPM
```
Action: setBpm(value: number)
Valid Range: 1 to 999
Validation: Clamps to range, prevents NaN
Default: 120
Effect: Sets tempo for melody playback
Side Effect: Triggers flash animation if not actively being edited
Location: uiReducer.ts:62
```

#### Set Number of Beats
```
Action: setNumberOfBeats(value: number)
Valid Range: 1 to 100
Validation: Clamps to range, prevents NaN
Default: 5
Effect: Sets length of generated melody
Side Effect: Triggers flash animation if not actively being edited
Location: uiReducer.ts:70
```

#### Set Chord Mode
```
Action: setChordMode(mode: 'arpeggiator' | 'progression')
Default: 'arpeggiator'
Effect: Changes melody generation algorithm
  - Arpeggiator: One note at a time
  - Progression: Full chords (when chords applied)
Side Effect: Triggers flash animation
Location: uiReducer.ts:78
```

---

### 7. Melody Generation Actions

#### Generate Melody
```
Action: handleGenerateMelody()

Preconditions:
  - At least one of the following must be true:
    * selectedNotes.length > 0
    * appliedScales.length > 0
    * appliedChords.length > 0 (any mode)
  - If using Range Mode: selectedNotes.length must be exactly 2
  - If using Progression Mode without notes/scales: appliedChords.length must be > 0

Process:
  1. setIsGeneratingMelody(true)
  2. Collect available notes:
     - Manual selections from selectedNotes
     - All notes from appliedScales
     - Notes from appliedChords (mode-dependent)
  3. Generate random melody sequence based on chordMode:

     Arpeggiator Mode:
       - For each beat: Pick random note from available notes
       - Each note plays individually

     Progression Mode:
       - For each beat:
         * If only chords: Pick random chord
         * If chords + notes: 50% chance chord or single note
       - Chords have chordGroup metadata attached

  4. Store in generatedMelody
  5. Calculate melody duration
  6. Trigger auto-recording (see Auto-Recording)
  7. setIsGeneratingMelody(false) when recording complete

Effect:
  - New melody sequence created
  - Auto-recording begins
  - Audio player appears when ready
  - hasChanges flag cleared

Result: Melody ready for playback
Location: InstrumentContext.tsx:249
Generation Logic: useMelodyGenerator.ts:67
```

#### Generation Algorithm Details

**Arpeggiator Mode**:
```
Collect notes:
  availableNotes = []

  # Add manual selections
  availableNotes.push(...selectedNotes)

  # Add scale notes (avoiding duplicates)
  for each scale in appliedScales:
    for each note in scale.notes:
      if note not already in availableNotes:
        availableNotes.push(note)

  # Add chord notes (avoiding duplicates)
  for each chord in appliedChords:
    for each note in chord.notes:
      if note not already in availableNotes:
        availableNotes.push(note)

Generate melody:
  melody = []
  for i from 0 to numberOfBeats:
    randomIndex = random(0, availableNotes.length - 1)
    melody.push(availableNotes[randomIndex])

  return melody
```

**Progression Mode**:
```
Generate melody:
  melody = []
  hasIndividualNotes = (selectedNotes.length > 0 or appliedScales.length > 0)

  for i from 0 to numberOfBeats:
    # Decide: chord or single note?
    useChord = hasIndividualNotes ? random() < 0.5 : true

    if useChord:
      # Pick random chord
      chord = appliedChords[random(0, appliedChords.length - 1)]

      # Pick representative note for display
      representativeNote = chord.notes[random(0, chord.notes.length - 1)]

      # Attach chord metadata
      note = {
        ...representativeNote,
        chordGroup: {
          id: chord.id,
          displayName: chord.displayName,
          rootNote: chord.root,
          allNotes: chord.notes.map(n => n.name)
        }
      }
      melody.push(note)
    else:
      # Pick random single note
      note = availableNotes[random(0, availableNotes.length - 1)]
      melody.push(note)

  return melody
```

---

### 8. Playback and Recording Actions

#### Auto-Recording Process
```
Trigger: Automatically starts when generatedMelody changes
Condition: !isPlaying && !isRecording && !isAutoRecording && !hasRecordedAudio

Process:
  1. dispatch SET_IS_AUTO_RECORDING(true)
  2. stopMelody() - ensure clean state
  3. Call recordMelody(generatedMelody, bpm, instrument, chordMode)
     - Tone.js Recorder starts
     - Melody plays through audio engine
     - Audio captured simultaneously
     - Duration: (numberOfBeats - 1) * (60/bpm) + releaseTime
       * Keyboard releaseTime: 1.5s
       * Guitar releaseTime: 1.0s
       * Bass releaseTime: 1.5s
  4. Recording completes → returns Blob
  5. dispatch SET_RECORDED_AUDIO_BLOB(blob)
  6. dispatch SET_HAS_RECORDED_AUDIO(true)
  7. dispatch SET_IS_AUTO_RECORDING(false)

Abort Mechanism:
  - Can be aborted via handleClearRecordedAudio()
  - Sets abortRecordingRef.current = true
  - Discards in-flight recording

Result: Audio player appears with recorded audio
Location: useMelodyPlayer.ts:159
```

#### Play Melody
```
Action: handlePlayMelody()

Behavior:
  If isPlaying:
    - Stop playback
    - Reset progress to 0
  Else:
    - If no generatedMelody: Warn and return
    - Reset progress to 0
    - Play melody through Tone.js
    - Start progress tracking (updates every 50ms)
    - Set isPlaying = true
    - Auto-stop after melody duration

Playback Modes:
  1. Tone.js Playback (when playing generated melody):
     - Precise timing via Tone.now()
     - Notes scheduled in advance
     - Visual feedback: notes highlight during play

  2. Audio Player Playback (when recorded audio exists):
     - Uses HTML5 <audio> element
     - Plays from Blob URL
     - Can seek anywhere in recording

Location: InstrumentContext.tsx:273
```

#### Toggle Show/Hide Notes
```
Action: toggleShowNotes()
Effect: Inverts showNotes boolean
Impact: Controls whether notes highlight during playback
  - showNotes = true: Notes highlight as they play
  - showNotes = false: No highlighting (ear training mode)
Location: useMelodyPlayer.ts:90
```

#### Clear Recorded Audio
```
Action: handleClearRecordedAudio()
Effect:
  - Sets abortRecordingRef.current = true
  - dispatch RESET_RECORDING
  - Clears recordedAudioBlob
  - Clears hasRecordedAudio flag
  - Audio player disappears
Location: useMelodyPlayer.ts:113
```

#### Download Recording
```
Action: Click download button in AudioPlayer
Effect:
  - Creates temporary Blob URL
  - Triggers browser download
  - Filename: timestamp-based or parameter-based
  - Format: WebM or WAV (browser-dependent)
Location: AudioPlayer.tsx
```

---

### 9. Clear Actions

#### Clear All Selections
```
Action: "Clear All" button → handleClearAllSelections()
Effect:
  - clearSelection() - clears selectedNotes
  - handleKeyboardChordClear() - clears keyboard chord state
  - handleKeyboardScaleClear() - clears keyboard scale state
  - handleClearChord() - clears appliedChords
  - handleClearScale() - clears appliedScales
Result: Complete reset of all selections (not melody or audio)
Location: InstrumentDisplay.tsx:144
```

#### Clear Only Generated Content
```
Action: clearMelody()
Effect: Clears generatedMelody array
Note: Does NOT clear selectedNotes or applied scales/chords
Location: useMelodyGenerator.ts:300
```

---

## Interaction Patterns

### Pattern 1: Simple Note Selection → Melody

```
1. User selects instrument: handleInstrumentChange('keyboard')
2. User selects mode: handleKeyboardSelectionModeChange('range')
3. User clicks note: selectNote(C4, 'range') → selectedNotes = [C4]
4. User clicks note: selectNote(G4, 'range') → selectedNotes = [C4, G4]
5. User sets params: setBpm(120), setNumberOfBeats(5)
6. User generates: handleGenerateMelody()
   → System generates 5 notes between C4-G4 at 120 BPM
   → Auto-recording starts
   → Audio player appears
7. User plays: handlePlayMelody()
   → Melody plays, notes highlight
```

### Pattern 2: Scale Application → Melody

```
1. User selects instrument: handleInstrumentChange('guitar')
2. User opens scales: [Opens scales panel in UI]
3. User selects root: handleRootChange('C')
4. User selects scale: handleScaleSelect('Major')
5. User selects position: handleScaleBoxSelect(0, 4) [Frets 0-4]
6. User applies: [Apply scale button] → Scale highlights on fretboard
7. User sets params: setBpm(100), setNumberOfBeats(8)
8. User generates: handleGenerateMelody()
   → System generates 8 notes from C Major scale at 100 BPM
   → Auto-recording starts
9. User downloads: [Download button] → Audio file saved
```

### Pattern 3: Chord Progression

```
1. User selects instrument: handleInstrumentChange('keyboard')
2. User applies chords:
   - handleChordRootChange('C'), handleChordSelect('Major'), apply
   - handleChordRootChange('F'), handleChordSelect('Major'), apply
   - handleChordRootChange('G'), handleChordSelect('Dom7'), apply
3. User switches mode: setChordMode('progression')
4. User sets params: setBpm(100), setNumberOfBeats(12)
5. User generates: handleGenerateMelody()
   → System generates 12-beat chord progression
   → Randomly picks from C Major, F Major, G7
   → Each chord plays all notes simultaneously
   → Auto-recording starts
6. User listens: Audio plays chord progression
```

### Pattern 4: Ear Training

```
1. User generates melody (any method above)
2. User plays with notes visible:
   - handlePlayMelody()
   - Notes highlight during playback
   - User observes which notes play
3. User hides notes: toggleShowNotes() → showNotes = false
4. User plays again: handlePlayMelody()
   - No visual feedback
   - User tries to identify notes by ear
5. User clicks suspected notes: selectNote(note, mode)
6. User reveals: toggleShowNotes() → showNotes = true
7. User plays to verify: handlePlayMelody()
   - User compares their selections to actual melody
```

---

## State Constraints and Validation

### Required States for Actions

| Action | Required State | Validation |
|--------|---------------|------------|
| generateMelody (Arpeggiator) | selectedNotes.length ≥ 1 OR appliedScales.length ≥ 1 OR appliedChords.length ≥ 1 | Warns if no notes available |
| generateMelody (Range Mode) | selectedNotes.length === 2 | Warns if not exactly 2 |
| generateMelody (Progression) | appliedChords.length ≥ 1 | Warns if no chords |
| playMelody | generatedMelody.length > 0 | Warns if no melody |
| recordMelody | generatedMelody.length > 0 | Returns null if no melody |
| applyScale | selectedRoot !== null && selectedScale !== null | Disabled until both selected |
| applyChord | selectedChordRoot !== null && selectedChord !== null | Disabled until both selected |

### Automatic State Resets

| Trigger | Reset Actions |
|---------|---------------|
| Switch instrument | Clear selectedNotes, appliedScales, appliedChords, generatedMelody, recordedAudioBlob |
| Switch keyboard mode | Clear selectedNotes (if clearSelections = true) |
| Generate melody | Clear hasChanges flag |
| Clear All button | Clear selectedNotes, appliedScales, appliedChords, keyboard scale/chord state |

### State Dependencies

```
If isPlaying = true:
  - Cannot start new playback
  - Can call stopMelody() to stop

If isRecording = true:
  - Cannot start new recording
  - Auto-recording in progress

If isGeneratingMelody = true:
  - Generate button shows "Generating..."
  - Cannot start new generation

If generatedMelody.length === 0:
  - Audio player hidden
  - Play button disabled

If recordedAudioBlob === null:
  - Download button disabled
  - Audio player not functional

If showNotes = false:
  - Notes don't highlight during playback
  - isInMelody() returns false for all notes
```

---

## Available Notes Per Instrument

### Keyboard
```
Base Range (default): C4 to C5
With Octave Adjustments: C(4+lower) to C(5+higher)
Example: lowerOctaves=1, higherOctaves=2 → C3 to C7

Total Keys: 88 (C1 to C8 possible)
```

### Guitar
```
Strings: E2, A2, D3, G3, B3, E4
Frets: 0-24 per string
Total Notes: ~150 unique positions

Common Scale Positions:
- Frets 0-4: Open position
- Frets 5-9: Middle register
- Frets 7-11: Position V
- Frets 12-16: Octave position
```

### Bass
```
Strings: E1, A1, D2, G2
Frets: 0-24 per string
Total Notes: ~100 unique positions

Note: Bass includes "Chromatic" scale (all 12 notes)
```

---

## Available Scales (Complete List)

### Universal Scales (All Instruments)
1. **Major**: [0, 2, 4, 5, 7, 9, 11] - Happy, bright
2. **Natural Minor**: [0, 2, 3, 5, 7, 8, 10] - Sad, dark
3. **Pentatonic Major**: [0, 2, 4, 7, 9] - Folk, simple
4. **Pentatonic Minor**: [0, 3, 5, 7, 10] - Blues, rock
5. **Dorian**: [0, 2, 3, 5, 7, 9, 10] - Jazz, funk
6. **Phrygian**: [0, 1, 3, 5, 7, 8, 10] - Spanish, exotic
7. **Lydian**: [0, 2, 4, 6, 7, 9, 11] - Dreamy, bright
8. **Mixolydian**: [0, 2, 4, 5, 7, 9, 10] - Blues, rock
9. **Locrian**: [0, 1, 3, 5, 6, 8, 10] - Dark, unstable
10. **Harmonic Minor**: [0, 2, 3, 5, 7, 8, 11] - Classical, dramatic
11. **Blues**: [0, 3, 5, 6, 7, 10] - Blues foundation

### Bass-Only Scale
12. **Chromatic**: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] - All notes

*Note: Numbers indicate semitones from root. E.g., Major scale in C = [C, D, E, F, G, A, B]*

---

## Available Chords (Complete List)

### Universal Chords (All Instruments)
1. **Major**: [0, 4, 7] - Happy, stable
2. **Minor**: [0, 3, 7] - Sad, darker
3. **Dominant 7th (Dom7)**: [0, 4, 7, 10] - Tense, bluesy
4. **Major 7th (Maj7)**: [0, 4, 7, 11] - Jazzy, sophisticated
5. **Minor 7th (Min7)**: [0, 3, 7, 10] - Mellow, jazzy
6. **Diminished**: [0, 3, 6] - Tense, transitional
7. **Augmented**: [0, 4, 8] - Exotic, unstable
8. **Sus2**: [0, 2, 7] - Open, floating
9. **Sus4**: [0, 5, 7] - Suspended, anticipatory
10. **Add9**: [0, 4, 7, 14] - Rich, colorful

### Extended Chords (Keyboard/Guitar)
11. **Minor 9th (Min9)**: [0, 3, 7, 10, 14] - Deep, jazzy
12. **Major 9th (Maj9)**: [0, 4, 7, 11, 14] - Lush, sophisticated

*Note: Numbers indicate semitones from root. E.g., C Major = [C, E, G]*

---

## Audio System Details

### Playback Timing
```
Note Duration per Beat: (60 / bpm) seconds

Example at 120 BPM:
- Time per beat: 60/120 = 0.5 seconds (500ms)
- 5-beat melody: 4 gaps × 500ms + release = 2000ms + release

Instrument Release Times:
- Keyboard: 1500ms
- Guitar: 1000ms
- Bass: 1500ms

Total Duration Formula:
duration = (numberOfBeats - 1) × (60000 / bpm) + releaseTime
```

### Audio Quality
```
Sample Rate: 44.1 kHz
Channels: Stereo
Format: WebM (Chrome/Edge) or WAV (Firefox/Safari)
Bitrate: ~128 kbps
Sample Source: tonejs-instruments (high-quality recordings)
```

### Playback Modes

**Tone.js Playback** (during generation/auto-record):
- Notes scheduled via `Tone.now()` + offset
- Precise timing, no drift
- Visual feedback synchronized

**HTML5 Audio Playback** (after recording):
- Uses Blob URL from recorded audio
- Can seek anywhere
- Progress bar functional
- Download available

---

## Visual Feedback System

### Note Highlighting Priority

When multiple states apply to a note, visual priority:
1. **In Melody** (highest) - Green, currently playing
2. **Selected** - Blue, user-selected
3. **In Chord** - Orange, part of applied chord
4. **In Scale** - Yellow, part of applied scale
5. **Root Note** - Red border, root of scale/chord

### Input Flash Animation

**Triggers**:
- BPM changes (when not actively editing)
- Number of beats changes (when not actively editing)
- Chord mode changes

**Duration**: 1000ms (1 second)

**Visual Effect**: Border color flashes to primary purple

**Purpose**: Indicate external or programmatic parameter changes

---

## Error Conditions and Warnings

### Console Warnings (Not User-Facing)

```
"Number of notes must be positive"
→ Trigger: numberOfBeats ≤ 0
→ Action: generateMelody returns early

"Range mode requires exactly 2 notes selected"
→ Trigger: Range mode with selectedNotes.length ≠ 2
→ Action: generateMelody returns early

"Multi-select mode requires at least one note selected"
→ Trigger: Multi mode with selectedNotes.length === 0
→ Action: generateMelody returns early

"Guitar requires at least one note selected"
→ Trigger: Guitar with selectedNotes.length === 0
→ Action: generateMelody returns early

"No melody to play. Generate a melody first."
→ Trigger: handlePlayMelody with generatedMelody.length === 0
→ Action: Returns early

"No melody to record. Generate a melody first."
→ Trigger: recordMelody with melody.length === 0
→ Action: Returns null

"Audio not initialized"
→ Trigger: Play action before samplers loaded
→ Action: Throws error

"No notes available for melody generation"
→ Trigger: No selectedNotes, scales, or chords
→ Action: generateMelody returns early
```

### User-Facing Issues (No error messages yet)

Current behavior: Silent failures with console warnings
Recommendation for agent: Inform user of requirements before action

---

## State Persistence

### What IS Persisted
- Authentication state (Supabase session)
- Theme preference (localStorage)

### What is NOT Persisted (Lost on Page Refresh)
- selectedNotes
- appliedScales
- appliedChords
- generatedMelody
- recordedAudioBlob
- BPM, numberOfBeats, chordMode (reset to defaults)
- Instrument selection (resets to keyboard)

**Important**: Agent should warn users that refreshing loses work

---

## Agent Guidance Scenarios

### Scenario 1: User Wants to Generate a Melody

**Agent should verify**:
1. Has user selected an instrument?
2. Has user selected notes, or applied scales/chords?
3. If keyboard Range Mode: Are exactly 2 notes selected?
4. If Progression Mode: Are any chords applied?

**Agent should guide**:
```
If no selections:
  "First, select some notes on the [instrument] by clicking them.
   Or apply a scale using the Scales dropdown."

If Range Mode with 1 note:
  "Range Mode needs 2 notes to define a range. Please select one more note."

If Range Mode with >2 notes:
  "You have [n] notes selected. Range Mode uses only the first 2.
   Or switch to Multi-Select Mode to use all selected notes."

If Progression Mode with no chords:
  "Progression Mode requires at least one applied chord.
   Apply a chord using the Chords dropdown."

If all valid:
  "You're ready! Click 'Generate Melody' to create your melody.
   It will be recorded automatically."
```

### Scenario 2: User Wants to Apply a Scale

**Agent should guide**:
```
Step 1: "Open the Scales dropdown in the middle panel"
Step 2: "Select a root note (e.g., C, D, E...)"
Step 3: "Select a scale type (e.g., Major, Minor, Pentatonic)"
Step 4 (Guitar/Bass only): "Select a fretboard position (e.g., Frets 0-4)"
Step 5: "Click 'Apply Scale' button"

Result: "The scale notes will highlight on your instrument in yellow,
         and will be included in melody generation."
```

### Scenario 3: User Wants Ear Training

**Agent should guide**:
```
Step 1: "Generate a melody using any method"
Step 2: "Play the melody with 'Show Notes' enabled (default)"
Step 3: "Listen carefully and watch which notes highlight"
Step 4: "Click the 'Hide Notes' button"
Step 5: "Play the melody again"
Step 6: "Try to identify notes by ear and click them on the instrument"
Step 7: "Click 'Show Notes' to reveal the answer"
Step 8: "Repeat until you can identify all notes correctly"

Tips: "Start with just 2-3 notes at a slow tempo (60-80 BPM)"
```

### Scenario 4: User Asks "What Can I Do in Sandbox Mode?"

**Agent should explain**:
```
"In Sandbox Mode you can:

1. Choose an instrument: Keyboard, Guitar, or Bass
2. Select notes by clicking on the instrument
3. Apply musical scales to see theory in action
4. Apply chords to learn chord tones
5. Generate random melodies from your selections
6. Adjust tempo (BPM) and melody length (beats)
7. Switch between Arpeggiator (single notes) and Progression (full chords) modes
8. Listen to auto-recorded audio
9. Download recordings for practice
10. Practice ear training by hiding notes during playback

It's a free-form practice space where you can experiment with music theory."
```

### Scenario 5: User Reports "Nothing Happens When I Click Generate"

**Agent should troubleshoot**:
```
Check 1: "Have you selected any notes on the instrument?"
  → If no: "Click on some keys/frets to select notes first"

Check 2: "If using Keyboard Range Mode, are exactly 2 notes selected?"
  → If no: "Select exactly 2 notes, or switch to Multi-Select Mode"

Check 3: "If using Progression Mode, have you applied any chords?"
  → If no: "Apply at least one chord using the Chords dropdown"

Check 4: "Check the browser console for any error messages"
  → If errors: "There may be an audio initialization issue. Try refreshing the page."

Check 5: "Is audio working on your device?"
  → If no: "Check system volume and browser audio permissions"
```

### Scenario 6: User Asks About a Feature

**Agent should reference this document**:
- For action details: See "Complete Action Reference"
- For state information: See "Complete State Model"
- For scales/chords: See "Available Scales/Chords"
- For workflows: See "Interaction Patterns"

---

## Quick Reference for AI Agents

### Key Functions by Purpose

**Navigate to Sandbox**:
```typescript
navigateToSandbox()
```

**Change Instrument**:
```typescript
handleInstrumentChange('keyboard' | 'guitar' | 'bass')
```

**Select Notes (Keyboard)**:
```typescript
selectNote(note, 'range' | 'multi')
```

**Apply Scale**:
```typescript
handleRootChange('C')
handleScaleSelect('Major')
// Guitar/Bass only:
handleScaleBoxSelect(0, 4)
// Then trigger apply button
```

**Apply Chord**:
```typescript
handleChordRootChange('C')
handleChordSelect('Major')
// Guitar/Bass only:
handleChordShapeSelect('Open')
// Then trigger apply button
```

**Set Parameters**:
```typescript
setBpm(120)
setNumberOfBeats(5)
setChordMode('arpeggiator' | 'progression')
```

**Generate Melody**:
```typescript
handleGenerateMelody()
```

**Control Playback**:
```typescript
handlePlayMelody()  // Play/pause toggle
toggleShowNotes()   // Show/hide notes
```

**Clear Everything**:
```typescript
clearSelection()      // Clear selected notes only
handleClearScale()    // Clear all scales
handleClearChord()    // Clear all chords
// Or use "Clear All" button
```

---

## Implementation References

### File Locations

**Core Context**:
- `src/contexts/InstrumentContext.tsx` - Central state provider

**Hooks**:
- `src/hooks/useAudio.ts` - Audio engine
- `src/hooks/useMelodyGenerator.ts` - Melody generation
- `src/hooks/useMelodyPlayer.ts` - Playback and recording
- `src/hooks/useUIState.ts` - UI state management
- `src/hooks/useInstrumentConfig.ts` - Instrument settings
- `src/hooks/useScaleChordManagement.ts` - Scale/chord logic

**Reducers**:
- `src/reducers/uiReducer.ts` - UI state reducer
- `src/reducers/melodyReducer.ts` - Melody state reducer

**Components**:
- `src/components/keyboard/InstrumentDisplay.tsx` - Main container
- `src/components/keyboard/InstrumentControls.tsx` - Top panel
- `src/components/keyboard/InstrumentHeader.tsx` - Middle panel
- `src/components/common/AudioPlayer.tsx` - Audio playback UI

---

## Conclusion

This specification provides complete knowledge of Sandbox Mode's functionality for AI agent interaction. An agent with this information can:

1. ✅ Guide users through any workflow
2. ✅ Troubleshoot issues by checking state constraints
3. ✅ Explain features accurately
4. ✅ Predict system behavior
5. ✅ Recommend best practices
6. ✅ Understand all available actions
7. ✅ Verify preconditions before actions
8. ✅ Explain error conditions
9. ✅ Reference specific code locations if needed

**For updates or questions about this specification, refer to the codebase at the file locations listed above.**

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Maintained For**: AI Agent Integration
**Target Agents**: Chatbots, virtual assistants, automated help systems

