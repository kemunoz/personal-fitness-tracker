const INCREMENT = { lb: 5, kg: 2.5 }

/**
 * Given all entries for one exercise on one date, recommend the next weight.
 * Returns { weight, didProgress, message } or null if not applicable (bodyweight/cardio).
 */
export function recommend(entries, unit) {
  // Filter to entries that have a meaningful weight
  const weighted = entries.filter((e) => e.weight > 0 && !e.bodyweight)
  if (weighted.length === 0) return null

  const maxWeight = Math.max(...weighted.map((e) => e.weight))
  const atMax = weighted.filter((e) => e.weight === maxWeight)

  // Check if all sets at the top weight hit the same rep count
  const reps = atMax.map((e) => e.reps)
  const allConsistent = reps.length > 0 && reps.every((r) => r > 0 && r === reps[0])

  const increment = INCREMENT[unit] || INCREMENT.lb
  const entryUnit = atMax[0].unit || unit

  if (allConsistent) {
    const next = maxWeight + increment
    return {
      weight: next,
      didProgress: true,
      message: `Try ${next} ${entryUnit}`,
    }
  }

  return {
    weight: maxWeight,
    didProgress: false,
    message: `Stay at ${maxWeight} ${entryUnit} — complete all reps first`,
  }
}
