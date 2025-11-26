export function parseExpiresIn(expiresIn: string): number {
  const value = parseInt(expiresIn);
  const unit = expiresIn.replace(/\d+/g, '');

  switch (unit) {
    case 's':
      return value * 1000; // seconds to milliseconds
    case 'm':
      return value * 60 * 1000; // minutes to milliseconds
    case 'h':
      return value * 60 * 60 * 1000; // hours to milliseconds
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to milliseconds
    default:
      // Assume seconds if no unit or unknown unit
      return value * 1000;
  }
}
