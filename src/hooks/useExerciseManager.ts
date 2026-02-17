/**
 * useExerciseManager - Manages exercise array state for assignment creation/editing
 * Extracted from Classroom.tsx to reduce monolith size and enable reuse
 */

import { useState, useCallback } from 'react'
import type { ExerciseData } from '../types/exercise'
import { createEmptyExercise } from '../types/exercise'

const MAX_EXERCISES = 10

interface ExerciseManagerOptions {
  /** Default BPM for new exercises */
  defaultBpm?: number
  /** Default beats for new exercises */
  defaultBeats?: number
  /** Default chord mode */
  defaultChordMode?: 'single' | 'progression'
  /** Default lower octaves */
  defaultLowerOctaves?: number
  /** Default higher octaves */
  defaultHigherOctaves?: number
}

export function useExerciseManager(options: ExerciseManagerOptions = {}) {
  const {
    defaultBpm = 120,
    defaultBeats = 5,
    defaultChordMode = 'single',
    defaultLowerOctaves = 0,
    defaultHigherOctaves = 0,
  } = options

  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)

  /** Initialize exercises array (e.g., when creating a new assignment) */
  const initExercises = useCallback(
    (initial?: ExerciseData[]) => {
      if (initial && initial.length > 0) {
        setExercises(initial)
      } else {
        setExercises([
          createEmptyExercise(0, {
            bpm: defaultBpm,
            beats: defaultBeats,
            chordMode: defaultChordMode,
            lowerOctaves: defaultLowerOctaves,
            higherOctaves: defaultHigherOctaves,
          }),
        ])
      }
      setCurrentExerciseIndex(0)
    },
    [defaultBpm, defaultBeats, defaultChordMode, defaultLowerOctaves, defaultHigherOctaves]
  )

  /** Add a new exercise at the end. Returns the new index. */
  const addExercise = useCallback(
    (exerciseData?: Partial<ExerciseData>): number => {
      if (exercises.length >= MAX_EXERCISES) return exercises.length - 1

      const newExercise = createEmptyExercise(exercises.length, {
        bpm: defaultBpm,
        beats: defaultBeats,
        chordMode: defaultChordMode,
        lowerOctaves: defaultLowerOctaves,
        higherOctaves: defaultHigherOctaves,
        ...exerciseData,
      })

      setExercises(prev => [...prev, newExercise])
      const newIndex = exercises.length
      setCurrentExerciseIndex(newIndex)
      return newIndex
    },
    [
      exercises.length,
      defaultBpm,
      defaultBeats,
      defaultChordMode,
      defaultLowerOctaves,
      defaultHigherOctaves,
    ]
  )

  /** Insert an exercise at a specific position */
  const insertExercise = useCallback(
    (atIndex: number, exerciseData?: Partial<ExerciseData>): number => {
      if (exercises.length >= MAX_EXERCISES) return -1

      const insertAt = Math.max(0, Math.min(atIndex, exercises.length))
      const newExercise = createEmptyExercise(insertAt, {
        bpm: defaultBpm,
        beats: defaultBeats,
        chordMode: defaultChordMode,
        lowerOctaves: defaultLowerOctaves,
        higherOctaves: defaultHigherOctaves,
        ...exerciseData,
      })

      setExercises(prev => {
        const updated = [...prev]
        updated.splice(insertAt, 0, newExercise)
        // Rename all exercises
        return updated.map((ex, i) => ({ ...ex, name: `Exercise ${i + 1}` }))
      })
      setCurrentExerciseIndex(insertAt)
      return insertAt
    },
    [
      exercises.length,
      defaultBpm,
      defaultBeats,
      defaultChordMode,
      defaultLowerOctaves,
      defaultHigherOctaves,
    ]
  )

  /** Remove an exercise by index. Returns the new current index. */
  const removeExercise = useCallback(
    (indexToRemove: number): number => {
      if (exercises.length <= 1) return 0

      const updatedExercises = exercises
        .filter((_, i) => i !== indexToRemove)
        .map((exercise, i) => ({ ...exercise, name: `Exercise ${i + 1}` }))

      setExercises(updatedExercises)

      const newLength = updatedExercises.length
      const newCurrentIndex =
        indexToRemove >= newLength ? Math.max(0, newLength - 1) : indexToRemove
      setCurrentExerciseIndex(newCurrentIndex)
      return newCurrentIndex
    },
    [exercises]
  )

  /** Update an exercise at a specific index */
  const updateExercise = useCallback((index: number, updates: Partial<ExerciseData>) => {
    setExercises(prev => {
      if (index < 0 || index >= prev.length) return prev
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }, [])

  /** Update the current exercise */
  const updateCurrentExercise = useCallback(
    (updates: Partial<ExerciseData>) => {
      setExercises(prev => {
        if (currentExerciseIndex < 0 || currentExerciseIndex >= prev.length) return prev
        const updated = [...prev]
        updated[currentExerciseIndex] = { ...updated[currentExerciseIndex], ...updates }
        return updated
      })
    },
    [currentExerciseIndex]
  )

  /** Duplicate an exercise, inserting the copy right after it */
  const duplicateExercise = useCallback(
    (index: number): number => {
      if (exercises.length >= MAX_EXERCISES || index < 0 || index >= exercises.length) return -1

      const source = exercises[index]
      const copy: ExerciseData = {
        ...source,
        id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `Exercise ${index + 2}`, // Will be renamed below
      }

      setExercises(prev => {
        const updated = [...prev]
        updated.splice(index + 1, 0, copy)
        return updated.map((ex, i) => ({ ...ex, name: `Exercise ${i + 1}` }))
      })

      const newIndex = index + 1
      setCurrentExerciseIndex(newIndex)
      return newIndex
    },
    [exercises]
  )

  /** Reorder exercises by moving from one index to another */
  const reorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    setExercises(prev => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      )
        return prev

      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      // Rename all exercises
      return updated.map((ex, i) => ({ ...ex, name: `Exercise ${i + 1}` }))
    })

    // Adjust current exercise index to follow the moved item
    setCurrentExerciseIndex(prev => {
      if (prev === fromIndex) return toIndex
      if (fromIndex < prev && toIndex >= prev) return prev - 1
      if (fromIndex > prev && toIndex <= prev) return prev + 1
      return prev
    })
  }, [])

  /** Replace all exercises at once (e.g., from a template or generator) */
  const applyTemplate = useCallback((templateExercises: ExerciseData[]) => {
    const exercises = templateExercises.map((ex, i) => ({
      ...ex,
      id: `exercise-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: `Exercise ${i + 1}`,
    }))
    setExercises(exercises)
    setCurrentExerciseIndex(0)
  }, [])

  /** Insert a preset exercise at the current position + 1 */
  const insertPreset = useCallback(
    (preset: Partial<ExerciseData>): number => {
      return insertExercise(currentExerciseIndex + 1, preset)
    },
    [insertExercise, currentExerciseIndex]
  )

  /** Set all exercises' BPM at once */
  const setAllBpm = useCallback((newBpm: number) => {
    setExercises(prev =>
      prev.map(ex => ({
        ...ex,
        bpm: ex.type === 'song' ? ex.bpm : newBpm,
      }))
    )
  }, [])

  /** Get the current exercise */
  const currentExercise = exercises[currentExerciseIndex] ?? null

  /** Check if we can add more exercises */
  const canAddMore = exercises.length < MAX_EXERCISES

  return {
    exercises,
    setExercises,
    currentExerciseIndex,
    setCurrentExerciseIndex,
    currentExercise,
    canAddMore,
    maxExercises: MAX_EXERCISES,
    // Actions
    initExercises,
    addExercise,
    insertExercise,
    removeExercise,
    updateExercise,
    updateCurrentExercise,
    duplicateExercise,
    reorderExercises,
    applyTemplate,
    insertPreset,
    setAllBpm,
  }
}
