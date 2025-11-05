// Game logic utilities

export function pickDistractors(correctTrack, pool, mode, count) {
  const taken = new Set()
  const out = []
  const correctKey = mode === 'song' 
    ? (correctTrack.name || '').toLowerCase()
    : (correctTrack.artists?.[0]?.name || '').toLowerCase()
  
  // Also track by track ID to avoid duplicates
  const takenIds = new Set()
  takenIds.add(correctTrack.id)
  
  // Shuffle pool first for better randomness
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5)
  
  for (const t of shuffledPool) {
    if (out.length >= count) break
    
    // Skip if same track ID
    if (takenIds.has(t.id)) continue
    
    const key = mode === 'song' 
      ? (t.name || '').toLowerCase()
      : (t.artists?.[0]?.name || '').toLowerCase()
    
    if (!key || key === correctKey) continue
    if (taken.has(key)) continue
    
    taken.add(key)
    takenIds.add(t.id)
    out.push(t)
  }
  
  // If not enough unique options, try again with remaining pool
  if (out.length < count) {
    const remaining = shuffledPool.filter(t => !takenIds.has(t.id))
    for (const t of remaining) {
      if (out.length >= count) break
      if (takenIds.has(t.id)) continue
      const key = mode === 'song' 
        ? (t.name || '').toLowerCase()
        : (t.artists?.[0]?.name || '').toLowerCase()
      if (!key || key === correctKey) continue
      takenIds.add(t.id)
      out.push(t)
    }
  }
  
  return out.slice(0, count)
}

export function buildOptionsList(correctTrack, distractors, mode) {
  const toOption = (t, isCorrect) => ({
    label: mode === 'song' ? (t.name || 'Unknown') : (t.artists?.[0]?.name || 'Unknown'),
    sublabel: '',
    isCorrect,
    trackId: t.id
  })
  
  const allOptions = [
    toOption(correctTrack, true),
    ...distractors.map(d => toOption(d, false))
  ]
  
  // Final check: ensure no duplicate labels in the options
  const seenLabels = new Set()
  const uniqueOptions = []
  for (const opt of allOptions) {
    const labelKey = opt.label.toLowerCase()
    if (!seenLabels.has(labelKey)) {
      seenLabels.add(labelKey)
      uniqueOptions.push(opt)
    }
  }
  
  // If we lost the correct answer, add it back and remove a distractor
  const hasCorrect = uniqueOptions.some(opt => opt.isCorrect)
  if (!hasCorrect) {
    uniqueOptions.pop()
    uniqueOptions.push(toOption(correctTrack, true))
  }
  
  return uniqueOptions
}

export function shuffleArray(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp
  }
  return a
}

