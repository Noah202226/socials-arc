import { toast } from "sonner";

export interface FileDeduplicationOptions {
  /** Existing File objects currently in selection queue */
  existingFiles?: File[];
  /** Existing uploaded file names from server database */
  existingFileNames?: string[];
  /** Maximum allowed size per file in bytes (default: 50MB) */
  maxSizeBytes?: number;
}

/**
 * Deduplicates and validates incoming files against existing files/names.
 * Issues Sonner toast warnings if duplicates, empty files, or oversize files are detected.
 * Returns an array of clean, unique, valid File objects.
 */
export function deduplicateIncomingFiles(
  incomingFiles: File[] | FileList | null | undefined,
  options: FileDeduplicationOptions = {}
): File[] {
  if (!incomingFiles) return [];
  const incomingArray = Array.from(incomingFiles);
  if (incomingArray.length === 0) return [];

  const {
    existingFiles = [],
    existingFileNames = [],
    maxSizeBytes = 50 * 1024 * 1024, // 50 MB default
  } = options;

  // Build lookup sets for existing files in state (name + size)
  const existingSet = new Set(
    existingFiles.map((f) => `${f.name.toLowerCase()}-${f.size}`)
  );

  // Build lookup set for existing file names from database
  const existingNamesSet = new Set(
    existingFileNames.map((n) => n.toLowerCase())
  );

  const uniqueFiles: File[] = [];
  const duplicateNames: string[] = [];
  const oversizedNames: string[] = [];
  const emptyNames: string[] = [];

  for (const file of incomingArray) {
    // 1. Check if empty file
    if (file.size === 0) {
      emptyNames.push(file.name);
      continue;
    }

    // 2. Check size limit
    if (file.size > maxSizeBytes) {
      oversizedNames.push(file.name);
      continue;
    }

    // 3. Check duplicates
    const fileKey = `${file.name.toLowerCase()}-${file.size}`;
    const fileNameKey = file.name.toLowerCase();

    if (existingSet.has(fileKey) || existingNamesSet.has(fileNameKey)) {
      if (!duplicateNames.includes(file.name)) {
        duplicateNames.push(file.name);
      }
    } else {
      existingSet.add(fileKey);
      existingNamesSet.add(fileNameKey);
      uniqueFiles.push(file);
    }
  }

  // Toast Warnings / Notifications for skipped files using Sonner
  if (emptyNames.length > 0) {
    toast.error(
      emptyNames.length === 1
        ? `Skipped empty file: "${emptyNames[0]}" (0 bytes).`
        : `Skipped ${emptyNames.length} empty files (0 bytes).`
    );
  }

  if (oversizedNames.length > 0) {
    const limitMb = Math.round(maxSizeBytes / (1024 * 1024));
    toast.error(
      oversizedNames.length === 1
        ? `Skipped "${oversizedNames[0]}": Exceeds ${limitMb}MB size limit.`
        : `Skipped ${oversizedNames.length} files exceeding ${limitMb}MB size limit.`
    );
  }

  if (duplicateNames.length > 0) {
    if (duplicateNames.length === 1) {
      toast.warning(`Skipped duplicate file: "${duplicateNames[0]}" is already added.`);
    } else {
      toast.warning(
        `Skipped ${duplicateNames.length} duplicate files: ${duplicateNames
          .slice(0, 2)
          .map((n) => `"${n}"`)
          .join(", ")}${duplicateNames.length > 2 ? "..." : ""}`
      );
    }
  }

  return uniqueFiles;
}
