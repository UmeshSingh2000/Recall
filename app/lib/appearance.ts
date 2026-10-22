import { File, Paths } from "expo-file-system";

const appearanceFile = new File(Paths.document, "appearance.txt");
const paletteFile = new File(Paths.document, "palette.txt");

async function readPreference(file: File) {
  try {
    if (!file.exists) return null;
    return (await file.text()).trim();
  } catch {
    return null;
  }
}

async function writePreference(file: File, value: string) {
  file.create({ overwrite: true, intermediates: true });
  file.write(value);
}

export function readAppearance() {
  return readPreference(appearanceFile);
}

export function writeAppearance(value: string) {
  return writePreference(appearanceFile, value);
}

export function readPalette() {
  return readPreference(paletteFile);
}

export function writePalette(value: string) {
  return writePreference(paletteFile, value);
}
