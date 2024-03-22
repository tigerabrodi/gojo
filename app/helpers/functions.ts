import { COLORS } from '.'

const pluralRule = new Intl.PluralRules('en-US', {
  type: 'ordinal',
})

const suffixes = new Map([
  ['one', 'st'],
  ['two', 'nd'],
  ['few', 'rd'],
  ['other', 'th'],
])

export function formatOrdinals(number: number) {
  const rule = pluralRule.select(number)
  const suffix = suffixes.get(rule)
  return `${number}${suffix}`
}

export function getColorWithId(id: number) {
  return COLORS[id % COLORS.length]
}
