import type { AppLanguage } from '../../../i18n/types';

export interface LocalizedList {
  readonly it: readonly string[];
  readonly en: readonly string[];
}

export interface LocalizedText {
  readonly it: string;
  readonly en: string;
}

export interface ExerciseGuideEntry {
  readonly slug: string;
  readonly muscles: readonly string[];
  readonly instructions: LocalizedList;
  readonly commonMistakes: LocalizedList;
  readonly quickTip: LocalizedText;
}

export interface ResolvedExerciseGuide {
  readonly found: boolean;
  readonly canonicalSlug: string | null;
  readonly guide: ExerciseGuideEntry | null;
  readonly muscles: readonly string[];
}

const GUIDES: Record<string, ExerciseGuideEntry> = {
  flat_bench_press: {
    slug: 'flat_bench_press',
    muscles: ['chest', 'triceps', 'shoulders'],
    instructions: {
      it: [
        'Sdraiati con i piedi ben appoggiati a terra e glutei sulla panca.',
        'Impugna il bilanciere leggermente più largo delle spalle, polsi neutri.',
        'Abbassa il bilanciere al petto con controllo, gomiti a circa 45°.',
        'Spingi verso l\'alto fino a estensione quasi completa, senza bloccare i gomiti.',
      ],
      en: [
        'Lie with feet flat on the floor and glutes on the bench.',
        'Grip the bar slightly wider than shoulders, wrists neutral.',
        'Lower the bar to your chest with control, elbows around 45°.',
        'Press up to near-full extension without locking elbows hard.',
      ],
    },
    commonMistakes: {
      it: [
        'Rimbalzo del bilanciere sul petto.',
        'Gomiti troppo aperti (stress sulla spalla).',
        'Sollevare i glutei dalla panca in spinta.',
      ],
      en: [
        'Bouncing the bar off the chest.',
        'Flaring elbows too wide (shoulder stress).',
        'Lifting hips off the bench when pressing.',
      ],
    },
    quickTip: {
      it: 'Pensa a spingere il petto verso il soffitto, non solo le braccia.',
      en: 'Think about driving your chest to the ceiling, not just your arms.',
    },
  },
  squat: {
    slug: 'squat',
    muscles: ['quads', 'glutes', 'core'],
    instructions: {
      it: [
        'Posiziona il bilanciere sui trapezi, piedi alla larghezza spalle o poco più larghi.',
        'Inspira, bracing del core, inizia la discesa spingendo i fianchi indietro.',
        'Scendi fino a coscia almeno parallela mantenendo il petto alto.',
        'Spingi a terra con i piedi e risali in verticale.',
      ],
      en: [
        'Set the bar on your upper back, feet shoulder-width or slightly wider.',
        'Breathe in, brace your core, start down by sitting hips back.',
        'Descend until thighs are at least parallel, chest stays up.',
        'Drive through the floor and stand up tall.',
      ],
    },
    commonMistakes: {
      it: [
        'Ginocchia che collassano verso l\'interno.',
        'Inclinare troppo il busto in avanti.',
        'Talloni che si sollevano dal pavimento.',
      ],
      en: [
        'Knees caving inward.',
        'Leaning torso too far forward.',
        'Heels lifting off the floor.',
      ],
    },
    quickTip: {
      it: 'Immagina di aprire il pavimento con i piedi durante la salita.',
      en: 'Imagine spreading the floor apart with your feet on the way up.',
    },
  },
  deadlift: {
    slug: 'deadlift',
    muscles: ['hamstrings', 'glutes', 'back', 'core'],
    instructions: {
      it: [
        'Piedi sotto il bilanciere, metà piede allineata al centro del bilanciere.',
        'Afferra la barra, schiena neutra, petto alto prima del distacco.',
        'Spingi il pavimento con i piedi e alza il bilanciere vicino alle gambe.',
        'Blocca in alto con glutei contratti, poi scendi con lo stesso controllo.',
      ],
      en: [
        'Bar over mid-foot, shins close to the bar before you pull.',
        'Grip the bar, neutral spine, chest up before lifting.',
        'Push the floor away and keep the bar close to your legs.',
        'Lock out with glutes engaged, lower with the same control.',
      ],
    },
    commonMistakes: {
      it: [
        'Schiena arrotondata in salita o discesa.',
        'Bilanciere lontano dalle gambe.',
        'Tirare con le braccia invece che con gambe e schiena.',
      ],
      en: [
        'Rounded back on the way up or down.',
        'Bar drifting away from the legs.',
        'Pulling with arms instead of legs and back.',
      ],
    },
    quickTip: {
      it: 'Pensa allo stacco come uno spingere del pavimento, non un tirare con la schiena.',
      en: 'Treat the deadlift as pushing the floor away, not yanking with your back.',
    },
  },
  romanian_deadlift: {
    slug: 'romanian_deadlift',
    muscles: ['hamstrings', 'glutes', 'back'],
    instructions: {
      it: [
        'Parti in piedi con bilanciere o manubri, ginocchia leggermente flesse.',
        'Spingi i fianchi indietro mantenendo la schiena neutra.',
        'Scendi fino a sentire tensione sui femorali, bilanciere vicino alle gambe.',
        'Contrai glutei e femorali per tornare in posizione eretta.',
      ],
      en: [
        'Stand with bar or dumbbells, knees slightly bent.',
        'Push hips back while keeping a neutral spine.',
        'Lower until you feel hamstring stretch, bar stays close to legs.',
        'Squeeze glutes and hamstrings to return upright.',
      ],
    },
    commonMistakes: {
      it: [
        'Piegare troppo le ginocchia (diventa uno squat rumeno sbagliato).',
        'Arrotondare la schiena in basso.',
        'Scendere troppo in profondità perdendo tensione.',
      ],
      en: [
        'Bending knees too much (turns into a squat pattern).',
        'Rounding the lower back at the bottom.',
        'Going too deep and losing hamstring tension.',
      ],
    },
    quickTip: {
      it: 'Mantieni il bilanciere a contatto con le cosce per tutta la ROM.',
      en: 'Keep the bar brushing your thighs through the full range.',
    },
  },
  lat_pulldown: {
    slug: 'lat_pulldown',
    muscles: ['lats', 'back', 'biceps'],
    instructions: {
      it: [
        'Siediti con cosce bloccate, impugnatura leggermente più larga delle spalle.',
        'Inizia con braccia quasi estese e petto alto.',
        'Tira la barra verso l\'alto petto/porta torace, gomiti verso i fianchi.',
        'Controlla la risalita senza lasciare andare le spalle in avanti.',
      ],
      en: [
        'Sit with thighs secured, grip slightly wider than shoulders.',
        'Start with arms nearly straight and chest tall.',
        'Pull the bar toward upper chest, elbows drive toward hips.',
        'Control the return without letting shoulders roll forward.',
      ],
    },
    commonMistakes: {
      it: [
        'Tirare con le braccia invece che con i dorsali.',
        'Inclinarsi troppo indietro e usare slancio.',
        'Portare la barra dietro il collo.',
      ],
      en: [
        'Pulling with arms instead of lats.',
        'Leaning back too far and using momentum.',
        'Pulling the bar behind the neck.',
      ],
    },
    quickTip: {
      it: 'Pensa a portare i gomiti in tasca, non solo le mani verso il basso.',
      en: 'Think elbows to your pockets, not just hands moving down.',
    },
  },
  leg_press_45: {
    slug: 'leg_press_45',
    muscles: ['quads', 'glutes'],
    instructions: {
      it: [
        'Piedi sulla pedana alla larghezza spalle, schiena e bacino ben appoggiati.',
        'Sblocca la pedana e scendi controllando fino a circa 90° di ginocchio.',
        'Non lasciare che il bacino si stacchi dal sedile in basso.',
        'Spingi la pedana senza bloccare completamente le ginocchia in alto.',
      ],
      en: [
        'Feet shoulder-width on the platform, back and hips flat on the pad.',
        'Unlock and lower with control to roughly 90° knee bend.',
        'Do not let your lower back peel off the seat at the bottom.',
        'Press up without fully locking knees at the top.',
      ],
    },
    commonMistakes: {
      it: [
        'Ginocchia che collassano verso l\'interno.',
        'ROM troppo corto per ego lifting.',
        'Mani sulle ginocchia che spingono.',
      ],
      en: [
        'Knees caving inward.',
        'Using too short a range for heavy ego loads.',
        'Pushing through knees with your hands.',
      ],
    },
    quickTip: {
      it: 'Piedi leggermente più alti sulla pedana = più glutei; più bassi = più quadricipiti.',
      en: 'Feet higher on the platform hits glutes more; lower hits quads more.',
    },
  },
  dumbbell_row: {
    slug: 'dumbbell_row',
    muscles: ['back', 'lats', 'biceps'],
    instructions: {
      it: [
        'Appoggia un ginocchio e una mano sul panca, schiena quasi parallela al pavimento.',
        'Manubrio libero con braccio esteso, core stabile.',
        'Tira il manubrio verso l\'anca, gomito vicino al corpo.',
        'Scendi con controllo fino a estensione completa del braccio.',
      ],
      en: [
        'One knee and hand on the bench, torso nearly parallel to the floor.',
        'Free arm extended, core braced and stable.',
        'Row the dumbbell toward your hip, elbow stays close.',
        'Lower with control to full arm extension.',
      ],
    },
    commonMistakes: {
      it: [
        'Ruotare il busto per alzare più peso.',
        'Tirare con il bicipite senza muovere la scapola.',
        'Collo in estensione forzata.',
      ],
      en: [
        'Twisting torso to heave more weight.',
        'Curling with the bicep without scapular movement.',
        'Cranking the neck into extension.',
      ],
    },
    quickTip: {
      it: 'Inizia il movimento portando la scapola indietro, poi piega il gomito.',
      en: 'Start by pulling the shoulder blade back, then bend the elbow.',
    },
  },
  floor_press: {
    slug: 'floor_press',
    muscles: ['chest', 'triceps', 'shoulders'],
    instructions: {
      it: [
        'Sdraiati a terra, ginocchia piegate o gambe estese, bilanciere o manubri in mano.',
        'Abbassa il peso fino a quando i tricipiti toccano il pavimento.',
        'Mantieni i gomiti a circa 45° rispetto al busto.',
        'Spingi verso l\'alto fino a estensione completa dei gomiti.',
      ],
      en: [
        'Lie on the floor, knees bent or legs straight, bar or dumbbells in hand.',
        'Lower until triceps lightly touch the floor.',
        'Keep elbows around 45° from your torso.',
        'Press up to full elbow extension.',
      ],
    },
    commonMistakes: {
      it: [
        'Rimbalzare i gomiti sul pavimento.',
        'Perdere tensione del core e arcuare la schiena.',
        'ROM troppo corto non toccando il punto di stop.',
      ],
      en: [
        'Bouncing elbows off the floor.',
        'Losing core tension and arching the back.',
        'Cutting range short before the floor stop.',
      ],
    },
    quickTip: {
      it: 'Ottimo per forza lockout: pausa 1 secondo a terra prima della spinta.',
      en: 'Great for lockout strength: pause 1 second on the floor before pressing.',
    },
  },
  shoulder_press: {
    slug: 'shoulder_press',
    muscles: ['shoulders', 'triceps', 'core'],
    instructions: {
      it: [
        'In piedi o seduto, manubri o bilanciere all\'altezza delle spalle.',
        'Core attivo, glutei contratti se in piedi.',
        'Spingi verso l\'alto fino a quasi estensione completa sopra la testa.',
        'Scendi controllando fino all\'altezza delle orecchie o clavicole.',
      ],
      en: [
        'Standing or seated, dumbbells or bar at shoulder height.',
        'Brace core, squeeze glutes if standing.',
        'Press overhead to near-full lockout.',
        'Lower with control to ear or collarbone height.',
      ],
    },
    commonMistakes: {
      it: [
        'Inarcamento eccessivo della schiena in piedi.',
        'Gomiti troppo avanti o troppo indietro.',
        'Usare slancio delle gambe (push press involontario).',
      ],
      en: [
        'Excessive lower-back arch when standing.',
        'Elbows too far forward or flared back.',
        'Using leg drive unintentionally (accidental push press).',
      ],
    },
    quickTip: {
      it: 'Stringi i gomiti leggermente verso il centro in salita per proteggere le spalle.',
      en: 'Slightly tuck elbows toward center on the way up to spare the shoulders.',
    },
  },
  biceps_curl: {
    slug: 'biceps_curl',
    muscles: ['biceps'],
    instructions: {
      it: [
        'In piedi, manubri o bilanciere ai fianchi, gomiti vicino al corpo.',
        'Piega i gomiti portando il peso verso le spalle.',
        'Contrai il bicipite in alto senza andare in iperestensione del collo.',
        'Scendi con controllo fino a estensione quasi completa.',
      ],
      en: [
        'Stand with dumbbells or bar at your sides, elbows at your ribs.',
        'Curl the weight toward your shoulders.',
        'Squeeze at the top without cranking your neck back.',
        'Lower with control to near-full extension.',
      ],
    },
    commonMistakes: {
      it: [
        'Oscillare il busto per alzare più peso.',
        'Gomiti che avanzano durante il curl.',
        'ROM troppo corto in basso o in alto.',
      ],
      en: [
        'Swinging torso to move more weight.',
        'Elbows drifting forward during the curl.',
        'Cutting range short at bottom or top.',
      ],
    },
    quickTip: {
      it: 'Supina leggermente i polsi in alto per una maggiore attivazione del bicipite.',
      en: 'Supinate wrists slightly at the top for extra biceps engagement.',
    },
  },
  triceps_pushdown: {
    slug: 'triceps_pushdown',
    muscles: ['triceps'],
    instructions: {
      it: [
        'In piedi al cavo, gomiti fissi ai fianchi, avambracci paralleli al pavimento.',
        'Spingi la maniglia verso il basso fino a estensione completa dei gomiti.',
        'Mantieni i gomiti fermi, muovi solo avambracci.',
        'Risalita controllata senza far salire i gomiti.',
      ],
      en: [
        'Stand at the cable, elbows pinned to your sides, forearms parallel to floor.',
        'Push the handle down to full elbow extension.',
        'Keep elbows still — only forearms move.',
        'Return with control without letting elbows rise.',
      ],
    },
    commonMistakes: {
      it: [
        'Gomiti che si spostano in avanti o indietro.',
        'Inclinarsi sul cavo con slancio.',
        'Non estendere completamente in basso.',
      ],
      en: [
        'Elbows drifting forward or back.',
        'Leaning over the cable for momentum.',
        'Skipping full extension at the bottom.',
      ],
    },
    quickTip: {
      it: 'In basso, ruota leggermente i polsi verso il basso per il picco di contrazione.',
      en: 'At the bottom, turn palms slightly down for a stronger peak contraction.',
    },
  },
  plank: {
    slug: 'plank',
    muscles: ['core', 'abs', 'shoulders'],
    instructions: {
      it: [
        'Appoggia avambracci e punte dei piedi, corpo in linea retta.',
        'Contrai glutei e core come se ti preparassi a un pugno allo stomaco.',
        'Mantieni collo neutro, sguardo verso il pavimento.',
        'Respira costantemente senza far cedere i fianchi.',
      ],
      en: [
        'Support on forearms and toes, body in one straight line.',
        'Squeeze glutes and brace core like bracing for a punch.',
        'Keep neck neutral, gaze toward the floor.',
        'Breathe steadily without letting hips sag.',
      ],
    },
    commonMistakes: {
      it: [
        'Fianchi troppo alti o troppo bassi.',
        'Tenere il respiro fino allo sfinimento.',
        'Scapole completamente passive senza stabilità.',
      ],
      en: [
        'Hips too high or sagging too low.',
        'Holding breath until failure.',
        'Completely passive shoulders with no stability.',
      ],
    },
    quickTip: {
      it: 'Immagina di tirare i gomiti verso i piedi senza muoverli — il core si accende.',
      en: 'Imagine pulling elbows toward toes without moving them — core fires up.',
    },
  },
};

/** Maps normalized aliases to canonical guide slug. */
const ALIASES: Record<string, string> = {
  bench_press: 'flat_bench_press',
  flat_bench_press: 'flat_bench_press',
  barbell_back_squat: 'squat',
  front_squat: 'squat',
  goblet_squat: 'squat',
  rdl: 'romanian_deadlift',
  leg_press: 'leg_press_45',
  barbell_row: 'dumbbell_row',
  overhead_press: 'shoulder_press',
  military_press: 'shoulder_press',
  lateral_raise_alzate: 'shoulder_press',
  bicep_curl: 'biceps_curl',
  barbell_curl: 'biceps_curl',
  tricep_pushdown: 'triceps_pushdown',
  cable_triceps_pushdown: 'triceps_pushdown',
};

export function normalizeExerciseGuideKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function resolveCanonicalSlug(slugOrName: string): string | null {
  const raw = slugOrName.trim();
  if (!raw) return null;

  const candidates = [normalizeExerciseGuideKey(raw), raw.toLowerCase()];
  for (const key of candidates) {
    if (GUIDES[key]) return key;
    const alias = ALIASES[key];
    if (alias && GUIDES[alias]) return alias;
  }
  return null;
}

export function getExerciseGuide(
  slugOrName: string,
  fallbackMuscle?: string,
): ResolvedExerciseGuide {
  const canonicalSlug = resolveCanonicalSlug(slugOrName);
  const guide = canonicalSlug ? GUIDES[canonicalSlug] ?? null : null;

  if (guide) {
    return {
      found: true,
      canonicalSlug,
      guide,
      muscles: [...guide.muscles],
    };
  }

  const muscles = fallbackMuscle?.trim() ? [fallbackMuscle.trim()] : [];
  return {
    found: false,
    canonicalSlug: null,
    guide: null,
    muscles,
  };
}

export function pickLocalizedList(list: LocalizedList, lang: AppLanguage): string[] {
  return [...(lang === 'en' ? list.en : list.it)];
}

export function pickLocalizedText(text: LocalizedText, lang: AppLanguage): string {
  return lang === 'en' ? text.en : text.it;
}
