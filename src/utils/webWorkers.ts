/**
 * Web Workers integration for CPU-intensive tasks
 * Offloads heavy computations to background threads
 */

export interface WorkerTask<T = unknown, R = unknown> {
  id: string
  type: string
  payload: T
  resolve: (result: R) => void
  reject: (error: Error) => void
}

/**
 * Web Worker manager for offloading CPU-intensive tasks
 */
export class WorkerManager {
  private static instance: WorkerManager
  private workers = new Map<string, Worker>()
  private taskQueue = new Map<string, WorkerTask>()
  private nextTaskId = 0

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager()
    }
    return WorkerManager.instance
  }

  /**
   * Create or get a worker for a specific task type
   */
  private getWorker(workerType: string): Worker {
    if (!this.workers.has(workerType)) {
      const workerCode = this.getWorkerCode(workerType)
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))

      worker.onmessage = (event) => {
        const { taskId, result, error } = event.data
        const task = this.taskQueue.get(taskId)

        if (task) {
          this.taskQueue.delete(taskId)
          if (error) {
            task.reject(new Error(error))
          } else {
            task.resolve(result)
          }
        }
      }

      worker.onerror = (error) => {
        console.error(`Worker error for ${workerType}:`, error)
      }

      this.workers.set(workerType, worker)
    }

    return this.workers.get(workerType)!
  }

  /**
   * Execute a task in a web worker
   */
  async executeTask<T, R>(
    workerType: string,
    taskType: string,
    payload: T
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const taskId = `task_${this.nextTaskId++}`
      const task: WorkerTask<T, R> = {
        id: taskId,
        type: taskType,
        payload,
        resolve,
        reject
      }

      this.taskQueue.set(taskId, task)

      const worker = this.getWorker(workerType)
      worker.postMessage({
        taskId,
        type: taskType,
        payload
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.taskQueue.has(taskId)) {
          this.taskQueue.delete(taskId)
          reject(new Error('Worker task timed out'))
        }
      }, 30000)
    })
  }

  /**
   * Terminate a specific worker
   */
  terminateWorker(workerType: string): void {
    const worker = this.workers.get(workerType)
    if (worker) {
      worker.terminate()
      this.workers.delete(workerType)
    }
  }

  /**
   * Terminate all workers
   */
  terminateAll(): void {
    this.workers.forEach((worker) => worker.terminate())
    this.workers.clear()
    this.taskQueue.clear()
  }

  /**
   * Get worker code for different task types
   */
  private getWorkerCode(workerType: string): string {
    switch (workerType) {
      case 'audio-analysis':
        return this.getAudioAnalysisWorkerCode()
      case 'melody-generation':
        return this.getMelodyGenerationWorkerCode()
      case 'data-processing':
        return this.getDataProcessingWorkerCode()
      default:
        throw new Error(`Unknown worker type: ${workerType}`)
    }
  }

  /**
   * Audio analysis worker code
   */
  private getAudioAnalysisWorkerCode(): string {
    return `
      self.onmessage = function(event) {
        const { taskId, type, payload } = event.data;

        try {
          let result;

          switch (type) {
            case 'analyze-frequency':
              result = analyzeFrequency(payload);
              break;
            case 'detect-pitch':
              result = detectPitch(payload);
              break;
            case 'calculate-harmony':
              result = calculateHarmony(payload);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }

          self.postMessage({ taskId, result });
        } catch (error) {
          self.postMessage({ taskId, error: error.message });
        }
      };

      function analyzeFrequency(audioData) {
        // FFT analysis implementation
        const fftSize = audioData.length;
        const real = new Float32Array(fftSize);
        const imag = new Float32Array(fftSize);

        // Copy audio data to real part
        for (let i = 0; i < fftSize; i++) {
          real[i] = audioData[i] || 0;
          imag[i] = 0;
        }

        // Simple FFT implementation (for demo - use more optimized version in production)
        fft(real, imag);

        // Calculate magnitude spectrum
        const spectrum = new Float32Array(fftSize / 2);
        for (let i = 0; i < spectrum.length; i++) {
          spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }

        return spectrum;
      }

      function detectPitch(audioData) {
        // Autocorrelation-based pitch detection
        const sampleRate = 44100;
        const minPeriod = Math.floor(sampleRate / 800); // Min frequency ~800Hz
        const maxPeriod = Math.floor(sampleRate / 80);  // Max frequency ~80Hz

        let bestPeriod = 0;
        let bestCorrelation = 0;

        for (let period = minPeriod; period < maxPeriod; period++) {
          let correlation = 0;
          let count = 0;

          for (let i = 0; i < audioData.length - period; i++) {
            correlation += audioData[i] * audioData[i + period];
            count++;
          }

          correlation = count > 0 ? correlation / count : 0;

          if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestPeriod = period;
          }
        }

        const frequency = bestPeriod > 0 ? sampleRate / bestPeriod : 0;
        return { frequency, confidence: bestCorrelation };
      }

      function calculateHarmony(notes) {
        // Calculate harmonic relationships between notes
        const harmonies = [];

        for (let i = 0; i < notes.length; i++) {
          for (let j = i + 1; j < notes.length; j++) {
            const interval = calculateInterval(notes[i], notes[j]);
            const consonance = calculateConsonance(interval);

            harmonies.push({
              notes: [notes[i], notes[j]],
              interval,
              consonance
            });
          }
        }

        return harmonies.sort((a, b) => b.consonance - a.consonance);
      }

      function calculateInterval(note1, note2) {
        const semitones = Math.abs(note2.position - note1.position);
        return semitones % 12;
      }

      function calculateConsonance(interval) {
        const consonanceMap = {
          0: 1.0,   // Unison
          7: 0.9,   // Perfect fifth
          5: 0.8,   // Perfect fourth
          4: 0.7,   // Major third
          3: 0.6,   // Minor third
          9: 0.5,   // Major sixth
          8: 0.4,   // Minor sixth
          2: 0.3,   // Major second
          10: 0.3,  // Minor seventh
          11: 0.2,  // Major seventh
          1: 0.1,   // Minor second
          6: 0.1    // Tritone
        };

        return consonanceMap[interval] || 0;
      }

      function fft(real, imag) {
        const n = real.length;
        if (n <= 1) return;

        // Bit-reversal permutation
        for (let i = 1, j = 0; i < n; i++) {
          let bit = n >> 1;
          for (; j & bit; bit >>= 1) {
            j ^= bit;
          }
          j ^= bit;

          if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
          }
        }

        // Cooley-Tukey FFT
        for (let len = 2; len <= n; len <<= 1) {
          const angle = -2 * Math.PI / len;
          const wlen = { real: Math.cos(angle), imag: Math.sin(angle) };

          for (let i = 0; i < n; i += len) {
            const w = { real: 1, imag: 0 };

            for (let j = 0; j < len / 2; j++) {
              const u = { real: real[i + j], imag: imag[i + j] };
              const v = {
                real: real[i + j + len / 2] * w.real - imag[i + j + len / 2] * w.imag,
                imag: real[i + j + len / 2] * w.imag + imag[i + j + len / 2] * w.real
              };

              real[i + j] = u.real + v.real;
              imag[i + j] = u.imag + v.imag;
              real[i + j + len / 2] = u.real - v.real;
              imag[i + j + len / 2] = u.imag - v.imag;

              const nextW = {
                real: w.real * wlen.real - w.imag * wlen.imag,
                imag: w.real * wlen.imag + w.imag * wlen.real
              };
              w.real = nextW.real;
              w.imag = nextW.imag;
            }
          }
        }
      }
    `
  }

  /**
   * Melody generation worker code
   */
  private getMelodyGenerationWorkerCode(): string {
    return `
      self.onmessage = function(event) {
        const { taskId, type, payload } = event.data;

        try {
          let result;

          switch (type) {
            case 'generate-melody':
              result = generateMelody(payload);
              break;
            case 'analyze-melody':
              result = analyzeMelody(payload);
              break;
            case 'suggest-harmony':
              result = suggestHarmony(payload);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }

          self.postMessage({ taskId, result });
        } catch (error) {
          self.postMessage({ taskId, error: error.message });
        }
      };

      function generateMelody({ notes, length, constraints }) {
        const melody = [];
        const availableNotes = [...notes];

        // Apply constraints
        if (constraints.mode) {
          // Filter notes based on musical mode
          availableNotes.splice(0, availableNotes.length,
            ...filterNotesByMode(notes, constraints.mode));
        }

        for (let i = 0; i < length; i++) {
          let nextNote;

          if (i === 0) {
            // First note - choose randomly or based on key
            nextNote = constraints.startNote ||
              availableNotes[Math.floor(Math.random() * availableNotes.length)];
          } else {
            // Apply melodic constraints
            const prevNote = melody[i - 1];
            nextNote = chooseMelodicNote(prevNote, availableNotes, constraints);
          }

          melody.push(nextNote);
        }

        return melody;
      }

      function chooseMelodicNote(prevNote, availableNotes, constraints) {
        const { maxInterval = 7, preferredDirection, rhythmPattern } = constraints;

        // Filter notes by maximum interval
        const validNotes = availableNotes.filter(note =>
          Math.abs(note.position - prevNote.position) <= maxInterval
        );

        if (validNotes.length === 0) return prevNote; // Fallback

        // Apply direction preference
        if (preferredDirection) {
          const directionNotes = validNotes.filter(note => {
            const isAscending = note.position > prevNote.position;
            return preferredDirection === 'up' ? isAscending : !isAscending;
          });

          if (directionNotes.length > 0) {
            return directionNotes[Math.floor(Math.random() * directionNotes.length)];
          }
        }

        // Weighted random selection favoring consonant intervals
        const weights = validNotes.map(note => {
          const interval = Math.abs(note.position - prevNote.position) % 12;
          const consonanceWeights = {
            0: 1,   // Unison
            1: 0.3, // Minor second
            2: 0.5, // Major second
            3: 0.7, // Minor third
            4: 0.8, // Major third
            5: 0.9, // Perfect fourth
            6: 0.2, // Tritone
            7: 1.0, // Perfect fifth
            8: 0.6, // Minor sixth
            9: 0.7, // Major sixth
            10: 0.4, // Minor seventh
            11: 0.3  // Major seventh
          };

          return consonanceWeights[interval] || 0.5;
        });

        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < validNotes.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            return validNotes[i];
          }
        }

        return validNotes[0]; // Fallback
      }

      function filterNotesByMode(notes, mode) {
        const modePatterns = {
          major: [0, 2, 4, 5, 7, 9, 11],
          minor: [0, 2, 3, 5, 7, 8, 10],
          dorian: [0, 2, 3, 5, 7, 9, 10],
          phrygian: [0, 1, 3, 5, 7, 8, 10],
          lydian: [0, 2, 4, 6, 7, 9, 11],
          mixolydian: [0, 2, 4, 5, 7, 9, 10],
          locrian: [0, 1, 3, 5, 6, 8, 10]
        };

        const pattern = modePatterns[mode] || modePatterns.major;

        return notes.filter(note => {
          const semitone = note.position % 12;
          return pattern.includes(semitone);
        });
      }

      function analyzeMelody(melody) {
        const analysis = {
          length: melody.length,
          range: calculateRange(melody),
          intervals: calculateIntervals(melody),
          contour: calculateContour(melody),
          keyCenter: detectKeyCenter(melody),
          complexity: calculateComplexity(melody)
        };

        return analysis;
      }

      function calculateRange(melody) {
        const positions = melody.map(note => note.position);
        return Math.max(...positions) - Math.min(...positions);
      }

      function calculateIntervals(melody) {
        const intervals = [];
        for (let i = 1; i < melody.length; i++) {
          intervals.push(melody[i].position - melody[i - 1].position);
        }
        return intervals;
      }

      function calculateContour(melody) {
        const intervals = calculateIntervals(melody);
        return intervals.map(interval => {
          if (interval > 0) return 'up';
          if (interval < 0) return 'down';
          return 'same';
        });
      }

      function detectKeyCenter(melody) {
        const pitchCounts = {};
        melody.forEach(note => {
          const pitch = note.position % 12;
          pitchCounts[pitch] = (pitchCounts[pitch] || 0) + 1;
        });

        const sortedPitches = Object.entries(pitchCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([pitch]) => parseInt(pitch));

        return sortedPitches[0]; // Most frequent pitch class
      }

      function calculateComplexity(melody) {
        const intervals = calculateIntervals(melody);
        const uniqueIntervals = new Set(intervals).size;
        const averageInterval = intervals.reduce((sum, interval) =>
          sum + Math.abs(interval), 0) / intervals.length;

        return {
          intervalDiversity: uniqueIntervals / intervals.length,
          averageInterval,
          complexity: (uniqueIntervals + averageInterval) / 2
        };
      }

      function suggestHarmony(melody) {
        const harmonies = [];

        melody.forEach((note, index) => {
          const chords = generateChords(note);
          const contextualChords = filterChordsByContext(chords, melody, index);

          harmonies.push({
            noteIndex: index,
            note,
            suggestedChords: contextualChords.slice(0, 3) // Top 3 suggestions
          });
        });

        return harmonies;
      }

      function generateChords(rootNote) {
        const chordTypes = [
          { name: 'major', intervals: [0, 4, 7] },
          { name: 'minor', intervals: [0, 3, 7] },
          { name: 'major7', intervals: [0, 4, 7, 11] },
          { name: 'minor7', intervals: [0, 3, 7, 10] },
          { name: 'dominant7', intervals: [0, 4, 7, 10] }
        ];

        return chordTypes.map(chordType => ({
          root: rootNote,
          type: chordType.name,
          notes: chordType.intervals.map(interval => ({
            ...rootNote,
            position: rootNote.position + interval
          }))
        }));
      }

      function filterChordsByContext(chords, melody, noteIndex) {
        // Simple context filtering - prefer chords that fit with neighboring notes
        return chords.map(chord => {
          let score = 1;

          // Check how well chord fits with previous and next notes
          const contextNotes = [
            noteIndex > 0 ? melody[noteIndex - 1] : null,
            noteIndex < melody.length - 1 ? melody[noteIndex + 1] : null
          ].filter(Boolean);

          contextNotes.forEach(contextNote => {
            const fitsInChord = chord.notes.some(chordNote =>
              chordNote.position % 12 === contextNote.position % 12
            );
            if (fitsInChord) score += 0.5;
          });

          return { ...chord, score };
        }).sort((a, b) => b.score - a.score);
      }
    `
  }

  /**
   * Data processing worker code
   */
  private getDataProcessingWorkerCode(): string {
    return `
      self.onmessage = function(event) {
        const { taskId, type, payload } = event.data;

        try {
          let result;

          switch (type) {
            case 'sort-melodies':
              result = sortMelodies(payload);
              break;
            case 'filter-melodies':
              result = filterMelodies(payload);
              break;
            case 'search-melodies':
              result = searchMelodies(payload);
              break;
            default:
              throw new Error('Unknown task type: ' + type);
          }

          self.postMessage({ taskId, result });
        } catch (error) {
          self.postMessage({ taskId, error: error.message });
        }
      };

      function sortMelodies({ melodies, sortBy, order = 'asc' }) {
        const sorted = [...melodies].sort((a, b) => {
          let aVal, bVal;

          switch (sortBy) {
            case 'name':
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
              break;
            case 'duration':
              aVal = a.duration;
              bVal = b.duration;
              break;
            case 'complexity':
              aVal = calculateMelodyComplexity(a);
              bVal = calculateMelodyComplexity(b);
              break;
            case 'bpm':
              aVal = a.bpm;
              bVal = b.bpm;
              break;
            default:
              return 0;
          }

          if (typeof aVal === 'string') {
            return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
          } else {
            return order === 'asc' ? aVal - bVal : bVal - aVal;
          }
        });

        return sorted;
      }

      function filterMelodies({ melodies, filters }) {
        return melodies.filter(melody => {
          return Object.entries(filters).every(([key, value]) => {
            switch (key) {
              case 'minDuration':
                return melody.duration >= value;
              case 'maxDuration':
                return melody.duration <= value;
              case 'minBpm':
                return melody.bpm >= value;
              case 'maxBpm':
                return melody.bpm <= value;
              case 'noteCount':
                return melody.notes.length === value;
              case 'hasNote':
                return melody.notes.some(note => note.name === value);
              default:
                return true;
            }
          });
        });
      }

      function searchMelodies({ melodies, query, searchFields = ['name'] }) {
        const lowerQuery = query.toLowerCase();

        return melodies.filter(melody => {
          return searchFields.some(field => {
            switch (field) {
              case 'name':
                return melody.name.toLowerCase().includes(lowerQuery);
              case 'notes':
                return melody.notes.some(note =>
                  note.name.toLowerCase().includes(lowerQuery)
                );
              default:
                return false;
            }
          });
        }).map(melody => ({
          ...melody,
          searchScore: calculateSearchScore(melody, query, searchFields)
        })).sort((a, b) => b.searchScore - a.searchScore);
      }

      function calculateMelodyComplexity(melody) {
        const intervals = [];
        for (let i = 1; i < melody.notes.length; i++) {
          intervals.push(Math.abs(melody.notes[i].position - melody.notes[i - 1].position));
        }

        const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
        const uniqueIntervals = new Set(intervals).size;

        return avgInterval * (uniqueIntervals / intervals.length);
      }

      function calculateSearchScore(melody, query, searchFields) {
        let score = 0;
        const lowerQuery = query.toLowerCase();

        searchFields.forEach(field => {
          switch (field) {
            case 'name':
              if (melody.name.toLowerCase() === lowerQuery) score += 10;
              else if (melody.name.toLowerCase().includes(lowerQuery)) score += 5;
              break;
            case 'notes':
              const matchingNotes = melody.notes.filter(note =>
                note.name.toLowerCase().includes(lowerQuery)
              ).length;
              score += matchingNotes * 2;
              break;
          }
        });

        return score;
      }
    `
  }
}

// Export singleton instance
export const workerManager = WorkerManager.getInstance()

/**
 * Hook for using web workers in React components
 */
export function useWebWorker<T, R>(workerType: string) {
  const executeTask = useCallback(
    (taskType: string, payload: T): Promise<R> => {
      return workerManager.executeTask<T, R>(workerType, taskType, payload)
    },
    [workerType]
  )

  useEffect(() => {
    return () => {
      // Cleanup worker when component unmounts
      workerManager.terminateWorker(workerType)
    }
  }, [workerType])

  return { executeTask }
}