import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface CategoryDropdownProps {
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function CategoryDropdown({
  selectedCategoryId,
  onSelectCategory,
}: CategoryDropdownProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bill_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('bill_categories')
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)));
        onSelectCategory(data.id);
        setNewCategoryName('');
        setShowAddInput(false);
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <View>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dropdownText, !selectedCategory && styles.placeholder]}>
          {selectedCategory ? selectedCategory.name : 'Select category'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#7f8c8d" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setShowAddInput(false);
          setNewCategoryName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setShowAddInput(false);
                  setNewCategoryName('');
                }}
              >
                <Ionicons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
            ) : (
              <ScrollView style={styles.categoryList}>
                {/* None option */}
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    !selectedCategoryId && styles.selectedCategory,
                  ]}
                  onPress={() => {
                    onSelectCategory(null);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.categoryText}>None</Text>
                  {!selectedCategoryId && (
                    <Ionicons name="checkmark" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>

                {/* Existing categories */}
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategoryId === category.id && styles.selectedCategory,
                    ]}
                    onPress={() => {
                      onSelectCategory(category.id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.categoryText}>{category.name}</Text>
                    {selectedCategoryId === category.id && (
                      <Ionicons name="checkmark" size={20} color="#3498db" />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Add category section */}
                {showAddInput ? (
                  <View style={styles.addInputContainer}>
                    <TextInput
                      style={styles.addInput}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      placeholder="Enter category name"
                      autoFocus
                      onSubmitEditing={handleAddCategory}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowAddInput(false);
                        setNewCategoryName('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddInput(true)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#3498db" />
                    <Text style={styles.addButtonText}>Add Category</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dropdownText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  placeholder: {
    color: '#95a5a6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  loader: {
    padding: 40,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  selectedCategory: {
    backgroundColor: '#ecf0f1',
  },
  categoryText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  addInputContainer: {
    padding: 16,
    gap: 12,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cancelButton: {
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});
