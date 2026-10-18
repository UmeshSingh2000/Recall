import { File, Paths } from "expo-file-system";

const appearanceFile = new File(Paths.document, "appearance.txt");

export async function readAppearance() {
  try {
    if (!appearanceFile.exists) return null;
    return (await appearanceFile.text()).trim();
  } catch {
    return null;
  }
}

export async function writeAppearance(value: string) {
  appearanceFile.create({ overwrite: true, intermediates: true });
  appearanceFile.write(value);
}
