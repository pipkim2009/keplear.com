import { useState, useEffect } from 'react'
import * as Tone from 'tone'

export const useAudio = () => {
  const [keyboard, setKeyboard] = useState<Tone.Sampler | null>(null)
  const [guitar, setGuitar] = useState<Tone.Sampler | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const initializeAudio = async () => {
    if (isInitialized) return

    try {
      // Only initialize after user interaction
      await Tone.start()
      
      // Piano/Keyboard sampler
      const pianoSampler = new Tone.Sampler({
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

      // Acoustic Guitar sampler with working samples only
      const guitarSampler = new Tone.Sampler({
        urls: {
          A2: "A2.mp3",
          A3: "A3.mp3", 
          A4: "A4.mp3",
          C3: "C3.mp3",
          C4: "C4.mp3",
          C5: "C5.mp3",
          "D#4": "Ds4.mp3",
          "F#2": "Fs2.mp3",
          "F#3": "Fs3.mp3", 
          "F#4": "Fs4.mp3",
          G3: "G3.mp3",
        },
        release: 1.0,
        baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/",
      }).toDestination()

      setKeyboard(pianoSampler)
      setGuitar(guitarSampler)
      setIsInitialized(true)
      
      return () => {
        pianoSampler.dispose()
        guitarSampler.dispose()
      }
    } catch (error) {
      // Audio initialization failed silently
    }
  }

  useEffect(() => {
    return () => {
      if (keyboard) keyboard.dispose()
      if (guitar) guitar.dispose()
    }
  }, [])

  const playNote = async (noteName: string, duration: string = "0.3") => {
    await initializeAudio()
    if (!keyboard) return
    
    keyboard.triggerAttackRelease(noteName, duration)
  }

  const playGuitarNote = async (noteName: string, duration: string = "0.5") => {
    await initializeAudio()
    if (!guitar) return
    
    guitar.triggerAttackRelease(noteName, duration)
  }

  const playMelody = async (melody: Array<{name: string}>, bpm: number) => {
    if (melody.length === 0 || isPlaying) return
    
    await initializeAudio()
    if (!keyboard) return
    
    setIsPlaying(true)
    
    const noteDuration = (60 / bpm) * 800 // 80% rhythm timing in milliseconds
    
    for (let i = 0; i < melody.length; i++) {
      keyboard.triggerAttackRelease(melody[i].name, "0.5")
      if (i < melody.length - 1) {
        await new Promise(resolve => setTimeout(resolve, noteDuration))
      }
    }
    
    setIsPlaying(false)
  }

  const playGuitarMelody = async (melody: Array<{name: string}>, bpm: number) => {
    if (melody.length === 0 || isPlaying) return
    
    await initializeAudio()
    if (!guitar) return
    
    setIsPlaying(true)
    
    const noteDuration = (60 / bpm) * 800 // 80% rhythm timing in milliseconds
    
    for (let i = 0; i < melody.length; i++) {
      guitar.triggerAttackRelease(melody[i].name, "0.6")
      if (i < melody.length - 1) {
        await new Promise(resolve => setTimeout(resolve, noteDuration))
      }
    }
    
    setIsPlaying(false)
  }

  return {
    playNote,
    playGuitarNote,
    playMelody,
    playGuitarMelody,
    isPlaying
  }
}