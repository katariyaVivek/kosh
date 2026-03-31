export function isSetupRequired(): boolean {
  const key = process.env.KOSH_MASTER_KEY
  return (
    !key ||
    key === "" ||
    key.includes("change-this") ||
    key.includes("super-secret") ||
    key.length < 32
  )
}
