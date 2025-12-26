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
import { useRouter } from 'expo-router';
import TabScreenHeader from '@/components/TabScreenHeader';
import DateInput from '@/components/DateInput';

// Data Interfaces (Schema)
export interface PersonalTask {
  id: string;
  projectId: string;
  milestoneId?: string;
  name: string;
  description: string;
  assignedWeek?: string; // ISO week format: "2025-W50"
  assignedDate?: string; // ISO date: "2025-12-08"
  dueDate?: string; // ISO date: "2025-12-15"
  completed: boolean;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate?: string; // ISO date
  createdAt: string;
}

export interface PersonalProject {
  id: string;
  name: string;
  description: string;
  priority: 'Urgent' | 'High' | 'Moderate' | 'Low';
  dueDate?: string; // ISO date
  createdAt: string;
}

type PriorityType = 'Urgent' | 'High' | 'Moderate' | 'Low';

const STORAGE_KEY = '@personal_projects';

export default function PersonalScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<PersonalProject[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<PriorityType>('Moderate');
  const [formDueDate, setFormDueDate] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProjects(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const saveProjects = async (updatedProjects: PersonalProject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  };

  const handleAddProject = () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    const newProject: PersonalProject = {
      id: Date.now().toString(),
      name: formName.trim(),
      description: formDescription.trim(),
      priority: formPriority,
      dueDate: formDueDate || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPriority('Moderate');
    setFormDueDate('');
  };

  const handleProjectPress = (project: PersonalProject) => {
    // Navigate to project details screen
    router.push({
      pathname: '/project-details',
      params: { projectId: project.id },
    });
  };

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case 'Urgent':
        return '#e74c3c';
      case 'High':
        return '#e67e22';
      case 'Moderate':
        return '#f39c12';
      case 'Low':
        return '#95a5a6';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Personal Projects"
          rightContent={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          }
        />

        {/* Projects List */}
        <ScrollView style={styles.content}>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateText}>No projects yet</Text>
              <Text style={styles.emptyStateSubtext}>Tap "Add Project" to get started</Text>
            </View>
          ) : (
            projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => handleProjectPress(project)}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(project.priority) },
                    ]}
                  >
                    <Text style={styles.priorityText}>{project.priority}</Text>
                  </View>
                </View>
                {project.description ? (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                ) : null}
                {project.dueDate ? (
                  <View style={styles.projectFooter}>
                    <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                    <Text style={styles.dueDateText}>Due {formatDate(project.dueDate)}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Add Project Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowAddModal(false);
              resetForm();
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Personal Project</Text>
              <TouchableOpacity onPress={handleAddProject}>
                <Text style={[styles.modalButton, styles.saveButton]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Project name"
                  placeholderTextColor="#bdc3c7"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Project description"
                  placeholderTextColor="#bdc3c7"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Priority */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityPills}>
                  {(['Urgent', 'High', 'Moderate', 'Low'] as PriorityType[]).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityPill,
                        formPriority === priority && styles.priorityPillActive,
                        formPriority === priority && {
                          backgroundColor: getPriorityColor(priority),
                        },
                      ]}
                      onPress={() => setFormPriority(priority)}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          formPriority === priority && styles.priorityPillTextActive,
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Due Date */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (Optional)</Text>
                <DateInput
                  value={formDueDate}
                  onChangeText={setFormDueDate}
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
    backgroundColor: '#2c3e50',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  projectDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 8,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dueDateText: {
    fontSize: 13,
    color: '#7f8c8d',
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
    minHeight: 100,
    paddingTop: 12,
  },
  priorityPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: 'white',
  },
  priorityPillActive: {
    borderColor: 'transparent',
  },
  priorityPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  priorityPillTextActive: {
    color: 'white',
  },
});
