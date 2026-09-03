// Parses free-form workout notes -- the kind you'd type in a notes app -- into
// structured entries. Every guess is best-effort, so the original line is kept
// on each entry and nothing from the paste is ever silently dropped.

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

const WEEKDAY =
  '(?:monday|mon|tuesday|tues|tue|wednesday|weds|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)'
const WEEKDAY_PREFIX = new RegExp(`^${WEEKDAY}\\.?,?\\s+`, 'i')
const BARE_WEEKDAY = new RegExp(`^${WEEKDAY}\\.?$`, 'i')
const SEPARATOR_LINE = /^[-–—=_*~+.]{3,}$/
const LEAD_SEPARATOR = /^[\s:,\-–—|]+/

// Where the numbers start: the first "@", digit, or bodyweight marker that
// begins a word. Everything before it is the exercise name.
const SPEC_START = /(^|\s)(@|bw\b|bodyweight\b|\d)/i

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Notes are written about workouts that already happened, so a bare "Mar 4"
// means last year once we're past early April.
function buildDate(year, month, day, today) {
  if (year != null) {
    const full = year < 100 ? 2000 + year : year
    return toISO(new Date(full, month, day))
  }
  const candidate = new Date(today.getFullYear(), month, day)
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  if (candidate.getTime() - today.getTime() > THIRTY_DAYS) {
    candidate.setFullYear(candidate.getFullYear() - 1)
  }
  return toISO(candidate)
}

function titleFrom(rest) {
  return rest.replace(LEAD_SEPARATOR, '').trim()
}

/**
 * Recognizes a line that starts a new day, e.g. "2026-09-02", "9/2 Push day",
 * "Sept 2", "Mon 9/2", "Today". Returns { date, title } where `date` is null
 * for a bare weekday (a heading, but not enough to pin a real date).
 */
export function parseDateLine(line, today = new Date()) {
  let rest = line.trim()
  if (!rest) return null

  let sawWeekday = false
  if (WEEKDAY_PREFIX.test(rest)) {
    sawWeekday = true
    rest = rest.replace(WEEKDAY_PREFIX, '')
  } else if (BARE_WEEKDAY.test(rest)) {
    return { date: null, title: rest.replace(/\.$/, '') }
  }

  let m = rest.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (m) {
    const month = Number(m[2]) - 1
    const day = Number(m[3])
    if (month <= 11 && day <= 31) {
      return {
        date: buildDate(Number(m[1]), month, day, today),
        title: titleFrom(rest.slice(m[0].length)),
      }
    }
  }

  // Numeric dates require slashes: "9-2" is too easily a rep range.
  m = rest.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (m) {
    const month = Number(m[1]) - 1
    const day = Number(m[2])
    if (month <= 11 && day <= 31) {
      return {
        date: buildDate(m[3] ? Number(m[3]) : null, month, day, today),
        title: titleFrom(rest.slice(m[0].length)),
      }
    }
  }

  m = rest.match(/^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i)
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    const day = Number(m[2])
    if (day <= 31) {
      return {
        date: buildDate(m[3] ? Number(m[3]) : null, MONTHS[m[1].toLowerCase()], day, today),
        title: titleFrom(rest.slice(m[0].length)),
      }
    }
  }

  m = rest.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:\s*,?\s*(\d{4}))?\b/i)
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    const day = Number(m[1])
    if (day <= 31) {
      return {
        date: buildDate(m[3] ? Number(m[3]) : null, MONTHS[m[2].toLowerCase()], day, today),
        title: titleFrom(rest.slice(m[0].length)),
      }
    }
  }

  m = rest.match(/^(today|yesterday)\b/i)
  if (m) {
    const d = new Date(today)
    if (m[1].toLowerCase() === 'yesterday') d.setDate(d.getDate() - 1)
    return { date: toISO(d), title: titleFrom(rest.slice(m[0].length)) }
  }

  // "Mon" on its own line, with something after it we couldn't read as a date.
  if (sawWeekday) return { date: null, title: line.trim() }
  return null
}

function emptyGroup() {
  return {
    sets: 0,
    reps: 0,
    weight: 0,
    unit: '',
    bodyweight: false,
    durationMin: 0,
    distance: 0,
    distanceUnit: '',
    notes: '',
  }
}

function isMeaningful(g) {
  return g.reps > 0 || g.weight > 0 || g.durationMin > 0 || g.distance > 0 || g.bodyweight
}

// Consumes every match, blanking it out with spaces so that later passes see a
// shorter string but every surviving character keeps its original index. Those
// indices are what tell us whether the weight was written before the reps.
function consume(input, re, onMatch) {
  let out = input
  let m
  re.lastIndex = 0
  while ((m = re.exec(input)) !== null) {
    if (onMatch(m) !== false) {
      out = out.slice(0, m.index) + ' '.repeat(m[0].length) + out.slice(m.index + m[0].length)
    }
    if (m[0].length === 0) re.lastIndex += 1
  }
  return out
}

const FILLER_WORDS = /^(?:of|for|each|ea|at|w|with|sets?|reps?|total|total:)$/

/**
 * Reads one set-spec: "135 x 8", "3x5 @ 225", "BW x 12", "30 min", "3mi 24:30".
 * Returns a group, or null if there was nothing numeric to find.
 */
function parseGroup(text, defaultUnit) {
  let s = ` ${text.toLowerCase()} `
  const g = emptyGroup()
  const notes = []
  let weightIndex = Infinity

  s = consume(s, /\(([^)]*)\)/g, (m) => {
    notes.push(m[1].trim())
  })

  s = consume(s, /\b(?:bw|bodyweight|body\s?weight)\b/g, (m) => {
    g.bodyweight = true
    weightIndex = Math.min(weightIndex, m.index)
  })

  // Explicit words win over positional guessing: "3 sets of 12 reps".
  s = consume(s, /(\d+(?:\.\d+)?)\s*(?:x\s*)?sets?\b/g, (m) => {
    g.sets = Number(m[1])
  })
  s = consume(s, /(\d+(?:\.\d+)?)\s*(?:x\s*)?reps?\b/g, (m) => {
    g.reps = Number(m[1])
  })

  // mm:ss or h:mm:ss
  s = consume(s, /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g, (m) => {
    g.durationMin =
      m[3] === undefined
        ? Number(m[1]) + Number(m[2]) / 60
        : Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60
  })

  s = consume(
    s,
    /(\d+(?:\.\d+)?)\s*(miles?|mi|kilometers?|kms?|meters?|metres?|m|yards?|yds?)\b/g,
    (m) => {
      const unit = m[2]
      const value = Number(m[1])
      // A bare "m" is minutes at gym-sized numbers and meters at track-sized
      // ones: "30m" is half an hour, "5000m" is a rowing piece.
      if (unit === 'm' && value < 100) return false
      g.distance = value
      g.distanceUnit = unit.startsWith('mi')
        ? 'mi'
        : unit.startsWith('k')
          ? 'km'
          : unit.startsWith('y')
            ? 'yd'
            : 'm'
    },
  )

  s = consume(s, /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g, (m) => {
    const v = Number(m[1])
    if (m[2].startsWith('h')) g.durationMin += v * 60
    else if (m[2].startsWith('s')) g.durationMin += v / 60
    else g.durationMin += v
  })

  s = consume(s, /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|#|kgs?|kilos?|kilograms?)\b/g, (m) => {
    g.weight = Number(m[1])
    g.unit = m[2].startsWith('k') ? 'kg' : 'lb'
    weightIndex = Math.min(weightIndex, m.index)
  })

  s = consume(s, /@\s*(\d+(?:\.\d+)?)/g, (m) => {
    if (!g.weight) g.weight = Number(m[1])
    weightIndex = Math.min(weightIndex, m.index)
  })

  // Ranges ("8-10 reps", "135-145") collapse to their first number.
  s = s.replace(/(\d+(?:\.\d+)?)\s*[-–]\s*\d+(?:\.\d+)?/g, (match, first) =>
    first + ' '.repeat(match.length - first.length),
  )

  const remaining = [...s.matchAll(/\d+(?:\.\d+)?/g)]
  const nums = remaining.map((m) => Number(m[0]))
  const firstNumIndex = remaining.length ? remaining[0].index : Infinity
  const haveWeight = g.weight > 0 || g.bodyweight
  const timed = g.durationMin > 0 || g.distance > 0

  if (haveWeight) {
    // "135 lb x 8 x 3" counts down from the weight (reps, then sets), while
    // "3 x 8 @ 135" leads with the sets.
    const weightFirst = weightIndex < firstNumIndex
    const order = weightFirst ? ['reps', 'sets'] : ['sets', 'reps']
    if (nums.length === 1) {
      if (!g.reps) g.reps = nums[0]
    } else if (nums.length >= 2) {
      if (!g[order[0]]) g[order[0]] = nums[0]
      if (!g[order[1]]) g[order[1]] = nums[1]
    }
  } else if (timed) {
    // "3 x 45s" is three sets, not three reps.
    if (nums.length === 1) {
      if (!g.sets) g.sets = nums[0]
    } else if (nums.length >= 2) {
      if (!g.sets) g.sets = nums[0]
      if (!g.reps) g.reps = nums[1]
    }
  } else if (nums.length === 1) {
    if (!g.reps) g.reps = nums[0]
  } else if (nums.length === 2) {
    // "135 x 8" is weight x reps; "3 x 8" is sets x reps. Nobody logs 13 sets.
    if (nums[0] > 12) {
      g.weight = nums[0]
      if (!g.reps) g.reps = nums[1]
    } else {
      if (!g.sets) g.sets = nums[0]
      if (!g.reps) g.reps = nums[1]
    }
  } else if (nums.length >= 3) {
    if (nums[0] > 12) {
      g.weight = nums[0]
      if (!g.reps) g.reps = nums[1]
      if (!g.sets) g.sets = nums[2]
    } else {
      if (!g.sets) g.sets = nums[0]
      if (!g.reps) g.reps = nums[1]
      g.weight = nums[2]
    }
  }

  if (g.weight > 0 && !g.unit) g.unit = defaultUnit
  if (!g.sets && isMeaningful(g)) g.sets = 1

  // Leftover words are the user's own shorthand -- keep them as notes, minus
  // the connective tissue ("3 sets of 12" leaves a stray "of").
  const leftover = s
    .replace(/[\d.x×*@/,;:]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.test(word))
    .join(' ')
    .trim()
  if (leftover) notes.push(leftover)
  g.notes = notes.filter(Boolean).join('; ')
  g.leftoverWords = leftover

  return isMeaningful(g) ? g : null
}

// "225x5, 245x5, 265x3" is three sets, but the comma in "(deep, felt good)" is
// part of a note -- so only split on separators outside brackets.
function splitGroups(text) {
  const parts = []
  let current = ''
  let depth = 0

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]

    if (ch === '(' || ch === '[') depth += 1
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)

    if (depth === 0) {
      if (ch === ',' || ch === ';') {
        parts.push(current)
        current = ''
        continue
      }
      // "/" is left alone: on a cardio line it separates distance from pace
      // ("500m / 1:45"), which belongs to a single entry.
      if (/^\s+and\s+/i.test(text.slice(i))) {
        const [matched] = text.slice(i).match(/^\s+and\s+/i)
        parts.push(current)
        current = ''
        i += matched.length - 1
        continue
      }
    }

    current += ch
  }

  parts.push(current)
  return parts
}

function parseSpec(text, defaultUnit) {
  return splitGroups(text)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseGroup(part, defaultUnit))
    .filter(Boolean)
}

function cleanName(name) {
  return name.replace(/[\s:,\-–—]+$/, '').replace(/^[\s:,\-–—]+/, '').trim()
}

function stripBullet(line) {
  return line
    .replace(/^[\s>*•·◦]+/, '')
    .replace(/^[-–—]\s+/, '')
    .replace(/^\d+[.)]\s+(?=[a-z])/i, '')
    .trim()
}

/**
 * Turns pasted notes into a flat list of entries, one per set-group.
 *
 * @param {string} text     Whatever was pasted.
 * @param {object} options  { date: ISO fallback when the notes name no date,
 *                            unit: 'lb' | 'kg', today: Date }
 */
export function parseWorkoutText(text, options = {}) {
  const today = options.today || new Date()
  const fallbackDate = options.date || toISO(today)
  const defaultUnit = options.unit || 'lb'

  const entries = []
  let date = fallbackDate
  let session = ''
  let exercise = ''
  let pendingHeader = null

  const flushPendingHeader = () => {
    if (!pendingHeader) return
    entries.push({
      ...emptyGroup(),
      date: pendingHeader.date,
      session: pendingHeader.session,
      exercise: pendingHeader.name,
      raw: pendingHeader.raw,
      needsReview: true,
    })
    pendingHeader = null
  }

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = stripBullet(rawLine)
    if (!line || SEPARATOR_LINE.test(line)) continue

    const asDate = parseDateLine(line, today)
    if (asDate) {
      flushPendingHeader()
      if (asDate.date) {
        date = asDate.date
        session = asDate.title
      } else {
        session = asDate.title
      }
      exercise = ''
      continue
    }

    const match = SPEC_START.exec(line)
    const splitAt = match ? match.index + match[1].length : -1
    const name = splitAt >= 0 ? cleanName(line.slice(0, splitAt)) : cleanName(line)
    const groups = splitAt >= 0 ? parseSpec(line.slice(splitAt), defaultUnit) : []

    if (groups.length === 0) {
      // A heading. If the previous heading never got any sets, it was a
      // section label ("Push day"), not an exercise.
      if (pendingHeader) {
        if (!session) session = pendingHeader.name
        else flushPendingHeader()
      }
      exercise = name
      pendingHeader = { name, date, session, raw: rawLine.trim() }
      continue
    }

    // "5x5 squat" -- the name trailed the numbers.
    let resolved = name
    if (!resolved) {
      const trailing = groups.map((g) => g.leftoverWords).find(Boolean)
      if (trailing) resolved = cleanName(trailing)
    }
    if (resolved) {
      exercise = resolved
      pendingHeader = null
    }

    for (const group of groups) {
      const { leftoverWords, ...rest } = group
      entries.push({
        ...rest,
        notes: resolved && leftoverWords === resolved ? '' : rest.notes,
        date,
        session,
        exercise: exercise || 'Unnamed',
        raw: rawLine.trim(),
        needsReview: !exercise,
      })
    }
    pendingHeader = null
  }

  flushPendingHeader()
  return entries
}

export function volumeOf(entry) {
  return (Number(entry.sets) || 0) * (Number(entry.reps) || 0) * (Number(entry.weight) || 0)
}
