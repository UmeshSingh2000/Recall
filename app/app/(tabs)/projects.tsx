import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../components/ThemeProvider';
import { radius, spacing, tabBarInset } from '../../constants/theme';
import { EmptyState, Screen } from '../../components/ui';
import type { Project } from '../../types';
import { getProjectById, getProjectsIds, syncProjects } from '@/lib/backendCalls';
import Toast from 'react-native-toast-message';
import { setSyncMetaData, SyncMetadataKeys } from '@/lib/database';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    add: { color: colors.green, fontWeight: '800', fontSize: 13 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    list: { paddingBottom: tabBarInset },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.md,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.greenSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: { color: colors.green, fontSize: 18, fontWeight: '800' },
    main: { flex: 1, marginLeft: 12 },
    name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
    description: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
    meta: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 7 },
    active: { color: colors.green, fontSize: 12, fontWeight: '800' },
    completed: { color: colors.muted, fontSize: 12 },
    dot: { color: colors.line },
    arrow: { color: colors.muted, fontSize: 26, lineHeight: 28 },
    syncBar: {
      position: 'absolute',
      left: -spacing.lg,
      right: -spacing.lg,
      bottom: 0,
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    syncIcon: { marginRight: spacing.sm },
    syncStatus: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    syncButton: {
      minHeight: 36,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.ink,
    },
    syncButtonDisabled: { opacity: 0.55 },
    syncButtonText: { color: colors.canvas, fontSize: 12, fontWeight: '800' },
    dismiss: {
      width: 36,
      height: 36,
      marginLeft: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    syncRestore: {
      position: 'absolute',
      right: spacing.lg,
      bottom: 0,
      width: 42,
      height: 42,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
  }));
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [syncDismissed, setSyncDismissed] = useState(false);
  const [ids, setIds] = useState<{
    online: number[];
    local: number[];
  }>({
    online: [] as number[],
    local: [] as number[],
  })


  const loadProjects = useCallback(() => {
    return db
      .getAllAsync<Project>(
        `SELECT p.*,
          SUM(CASE WHEN t.status NOT IN ('done', 'live') THEN 1 ELSE 0 END) AS active_count,
          SUM(CASE WHEN t.status IN ('done', 'live') THEN 1 ELSE 0 END) AS completed_count
        FROM projects p
        LEFT JOIN tickets t ON t.project_id = p.id
        GROUP BY p.id
        ORDER BY p.name`,
      )
      .then(setProjects);
  }, [db]);

  const handleSyncProject = async () => {
    
    // if(!projects.length){
    //   Toast.show({
    //     type: "info",
    //     text1: "No projects to sync",
    //     text2: "There are no projects available to sync with the backend.",
    //   });
    //   return;
    // }
    try{
      setLoading(true);

      if(ids.local.length) {
        const localProjectsToSync = projects.filter((project: Project) => ids.local.includes(project.id));
        const results = await Promise.all(
          localProjectsToSync.map((project) => syncProjects(project))
        )

        Toast.show({
          type: "success",
          text1:  "Sync Successful",
          text2: `${results.length} project(s) synced from local to online.`,
        });
      }

      else if (ids.online.length) {
        const onlineProjectsToSync = await Promise.all(
          ids.online.map((id) => getProjectById(id))
        );

        const projects = onlineProjectsToSync
          .map(response => response.data?.project)
          .filter(Boolean);

        await db.withTransactionAsync(async () => {
          for (const project of projects) {
            await db.runAsync(
              `INSERT OR IGNORE INTO projects
                (id, name, description, repository_url, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
              project.id,
              project.name,
              project.description,
              project.repository_url,
              project.created_at,
              project.updated_at,
            );
          }
        });
        await loadProjects();

        Toast.show({
          type: "success",
          text1:  "Sync Successful",
          text2: `${projects.length} project(s) synced from online to local.`,
        });
      }
      await setSyncMetaData(db, SyncMetadataKeys.ProjectsDirty, '0');
      setIsDirty(false);
    }
    catch(e: any){
      console.error('Sync error:', e.message);
      Toast.show({
        type: "error",
        text1: "Sync failed",
        text2: e.message || "An error occurred while syncing projects.",
      });
    }
    finally{
      setLoading(false);
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProjects();
    } finally {
      setRefreshing(false);
    }
  }, [loadProjects]);

  // fetch all the project ids and compare them with local sqlite ids diff should be pushed to either on local or online
  const loadProjectsOnlineAndCheckDirty = useCallback(async () => {
    try {
      // Always read the latest IDs from SQLite.
      const localRows = await db.getAllAsync<{ id: number }>(
        'SELECT id FROM projects ORDER BY id'
      );

      const response = await getProjectsIds();

      const localIds = localRows.map(row => row.id);
      const onlineIds: number[] = response.data.projects.map(
        (project: { id: number }) => project.id
      );

      const localSet = new Set(localIds);
      const onlineSet = new Set(onlineIds);

      // Local projects missing online: upload them.
      const localToOnline = localIds.filter(id => !onlineSet.has(id));

      // Online projects missing locally: download them.
      const onlineToLocal = onlineIds.filter(id => !localSet.has(id));

      const dirty = localToOnline.length > 0 || onlineToLocal.length > 0;

      setIds({
        local: localToOnline,
        online: onlineToLocal,
      });

      setIsDirty(dirty);

      await setSyncMetaData(
        db,
        SyncMetadataKeys.ProjectsDirty,
        dirty ? '1' : '0'
      );
    } catch (error) {
      console.error('Error fetching project IDs:', error);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function initialize() {
        await loadProjects();

        if (!cancelled) {
          await loadProjectsOnlineAndCheckDirty();
        }
      }

      initialize();

      return () => {
        cancelled = true;
      };
    }, [loadProjects, loadProjectsOnlineAndCheckDirty])
  );

  return (
    <Screen
      title="Projects"
      subtitle="Your engineering landscape"
      right={
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/new-project')}>
            <Text style={styles.add}>Add project</Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        contentContainerStyle={[
          styles.list,
          isDirty && !syncDismissed && { paddingBottom: tabBarInset + 60 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />
        }
      >
        {projects.length ? (
          projects.map((project) => (
            <Pressable
              key={project.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() => router.push(`/project/${project.id}`)}
            >
              <View style={styles.icon}>
                <Text style={styles.iconText}>{project.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.main}>
                <Text style={styles.name}>{project.name}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {project.description}
                </Text>
                <View style={styles.meta}>
                  <Text style={styles.active}>{project.active_count || 0} active</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.completed}>{project.completed_count || 0} completed</Text>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="layers-outline"
            title="No projects yet"
            body="Create your first project to give your tickets a home."
            action="Add project"
            onAction={() => router.push('/new-project')}
          />
        )}
      </ScrollView>
      {isDirty && !syncDismissed ? (
        <View
          style={[
            styles.syncBar,
            { bottom: Math.max(insets.bottom, spacing.md) + FLOATING_TAB_BAR_HEIGHT },
          ]}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.muted}
              style={styles.syncIcon}
            />
          ) : (
            <Ionicons
              name="sync-outline"
              size={17}
              color={colors.muted}
              style={styles.syncIcon}
            />
          )}
          <Text style={styles.syncStatus}>
            {loading ? 'Syncing projects...' : isDirty ? 'Sync required' : 'Projects are up to date'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync projects now"
            disabled={loading}
            onPress={handleSyncProject}
            style={({ pressed }) => [
              styles.syncButton,
              loading && styles.syncButtonDisabled,
              pressed && !loading && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.syncButtonText}>Sync now</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss sync status"
            hitSlop={6}
            onPress={() => setSyncDismissed(true)}
            style={styles.dismiss}
          >
            <Ionicons name="close" size={17} color={colors.muted} />
          </Pressable>
        </View>
      ) : isDirty ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show sync status"
          onPress={() => setSyncDismissed(false)}
          style={styles.syncRestore}
        >
          <Ionicons name="sync-outline" size={18} color={colors.green} />
        </Pressable>
      ) : null}
    </Screen>
  );
}
