/**
 * Keplear AI Assistant
 * A client-side AI that helps users navigate and use the app
 */

interface Intent {
  keywords: string[]
  patterns: RegExp[]
  response: string | ((match: string) => string)
  followUp?: string
  action?: {
    type: 'navigate' | 'tip' | 'info'
    target?: string
  }
}

interface KnowledgeBase {
  appInfo: {
    name: string
    description: string
    features: string[]
  }
  pages: Record<string, {
    name: string
    description: string
    howToAccess: string
    features: string[]
  }>
  features: Record<string, {
    name: string
    description: string
    location: string
    howToUse: string
  }>
  instruments: Record<string, {
    name: string
    description: string
    tips: string[]
  }>
}

// Comprehensive knowledge base about the app
const knowledgeBase: KnowledgeBase = {
  appInfo: {
    name: 'Keplear',
    description: 'An ear training app for musicians to practice identifying and playing scales, chords, and melodies on keyboard, guitar, or bass.',
    features: [
      'Three instruments: Keyboard, Guitar, and Bass',
      'Scale and chord practice',
      'Melody generation and playback',
      'Real-time pitch detection with microphone',
      'BPM and beat customization',
      'Classroom mode for teachers and students',
      'Dark and light theme support'
    ]
  },
  pages: {
    home: {
      name: 'Home Page',
      description: 'The landing page with an overview of Keplear and a button to start training.',
      howToAccess: 'Click on the Keplear logo in the header or navigate to the home page.',
      features: ['Start Training button', 'App overview', 'Instrument showcase']
    },
    sandbox: {
      name: 'Sandbox / Practice Mode',
      description: 'The main practice area where you can select instruments, apply scales and chords, generate melodies, and train your ear.',
      howToAccess: 'Click "Start Training Now" on the home page, or click "Sandbox" in the header navigation.',
      features: [
        'Instrument selection (Keyboard, Guitar, Bass)',
        'Scale selection and application',
        'Chord selection and application',
        'Melody generation',
        'BPM and beats control',
        'Microphone pitch detection',
        'Octave range adjustment (keyboard)',
        'Fret zone selection (guitar/bass)'
      ]
    },
    classroom: {
      name: 'Classroom',
      description: 'A space for teachers to create classrooms and assignments, and for students to join and complete assignments.',
      howToAccess: 'Click "Classroom" in the header navigation. You need to be signed in to use this feature.',
      features: [
        'Create classrooms (teachers)',
        'Join classrooms with a code (students)',
        'Create assignments with specific scales/chords',
        'Take assignments and practice',
        'Public and private classroom options'
      ]
    }
  },
  features: {
    scales: {
      name: 'Scales',
      description: 'Musical scales that highlight specific notes on your instrument. Available scales include Major, Minor, Pentatonic, Blues, and more.',
      location: 'In Sandbox mode, look for the "Scales" section in the control panel.',
      howToUse: 'Select a root note (like C, D, E), choose a scale type, then click "Apply" to highlight those notes on your instrument.'
    },
    chords: {
      name: 'Chords',
      description: 'Chord patterns that can be applied to your instrument. Includes Major, Minor, 7th, and other chord types.',
      location: 'In Sandbox mode, look for the "Chords" section in the control panel.',
      howToUse: 'Select a root note, choose a chord type, then click "Apply". Use the Progression/Arpeggiator toggle to control how chords are played in melodies.'
    },
    melodyGeneration: {
      name: 'Melody Generation',
      description: 'Automatically generates melodies based on your selected scales and chords.',
      location: 'In Sandbox mode, click the "Generate" button after applying scales or chords.',
      howToUse: 'First apply some scales or chords, set your BPM and number of beats, then click "Generate" to create a melody. Click "Play" to hear it.'
    },
    bpm: {
      name: 'BPM (Beats Per Minute)',
      description: 'Controls the tempo/speed of melody playback.',
      location: 'In the control panel in Sandbox mode, look for the BPM input field.',
      howToUse: 'Enter a number between 1-999 to set the tempo. Higher numbers = faster playback.'
    },
    beats: {
      name: 'Number of Beats',
      description: 'Controls how many notes are in a generated melody.',
      location: 'In the control panel in Sandbox mode, next to the BPM setting.',
      howToUse: 'Enter a number to set how many beats/notes will be in your generated melody.'
    },
    microphone: {
      name: 'Microphone / Pitch Detection',
      description: 'Uses your microphone to detect what notes you\'re playing and provides real-time feedback.',
      location: 'In Sandbox mode, look for the microphone icon or "Start Listening" button.',
      howToUse: 'Click to enable microphone access. Play notes on your real instrument and the app will detect and highlight them.'
    },
    instruments: {
      name: 'Instrument Selection',
      description: 'Switch between Keyboard, Guitar, and Bass instruments.',
      location: 'At the top of the Sandbox page, you\'ll see instrument tabs or a selector.',
      howToUse: 'Click on Keyboard, Guitar, or Bass to switch instruments. Each has its own visual layout.'
    },
    octaveRange: {
      name: 'Octave Range',
      description: 'Adjust the range of octaves displayed on the keyboard.',
      location: 'In Sandbox mode when using Keyboard, look for octave controls.',
      howToUse: 'Use the +/- buttons to add or remove octaves from the keyboard display.'
    },
    chordMode: {
      name: 'Chord Mode (Progression/Arpeggiator)',
      description: 'Controls how chords are played in generated melodies. Progression plays full chords, Arpeggiator plays notes individually.',
      location: 'In the control panel when chords are applied.',
      howToUse: 'Toggle between "Progression" and "Arpeggiator" to change how chord notes are played in melodies.'
    },
    theme: {
      name: 'Dark/Light Theme',
      description: 'Switch between dark and light visual themes.',
      location: 'In the header, look for a sun/moon icon.',
      howToUse: 'Click the theme toggle icon to switch between dark and light modes.'
    },
    authentication: {
      name: 'Sign In / Sign Up',
      description: 'Create an account or sign in to access Classroom features and save progress.',
      location: 'In the header, click "Sign In" or the user icon.',
      howToUse: 'Click Sign In to log in with existing account, or Sign Up to create a new account.'
    }
  },
  instruments: {
    keyboard: {
      name: 'Keyboard',
      description: 'A piano keyboard interface with adjustable octave range.',
      tips: [
        'Click on keys to hear notes',
        'Use octave controls to show more or fewer octaves',
        'Selected notes are highlighted in color',
        'Scale notes appear in one color, chord notes in another'
      ]
    },
    guitar: {
      name: 'Guitar',
      description: 'A 6-string guitar fretboard interface.',
      tips: [
        'Click on fret positions to hear notes',
        'Use fret zone selection to focus on specific areas',
        'Standard tuning: E-A-D-G-B-E',
        'Notes are displayed on the fretboard'
      ]
    },
    bass: {
      name: 'Bass',
      description: 'A 4-string bass guitar fretboard interface.',
      tips: [
        'Click on fret positions to hear notes',
        'Standard tuning: E-A-D-G',
        'Great for practicing bass lines and root notes',
        'Use with chord progressions for bass practice'
      ]
    }
  }
}

// Intent definitions for understanding user queries
const intents: Intent[] = [
  // Greetings
  {
    keywords: ['hello', 'hi', 'hey', 'howdy', 'greetings', 'sup'],
    patterns: [/^(hi|hello|hey|howdy)[\s!.?]*$/i],
    response: "Hello! I'm your Keplear assistant. I can help you navigate the app, explain features, or answer questions about ear training. What would you like to know?",
    followUp: "Try asking about scales, chords, or how to use the sandbox!"
  },

  // What is Keplear
  {
    keywords: ['what is keplear', 'about keplear', 'what does keplear do', 'tell me about'],
    patterns: [/what.*(is|does).*keplear/i, /about.*keplear/i, /tell me about.*(app|keplear)/i],
    response: `Keplear is an ear training app for musicians! Here's what you can do:\n\n• Practice on **Keyboard**, **Guitar**, or **Bass**\n• Learn and apply **scales** and **chords**\n• **Generate melodies** to train your ear\n• Use your **microphone** for real-time feedback\n• Join **classrooms** for structured learning\n\nWould you like to know more about any specific feature?`
  },

  // Navigation - Home
  {
    keywords: ['home', 'main page', 'start page', 'landing'],
    patterns: [/how.*(get|go|navigate).*(home|start|main)/i, /where.*home/i],
    response: "To go to the **Home page**, click on the **Keplear logo** in the top left corner of the header. The home page shows an overview of the app and has a 'Start Training Now' button to jump into practice!",
    action: { type: 'navigate', target: 'home' }
  },

  // Navigation - Sandbox
  {
    keywords: ['sandbox', 'practice', 'training', 'start training', 'play'],
    patterns: [/how.*(get|go|access|start).*(sandbox|practice|training)/i, /where.*(practice|train|play)/i, /want to practice/i],
    response: "To access the **Sandbox** (practice mode):\n\n1. Click **'Start Training Now'** on the home page, or\n2. Click **'Sandbox'** in the header navigation\n\nIn Sandbox mode you can select instruments, apply scales/chords, and generate melodies to practice!",
    action: { type: 'navigate', target: 'sandbox' }
  },

  // Navigation - Classroom
  {
    keywords: ['classroom', 'class', 'teacher', 'student', 'assignment', 'join class', 'create class'],
    patterns: [/how.*(get|go|access).*(classroom|class)/i, /where.*classroom/i, /(create|join).*(class|classroom)/i, /teacher|student/i],
    response: "To access the **Classroom**:\n\n1. Click **'Classroom'** in the header navigation\n2. You'll need to **sign in** to use classroom features\n\n**Teachers** can:\n• Create classrooms (public or private)\n• Create assignments with specific scales/chords\n\n**Students** can:\n• Join classrooms using a class code\n• Complete assignments",
    action: { type: 'navigate', target: 'classroom' }
  },

  // Scales
  {
    keywords: ['scale', 'scales', 'major scale', 'minor scale', 'pentatonic', 'blues scale'],
    patterns: [/how.*(use|apply|add|select).*(scale)/i, /what.*(scale|scales)/i, /where.*scale/i, /scale.*work/i],
    response: "**Scales** highlight specific note patterns on your instrument!\n\n**How to use:**\n1. Go to **Sandbox** mode\n2. Find the **Scales** section in the controls\n3. Select a **root note** (C, D, E, etc.)\n4. Choose a **scale type** (Major, Minor, Pentatonic, Blues, etc.)\n5. Click **'Apply'**\n\nThe scale notes will be highlighted on your instrument. Generate a melody to hear them in action!"
  },

  // Chords
  {
    keywords: ['chord', 'chords', 'major chord', 'minor chord', 'progression', 'arpeggiator'],
    patterns: [/how.*(use|apply|add|select|play).*(chord)/i, /what.*(chord|chords)/i, /where.*chord/i, /chord.*work/i],
    response: "**Chords** add harmony to your practice!\n\n**How to use:**\n1. Go to **Sandbox** mode\n2. Find the **Chords** section\n3. Select a **root note** and **chord type** (Major, Minor, 7th, etc.)\n4. Click **'Apply'**\n\n**Tip:** Use the **Progression/Arpeggiator** toggle:\n• **Progression** = plays full chords together\n• **Arpeggiator** = plays chord notes one at a time"
  },

  // Melody Generation
  {
    keywords: ['melody', 'generate', 'create melody', 'make melody', 'play melody'],
    patterns: [/how.*(generate|create|make).*(melody)/i, /generate.*melody/i, /melody.*generat/i, /play.*melody/i],
    response: "To **generate a melody**:\n\n1. Go to **Sandbox** mode\n2. **Apply scales or chords** first (the melody uses these notes)\n3. Set your **BPM** (tempo) and **number of beats**\n4. Click the **'Generate'** button\n5. Click **'Play'** to hear your melody!\n\nThe generated melody will use notes from your selected scales/chords. Try different combinations!"
  },

  // BPM
  {
    keywords: ['bpm', 'tempo', 'speed', 'fast', 'slow'],
    patterns: [/how.*(change|set|adjust).*(bpm|tempo|speed)/i, /what.*bpm/i, /(faster|slower)/i],
    response: "**BPM (Beats Per Minute)** controls the tempo:\n\n• Find the **BPM input** in Sandbox mode controls\n• Enter a number between **1-999**\n• **Higher BPM** = faster playback\n• **Lower BPM** = slower playback\n\n**Tip:** Start slow (60-80 BPM) when learning, then increase speed as you improve!"
  },

  // Beats
  {
    keywords: ['beats', 'number of beats', 'notes', 'length'],
    patterns: [/how.*(change|set).*(beats|notes)/i, /number of (beats|notes)/i, /melody length/i],
    response: "**Number of Beats** controls melody length:\n\n• Find the **beats input** next to BPM in Sandbox\n• Enter how many notes you want in your melody\n• More beats = longer melody\n\n**Tip:** Start with 4-8 beats for simple practice, increase for more challenge!"
  },

  // Microphone
  {
    keywords: ['microphone', 'mic', 'listen', 'pitch detection', 'detect', 'real instrument'],
    patterns: [/how.*(use|enable).*(mic|microphone)/i, /pitch detection/i, /play.*real.*instrument/i, /detect.*note/i],
    response: "**Microphone/Pitch Detection** lets you practice with a real instrument!\n\n**How to use:**\n1. In Sandbox mode, find the **microphone** button\n2. Click to **enable** microphone access\n3. Allow browser permission when prompted\n4. Play notes on your real instrument\n5. The app will **detect and highlight** the notes you play!\n\nGreat for checking if you're playing the right notes in a melody."
  },

  // Instruments
  {
    keywords: ['keyboard', 'piano', 'guitar', 'bass', 'instrument', 'switch instrument', 'change instrument'],
    patterns: [/how.*(switch|change|select).*(instrument|keyboard|guitar|bass)/i, /use.*(keyboard|guitar|bass)/i, /which instrument/i],
    response: "**Keplear supports 3 instruments:**\n\n🎹 **Keyboard** - Piano keys with adjustable octave range\n🎸 **Guitar** - 6-string fretboard\n🎸 **Bass** - 4-string bass fretboard\n\n**To switch instruments:**\n1. Go to Sandbox mode\n2. Click on the instrument name/tab at the top\n3. The display will change to show that instrument\n\nAll features work with all instruments!"
  },

  // Octave Range
  {
    keywords: ['octave', 'octaves', 'range', 'more keys', 'fewer keys'],
    patterns: [/how.*(change|adjust|add).*(octave|range)/i, /(more|fewer|less).*(keys|octaves)/i],
    response: "**Octave Range** (keyboard only):\n\n• Look for **+/-** buttons near the keyboard display\n• Click **+** to add more octaves (higher/lower keys)\n• Click **-** to remove octaves\n\nThis lets you focus on specific ranges or see the full keyboard!"
  },

  // Theme
  {
    keywords: ['dark mode', 'light mode', 'theme', 'dark', 'light', 'color scheme'],
    patterns: [/how.*(change|switch|toggle).*(theme|mode|dark|light)/i, /(dark|light) mode/i],
    response: "To **change the theme**:\n\n• Look for the **sun/moon icon** in the header\n• Click it to toggle between **dark** and **light** mode\n\nYour preference is saved automatically!"
  },

  // Sign In / Sign Up
  {
    keywords: ['sign in', 'sign up', 'login', 'register', 'account', 'create account'],
    patterns: [/how.*(sign|log) ?(in|up)/i, /create.*account/i, /register/i],
    response: "**To sign in or create an account:**\n\n1. Click **'Sign In'** in the header (top right)\n2. Enter your email and password to sign in\n3. Or click **'Sign Up'** to create a new account\n\n**Why sign in?**\n• Access **Classroom** features\n• Create and join classes\n• Save your progress"
  },

  // Assignments
  {
    keywords: ['assignment', 'assignments', 'create assignment', 'take assignment', 'homework'],
    patterns: [/how.*(create|make|take|do).*(assignment)/i, /what.*assignment/i],
    response: "**Assignments** are created in Classrooms:\n\n**Teachers - Creating assignments:**\n1. Go to Classroom and open your class\n2. Click **'Add Assignment'**\n3. Select scales, chords, instrument, and settings\n4. Give it a title and save\n\n**Students - Taking assignments:**\n1. Join a classroom using the class code\n2. Click on an assignment to start\n3. Practice with the pre-configured settings!"
  },

  // Help
  {
    keywords: ['help', 'stuck', 'confused', 'how do i', 'what can you do', 'features'],
    patterns: [/^help$/i, /what can you (do|help)/i, /i('m| am) (stuck|confused|lost)/i],
    response: "I can help you with:\n\n🎵 **Features** - scales, chords, melody generation\n🎹 **Instruments** - keyboard, guitar, bass\n📍 **Navigation** - finding pages and settings\n🎓 **Classroom** - creating/joining classes\n⚙️ **Settings** - BPM, beats, themes\n\n**Try asking:**\n• \"How do I generate a melody?\"\n• \"Where is the classroom?\"\n• \"How do I use scales?\"\n• \"What instruments are available?\""
  },

  // Thanks
  {
    keywords: ['thanks', 'thank you', 'thx', 'ty', 'appreciate'],
    patterns: [/thank/i, /^thx$/i, /^ty$/i],
    response: "You're welcome! Happy to help. If you have more questions about Keplear, just ask! 🎵"
  },

  // Goodbye
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'quit', 'exit'],
    patterns: [/^bye/i, /goodbye/i, /see you/i],
    response: "Goodbye! Happy practicing! 🎶 Feel free to come back anytime you need help with Keplear."
  }
]

// Fallback responses when no intent matches
const fallbackResponses = [
  "I'm not sure I understand. Could you rephrase that? I can help with:\n• Navigation (home, sandbox, classroom)\n• Features (scales, chords, melodies)\n• Instruments (keyboard, guitar, bass)\n• Settings (BPM, themes)",
  "Hmm, I don't have information about that. Try asking about:\n• How to use scales or chords\n• How to generate melodies\n• How to access the classroom\n• How to change instruments",
  "I didn't quite catch that. I'm best at helping with Keplear features! Ask me about scales, chords, melodies, or how to navigate the app."
]

/**
 * Find the best matching intent for a user message
 */
function findIntent(message: string): Intent | null {
  const lowerMessage = message.toLowerCase().trim()

  // First, check for pattern matches (more specific)
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (pattern.test(lowerMessage)) {
        return intent
      }
    }
  }

  // Then, check for keyword matches
  let bestMatch: Intent | null = null
  let bestScore = 0

  for (const intent of intents) {
    let score = 0
    for (const keyword of intent.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += keyword.length // Longer keyword matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = intent
    }
  }

  // Only return if we have a reasonable match
  return bestScore >= 3 ? bestMatch : null
}

/**
 * Generate a response to a user message
 */
export function generateResponse(message: string): string {
  const intent = findIntent(message)

  if (intent) {
    let response = typeof intent.response === 'function'
      ? intent.response(message)
      : intent.response

    if (intent.followUp) {
      response += `\n\n💡 ${intent.followUp}`
    }

    return response
  }

  // Check for specific questions about features
  const lowerMessage = message.toLowerCase()

  // Search knowledge base for relevant info
  for (const [key, feature] of Object.entries(knowledgeBase.features)) {
    if (lowerMessage.includes(key) || lowerMessage.includes(feature.name.toLowerCase())) {
      return `**${feature.name}**\n\n${feature.description}\n\n**Location:** ${feature.location}\n\n**How to use:** ${feature.howToUse}`
    }
  }

  // Return a random fallback
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
}

/**
 * Get a welcome message
 */
export function getWelcomeMessage(): string {
  return "Hi! I'm your Keplear assistant.\n\nI can help you:\n• Navigate the app\n• Learn how to use features\n• Understand scales and chords\n• Get started with ear training\n\nWhat would you like to know?"
}

/**
 * Get suggested questions
 */
export function getSuggestedQuestions(): string[] {
  return [
    "How do I generate a melody?",
    "What instruments are available?",
    "How do I use scales?",
    "Where is the classroom?"
  ]
}
