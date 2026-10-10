import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../components/ThemeProvider';
import { radius, spacing, tabBarInset } from '../../constants/theme';
import { EmptyState, Screen } from '../../components/ui';
import type { Project } from '../../types';
import { getProjectById, getProjectsIds, syncProjects } from '@/lib/backendCalls';
import Toast from 'react-native-toast-message';
import AppLoader from '@/components/AppLoader';
import { setSyncMetaData, SyncMetadataKeys } from '@/lib/database';

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles((colors) => ({
    add: { color: colors.green, fontWeight: '800', fontSize: 13 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sync: {
      color: colors.ink,
      fontWeight: '800',
      fontSize: 13,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 7,
    },
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
  }));
  const db = useSQLiteContext();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
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

  if(loading){
    return <AppLoader
      text="Syncing projects..."
    />
  }

  return (
    <Screen
      title="Projects"
      subtitle="Your engineering landscape"
      right={
        <View style={styles.headerActions}>
          {
            isDirty &&
            <TouchableOpacity onPress={handleSyncProject}>
              <Text style={styles.sync}>Sync projects</Text>
            </TouchableOpacity>
          }
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
        contentContainerStyle={styles.list}
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
    </Screen>
  );
}
