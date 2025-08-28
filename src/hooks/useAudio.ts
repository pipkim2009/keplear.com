import { useState, useEffect } from 'react'
import * as Tone from 'tone'

export const useAudio = () => {
  const [keyboard, setKeyboard] = useState<Tone.Sampler | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
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

    setKeyboard(sampler)

    return () => {
      sampler.dispose()
    }
  }, [])

  const ensureToneStarted = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
  }

  const playNote = async (noteName: string, duration: string = "0.3") => {
    if (!keyboard) return
    
    await ensureToneStarted()
    keyboard.triggerAttackRelease(noteName, duration)
  }

  const playMelody = async (melody: Array<{name: string}>, bpm: number) => {
    if (melody.length === 0 || isPlaying || !keyboard) return
    
    await ensureToneStarted()
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

  return {
    playNote,
    playMelody,
    isPlaying
  }
}