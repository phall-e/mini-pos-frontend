type BarcodeBar = {
  x: number
  width: number
}

type BarcodeSvg = {
  bars: BarcodeBar[]
  width: number
  height: number
  value: string
}

const code39Patterns: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
}

const code39AllowedPattern = /[0-9A-Z .$/+%-]/

export const useBarcode = () => {
  const normalizeBarcodeValue = (value?: string | number | null) => {
    return String(value ?? '')
      .toUpperCase()
      .split('')
      .filter(character => code39AllowedPattern.test(character))
      .join('')
  }

  const createCode39Barcode = (value?: string | number | null): BarcodeSvg => {
    const normalizedValue = normalizeBarcodeValue(value)
    const encodedValue = `*${normalizedValue || '0'}*`
    const narrowWidth = 2
    const wideWidth = 5
    const gapWidth = narrowWidth
    const quietWidth = 12
    const height = 70
    const bars: BarcodeBar[] = []
    let x = quietWidth

    encodedValue.split('').forEach((character, characterIndex) => {
      const pattern = code39Patterns[character] ?? code39Patterns['0']

      pattern.split('').forEach((unit, unitIndex) => {
        const width = unit === 'w' ? wideWidth : narrowWidth

        if (unitIndex % 2 === 0) {
          bars.push({ x, width })
        }

        x += width
      })

      if (characterIndex < encodedValue.length - 1) {
        x += gapWidth
      }
    })

    return {
      bars,
      width: x + quietWidth,
      height,
      value: normalizedValue,
    }
  }

  return {
    createCode39Barcode,
    normalizeBarcodeValue,
  }
}
