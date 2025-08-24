import React, { useState, useEffect } from 'react'
import * as Tone from 'tone'
import { Sun, Moon, Eye, EyeOff } from 'lucide-react'

type Note = {
  name: string
  frequency: number
  isBlack: boolean
  position: number
}

const notes: Note[] = [
  // First octave (C4 to B4)
  { name: 'C4', frequency: 261.63, isBlack: false, position: 0 },
  { name: 'C#4', frequency: 277.18, isBlack: true, position: 1 },
  { name: 'D4', frequency: 293.66, isBlack: false, position: 2 },
  { name: 'D#4', frequency: 311.13, isBlack: true, position: 3 },
  { name: 'E4', frequency: 329.63, isBlack: false, position: 4 },
  { name: 'F4', frequency: 349.23, isBlack: false, position: 5 },
  { name: 'F#4', frequency: 369.99, isBlack: true, position: 6 },
  { name: 'G4', frequency: 392.00, isBlack: false, position: 7 },
  { name: 'G#4', frequency: 415.30, isBlack: true, position: 8 },
  { name: 'A4', frequency: 440.00, isBlack: false, position: 9 },
  { name: 'A#4', frequency: 466.16, isBlack: true, position: 10 },
  { name: 'B4', frequency: 493.88, isBlack: false, position: 11 },
  
  // Second octave (C5 to B5)
  { name: 'C5', frequency: 523.25, isBlack: false, position: 12 },
  { name: 'C#5', frequency: 554.37, isBlack: true, position: 13 },
  { name: 'D5', frequency: 587.33, isBlack: false, position: 14 },
  { name: 'D#5', frequency: 622.25, isBlack: true, position: 15 },
  { name: 'E5', frequency: 659.25, isBlack: false, position: 16 },
  { name: 'F5', frequency: 698.46, isBlack: false, position: 17 },
  { name: 'F#5', frequency: 739.99, isBlack: true, position: 18 },
  { name: 'G5', frequency: 783.99, isBlack: false, position: 19 },
  { name: 'G#5', frequency: 830.61, isBlack: true, position: 20 },
  { name: 'A5', frequency: 880.00, isBlack: false, position: 21 },
  { name: 'A#5', frequency: 932.33, isBlack: true, position: 22 },
  { name: 'B5', frequency: 987.77, isBlack: false, position: 23 },
]


const Piano: React.FC = () => {
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([])
  const [generatedMelody, setGeneratedMelody] = useState<Note[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [piano, setPiano] = useState<Tone.Sampler | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [numberOfNotes, setNumberOfNotes] = useState(8)
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    // Dispose existing sampler
    if (piano) {
      piano.dispose()
    }

    // Initialize Tone.js piano sampler with high-quality samples
    const sampler = new Tone.Sampler({
      urls: {
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
      },
      release: 1.5,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination()

    setPiano(sampler)

    return () => {
      sampler.dispose()
    }
  }, [])

  const handleNoteClick = async (note: Note) => {
    // Play the note sound immediately when clicked
    if (piano) {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }
      piano.triggerAttackRelease(note.name, "0.3")
    }

    // Update selection logic
    if (selectedNotes.length < 2) {
      if (!selectedNotes.find(n => n.name === note.name)) {
        setSelectedNotes([...selectedNotes, note])
      }
    } else {
      setSelectedNotes([note])
    }
    setGeneratedMelody([])
  }

  const generateMelody = () => {
    if (selectedNotes.length !== 2) return

    const [note1, note2] = selectedNotes.sort((a, b) => a.position - b.position)
    const startPos = note1.position
    const endPos = note2.position
    
    const notesInRange = currentNotes.filter(note => 
      note.position >= startPos && note.position <= endPos
    )

    const melody: Note[] = []
    for (let i = 0; i < numberOfNotes; i++) {
      const randomNote = notesInRange[Math.floor(Math.random() * notesInRange.length)]
      melody.push(randomNote)
    }

    setGeneratedMelody(melody)
  }

  const playMelody = async () => {
    if (generatedMelody.length === 0 || isPlaying || !piano) return
    
    // Start Tone.js context if not already started
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    
    setIsPlaying(true)
    
    // Calculate note duration based on BPM (quarter notes)
    const noteDuration = (60 / bpm) * 1000 // Convert to milliseconds
    
    for (let i = 0; i < generatedMelody.length; i++) {
      await playNote(generatedMelody[i])
      if (i < generatedMelody.length - 1) { // Don't wait after the last note
        await new Promise(resolve => setTimeout(resolve, noteDuration * 0.8)) // 80% for rhythm, 20% for note sustain
      }
    }
    
    setIsPlaying(false)
  }

  const playNote = async (note: Note): Promise<void> => {
    if (!piano) return
    
    // Start Tone.js context if not already started
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    
    // Play the note using real piano samples
    piano.triggerAttackRelease(note.name, "0.5")
    
    // Return a promise that resolves when the note would finish
    return new Promise(resolve => {
      setTimeout(resolve, 500)
    })
  }


  const currentNotes = notes
  
  const isSelected = (note: Note) => selectedNotes.find(n => n.name === note.name) !== undefined
  const isInMelody = (note: Note) => showNotes && generatedMelody.find(n => n.name === note.name) !== undefined

  const whiteKeys = notes.filter(note => !note.isBlack)
  const blackKeys = notes.filter(note => note.isBlack)

  const getStyles = (isDark: boolean) => `
    .piano-container {
      position: relative;
      display: inline-block;
      background: linear-gradient(145deg, #2d3748, #1a202c);
      padding: 60px 30px 30px 30px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      border: 4px solid #4a5568;
    }

    .notes-visibility-toggle {
      position: absolute;
      top: 80px;
      right: 20px;
      background: ${isDark 
        ? '#8000ff' 
        : '#8000ff'};
      color: ${isDark ? '#d2d2f9' : '#d2d2f9'};
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .notes-visibility-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .piano-controls {
      position: absolute;
      top: 10px;
      left: 30px;
      right: 30px;
      display: flex;
      gap: 20px;
      align-items: flex-start;
      z-index: 20;
      height: 40px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .control-label {
      font-size: 12px;
      font-weight: 600;
      color: #d2d2f9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .instrument-dropdown, .piano-setting-input {
      background: rgba(128, 0, 255, 0.1);
      border: 2px solid #8000ff;
      color: #d2d2f9;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      outline: none;
      min-width: 70px;
      text-align: center;
      height: 28px;
    }

    .instrument-dropdown:hover, .piano-setting-input:hover {
      background: rgba(128, 0, 255, 0.2);
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .instrument-dropdown:focus, .piano-setting-input:focus {
      box-shadow: 0 0 0 2px rgba(128, 0, 255, 0.3);
    }

    .instrument-dropdown option {
      background: #121212;
      color: #d2d2f9;
      padding: 8px;
    }

    .keyboard {
      position: relative;
      display: flex;
    }


    .white-key {
      width: 60px;
      height: 280px;
      background: linear-gradient(145deg, #ffffff, #f7fafc);
      border: 2px solid #e2e8f0;
      border-radius: 0 0 8px 8px;
      margin-right: 2px;
      position: relative;
      cursor: pointer;
      transition: all 0.1s ease;
      box-shadow: 
        inset 0 2px 4px ${isDark 
          ? 'rgba(156, 163, 175, 0.3)' 
          : 'rgba(255, 255, 255, 0.8)'},
        inset 0 -2px 4px rgba(0, 0, 0, 0.1),
        0 4px 8px rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'});
    }

    .white-key:hover {
      transform: translateY(2px);
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.8),
        inset 0 -2px 4px rgba(0, 0, 0, 0.1),
        0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .white-key:active {
      transform: translateY(4px);
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.6),
        inset 0 -1px 2px rgba(0, 0, 0, 0.2),
        0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .white-key.selected {
      background: linear-gradient(145deg, #dbeafe, #bfdbfe);
      border-color: #3b82f6;
      transform: translateY(3px);
    }

    .white-key.melody {
      background: linear-gradient(145deg, #dcfce7, #bbf7d0);
      border-color: #10b981;
    }

    .white-key:last-child {
      margin-right: 0;
    }

    .black-keys {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    .black-key {
      position: absolute;
      width: 36px;
      height: 180px;
      background: linear-gradient(145deg, #374151, #111827);
      border: 1px solid #4b5563;
      border-radius: 0 0 6px 6px;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.1s ease;
      box-shadow: 
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 2px rgba(0, 0, 0, 0.3),
        0 4px 8px rgba(0, 0, 0, 0.5);
    }

    .black-key:hover {
      transform: translateY(1px);
      box-shadow: 
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 2px rgba(0, 0, 0, 0.3),
        0 2px 4px rgba(0, 0, 0, 0.5);
    }

    .black-key:active {
      transform: translateY(3px);
      box-shadow: 
        inset 0 1px 2px rgba(255, 255, 255, 0.1),
        inset 0 -1px 1px rgba(0, 0, 0, 0.4),
        0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .black-key.selected {
      background: linear-gradient(145deg, #1e40af, #1d4ed8);
      transform: translateY(2px);
    }

    .black-key.melody {
      background: linear-gradient(145deg, #047857, #065f46);
    }

    .key-label {
      position: absolute;
      bottom: 15px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      font-weight: 600;
      user-select: none;
      pointer-events: none;
    }

    .white-key .key-label {
      color: #374151;
    }

    .black-key .key-label {
      color: #ffffff;
      font-size: 10px;
      bottom: 12px;
    }

    .app-title {
      font-size: 3rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 1rem;
      color: ${isDarkMode ? '#d2d2f9' : '#121212'};
      text-shadow: ${isDarkMode ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)'};
    }

    .app-description {
      font-size: 1.125rem;
      text-align: center;
      margin-bottom: 2rem;
      color: ${isDarkMode ? '#d2d2f9' : '#121212'};
      opacity: 0.9;
    }

    .controls {
      text-align: center;
      margin-top: 40px;
    }

    .settings-controls {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin: 20px 0;
      flex-wrap: wrap;
    }

    .selected-notes {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: ${isDark ? '#d2d2f9' : '#121212'};
    }

    .dark-mode-toggle {
      position: absolute;
      top: 20px;
      right: 20px;
      background: ${isDark 
        ? '#8000ff' 
        : '#8000ff'};
      color: ${isDark ? '#d2d2f9' : '#d2d2f9'};
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .dark-mode-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .settings-toggle {
      position: absolute;
      top: 20px;
      left: 20px;
      background: #8000ff;
      color: #d2d2f9;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      font-size: 20px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .settings-toggle:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .settings-panel {
      position: absolute;
      top: 80px;
      left: 20px;
      background: ${isDarkMode ? '#121212' : '#d2d2f9'};
      border: 2px solid #8000ff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 30;
    }

    .settings-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      color: ${isDarkMode ? '#d2d2f9' : '#121212'};
    }

    .setting-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .setting-label {
      font-weight: 600;
      font-size: 14px;
      color: ${isDarkMode ? '#d2d2f9' : '#121212'};
    }

    .setting-input {
      width: 80px;
      padding: 8px 12px;
      border: 2px solid #8000ff;
      border-radius: 6px;
      background: ${isDarkMode ? '#121212' : '#ffffff'};
      color: ${isDarkMode ? '#d2d2f9' : '#121212'};
      font-size: 14px;
      text-align: center;
    }

    .setting-input:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(128, 0, 255, 0.3);
    }

    .buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-bottom: 30px;
    }

    .button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .generate-btn {
      background: #8000ff;
      color: #d2d2f9;
    }

    .generate-btn:not(:disabled):hover {
      background: #6600cc;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(128, 0, 255, 0.4);
    }

    .play-btn {
      background: #8000ff;
      color: #d2d2f9;
    }

    .play-btn:not(:disabled):hover {
      background: #6600cc;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(128, 0, 255, 0.4);
    }

    .melody-display {
      background: #121212;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #8000ff;
      position: relative;
    }

    .melody-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      color: #d2d2f9;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .notes-toggle {
      background: transparent;
      border: none;
      color: #d2d2f9;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notes-toggle:hover {
      background: rgba(128, 0, 255, 0.2);
      transform: scale(1.1);
    }

    .melody-notes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .melody-note {
      background: #ffffff;
      color: #121212;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid #ffffff;
    }
  `

  // Calculate black key positions for two octaves
  const getBlackKeyLeft = (position: number): number => {
    const whiteKeyWidth = 62 // 60px + 2px margin
    const blackKeyWidth = 36
    
    const positions: { [key: number]: number } = {
      // First octave
      1: whiteKeyWidth * 1 - blackKeyWidth / 2,   // C#4
      3: whiteKeyWidth * 2 - blackKeyWidth / 2,   // D#4
      6: whiteKeyWidth * 4 - blackKeyWidth / 2,   // F#4
      8: whiteKeyWidth * 5 - blackKeyWidth / 2,   // G#4
      10: whiteKeyWidth * 6 - blackKeyWidth / 2,  // A#4
      
      // Second octave
      13: whiteKeyWidth * 8 - blackKeyWidth / 2,  // C#5
      15: whiteKeyWidth * 9 - blackKeyWidth / 2,  // D#5
      18: whiteKeyWidth * 11 - blackKeyWidth / 2, // F#5
      20: whiteKeyWidth * 12 - blackKeyWidth / 2, // G#5
      22: whiteKeyWidth * 13 - blackKeyWidth / 2, // A#5
    }
    
    return positions[position] || 0
  }



  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      width: '100%',
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #121212 0%, #121212 100%)' 
        : 'linear-gradient(135deg, #d2d2f9 0%, #d2d2f9 100%)',
      transition: 'all 0.3s ease',
      position: 'relative'
    }}>
      <style>{getStyles(isDarkMode)}</style>
      

      {/* Dark Mode Toggle */}
      <button 
        className="dark-mode-toggle"
        onClick={() => setIsDarkMode(!isDarkMode)}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* App Title and Description */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 className="app-title">Keplear</h1>
        <p className="app-description">
          Interactive piano for melody generation and practice
        </p>
      </div>

      {/* Notes Visibility Toggle */}
      <button 
        className="notes-visibility-toggle"
        onClick={() => setShowNotes(!showNotes)}
        title={showNotes ? 'Hide notes' : 'Show notes'}
      >
        {showNotes ? <Eye size={20} /> : <EyeOff size={20} />}
      </button>

      <div className="piano-container">
        {/* Piano Controls */}
        <div className="piano-controls">

          <div className="control-group">
            <label className="control-label">BPM</label>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="piano-setting-input"
            />
          </div>

          <div className="control-group">
            <label className="control-label">Notes</label>
            <input
              type="number"
              min="3"
              max="16"
              value={numberOfNotes}
              onChange={(e) => setNumberOfNotes(Number(e.target.value))}
              className="piano-setting-input"
            />
          </div>
        </div>

        <div className="keyboard">
          {/* White Keys */}
          {whiteKeys.map((note) => (
            <button
              key={note.name}
              className={`white-key ${isSelected(note) ? 'selected' : ''} ${isInMelody(note) ? 'melody' : ''}`}
              onClick={() => handleNoteClick(note)}
            >
              <span className="key-label">{note.name}</span>
            </button>
          ))}
          
          {/* Black Keys */}
          <div className="black-keys">
            {blackKeys.map((note) => (
              <button
                key={note.name}
                className={`black-key ${isSelected(note) ? 'selected' : ''} ${isInMelody(note) ? 'melody' : ''}`}
                style={{ left: `${getBlackKeyLeft(note.position)}px` }}
                onClick={() => handleNoteClick(note)}
              >
                <span className="key-label">{note.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>


      <div className="controls">
        <div className="selected-notes">
          Selected Notes: {selectedNotes.map(n => n.name).join(', ') || 'None'}
        </div>
        
        <div className="buttons">
          <button
            onClick={generateMelody}
            disabled={selectedNotes.length !== 2}
            className="button generate-btn"
          >
            Generate Melody
          </button>
          
          <button
            onClick={playMelody}
            disabled={generatedMelody.length === 0 || isPlaying}
            className="button play-btn"
          >
            {isPlaying ? 'Playing...' : 'Play Melody'}
          </button>
        </div>
      </div>

      {generatedMelody.length > 0 && showNotes && (
        <div className="melody-display">
          <div className="melody-title">Generated Melody:</div>
          <div className="melody-notes">
            {generatedMelody.map((note, index) => (
              <span key={`${note.name}-${index}`} className="melody-note">
                {note.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Piano