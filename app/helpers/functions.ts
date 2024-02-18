const pluralRule = new Intl.PluralRules("en-US", {
  type: "ordinal",
});

const suffixes = new Map([
  ["one", "st"],
  ["two", "nd"],
  ["few", "rd"],
  ["other", "th"],
]);

export function formatOrdinals(number: number) {
  const rule = pluralRule.select(number);
  const suffix = suffixes.get(rule);
  return `${number}${suffix}`;
}
