export function isPrismaUniqueError(error: unknown) {
  return hasPrismaCode(error, 'P2002');
}

export function isPrismaNotFoundError(error: unknown) {
  return hasPrismaCode(error, 'P2025');
}

function hasPrismaCode(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
