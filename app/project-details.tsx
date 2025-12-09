import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateInput from '@/components/DateInput';
import { PersonalProject, Milestone, PersonalTask } from './(tabs)/personal';

const PROJECTS_KEY = '@personal_projects';
const MILESTONES_KEY = '@personal_milestones';
const TASKS_KEY = '@personal_tasks';

export default function ProjectDetailsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject] = useState<PersonalProject | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Milestone form
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');

  // Task form
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignedWeek, setTaskAssignedWeek] = useState('');
  const [taskAssignedDate, setTaskAssignedDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      // Load project
      const projectsData = await AsyncStorage.getItem(PROJECTS_KEY);
      if (projectsData) {
        const projects: PersonalProject[] = JSON.parse(projectsData);
        const foundProject = projects.find((p) => p.id === projectId);
        setProject(foundProject || null);
      }

      // Load milestones
      const milestonesData = await AsyncStorage.getItem(MILESTONES_KEY);
      if (milestonesData) {
        const allMilestones: Milestone[] = JSON.parse(milestonesData);
        setMilestones(allMilestones.filter((m) => m.projectId === projectId));
      }

      // Load tasks
      const tasksData = await AsyncStorage.getItem(TASKS_KEY);
      if (tasksData) {
        const allTasks: PersonalTask[] = JSON.parse(tasksData);
        setTasks(allTasks.filter((t) => t.projectId === projectId));
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneName.trim()) {
      Alert.alert('Error', 'Please enter a milestone name');
      return;
    }

    const newMilestone: Milestone = {
      id: Date.now().toString(),
      projectId: projectId!,
      name: milestoneName.trim(),
      dueDate: milestoneDueDate || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const stored = await AsyncStorage.getItem(MILESTONES_KEY);
      const allMilestones: Milestone[] = stored ? JSON.parse(stored) : [];
      const updated = [...allMilestones, newMilestone];
      await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
      setMilestones([...milestones, newMilestone]);
      setMilestoneName('');
      setMilestoneDueDate('');
      setShowMilestoneModal(false);
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    const newTask: PersonalTask = {
      id: Date.now().toString(),
      projectId: projectId!,
      milestoneId: selectedMilestoneId,
      name: taskName.trim(),
      description: taskDescription.trim(),
      assignedWeek: taskAssignedWeek || undefined,
      assignedDate: taskAssignedDate || undefined,
      dueDate: taskDueDate || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const stored = await AsyncStorage.getItem(TASKS_KEY);
      const allTasks: PersonalTask[] = stored ? JSON.parse(stored) : [];
      const updated = [...allTasks, newTask];
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
      setTasks([...tasks, newTask]);
      resetTaskForm();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    try {
      const stored = await AsyncStorage.getItem(TASKS_KEY);
      const allTasks: PersonalTask[] = stored ? JSON.parse(stored) : [];
      const updated = allTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const resetTaskForm = () => {
    setTaskName('');
    setTaskDescription('');
    setTaskAssignedWeek('');
    setTaskAssignedDate('');
    setTaskDueDate('');
    setSelectedMilestoneId(undefined);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return tasks.filter((task) => task.milestoneId === milestoneId);
  };

  const getUnassignedTasks = () => {
    return tasks.filter((task) => !task.milestoneId);
  };

  if (!project) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Project not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{project.name}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowMilestoneModal(true)}
            >
              <Ionicons name="flag" size={20} color="white" />
              <Text style={styles.headerButtonText}>Milestone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowTaskModal(true)}
            >
              <Ionicons name="checkbox" size={20} color="white" />
              <Text style={styles.headerButtonText}>Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Project Info */}
        <View style={styles.projectInfo}>
          {project.description ? (
            <Text style={styles.projectDescription}>{project.description}</Text>
          ) : null}
          {project.dueDate ? (
            <View style={styles.projectMeta}>
              <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
              <Text style={styles.metaText}>Due {formatDate(project.dueDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {/* Milestones with Tasks */}
          {milestones.map((milestone) => {
            const milestoneTasks = getTasksForMilestone(milestone.id);
            return (
              <View key={milestone.id} style={styles.milestoneSection}>
                <View style={styles.milestoneHeader}>
                  <Ionicons name="flag" size={18} color="#3498db" />
                  <Text style={styles.milestoneName}>{milestone.name}</Text>
                  {milestone.dueDate ? (
                    <Text style={styles.milestoneDueDate}>{formatDate(milestone.dueDate)}</Text>
                  ) : null}
                </View>

                {milestoneTasks.length > 0 ? (
                  <View style={styles.tasksList}>
                    {milestoneTasks.map((task) => (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.taskItem}
                        onPress={() => handleToggleTask(task.id)}
                      >
                        <Ionicons
                          name={task.completed ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={task.completed ? '#27ae60' : '#bdc3c7'}
                        />
                        <View style={styles.taskContent}>
                          <Text
                            style={[
                              styles.taskName,
                              task.completed && styles.taskNameCompleted,
                            ]}
                          >
                            {task.name}
                          </Text>
                          {task.description ? (
                            <Text style={styles.taskDescription}>{task.description}</Text>
                          ) : null}
                          <View style={styles.taskMeta}>
                            {task.assignedDate ? (
                              <Text style={styles.taskMetaText}>
                                Assigned: {formatDate(task.assignedDate)}
                              </Text>
                            ) : null}
                            {task.dueDate ? (
                              <Text style={styles.taskMetaText}>
                                Due: {formatDate(task.dueDate)}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Unassigned Tasks */}
          {getUnassignedTasks().length > 0 ? (
            <View style={styles.milestoneSection}>
              <View style={styles.milestoneHeader}>
                <Ionicons name="list" size={18} color="#95a5a6" />
                <Text style={styles.milestoneName}>Unassigned Tasks</Text>
              </View>
              <View style={styles.tasksList}>
                {getUnassignedTasks().map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => handleToggleTask(task.id)}
                  >
                    <Ionicons
                      name={task.completed ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={task.completed ? '#27ae60' : '#bdc3c7'}
                    />
                    <View style={styles.taskContent}>
                      <Text
                        style={[
                          styles.taskName,
                          task.completed && styles.taskNameCompleted,
                        ]}
                      >
                        {task.name}
                      </Text>
                      {task.description ? (
                        <Text style={styles.taskDescription}>{task.description}</Text>
                      ) : null}
                      <View style={styles.taskMeta}>
                        {task.assignedDate ? (
                          <Text style={styles.taskMetaText}>
                            Assigned: {formatDate(task.assignedDate)}
                          </Text>
                        ) : null}
                        {task.dueDate ? (
                          <Text style={styles.taskMetaText}>
                            Due: {formatDate(task.dueDate)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {milestones.length === 0 && tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>No milestones or tasks yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add milestones to organize your project
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Add Milestone Modal */}
      <Modal
        visible={showMilestoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowMilestoneModal(false);
          setMilestoneName('');
          setMilestoneDueDate('');
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowMilestoneModal(false);
              setMilestoneName('');
              setMilestoneDueDate('');
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowMilestoneModal(false);
                  setMilestoneName('');
                  setMilestoneDueDate('');
                }}
              >
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Milestone</Text>
              <TouchableOpacity onPress={handleAddMilestone}>
                <Text style={[styles.modalButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={milestoneName}
                  onChangeText={setMilestoneName}
                  placeholder="Milestone name"
                  placeholderTextColor="#bdc3c7"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (Optional)</Text>
                <DateInput
                  value={milestoneDueDate}
                  onChangeText={setMilestoneDueDate}
                  placeholder="Select due date"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowTaskModal(false);
          resetTaskForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowTaskModal(false);
              resetTaskForm();
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowTaskModal(false);
                  resetTaskForm();
                }}
              >
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Task</Text>
              <TouchableOpacity onPress={handleAddTask}>
                <Text style={[styles.modalButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="Task name"
                  placeholderTextColor="#bdc3c7"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Task description"
                  placeholderTextColor="#bdc3c7"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {milestones.length > 0 ? (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Milestone (Optional)</Text>
                  <View style={styles.milestonePills}>
                    <TouchableOpacity
                      style={[
                        styles.milestonePill,
                        !selectedMilestoneId && styles.milestonePillActive,
                      ]}
                      onPress={() => setSelectedMilestoneId(undefined)}
                    >
                      <Text
                        style={[
                          styles.milestonePillText,
                          !selectedMilestoneId && styles.milestonePillTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {milestones.map((milestone) => (
                      <TouchableOpacity
                        key={milestone.id}
                        style={[
                          styles.milestonePill,
                          selectedMilestoneId === milestone.id && styles.milestonePillActive,
                        ]}
                        onPress={() => setSelectedMilestoneId(milestone.id)}
                      >
                        <Text
                          style={[
                            styles.milestonePillText,
                            selectedMilestoneId === milestone.id &&
                              styles.milestonePillTextActive,
                          ]}
                        >
                          {milestone.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Assigned Date (Optional)</Text>
                <DateInput
                  value={taskAssignedDate}
                  onChangeText={setTaskAssignedDate}
                  placeholder="Select assigned date"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (Optional)</Text>
                <DateInput
                  value={taskDueDate}
                  onChangeText={setTaskDueDate}
                  placeholder="Select due date"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  projectInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  projectDescription: {
    fontSize: 15,
    color: '#7f8c8d',
    lineHeight: 22,
    marginBottom: 8,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  milestoneSection: {
    marginBottom: 24,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  milestoneName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
  },
  milestoneDueDate: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  tasksList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    gap: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  taskDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskMetaText: {
    fontSize: 12,
    color: '#95a5a6',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#95a5a6',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  saveButton: {
    color: '#3498db',
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  milestonePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  milestonePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: 'white',
  },
  milestonePillActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  milestonePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  milestonePillTextActive: {
    color: 'white',
  },
});
