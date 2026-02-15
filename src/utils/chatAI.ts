/**
 * Keplear AI Assistant
 * A client-side AI that helps users navigate and use the app
 * Fully internationalized with translation support
 */

import { getTranslation } from '../contexts/TranslationContext'

interface Intent {
  keywords: string[]
  patterns: RegExp[]
  responseKey: string
  followUpKey?: string
  action?: {
    type: 'navigate' | 'tip' | 'info'
    target?: string
  }
}

// Intent definitions for understanding user queries
const intents: Intent[] = [
  // Greetings
  {
    keywords: [
      'hello',
      'hi',
      'hey',
      'howdy',
      'greetings',
      'sup',
      'hola',
      'bonjour',
      'hallo',
      'ciao',
      'olá',
      '你好',
      'こんにちは',
      '안녕',
      'shwmae',
      'helo',
    ],
    patterns: [/^(hi|hello|hey|howdy|hola|bonjour|hallo|ciao|olá|shwmae|helo)[\s!.?]*$/i],
    responseKey: 'chatAI.greetings.response',
    followUpKey: 'chatAI.followUpTip',
  },

  // What is Keplear
  {
    keywords: [
      'what is keplear',
      'about keplear',
      'what does keplear do',
      'tell me about',
      'qué es keplear',
      "qu'est-ce que keplear",
      'was ist keplear',
      "cos'è keplear",
      'o que é keplear',
      '什么是keplear',
      'keplearとは',
      'keplear란',
      'beth yw keplear',
    ],
    patterns: [
      /what.*(is|does).*keplear/i,
      /about.*keplear/i,
      /tell me about.*(app|keplear)/i,
      /qué es/i,
      /qu'est-ce que/i,
      /was ist/i,
      /cos'è/i,
      /o que é/i,
      /什么是/i,
      /とは/i,
      /란/i,
      /beth yw/i,
    ],
    responseKey: 'chatAI.whatIsKeplear.response',
  },

  // Navigation - Home
  {
    keywords: [
      'home',
      'main page',
      'start page',
      'landing',
      'inicio',
      'accueil',
      'startseite',
      'pagina iniziale',
      'página inicial',
      '首页',
      'ホーム',
      '홈',
      'cartref',
    ],
    patterns: [
      /how.*(get|go|navigate).*(home|start|main)/i,
      /where.*home/i,
      /cómo.*(ir|llegar).*(inicio|casa)/i,
      /comment.*(aller|accéder).*(accueil)/i,
      /wie.*(gehe|komme).*(startseite|home)/i,
    ],
    responseKey: 'chatAI.navigation.home',
    action: { type: 'navigate', target: 'home' },
  },

  // Navigation - Generator
  {
    keywords: [
      'generator',
      'practice',
      'training',
      'start training',
      'play',
      'práctica',
      'entrenamiento',
      'pratique',
      'entraînement',
      'übung',
      'training',
      'pratica',
      'prática',
      '练习',
      '沙盒',
      'サンドボックス',
      '연습',
      'ymarfer',
    ],
    patterns: [
      /how.*(get|go|access|start).*(Generator|practice|training)/i,
      /where.*(practice|train|play)/i,
      /want to practice/i,
      /cómo.*(practicar|entrenar)/i,
      /comment.*(pratiquer|entraîner)/i,
      /wie.*(üben|trainieren)/i,
    ],
    responseKey: 'chatAI.navigation.Generator',
    action: { type: 'navigate', target: 'generator' },
  },

  // Navigation - Classroom
  {
    keywords: [
      'classroom',
      'class',
      'teacher',
      'student',
      'assignment',
      'join class',
      'create class',
      'aula',
      'clase',
      'profesor',
      'estudiante',
      'salle de classe',
      'professeur',
      'élève',
      'klassenzimmer',
      'lehrer',
      'schüler',
      'classe',
      'insegnante',
      'studente',
      'sala de aula',
      'professor',
      'aluno',
      '教室',
      '老师',
      '学生',
      'クラスルーム',
      '先生',
      '生徒',
      '교실',
      '선생님',
      '학생',
      'ystafell ddosbarth',
      'athro',
      'myfyriwr',
    ],
    patterns: [
      /how.*(get|go|access).*(classroom|class)/i,
      /where.*classroom/i,
      /(create|join).*(class|classroom)/i,
      /teacher|student/i,
      /cómo.*(acceder|ir).*(aula|clase)/i,
      /comment.*(accéder|aller).*(classe|salle)/i,
    ],
    responseKey: 'chatAI.navigation.classroom',
    action: { type: 'navigate', target: 'classroom' },
  },

  // Scales
  {
    keywords: [
      'scale',
      'scales',
      'major scale',
      'minor scale',
      'pentatonic',
      'blues scale',
      'escala',
      'escalas',
      'gamme',
      'gammes',
      'tonleiter',
      'tonleitern',
      'scala',
      'scale',
      'escala',
      '音阶',
      'スケール',
      '음계',
      'graddfa',
    ],
    patterns: [
      /how.*(use|apply|add|select).*(scale)/i,
      /what.*(scale|scales)/i,
      /where.*scale/i,
      /scale.*work/i,
      /cómo.*(usar|aplicar).*(escala)/i,
      /comment.*(utiliser|appliquer).*(gamme)/i,
      /wie.*(benutzen|anwenden).*(tonleiter)/i,
    ],
    responseKey: 'chatAI.features.scales',
  },

  // Chords
  {
    keywords: [
      'chord',
      'chords',
      'major chord',
      'minor chord',
      'progression',
      'arpeggiator',
      'acorde',
      'acordes',
      'accord',
      'accords',
      'akkord',
      'akkorde',
      'accordo',
      'accordi',
      'acorde',
      'acordes',
      '和弦',
      'コード',
      '코드',
      'cord',
    ],
    patterns: [
      /how.*(use|apply|add|select|play).*(chord)/i,
      /what.*(chord|chords)/i,
      /where.*chord/i,
      /chord.*work/i,
      /cómo.*(usar|aplicar|tocar).*(acorde)/i,
      /comment.*(utiliser|jouer).*(accord)/i,
      /wie.*(benutzen|spielen).*(akkord)/i,
    ],
    responseKey: 'chatAI.features.chords',
  },

  // Melody Generation
  {
    keywords: [
      'melody',
      'generate',
      'create melody',
      'make melody',
      'play melody',
      'melodía',
      'generar',
      'crear melodía',
      'mélodie',
      'générer',
      'créer mélodie',
      'melodie',
      'generieren',
      'erstellen',
      'melodia',
      'generare',
      'creare',
      'melodia',
      'gerar',
      'criar',
      '旋律',
      '生成',
      'メロディー',
      '生成する',
      '멜로디',
      '생성',
      'alaw',
      'cynhyrchu',
    ],
    patterns: [
      /how.*(generate|create|make).*(melody)/i,
      /generate.*melody/i,
      /melody.*generat/i,
      /play.*melody/i,
      /cómo.*(generar|crear).*(melodía)/i,
      /comment.*(générer|créer).*(mélodie)/i,
      /wie.*(generieren|erstellen).*(melodie)/i,
    ],
    responseKey: 'chatAI.features.melody',
  },

  // BPM
  {
    keywords: [
      'bpm',
      'tempo',
      'speed',
      'fast',
      'slow',
      'velocidad',
      'rápido',
      'lento',
      'vitesse',
      'rapide',
      'geschwindigkeit',
      'schnell',
      'langsam',
      'velocità',
      'veloce',
      'velocidade',
      '速度',
      '快',
      '慢',
      'テンポ',
      '速い',
      '遅い',
      '템포',
      '빠른',
      '느린',
      'cyflymder',
    ],
    patterns: [
      /how.*(change|set|adjust).*(bpm|tempo|speed)/i,
      /what.*bpm/i,
      /(faster|slower)/i,
      /cómo.*(cambiar|ajustar).*(bpm|tempo|velocidad)/i,
      /comment.*(changer|régler).*(bpm|tempo|vitesse)/i,
    ],
    responseKey: 'chatAI.features.bpm',
  },

  // Beats
  {
    keywords: [
      'beats',
      'number of beats',
      'notes',
      'length',
      'tiempos',
      'número de tiempos',
      'temps',
      'nombre de temps',
      'schläge',
      'anzahl',
      'battiti',
      'numero di battiti',
      'batidas',
      'número de batidas',
      '节拍',
      '拍数',
      'ビート',
      '拍数',
      '비트',
      '박자 수',
      'curiadau',
    ],
    patterns: [
      /how.*(change|set).*(beats|notes)/i,
      /number of (beats|notes)/i,
      /melody length/i,
      /cómo.*(cambiar|ajustar).*(tiempos|notas)/i,
      /comment.*(changer|régler).*(temps|notes)/i,
    ],
    responseKey: 'chatAI.features.beats',
  },

  // Microphone
  {
    keywords: [
      'microphone',
      'mic',
      'listen',
      'pitch detection',
      'detect',
      'real instrument',
      'micrófono',
      'escuchar',
      'detección',
      'microphone',
      'écouter',
      'détection',
      'mikrofon',
      'zuhören',
      'erkennung',
      'microfono',
      'ascoltare',
      'rilevamento',
      'microfone',
      'ouvir',
      'detecção',
      '麦克风',
      '检测',
      'マイク',
      '検出',
      '마이크',
      '감지',
      'meicroffon',
    ],
    patterns: [
      /how.*(use|enable).*(mic|microphone)/i,
      /pitch detection/i,
      /play.*real.*instrument/i,
      /detect.*note/i,
      /cómo.*(usar|activar).*(micrófono)/i,
      /comment.*(utiliser|activer).*(microphone)/i,
    ],
    responseKey: 'chatAI.features.microphone',
  },

  // Instruments
  {
    keywords: [
      'keyboard',
      'piano',
      'guitar',
      'bass',
      'instrument',
      'switch instrument',
      'change instrument',
      'teclado',
      'guitarra',
      'bajo',
      'instrumento',
      'clavier',
      'guitare',
      'basse',
      'tastatur',
      'klavier',
      'gitarre',
      'tastiera',
      'chitarra',
      'basso',
      'strumento',
      'violão',
      '键盘',
      '吉他',
      '贝斯',
      '乐器',
      'キーボード',
      'ギター',
      'ベース',
      '楽器',
      '키보드',
      '기타',
      '베이스',
      '악기',
      'bysellfwrdd',
      'gitâr',
      'bas',
      'offeryn',
    ],
    patterns: [
      /how.*(switch|change|select).*(instrument|keyboard|guitar|bass)/i,
      /use.*(keyboard|guitar|bass)/i,
      /which instrument/i,
      /cómo.*(cambiar|seleccionar).*(instrumento)/i,
      /comment.*(changer|sélectionner).*(instrument)/i,
    ],
    responseKey: 'chatAI.features.instruments',
  },

  // Octave Range
  {
    keywords: [
      'octave',
      'octaves',
      'range',
      'more keys',
      'fewer keys',
      'octava',
      'rango',
      'más teclas',
      'octave',
      'plage',
      'plus de touches',
      'oktave',
      'bereich',
      'mehr tasten',
      'ottava',
      'gamma',
      'più tasti',
      'oitava',
      'alcance',
      '八度',
      '范围',
      'オクターブ',
      '範囲',
      '옥타브',
      '범위',
      'wythfed',
    ],
    patterns: [
      /how.*(change|adjust|add).*(octave|range)/i,
      /(more|fewer|less).*(keys|octaves)/i,
      /cómo.*(cambiar|ajustar).*(octava|rango)/i,
      /comment.*(changer|ajuster).*(octave|plage)/i,
    ],
    responseKey: 'chatAI.features.octaveRange',
  },

  // Theme
  {
    keywords: [
      'dark mode',
      'light mode',
      'theme',
      'dark',
      'light',
      'color scheme',
      'modo oscuro',
      'modo claro',
      'tema',
      'mode sombre',
      'mode clair',
      'thème',
      'dunkelmodus',
      'hellmodus',
      'thema',
      'modalità scura',
      'modalità chiara',
      'modo escuro',
      'modo claro',
      '深色模式',
      '浅色模式',
      '主题',
      'ダークモード',
      'ライトモード',
      'テーマ',
      '다크 모드',
      '라이트 모드',
      '테마',
      'modd tywyll',
      'modd golau',
      'thema',
    ],
    patterns: [
      /how.*(change|switch|toggle).*(theme|mode|dark|light)/i,
      /(dark|light) mode/i,
      /cómo.*(cambiar).*(tema|modo)/i,
      /comment.*(changer).*(thème|mode)/i,
    ],
    responseKey: 'chatAI.features.theme',
  },

  // Sign In / Sign Up
  {
    keywords: [
      'sign in',
      'sign up',
      'login',
      'register',
      'account',
      'create account',
      'iniciar sesión',
      'registrarse',
      'cuenta',
      'se connecter',
      "s'inscrire",
      'compte',
      'anmelden',
      'registrieren',
      'konto',
      'accedi',
      'registrati',
      'account',
      'entrar',
      'registrar',
      'conta',
      '登录',
      '注册',
      '账户',
      'ログイン',
      '登録',
      'アカウント',
      '로그인',
      '회원가입',
      '계정',
      'mewngofnodi',
      'cofrestru',
      'cyfrif',
    ],
    patterns: [
      /how.*(sign|log) ?(in|up)/i,
      /create.*account/i,
      /register/i,
      /cómo.*(iniciar sesión|registrar)/i,
      /comment.*(connecter|inscrire)/i,
    ],
    responseKey: 'chatAI.features.auth',
  },

  // Assignments
  {
    keywords: [
      'assignment',
      'assignments',
      'create assignment',
      'take assignment',
      'homework',
      'tarea',
      'tareas',
      'crear tarea',
      'devoir',
      'devoirs',
      'créer devoir',
      'aufgabe',
      'aufgaben',
      'erstellen aufgabe',
      'compito',
      'compiti',
      'creare compito',
      'tarefa',
      'tarefas',
      'criar tarefa',
      '作业',
      '创建作业',
      '課題',
      '課題を作成',
      '과제',
      '과제 만들기',
      'aseiniad',
      'aseiniadau',
    ],
    patterns: [
      /how.*(create|make|take|do).*(assignment)/i,
      /what.*assignment/i,
      /cómo.*(crear|hacer).*(tarea)/i,
      /comment.*(créer|faire).*(devoir)/i,
    ],
    responseKey: 'chatAI.features.assignments',
  },

  // Help
  {
    keywords: [
      'help',
      'stuck',
      'confused',
      'how do i',
      'what can you do',
      'features',
      'ayuda',
      'atascado',
      'confundido',
      'aide',
      'bloqué',
      'confus',
      'hilfe',
      'feststecken',
      'verwirrt',
      'aiuto',
      'bloccato',
      'confuso',
      'ajuda',
      'preso',
      'confuso',
      '帮助',
      '卡住',
      '困惑',
      'ヘルプ',
      '困った',
      '도움말',
      '막힘',
      'help',
      'sownd',
      'dryslyd',
    ],
    patterns: [
      /^help$/i,
      /what can you (do|help)/i,
      /i('m| am) (stuck|confused|lost)/i,
      /^ayuda$/i,
      /^aide$/i,
      /^hilfe$/i,
      /^aiuto$/i,
      /^ajuda$/i,
    ],
    responseKey: 'chatAI.help.response',
  },

  // Thanks
  {
    keywords: [
      'thanks',
      'thank you',
      'thx',
      'ty',
      'appreciate',
      'gracias',
      'merci',
      'danke',
      'grazie',
      'obrigado',
      'obrigada',
      '谢谢',
      'ありがとう',
      '감사합니다',
      'diolch',
    ],
    patterns: [
      /thank/i,
      /^thx$/i,
      /^ty$/i,
      /gracias/i,
      /merci/i,
      /danke/i,
      /grazie/i,
      /obrigad/i,
      /谢谢/i,
      /ありがとう/i,
      /감사/i,
      /diolch/i,
    ],
    responseKey: 'chatAI.thanks.response',
  },

  // Goodbye
  {
    keywords: [
      'bye',
      'goodbye',
      'see you',
      'later',
      'quit',
      'exit',
      'adiós',
      'hasta luego',
      'au revoir',
      'à bientôt',
      'auf wiedersehen',
      'tschüss',
      'arrivederci',
      'ciao',
      'tchau',
      'adeus',
      '再见',
      'さようなら',
      '안녕히',
      'hwyl fawr',
    ],
    patterns: [
      /^bye/i,
      /goodbye/i,
      /see you/i,
      /adiós/i,
      /hasta luego/i,
      /au revoir/i,
      /auf wiedersehen/i,
      /arrivederci/i,
      /tchau/i,
      /再见/i,
      /さようなら/i,
      /안녕히/i,
      /hwyl/i,
    ],
    responseKey: 'chatAI.goodbye.response',
  },
]

// Fallback response keys
const fallbackResponseKeys = [
  'chatAI.fallback.option1',
  'chatAI.fallback.option2',
  'chatAI.fallback.option3',
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
    let response = getTranslation(intent.responseKey)

    if (intent.followUpKey) {
      const followUp = getTranslation(intent.followUpKey)
      response += `\n\n💡 ${followUp}`
    }

    return response
  }

  // Return a random fallback
  const randomKey = fallbackResponseKeys[Math.floor(Math.random() * fallbackResponseKeys.length)]
  return getTranslation(randomKey)
}

/**
 * Get a welcome message
 */
export function getWelcomeMessage(): string {
  const welcome = getTranslation('chatAI.welcome')
  const followUp = getTranslation('chatAI.followUpTip')
  return `${welcome}\n\n💡 ${followUp}`
}

/**
 * Get suggested questions
 */
export function getSuggestedQuestions(): string[] {
  return [
    getTranslation('chatAI.suggestedQuestions.melody'),
    getTranslation('chatAI.suggestedQuestions.instruments'),
    getTranslation('chatAI.suggestedQuestions.scales'),
    getTranslation('chatAI.suggestedQuestions.classroom'),
  ]
}
