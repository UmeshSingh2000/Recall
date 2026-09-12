import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, tabBarInset } from "../../constants/theme";
import { ConfirmDialog, Screen } from "../../components/ui";
import { createBackup, parseBackup, restoreBackup, type RecallBackup } from "../../lib/backup";
import { deleteAllData } from "../../lib/database";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [appearance, setAppearance] = useState("System");
  const [sessions, setSessions] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [pendingImport, setPendingImport] = useState<RecallBackup | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmDeleteAll = () => setDeleteDialogVisible(true);
  const handleDeleteAll = async () => {
    setDeleteDialogVisible(false);
    await deleteAllData(db);
  };
  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      const backup = await createBackup(db);
      const filename = `recall-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const contents = JSON.stringify(backup, null, 2);
      if (Platform.OS === "android") {
        const directory = await Directory.pickDirectoryAsync();
        const destination = directory.createFile(filename, "application/json");
        destination.write(contents);
        setStatus(`Saved ${filename} to the selected folder.`);
        return;
      }
      const file = new File(Paths.document, filename);
      file.create({ overwrite: true });
      file.write(contents);
      if (!(await Sharing.isAvailableAsync())) {
        setStatus("Backup created, but sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export Recall data",
      });
      setStatus("Backup ready to share.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not export data.");
    } finally {
      setBusy(false);
    }
  };
  const handlePickImport = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const contents = Platform.OS === "web" && asset.file
        ? await asset.file.text()
        : await FileSystemLegacy.readAsStringAsync(asset.uri);
      setPendingImport(parseBackup(JSON.parse(contents)));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read that backup file.");
    } finally {
      setBusy(false);
    }
  };
  const handleImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    setPendingImport(null);
    try {
      await restoreBackup(db, pendingImport);
      setStatus("Backup imported successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import that backup.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Settings" subtitle="Tune Recall to your workflow">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Text style={styles.group}>APPEARANCE</Text>
        <View style={styles.panel}>
          {["System", "Light", "Dark"].map((item) => (
            <Pressable key={item} style={styles.row} onPress={() => setAppearance(item)}>
              <View style={styles.rowIcon}>
                <Ionicons name={item === "System" ? "contrast-outline" : item === "Dark" ? "moon-outline" : "sunny-outline"} size={18} color={colors.green} />
              </View>
              <Text style={styles.label}>{item}</Text>
              {appearance === item ? <Ionicons name="checkmark-circle" size={20} color={colors.green} /> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.group}>WORKFLOW</Text>
        <View style={styles.panel}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="timer-outline" size={18} color={colors.green} /></View>
            <Text style={styles.label}>Optional work sessions</Text>
            <Pressable onPress={() => setSessions(!sessions)} style={[styles.toggle, sessions && styles.toggleOn]}>
              <View style={[styles.knob, sessions && styles.knobOn]} />
            </Pressable>
          </View>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="swap-vertical-outline" size={18} color={colors.green} /></View>
            <Text style={styles.label}>Default sort</Text>
            <Text style={styles.value}>Recently updated</Text>
          </View>
        </View>

        <Text style={styles.group}>DATA</Text>
        <View style={styles.panel}>
          {["Export data", "Import data", "Delete all data"].map((item, index) => (
            <Pressable key={item} disabled={busy} style={styles.row} onPress={index === 0 ? handleExport : index === 1 ? handlePickImport : confirmDeleteAll}>
              <View style={styles.rowIcon}>
                <Ionicons name={index === 0 ? "download-outline" : index === 1 ? "cloud-upload-outline" : "trash-outline"} size={18} color={index === 2 ? colors.red : colors.green} />
              </View>
              <Text style={[styles.label, index === 2 && { color: colors.red }]}>{item}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        {status ? <Text style={styles.status}>{status}</Text> : null}

        <View style={styles.about}>
          <Text style={styles.aboutTitle}>Recall</Text>
          <Text style={styles.aboutText}>A quiet place for the context behind your code.</Text>
          <Text style={styles.version}>Version 1.0.0 · Local-first</Text>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete all data?"
        message="This will permanently delete every project, ticket, note, work log, and work session."
        confirmLabel="Delete everything"
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleDeleteAll}
      />
      <ConfirmDialog
        visible={pendingImport !== null}
        title="Replace all data?"
        message="Importing this backup will replace all current projects, tickets, notes, logs, and sessions."
        confirmLabel="Import backup"
        onCancel={() => setPendingImport(null)}
        onConfirm={handleImport}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: tabBarInset },
  group: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginTop: 14, marginBottom: 8, marginLeft: 4 },
  panel: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  row: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderBottomColor: colors.line, borderBottomWidth: 1 },
  rowIcon: { width: 28 },
  label: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: "600" },
  value: { color: colors.muted, fontSize: 12 },
  toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.line, padding: 3 },
  toggleOn: { backgroundColor: colors.green },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },
  about: { alignItems: "center", padding: 35 },
  aboutTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  aboutText: { color: colors.muted, marginTop: 6 },
  version: { color: colors.muted, fontSize: 12, marginTop: 12 },
  status: { color: colors.green, fontSize: 13, lineHeight: 19, marginTop: 10, marginHorizontal: 4 },
});
