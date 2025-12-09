import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { ExpenseType, ExpensePurchase, ChecklistItem, ExpenseBudget } from '@/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBills } from '@/contexts/BillsContext';
import { pickImage, takePhoto, uploadPurchasePhoto, deletePurchasePhoto } from '@/lib/photoUtils';
import DateInput from '@/components/DateInput';

interface ViewPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  purchase: ExpensePurchase | null;
  expenseType: ExpenseType | null;
  budget: ExpenseBudget | null;
  onUpdate: (id: string, updates: Partial<ExpensePurchase>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function ViewPurchaseModal({
  visible,
  onClose,
  purchase,
  expenseType,
  budget,
  onUpdate,
  onDelete,
}: ViewPurchaseModalProps) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const estimatedAmountInputRef = useRef<TextInput>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [editingEstimatedAmount, setEditingEstimatedAmount] = useState(false);
  const [estimatedAmountText, setEstimatedAmountText] = useState('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [moveToPurchaseModalVisible, setMoveToPurchaseModalVisible] = useState(false);
  const [itemToMove, setItemToMove] = useState<ChecklistItem | null>(null);
  const [newPurchaseName, setNewPurchaseName] = useState('');
  const [showNewPurchaseInput, setShowNewPurchaseInput] = useState(false);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const { expensePurchases, createExpensePurchase, updateExpensePurchase } = useBills();

  useEffect(() => {
    if (visible && purchase) {
      setChecklist(purchase.checklist || []);
      setPhotos(purchase.photos || []);
      const estimatedTotal = purchase.estimated_amount || budget || 0;
      setPurchaseAmount(purchase.purchase_amount?.toString() || estimatedTotal.toString());
      setPurchaseDate(
        purchase.purchase_date ? purchase.purchase_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd')
      );
      setDescriptionText(purchase.description || '');
      setEditingDescription(false);
      setEstimatedAmountText(purchase.estimated_amount?.toString() || '');
      setEditingEstimatedAmount(false);
    }
  }, [visible, purchase, budget]);

  // Auto-update estimated amount based on checklist prices
  useEffect(() => {
    const checklistTotal = checklist.reduce((sum, item) => sum + (item.price || 0), 0);
    if (checklistTotal > 0) {
      setEstimatedAmountText(checklistTotal.toFixed(2));
    }
  }, [checklist]);

  const handleAddChecklistItem = async () => {
    if (!newItemName.trim() || !purchase) return;

    const priceNum = newItemPrice ? parseFloat(newItemPrice) : undefined;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      checked: false,
      price: priceNum,
    };

    const updatedChecklist = [...checklist, newItem];
    setChecklist(updatedChecklist);
    
    // Calculate new estimated amount from checklist
    const newEstimatedAmount = updatedChecklist.reduce((sum, item) => sum + (item.price || 0), 0);
    setEstimatedAmountText(newEstimatedAmount > 0 ? newEstimatedAmount.toString() : '');
    
    await onUpdate(purchase.id, { 
      checklist: updatedChecklist,
      estimated_amount: newEstimatedAmount > 0 ? newEstimatedAmount : undefined,
    });
    
    // Clear inputs but keep adding mode active for next item
    setNewItemName('');
    setNewItemPrice('');
    
    // Focus back on name input for next item
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
  };

  const handleUpdateDescription = async () => {
    if (!purchase) return;

    const trimmedDescription = descriptionText.trim() || undefined;
    await onUpdate(purchase.id, { description: trimmedDescription });
    // Keep the updated value in local state
    setDescriptionText(trimmedDescription || '');
    setEditingDescription(false);
  };

  const handleUpdateEstimatedAmount = async () => {
    if (!purchase) return;

    const amount = estimatedAmountText ? parseFloat(estimatedAmountText) : undefined;
    await onUpdate(purchase.id, { estimated_amount: amount });
  };

  const handleUpdatePurchaseAmount = async (value: string) => {
    if (!purchase) return;

    setPurchaseAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      await onUpdate(purchase.id, { purchase_amount: amount });
    } else if (value === '') {
      await onUpdate(purchase.id, { purchase_amount: undefined });
    }
  };

  const handleUpdatePurchaseDate = async (value: string) => {
    if (!purchase) return;

    setPurchaseDate(value);
    
    // Auto-generate description if date is valid and description is empty
    if (value && !descriptionText && expenseType) {
      try {
        // Parse date components directly to avoid timezone issues
        const [year, month, day] = value.split('-').map(Number);
        if (year && month && day) {
          const formattedDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
          const autoDescription = `${expenseType.name} ${formattedDate}`;
          setDescriptionText(autoDescription);
          await onUpdate(purchase.id, { description: autoDescription });
        }
      } catch (e) {
        // Invalid date, ignore
      }
    }

    // Save the date
    try {
      // Parse date components to avoid timezone issues
      const [year, month, day] = value.split('-').map(Number);
      if (year && month && day) {
        // Create date at noon UTC to avoid timezone shifts
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        await onUpdate(purchase.id, { purchase_date: date.toISOString() });
      }
    } catch (e) {
      // Invalid date, ignore
    }
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
    
    // Recalculate estimated amount from checklist
    const newEstimatedAmount = updatedChecklist.reduce((sum, item) => sum + (item.price || 0), 0);
    setEstimatedAmountText(newEstimatedAmount > 0 ? newEstimatedAmount.toString() : '');
    
    await onUpdate(purchase.id, { 
      checklist: updatedChecklist,
      estimated_amount: newEstimatedAmount > 0 ? newEstimatedAmount : undefined,
    });
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!purchase) return;

    const updatedChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(updatedChecklist);
    
    // Recalculate estimated amount from checklist
    const newEstimatedAmount = updatedChecklist.reduce((sum, item) => sum + (item.price || 0), 0);
    setEstimatedAmountText(newEstimatedAmount > 0 ? newEstimatedAmount.toString() : '');
    
    await onUpdate(purchase.id, { 
      checklist: updatedChecklist,
      estimated_amount: newEstimatedAmount > 0 ? newEstimatedAmount : undefined,
    });
  };

  const handleReorderChecklistItems = async (data: ChecklistItem[]) => {
    if (!purchase) return;

    setChecklist(data);
    await onUpdate(purchase.id, { checklist: data });
  };

  const handleMoveItemToPurchase = async (targetPurchaseId?: string) => {
    if (!purchase || !itemToMove) return;

    let targetId = targetPurchaseId;

    // Create new purchase if requested
    if (!targetId && newPurchaseName.trim()) {
      const { data: newPurchase } = await createExpensePurchase({
        expense_type_id: purchase.expense_type_id,
        description: newPurchaseName.trim(),
      });
      if (!newPurchase) return;
      targetId = newPurchase.id;
    }

    if (!targetId) return;

    // Remove item from current purchase
    const updatedChecklist = checklist.filter(item => item.id !== itemToMove.id);
    const newEstimatedAmount = updatedChecklist.reduce((sum, item) => sum + (item.price || 0), 0);
    
    setChecklist(updatedChecklist);
    await onUpdate(purchase.id, { 
      checklist: updatedChecklist,
      estimated_amount: newEstimatedAmount > 0 ? newEstimatedAmount : undefined,
    });

    // Add item to target purchase
    const targetPurchase = expensePurchases.find(p => p.id === targetId);
    if (targetPurchase) {
      const targetChecklist = [...(targetPurchase.checklist || []), itemToMove];
      const targetEstimatedAmount = targetChecklist.reduce((sum, item) => sum + (item.price || 0), 0);
      
      await updateExpensePurchase(targetId, { 
        checklist: targetChecklist,
        estimated_amount: targetEstimatedAmount > 0 ? targetEstimatedAmount : undefined,
      });

      const targetName = targetPurchase.description || 'Unnamed Purchase';
      Alert.alert('Success', `Item moved to ${targetName}`);
    } else if (newPurchaseName.trim()) {
      Alert.alert('Success', `Item moved to ${newPurchaseName}`);
    }

    // Close modal and reset state
    setMoveToPurchaseModalVisible(false);
    setItemToMove(null);
    setNewPurchaseName('');
    setShowNewPurchaseInput(false);
  };

  const handleStartMoveItem = (item: ChecklistItem) => {
    setItemToMove(item);
    setMoveToPurchaseModalVisible(true);
  };

  const handleMakePurchase = async () => {
    if (!purchase) return;

    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid purchase amount');
      return;
    }

    // Parse date components to avoid timezone issues
    const [year, month, day] = purchaseDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    await onUpdate(purchase.id, {
      purchase_amount: amount,
      purchase_date: date.toISOString(),
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

  const renderMoveAction = (item: ChecklistItem) => {
    return (
      <TouchableOpacity
        style={styles.moveAction}
        onPress={() => handleStartMoveItem(item)}
      >
        <Ionicons name="exit-outline" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderChecklistItem = ({ item, drag, isActive }: RenderItemParams<ChecklistItem>) => {
    return (
      <ScaleDecorator>
        <Swipeable 
          renderLeftActions={() => renderMoveAction(item)}
          renderRightActions={() => renderDeleteAction(item.id)}
        >
          <View style={[styles.checklistItem, item.checked && styles.checklistItemChecked, isActive && styles.draggingItem]}>
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
                  onPress={() => {
                    setEditingItemId(item.id);
                    setEditingItemName(item.name);
                  }}
                  onLongPress={drag}
                  delayLongPress={200}
                >
                  <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>

                {editingItemId !== item.id && (
                  <View style={styles.priceInputContainer}>
                    <Text style={[styles.pricePrefix, item.checked && styles.pricePrefixDisabled]}>$</Text>
                    <TextInput
                      style={[styles.priceInput, item.checked && styles.priceInputDisabled]}
                      value={item.price?.toString() || ''}
                      onChangeText={(value) => handleUpdateItemPrice(item.id, value)}
                      placeholder="0"
                      keyboardType="decimal-pad"
                      editable={!item.checked}
                      placeholderTextColor="#999"
                    />
                  </View>
                )}
              </>
            )}
          </View>
        </Swipeable>
      </ScaleDecorator>
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
        const result = await uploadPurchasePhoto(photoUri.uri, user.id, purchase.id);
        if (result.url) {
          const updatedPhotos = [...photos, result.url];
          setPhotos(updatedPhotos);
          await onUpdate(purchase.id, { photos: updatedPhotos });
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
        const result = await uploadPurchasePhoto(photoUri.uri, user.id, purchase.id);
        if (result.url) {
          const updatedPhotos = [...photos, result.url];
          setPhotos(updatedPhotos);
          await onUpdate(purchase.id, { photos: updatedPhotos });
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
              await onUpdate(purchase.id, { photos: updatedPhotos });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!purchase || !onDelete) return;

    Alert.alert(
      'Delete Purchase',
      'Are you sure you want to delete this purchase?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDelete(purchase.id);
            onClose();
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
              {expenseType?.name || 'Purchase'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

        <ScrollView style={styles.content}>
          {/* Description */}
          <View style={styles.section}>
            {editingDescription ? (
              <View style={styles.descriptionInputContainer}>
                <TextInput
                  style={styles.descriptionInput}
                  value={descriptionText}
                  onChangeText={setDescriptionText}
                  placeholder="Add a description..."
                  placeholderTextColor="#999"
                  multiline
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleUpdateDescription}
                  onBlur={() => {
                    setDescriptionText(purchase?.description || '');
                    setEditingDescription(false);
                  }}
                  blurOnSubmit
                />
                {descriptionText.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearDescriptionButton}
                    onPress={() => setDescriptionText('')}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingDescription(true)}>
                <Text style={[styles.sectionValue, !descriptionText && styles.noDescriptionText]}>
                  {descriptionText || 'No description'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Photo Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <TouchableOpacity onPress={handleAddPhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <Ionicons name="add-circle" size={28} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>
            
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoCarousel}>
                {photos.map((photoUrl, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <TouchableOpacity onPress={() => setFullscreenPhotoUrl(photoUrl)}>
                      <Image source={{ uri: photoUrl }} style={styles.photo} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deletePhotoButton}
                      onPress={() => handleDeletePhoto(photoUrl)}
                    >
                      <Ionicons name="close-circle" size={28} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Checklist Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Checklist</Text>
              <TouchableOpacity onPress={() => {
                if (isAddingItem) {
                  setIsAddingItem(false);
                  setNewItemName('');
                  setNewItemPrice('');
                } else {
                  setIsAddingItem(true);
                }
              }}>
                {isAddingItem ? (
                  <Text style={styles.doneButton}>Done</Text>
                ) : (
                  <Ionicons name="add-circle" size={28} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            {isAddingItem && (
              <View style={styles.addItemForm}>
                <TextInput
                  ref={nameInputRef}
                  style={styles.addItemNameInput}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  placeholder="Item name..."
                  placeholderTextColor="#999"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleAddChecklistItem}
                  blurOnSubmit={false}
                />
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricePrefix}>$</Text>
                  <TextInput
                    style={styles.addItemPriceInput}
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleAddChecklistItem}
                    blurOnSubmit={false}
                  />
                </View>
              </View>
            )}

            <DraggableFlatList
              data={checklist}
              onDragEnd={({ data }) => handleReorderChecklistItems(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderChecklistItem}
              scrollEnabled={false}
            />

            {/* Estimated Total Section */}
            <View style={styles.estimatedTotalContainer}>
              <Text style={styles.estimatedTotalLabel}>Estimated Total</Text>
              <View style={styles.estimatedTotalRight}>
                <View style={styles.estimatedPriceInputContainer}>
                  <Text style={styles.pricePrefix}>$</Text>
                  <TextInput
                    ref={estimatedAmountInputRef}
                    style={styles.estimatedTotalInput}
                    value={tally > 0 ? tally.toFixed(2) : estimatedAmountText}
                    onChangeText={setEstimatedAmountText}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleUpdateEstimatedAmount}
                    onFocus={() => {
                      setTimeout(() => {
                        estimatedAmountInputRef.current?.setNativeProps({
                          selection: { start: 0, end: (tally > 0 ? tally.toFixed(2) : estimatedAmountText).length }
                        });
                      }, 100);
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Purchase Form */}
          {showPurchaseForm && (
            <View style={styles.purchaseForm}>
              <View style={styles.dateAmountRow}>
                <View style={styles.dateField}>
                  <DateInput
                    label="Purchase Date"
                    value={purchaseDate}
                    onChangeDate={setPurchaseDate}
                    placeholder="MM/DD/YYYY"
                  />
                </View>
                <View style={styles.amountField}>
                  <Text style={styles.formLabel}>Purchase Amount</Text>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.amountPrefix}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={purchaseAmount}
                      onChangeText={setPurchaseAmount}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              </View>
              
              {/* Form Buttons */}
              <View style={styles.formButtonsRow}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelFormButton]}
                  onPress={() => setShowPurchaseForm(false)}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.purchaseFormButton]}
                  onPress={handleMakePurchase}
                >
                  <Text style={styles.purchaseFormButtonText}>Purchase</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Footer - Only show when form is not visible */}
        {!showPurchaseForm && (
          <View style={styles.footer}>
            {onDelete && (
              <TouchableOpacity
                style={[styles.footerButton, styles.deleteFooterButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.footerButton, styles.primaryFooterButton]}
              onPress={() => setShowPurchaseForm(true)}
            >
              <Text style={styles.footerButtonText}>
                {isPurchased ? 'Modify Purchase' : 'Make Purchase'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </GestureHandlerRootView>
    <Modal
        visible={moveToPurchaseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setMoveToPurchaseModalVisible(false);
          setItemToMove(null);
          setNewPurchaseName('');
          setShowNewPurchaseInput(false);
        }}
      >
        <View style={styles.moveModalOverlay}>
          <View style={styles.moveModalContent}>
            <View style={styles.moveModalHeader}>
              <Text style={styles.moveModalTitle}>Move to Purchase</Text>
              <TouchableOpacity
                onPress={() => {
                  setMoveToPurchaseModalVisible(false);
                  setItemToMove(null);
                  setNewPurchaseName('');
                  setShowNewPurchaseInput(false);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {itemToMove && (
              <Text style={styles.moveItemPreview}>
                Moving: {itemToMove.name}
                {itemToMove.price ? ` ($${itemToMove.price.toFixed(2)})` : ''}
              </Text>
            )}

            <ScrollView style={styles.purchaseList}>
              {expensePurchases
                .filter(p => 
                  p.id !== purchase?.id && 
                  p.expense_type_id === purchase?.expense_type_id &&
                  !p.purchase_date
                )
                .map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.purchaseListItem}
                    onPress={() => handleMoveItemToPurchase(p.id)}
                  >
                    <Text style={styles.purchaseListItemText}>
                      {p.description || 'Unnamed Purchase'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}

              {showNewPurchaseInput ? (
                <View style={styles.newPurchaseInputContainer}>
                  <TextInput
                    style={styles.newPurchaseInput}
                    placeholder="Enter purchase name"
                    value={newPurchaseName}
                    onChangeText={setNewPurchaseName}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.saveNewPurchaseButton}
                    onPress={() => handleMoveItemToPurchase()}
                  >
                    <Text style={styles.saveNewPurchaseText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.createNewPurchaseButton}
                  onPress={() => setShowNewPurchaseInput(true)}
                >
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                  <Text style={styles.createNewPurchaseText}>Create New Purchase</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Photo Viewer */}
      <Modal
        visible={!!fullscreenPhotoUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenPhotoUrl(null)}
      >
        <View style={styles.fullscreenPhotoContainer}>
          <TouchableOpacity 
            style={styles.fullscreenPhotoOverlay}
            activeOpacity={1}
            onPress={() => setFullscreenPhotoUrl(null)}
          >
            <TouchableOpacity 
              style={styles.closeFullscreenButton}
              onPress={() => setFullscreenPhotoUrl(null)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            {fullscreenPhotoUrl && (
              <Image 
                source={{ uri: fullscreenPhotoUrl }} 
                style={styles.fullscreenPhoto}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
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
  noDescriptionText: {
    fontStyle: 'italic',
    color: '#999',
  },
  descriptionInputContainer: {
    position: 'relative',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    paddingRight: 40,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  clearDescriptionButton: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  dateAmountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateAmountField: {
    flex: 2,
  },
  dateField: {
    flex: 3,
  },
  amountField: {
    flex: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  dateAmountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: '#fff',
  },
  amountPrefix: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
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
  doneButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
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
  addItemNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    width: 80,
  },
  pricePrefix: {
    fontSize: 14,
    color: '#333',
    marginRight: 2,
  },
  pricePrefixDisabled: {
    color: '#999',
  },
  estimatedPricePrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 2,
  },
  addItemPriceInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    textAlign: 'right',
  },
  saveItemButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveItemText: {
    color: 'white',
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
  itemNameWithDragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    marginRight: 8,
  },
  draggingItem: {
    backgroundColor: '#f0f8ff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    flex: 1,
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
  moveAction: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  estimatedTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  estimatedTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    flexShrink: 0,
  },
  estimatedTotalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  estimatedPriceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    minWidth: 100,
  },
  estimatedTotalInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  estimatedBudgetText: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
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
    marginBottom: 16,
  },
  formButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFormButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelFormButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseFormButton: {
    backgroundColor: '#27ae60',
  },
  purchaseFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFooterButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  deleteFooterButton: {
    width: 56,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  cancelFooterButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  cancelFooterButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseFooterButton: {
    flex: 2,
    backgroundColor: '#27ae60',
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
  moveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moveModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  moveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  moveModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  moveItemPreview: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  purchaseList: {
    padding: 20,
  },
  purchaseListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  purchaseListItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  createNewPurchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  createNewPurchaseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  newPurchaseInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  newPurchaseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveNewPurchaseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveNewPurchaseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenPhotoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullscreenPhotoOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
});
