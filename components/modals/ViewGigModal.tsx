import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GigWithPaychecks, ChecklistItem } from '@/types';
import { format, parseISO } from 'date-fns';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface ViewGigModalProps {
  visible: boolean;
  onClose: () => void;
  gig: GigWithPaychecks | null;
  onUpdate: (updates: Partial<GigWithPaychecks>) => Promise<void>;
}

export default function ViewGigModal({
  visible,
  onClose,
  gig,
  onUpdate,
}: ViewGigModalProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (visible && gig) {
      setChecklist(gig.checklist || []);
      setIsAddingItem(false);
      setNewItemText('');
      setEditingItemId(null);
      setEditingText('');
    }
  }, [visible, gig]);

  const handleAddChecklistItem = async () => {
    if (!newItemText.trim() || !gig) return;

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      name: newItemText.trim(),
      checked: false,
    };

    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    setNewItemText('');
    setIsAddingItem(false);
    await onUpdate({ ...gig, checklist: updatedChecklist });
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!gig) return;

    const updatedChecklist = checklist.filter((item) => item.id !== itemId);
    setChecklist(updatedChecklist);
    await onUpdate({ ...gig, checklist: updatedChecklist });
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!gig) return;

    const updatedChecklist = checklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updatedChecklist);
    await onUpdate({ ...gig, checklist: updatedChecklist });
  };

  const handleEditChecklistItem = async () => {
    if (editingItemId === null || !editingText.trim() || !gig) return;

    const updatedChecklist = checklist.map((item) =>
      item.id === editingItemId ? { ...item, name: editingText.trim() } : item
    );
    setChecklist(updatedChecklist);
    setEditingItemId(null);
    setEditingText('');
    await onUpdate({ ...gig, checklist: updatedChecklist });
  };

  const startEditingItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.name);
  };

  const renderRightActions = (itemId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteSwipe}
        onPress={() => handleDeleteChecklistItem(itemId)}
      >
        <Ionicons name="trash" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatHours = (hours?: number) => {
    if (!hours) return 'N/A';
    return `${hours.toFixed(1)}h`;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = format(parseISO(startDate), 'MMM d, yyyy');
    const end = format(parseISO(endDate), 'MMM d, yyyy');
    return `${start} - ${end}`;
  };

  if (!gig) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {gig.name}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.content}>
            {/* Gig Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Date Range</Text>
              <Text style={styles.sectionValue}>
                {formatDateRange(gig.start_date, gig.end_date)}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Total Amount</Text>
              <Text style={styles.sectionValue}>{formatAmount(gig.total_amount)}</Text>
            </View>

            {gig.total_hours && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Total Hours</Text>
                <Text style={styles.sectionValue}>{formatHours(gig.total_hours)}</Text>
              </View>
            )}

            {gig.description && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.sectionValue}>{gig.description}</Text>
              </View>
            )}

            {/* Linked Paychecks */}
            {gig.paychecks && gig.paychecks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Linked Paychecks</Text>
                {gig.paychecks
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((paycheck) => (
                  <View key={paycheck.id} style={styles.paycheckItem}>
                    <Text style={styles.paycheckDate}>
                      {format(parseISO(paycheck.date), 'MMM d, yyyy')}
                    </Text>
                    <Text style={styles.paycheckAmount}>
                      {formatAmount(paycheck.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Checklist */}
            <View style={styles.section}>
              <View style={styles.checklistHeader}>
                <Text style={styles.sectionLabel}>Checklist</Text>
                {!isAddingItem && (
                  <TouchableOpacity
                    onPress={() => setIsAddingItem(true)}
                    style={styles.addChecklistButton}
                  >
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>

              {isAddingItem && (
                <View style={styles.addItemContainer}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="Enter task..."
                    value={newItemText}
                    onChangeText={setNewItemText}
                    autoFocus
                    onSubmitEditing={handleAddChecklistItem}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={handleAddChecklistItem}
                    style={styles.addItemButton}
                  >
                    <Ionicons name="checkmark" size={24} color="#27ae60" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddingItem(false);
                      setNewItemText('');
                    }}
                    style={styles.cancelItemButton}
                  >
                    <Ionicons name="close" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              )}

              {checklist.length === 0 && !isAddingItem ? (
                <Text style={styles.emptyText}>No tasks yet. Add one to get started!</Text>
              ) : (
                checklist.map((item) => (
                  <Swipeable
                    key={item.id}
                    renderRightActions={() => renderRightActions(item.id)}
                  >
                    {editingItemId === item.id ? (
                      <View style={styles.editItemContainer}>
                        <TextInput
                          style={styles.editItemInput}
                          value={editingText}
                          onChangeText={setEditingText}
                          autoFocus
                          onSubmitEditing={handleEditChecklistItem}
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          onPress={handleEditChecklistItem}
                          style={styles.editItemButton}
                        >
                          <Ionicons name="checkmark" size={24} color="#27ae60" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingItemId(null);
                            setEditingText('');
                          }}
                          style={styles.cancelItemButton}
                        >
                          <Ionicons name="close" size={24} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.checklistItem}
                        onPress={() => handleToggleChecklistItem(item.id)}
                        onLongPress={() => startEditingItem(item)}
                        delayLongPress={500}
                      >
                        <Ionicons
                          name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={item.checked ? '#27ae60' : '#666'}
                        />
                        <Text
                          style={[
                            styles.checklistText,
                            item.checked && styles.checklistTextCompleted,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Swipeable>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  closeButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 16,
    color: '#333',
  },
  paycheckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
  },
  paycheckDate: {
    fontSize: 14,
    color: '#666',
  },
  paycheckAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addChecklistButton: {
    padding: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  addItemInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addItemButton: {
    padding: 8,
  },
  cancelItemButton: {
    padding: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  checklistTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  editItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  editItemInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editItemButton: {
    padding: 8,
  },
  deleteSwipe: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
