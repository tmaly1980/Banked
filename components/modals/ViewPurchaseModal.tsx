import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { ExpenseType, ExpensePurchase, ChecklistItem, ExpenseBudget } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { pickImage, takePhoto, uploadPurchasePhoto, deletePurchasePhoto } from '@/lib/photoUtils';

interface ViewPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  purchase: ExpensePurchase | null;
  expenseType: ExpenseType | null;
  budget: ExpenseBudget | null;
  onUpdate: (id: string, updates: Partial<ExpensePurchase>) => Promise<void>;
}

export default function ViewPurchaseModal({
  visible,
  onClose,
  purchase,
  expenseType,
  budget,
  onUpdate,
}: ViewPurchaseModalProps) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    if (visible && purchase) {
      setChecklist(purchase.checklist || []);
      setPhotos(purchase.photos || []);
      setPurchaseAmount(purchase.purchase_amount?.toString() || '');
      setPurchaseDate(
        purchase.purchase_date ? format(new Date(purchase.purchase_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      );
    }
  }, [visible, purchase]);

  const handleAddChecklistItem = async () => {
    if (!newItemName.trim() || !purchase) return;

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      checked: false,
    };

    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { checklist: updatedChecklist });
    
    setNewItemName('');
    setIsAddingItem(false);
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!purchase) return;

    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { checklist: updatedChecklist });
  };

  const handleUpdateItemName = async (itemId: string) => {
    if (!editingItemName.trim() || !purchase) return;

    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, name: editingItemName.trim() } : item
    );
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { checklist: updatedChecklist });
    
    setEditingItemId(null);
    setEditingItemName('');
  };

  const handleUpdateItemPrice = async (itemId: string, price: string) => {
    if (!purchase) return;

    const priceNum = price ? parseFloat(price) : undefined;
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, price: priceNum } : item
    );
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { checklist: updatedChecklist });
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!purchase) return;

    const updatedChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { checklist: updatedChecklist });
  };

  const handleMakePurchase = async () => {
    if (!purchase) return;

    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid purchase amount');
      return;
    }

    await onUpdate(purchase.id, {
      purchase_amount: amount,
      purchase_date: new Date(purchaseDate).toISOString(),
    });

    setShowPurchaseForm(false);
  };

  const renderDeleteAction = (itemId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteChecklistItem(itemId)}
      >
        <Ionicons name="trash" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const calculateTally = () => {
    return checklist.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const getEstimateOrBudget = () => {
    if (purchase?.estimated_amount) {
      return { amount: purchase.estimated_amount, label: 'estimated' };
    }
    if (budget?.amount) {
      return { amount: budget.amount, label: 'budgeted' };
    }
    return null;
  };

  const handleAddPhoto = async () => {
    if (!user || !purchase) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handlePhotoFromCamera();
          } else if (buttonIndex === 2) {
            await handlePhotoFromLibrary();
          }
        }
      );
    } else {
      // On Android, just show library for now
      await handlePhotoFromLibrary();
    }
  };

  const handlePhotoFromCamera = async () => {
    if (!user || !purchase) return;

    setUploadingPhoto(true);
    try {
      const photoUri = await takePhoto();
      if (photoUri) {
        const result = await uploadPurchasePhoto(photoUri, user.id, purchase.id);
        if (result.url) {
          const updatedPhotos = [...photos, result.url];
          setPhotos(updatedPhotos);
          await onUpdate({ ...purchase, photos: updatedPhotos });
        } else if (result.error) {
          Alert.alert('Upload Error', result.error.message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoFromLibrary = async () => {
    if (!user || !purchase) return;

    setUploadingPhoto(true);
    try {
      const photoUri = await pickImage();
      if (photoUri) {
        const result = await uploadPurchasePhoto(photoUri, user.id, purchase.id);
        if (result.url) {
          const updatedPhotos = [...photos, result.url];
          setPhotos(updatedPhotos);
          await onUpdate({ ...purchase, photos: updatedPhotos });
        } else if (result.error) {
          Alert.alert('Upload Error', result.error.message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!purchase) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePurchasePhoto(photoUrl);
              const updatedPhotos = photos.filter((url) => url !== photoUrl);
              setPhotos(updatedPhotos);
              await onUpdate({ ...purchase, photos: updatedPhotos });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  if (!purchase || !expenseType) return null;

  const tally = calculateTally();
  const estimateOrBudget = getEstimateOrBudget();
  const isPurchased = !!purchase.purchase_amount && !!purchase.purchase_date;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {purchase.description || expenseType?.name || 'Purchase'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

        <ScrollView style={styles.content}>
          {/* Purchase Info */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expense Type</Text>
            <Text style={styles.sectionValue}>{expenseType.name}</Text>
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoCarousel}>
              {photos.map((photoUrl, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photoUrl }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(photoUrl)}
                  >
                    <Ionicons name="close-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Ionicons name="camera" size={32} color="#007AFF" />
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Checklist Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Checklist</Text>
              {!isAddingItem && (
                <TouchableOpacity onPress={() => setIsAddingItem(true)}>
                  <Ionicons name="add-circle" size={28} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>

            {isAddingItem && (
              <View style={styles.addItemForm}>
                <TextInput
                  style={styles.addItemInput}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="Item name..."
                  placeholderTextColor="#999"
                  autoFocus
                />
                <TouchableOpacity style={styles.saveItemButton} onPress={handleAddChecklistItem}>
                  <Text style={styles.saveItemText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setIsAddingItem(false);
                  setNewItemName('');
                }}>
                  <Ionicons name="close-circle" size={24} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            {checklist.map((item) => (
              <Swipeable
                key={item.id}
                renderRightActions={() => renderDeleteAction(item.id)}
              >
                <View style={[styles.checklistItem, item.checked && styles.checklistItemChecked]}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleChecklistItem(item.id)}
                  >
                    <Ionicons
                      name={item.checked ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={item.checked ? '#27ae60' : '#999'}
                    />
                  </TouchableOpacity>

                  {editingItemId === item.id ? (
                    <View style={styles.editItemForm}>
                      <TextInput
                        style={styles.editItemInput}
                        value={editingItemName}
                        onChangeText={setEditingItemName}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => handleUpdateItemName(item.id)}>
                        <Text style={styles.saveItemText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.itemNameContainer}
                        onLongPress={() => {
                          setEditingItemId(item.id);
                          setEditingItemName(item.name);
                        }}
                      >
                        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>

                      {editingItemId !== item.id && (
                        <TextInput
                          style={[styles.priceInput, item.checked && styles.priceInputDisabled]}
                          value={item.price?.toString() || ''}
                          onChangeText={(value) => handleUpdateItemPrice(item.id, value)}
                          placeholder="$0"
                          keyboardType="decimal-pad"
                          editable={!item.checked}
                          placeholderTextColor="#999"
                        />
                      )}
                    </>
                  )}
                </View>
              </Swipeable>
            ))}

            {checklist.length > 0 && (
              <View style={styles.tallyContainer}>
                <Text style={styles.tallyLabel}>Tally:</Text>
                <Text style={styles.tallyAmount}>
                  ${tally.toFixed(2)}
                  {estimateOrBudget && ` / $${estimateOrBudget.amount.toFixed(2)} (${estimateOrBudget.label})`}
                </Text>
              </View>
            )}
          </View>

          {/* Purchase Status */}
          {isPurchased && (
            <View style={styles.purchaseStatus}>
              <Text style={styles.purchaseStatusLabel}>Purchased</Text>
              <Text style={styles.purchaseStatusDate}>
                {format(new Date(purchase.purchase_date!), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.purchaseStatusAmount}>
                ${purchase.purchase_amount!.toFixed(2)}
                {budget && ` / $${budget.amount.toFixed(2)}`}
              </Text>
            </View>
          )}

          {/* Purchase Form */}
          {showPurchaseForm && (
            <View style={styles.purchaseForm}>
              <Text style={styles.formLabel}>Purchase Amount</Text>
              <TextInput
                style={styles.formInput}
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                placeholder={estimateOrBudget ? `${estimateOrBudget.amount} (${estimateOrBudget.label})` : '0.00'}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />

              <Text style={styles.formLabel}>Purchase Date</Text>
              <TextInput
                style={styles.formInput}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelFormButton]}
                  onPress={() => setShowPurchaseForm(false)}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.purchaseButton]}
                  onPress={handleMakePurchase}
                >
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={() => setShowPurchaseForm(true)}
          >
            <Text style={styles.footerButtonText}>
              {isPurchased ? 'Modify Purchase' : 'Make Purchase'}
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addItemForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  saveItemButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveItemText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistItemChecked: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
  },
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  editItemForm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
  },
  priceInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    textAlign: 'right',
  },
  priceInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  deleteAction: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  tallyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  tallyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tallyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  purchaseStatus: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  purchaseStatusLabel: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  purchaseStatusDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  purchaseStatusAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
  },
  purchaseForm: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 80,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelFormButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelFormButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#27ae60',
  },
  purchaseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    padding: 16,
    backgroundColor: '#fff',
  },
  footerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoCarousel: {
    flexDirection: 'row',
    marginTop: 8,
  },
  photoContainer: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
});
