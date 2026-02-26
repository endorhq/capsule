/** Browser-safe basename: extract filename from a file path. */
export function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}
