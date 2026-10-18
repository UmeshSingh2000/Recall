import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../components/ThemeProvider';
import { radius, spacing, tabBarInset } from '../../constants/theme';
import { EmptyState, Screen } from '../../components/ui';
import ShimmerBlock from '../../components/ShimmerBlock';
import { fetchProjects } from '../../store/workspaceSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

function ProjectListSkeleton() {
  const styles = useThemedStyles((colors) => ({
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
      gap: 12,
    },
    content: { flex: 1, gap: 9 },
  }));

  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {["one", "two", "three", "four"].map((item) => (
        <View key={item} style={styles.card}>
          <ShimmerBlock width={40} height={40} borderRadius={12} />
          <View style={styles.content}>
            <ShimmerBlock width="58%" height={17} borderRadius={6} />
            <ShimmerBlock width="88%" height={13} borderRadius={5} />
            <ShimmerBlock width="45%" height={12} borderRadius={5} />
          </View>
          <ShimmerBlock width={12} height={24} borderRadius={5} />
        </View>
      ))}
    </ScrollView>
  );
}

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
  }));
  const router = useRouter();
  const dispatch = useAppDispatch();
  const projectsData = useAppSelector((state) => state.workspace.projects);
  const projects = projectsData ?? [];
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = useCallback((force = false) => {
    return dispatch(fetchProjects({ force })).unwrap()
      .catch((error) => {
        console.warn('Unable to load projects:', error);
      });
  }, [dispatch]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProjects(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadProjects]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects]),
  );

  if (projectsData === null) {
    return (
      <Screen title="Projects" subtitle="Your engineering landscape">
        <ProjectListSkeleton />
      </Screen>
    );
  }

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
