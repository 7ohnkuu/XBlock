/** Western letters + a long digit tail. Common farm handle, not unique to any one account. */
export function isDigitFarmHandle(handle: string): boolean {
  return /^[A-Za-z]{3,}\d{5,}$/.test(handle.replace(/^@/, ""))
}
