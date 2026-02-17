#!/usr/bin/env npx tsx
/**
 * AI Classroom Content Generator
 *
 * Uses Claude to generate themed classroom curricula with generator warm-ups
 * and YouTube song conclusions. Searches Piped API for real video IDs.
 * Inserts everything into Supabase.
 *
 * Usage:
 *   npx tsx scripts/generate-classrooms.ts \
 *     --instrument keyboard \
 *     --theme "jazz basics" \
 *     --lessons 8 \
 *     --user-id "your-supabase-user-id"
 *
 * Required env vars (in .env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   ANTHROPIC_API_KEY (or pass --api-key)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// 0. Load .env manually (no dotenv dependency)
// ---------------------------------------------------------------------------
function loadEnv() {
  try {
    const envPath = resolve(import.meta.dirname || __dirname, '..', '.env')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env not found, rely on env vars
  }
}
loadEnv()

// ---------------------------------------------------------------------------
// 1. Parse CLI args
// ---------------------------------------------------------------------------
interface CLIArgs {
  instrument: 'keyboard' | 'guitar' | 'bass'
  theme: string
  lessons: number
  userId: string
  apiKey: string
  dryRun: boolean
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  const instrument = (get('--instrument') || 'keyboard') as CLIArgs['instrument']
  const theme = get('--theme') || 'music fundamentals'
  const lessons = parseInt(get('--lessons') || '8', 10)
  const userId = get('--user-id') || ''
  const apiKey = get('--api-key') || process.env.ANTHROPIC_API_KEY || ''
  const serviceKey = get('--service-key') || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const dryRun = args.includes('--dry-run')

  if (!userId) {
    console.error('ERROR: --user-id is required (your Supabase user UUID)')
    process.exit(1)
  }
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY env var or --api-key flag is required')
    process.exit(1)
  }

  const validInstruments = ['keyboard', 'guitar', 'bass']
  if (!validInstruments.includes(instrument)) {
    console.error(`ERROR: --instrument must be one of: ${validInstruments.join(', ')}`)
    process.exit(1)
  }

  if (!serviceKey && !dryRun) {
    console.error(
      'ERROR: SUPABASE_SERVICE_ROLE_KEY env var or --service-key flag is required (find it at Supabase Dashboard > Settings > API)'
    )
    process.exit(1)
  }

  return { instrument, theme, lessons, userId, apiKey, serviceKey, dryRun }
}

// ---------------------------------------------------------------------------
// 2. Available scales and chords (must match what the app supports)
// ---------------------------------------------------------------------------
const AVAILABLE_SCALES_KEYBOARD = [
  'Major',
  'Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Locrian',
  'Pentatonic Major',
  'Pentatonic Minor',
  'Harmonic Minor',
  'Blues Scale',
]

const AVAILABLE_SCALES_GUITAR = [
  'Major',
  'Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Locrian',
  'Pentatonic Major',
  'Pentatonic Minor',
  'Harmonic Minor',
  'Blues Scale',
]

const AVAILABLE_SCALES_BASS = [
  'Major',
  'Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Locrian',
  'Pentatonic Major',
  'Pentatonic Minor',
  'Harmonic Minor',
  'Blues Scale',
  'Chromatic',
]

const AVAILABLE_CHORDS = [
  'Major',
  'Minor',
  'Dominant 7th',
  'Major 7th',
  'Minor 7th',
  'Diminished',
  'Augmented',
  'Sus2',
  'Sus4',
  'Add9',
  'Major 9th',
  'Minor 9th',
]

function getAvailableScales(instrument: string): string[] {
  if (instrument === 'bass') return AVAILABLE_SCALES_BASS
  if (instrument === 'guitar') return AVAILABLE_SCALES_GUITAR
  return AVAILABLE_SCALES_KEYBOARD
}

// ---------------------------------------------------------------------------
// 3. Claude API call
// ---------------------------------------------------------------------------
interface ExercisePlan {
  name: string
  scales: string[]
  chords: string[]
  bpm: number
  beats: number
  fretLow?: number
  fretHigh?: number
}

interface LessonPlan {
  classroomTitle: string
  classroomDescription: string
  lessons: {
    title: string
    focus: 'scales' | 'chords' | 'combined'
    exercises: ExercisePlan[]
    song: {
      searchQuery: string
      why: string
    }
  }[]
}

async function generateCurriculum(
  apiKey: string,
  instrument: string,
  theme: string,
  lessonCount: number
): Promise<LessonPlan> {
  console.log(`\n🤖 Asking Claude to design a "${theme}" curriculum for ${instrument}...`)

  const isStringed = instrument === 'guitar' || instrument === 'bass'

  const fretRangeRule = isStringed
    ? `- Each exercise MUST include "fretLow" and "fretHigh" (integers). Start lessons with small ranges like 0-4 or 0-5 and gradually expand to 0-12 in later lessons. NEVER use the full fretboard (0-12) for early lessons.`
    : ''

  const prompt = `You are a music teacher designing a ${instrument} course about "${theme}" with ${lessonCount} lessons.

This app teaches NOTE RECOGNITION — students see/hear notes and must identify them on the instrument. It is NOT about rhythm, timing, or strumming patterns. Focus entirely on melodic and harmonic note recognition.

CRITICAL PACING RULE — DO NOT overwhelm students:
- A lesson should focus on ONE concept. Do NOT teach scales AND chords in the same lesson.
- The first ~40% of lessons should be SCALES ONLY (all exercises use scales, chords arrays empty).
- The next ~30% of lessons should be CHORDS ONLY (all exercises use chords, scales arrays empty).
- Only the final ~30% of lessons may COMBINE scales and chords together.
- Within each phase, introduce ONE new scale or chord per lesson. Repeat previously learned ones for reinforcement.
- Example for 10 lessons: Lessons 1-4 scales only, Lessons 5-7 chords only, Lessons 8-10 combined.

Each lesson has 2-4 exercises (NOT always 4 — use fewer for simpler early lessons):
- Early lessons (scales phase): 2-3 exercises drilling the same scale in different ways (e.g. ascending, intervals, patterns)
- Middle lessons (chords phase): 2-3 exercises drilling chord tones
- Later lessons (combined): 3-4 exercises mixing previously learned scales and chords
- The LAST exercise in every lesson is always a Song exercise (provided separately, not in the exercises array)

Return ONLY valid JSON (no markdown, no code fences) matching this exact structure:
{
  "classroomTitle": "short catchy class name",
  "classroomDescription": "1-2 sentence description",
  "lessons": [
    {
      "title": "Lesson 1: descriptive name",
      "focus": "scales",
      "exercises": [
        {
          "name": "Major Scale: Ascending Pattern",
          "scales": ["Major"],
          "chords": [],
          "bpm": 65,
          "beats": 4${isStringed ? ',\n          "fretLow": 0,\n          "fretHigh": 4' : ''}
        },
        {
          "name": "Major Scale: Interval Jumps",
          "scales": ["Major"],
          "chords": [],
          "bpm": 70,
          "beats": 4${isStringed ? ',\n          "fretLow": 0,\n          "fretHigh": 4' : ''}
        }
      ],
      "song": {
        "searchQuery": "exact song title + artist for YouTube search",
        "why": "brief reason this song uses these scales/chords"
      }
    }
  ]
}

RULES:
- Scales MUST be from: ${getAvailableScales(instrument).join(', ')}
- Chords MUST be from: ${AVAILABLE_CHORDS.join(', ')}
- The "focus" field MUST be "scales", "chords", or "combined" — and must follow the pacing rule above
- In "scales" focus lessons: ALL exercises must have chords=[] (empty)
- In "chords" focus lessons: ALL exercises must have scales=[] (empty)
- In "combined" focus lessons: exercises can have both, but each exercise should still lean toward one concept
- BPM should progress from slow (60-75) to moderate (80-110) across lessons
- Each exercise should have a descriptive name explaining what the student is recognizing
- Song search queries should be SPECIFIC: "song title artist name" (real, well-known songs)
- Pick songs that clearly feature the scales/chords from the lesson
- Introduce at most ONE new scale or chord per lesson. Reuse previously taught ones.
- Each lesson title should be numbered and descriptive
- beats should be 3, 4, or 5
- Do NOT reference rhythm, strumming, timing, or groove in exercise names or lesson titles — this is purely note recognition
${fretRangeRule}`

  let response: Response | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const wait = attempt * 15
      console.log(`  ⏳ API overloaded, retrying in ${wait}s (attempt ${attempt + 1}/5)...`)
      await new Promise(r => setTimeout(r, wait * 1000))
    }
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (response.ok || response.status !== 529) break
  }

  if (!response || !response.ok) {
    const err = response ? await response.text() : 'No response'
    throw new Error(`Claude API error ${response?.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content[0].text

  // Parse JSON from response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  const plan: LessonPlan = JSON.parse(jsonMatch[0])

  // Validate scales/chords in all exercises
  const availableScales = getAvailableScales(instrument)
  for (const lesson of plan.lessons) {
    for (const ex of lesson.exercises) {
      ex.scales = ex.scales.filter(s => availableScales.includes(s))
      ex.chords = ex.chords.filter(c => AVAILABLE_CHORDS.includes(c))
      // Ensure at least one scale or chord per exercise
      if (ex.scales.length === 0 && ex.chords.length === 0) ex.scales = ['Major']
    }
  }

  console.log(`✅ Generated "${plan.classroomTitle}" with ${plan.lessons.length} lessons`)
  return plan
}

// ---------------------------------------------------------------------------
// 4. YouTube search via Piped API (direct, no proxy needed for server-side)
// ---------------------------------------------------------------------------
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.garudalinux.org',
  'https://api.piped.private.coffee',
]

interface YouTubeResult {
  videoId: string
  title: string
  author: string
}

async function searchYouTube(query: string): Promise<YouTubeResult | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)

      if (!res.ok) continue

      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) continue

      const data = await res.json()
      const items = data.items || data

      for (const item of items) {
        if (!item.url?.includes('/watch?v=')) continue
        const match = item.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
        if (match) {
          return {
            videoId: match[1],
            title: item.title || query,
            author: item.uploaderName || 'Unknown',
          }
        }
      }
    } catch {
      // Try next instance
      continue
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// 5. Supabase insert
// ---------------------------------------------------------------------------
async function insertClassroom(
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
  userId: string,
  plan: LessonPlan,
  instrument: string,
  songResults: Map<number, YouTubeResult>
) {
  // Service role key bypasses RLS — needed for CLI script without user session
  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${serviceKey}`,
    Prefer: 'return=representation',
  }

  // Create classroom
  console.log('\n📦 Creating classroom in Supabase...')
  const classroomRes = await fetch(`${supabaseUrl}/rest/v1/classrooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: plan.classroomTitle,
      description: plan.classroomDescription,
      created_by: userId,
      is_public: true,
      join_code: null,
    }),
  })

  if (!classroomRes.ok) {
    const err = await classroomRes.text()
    throw new Error(`Failed to create classroom: ${err}`)
  }

  const [classroom] = await classroomRes.json()
  const classroomId = classroom.id
  console.log(`✅ Classroom created: ${classroomId}`)

  // Create assignments
  let created = 0
  for (let i = 0; i < plan.lessons.length; i++) {
    const lesson = plan.lessons[i]
    const song = songResults.get(i)

    // Build exercises array: 3 generator exercises + 1 song
    const isStringedInst = instrument === 'guitar' || instrument === 'bass'
    const exercises: Record<string, unknown>[] = lesson.exercises.map((ex, j) => {
      const fretSuffix =
        isStringedInst && ex.fretLow != null && ex.fretHigh != null
          ? ` (Frets ${ex.fretLow}-${ex.fretHigh})`
          : ''
      return {
        id: `ex-${i}-gen-${j}`,
        name: ex.name,
        transcript: '',
        type: 'generator',
        bpm: ex.bpm,
        beats: ex.beats,
        chordMode: ex.chords.length > 0 ? 'progression' : 'single',
        lowerOctaves: 0,
        higherOctaves: 0,
        selectedNoteIds: [],
        appliedScales: ex.scales.map(s => ({
          root: 'C',
          scaleName: `${s}${fretSuffix}`,
          octave: 4,
          displayName: `C ${s}${fretSuffix}`,
        })),
        appliedChords: ex.chords.map(c => ({
          root: 'C',
          chordName: c,
          displayName: `C ${c}`,
        })),
      }
    })

    if (song) {
      exercises.push({
        id: `ex-${i}-song`,
        name: 'Song Practice',
        transcript: `${lesson.song.why} — ${song.title} by ${song.author}`,
        type: 'song',
        bpm: lesson.exercises[0]?.bpm || 80,
        beats: lesson.exercises[0]?.beats || 4,
        chordMode: 'single',
        lowerOctaves: 0,
        higherOctaves: 0,
        selectedNoteIds: [],
        appliedScales: [],
        appliedChords: [],
        songData: {
          videoId: song.videoId,
          videoTitle: `${song.title} - ${song.author}`,
          markerA: null,
          markerB: null,
          playbackRate: 1,
        },
      })
    }

    // Collect all scales/chords from exercises for top-level assignment fields
    const allScales = [...new Set(lesson.exercises.flatMap(ex => ex.scales))]
    const allChords = [...new Set(lesson.exercises.flatMap(ex => ex.chords))]
    const firstEx = lesson.exercises[0]

    const selectionData = {
      selectedNoteIds: [],
      appliedScales: exercises[0].appliedScales,
      appliedChords: exercises[0].appliedChords,
      exercises,
    }

    // For guitar/bass, use fret range from exercises; for keyboard use octaves
    const fretLow = firstEx?.fretLow ?? 0
    const fretHigh = firstEx?.fretHigh ?? 12

    const assignmentData = {
      classroom_id: classroomId,
      title: lesson.title,
      lesson_type:
        lesson.focus === 'chords' ? 'chords' : lesson.focus === 'combined' ? 'chords' : 'melodies',
      instrument,
      bpm: firstEx?.bpm || 80,
      beats: firstEx?.beats || 4,
      chord_count: allChords.length || 4,
      scales: allScales.length > 0 ? allScales : ['Major'],
      chords: allChords.length > 0 ? allChords : ['Major'],
      octave_low: 4,
      octave_high: 5,
      fret_low: fretLow,
      fret_high: fretHigh,
      selection_data: selectionData,
      created_by: userId,
    }

    const assignRes = await fetch(`${supabaseUrl}/rest/v1/assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(assignmentData),
    })

    if (assignRes.ok) {
      created++
      const songStatus = song ? `🎵 ${song.title}` : '⚠️  no song found'
      console.log(`  ✅ ${lesson.title} — ${songStatus}`)
    } else {
      const err = await assignRes.text()
      console.error(`  ❌ ${lesson.title}: ${err}`)
    }
  }

  return { classroomId, created }
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs()

  console.log('━'.repeat(60))
  console.log('🎹 Keplear AI Classroom Generator')
  console.log('━'.repeat(60))
  console.log(`  Instrument: ${args.instrument}`)
  console.log(`  Theme:      ${args.theme}`)
  console.log(`  Lessons:    ${args.lessons}`)
  console.log(`  Dry run:    ${args.dryRun}`)
  console.log('━'.repeat(60))

  // Step 1: Generate curriculum with Claude
  const plan = await generateCurriculum(args.apiKey, args.instrument, args.theme, args.lessons)

  // Step 2: Search YouTube for each song
  console.log('\n🔍 Searching YouTube for songs...')
  const songResults = new Map<number, YouTubeResult>()

  for (let i = 0; i < plan.lessons.length; i++) {
    const lesson = plan.lessons[i]
    const query = lesson.song.searchQuery
    process.stdout.write(`  [${i + 1}/${plan.lessons.length}] "${query}" ... `)

    const result = await searchYouTube(query)
    if (result) {
      songResults.set(i, result)
      console.log(`✅ ${result.videoId} — ${result.title}`)
    } else {
      console.log('❌ not found')
    }

    // Small delay to be nice to Piped
    await new Promise(r => setTimeout(r, 500))
  }

  const foundCount = songResults.size
  console.log(`\n🎵 Found ${foundCount}/${plan.lessons.length} songs`)

  // Step 3: Preview
  console.log('\n📋 Curriculum preview:')
  console.log(`\n  "${plan.classroomTitle}"`)
  console.log(`  ${plan.classroomDescription}\n`)

  for (let i = 0; i < plan.lessons.length; i++) {
    const lesson = plan.lessons[i]
    const song = songResults.get(i)
    console.log(`  ${lesson.title}`)
    for (const ex of lesson.exercises) {
      const parts = []
      if (ex.scales.length) parts.push(ex.scales.join(', '))
      if (ex.chords.length) parts.push(ex.chords.join(', '))
      const fretInfo = ex.fretLow != null ? ` [frets ${ex.fretLow}-${ex.fretHigh}]` : ''
      console.log(`    🏋️ ${ex.name}: ${parts.join(' | ')} @ ${ex.bpm}bpm${fretInfo}`)
    }
    if (song) {
      console.log(`    🎵 Song: ${song.title} (${song.videoId})`)
    } else {
      console.log(`    ⚠️  Song: not found for "${lesson.song.searchQuery}"`)
    }
  }

  if (args.dryRun) {
    console.log('\n🏁 Dry run complete — no data written to Supabase')
    return
  }

  // Step 4: Insert into Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('\nERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env')
    process.exit(1)
  }

  const { classroomId, created } = await insertClassroom(
    supabaseUrl,
    supabaseKey,
    args.serviceKey,
    args.userId,
    plan,
    args.instrument,
    songResults
  )

  console.log('\n━'.repeat(60))
  console.log(`🎉 Done! Created "${plan.classroomTitle}"`)
  console.log(`   ${created}/${plan.lessons.length} assignments inserted`)
  console.log(`   Classroom ID: ${classroomId}`)
  console.log('━'.repeat(60))
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message || err)
  process.exit(1)
})
