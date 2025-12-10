import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
  title: string;
  children: ReactNode;
  saveDisabled?: boolean;
  saveText?: string;
  cancelText?: string;
}

export default function BottomSheetModal({ 
  visible, 
  onClose, 
  onSave,
  title, 
  children,
  saveDisabled = false,
  saveText = 'Save',
  cancelText = 'Cancel',
}: BottomSheetModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          style={styles.modalSheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>{cancelText}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            {onSave ? (
              <TouchableOpacity onPress={onSave} disabled={saveDisabled}>
                <Text style={[styles.saveButton, saveDisabled && styles.disabledButton]}>
                  {saveText}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cancelButton: {
    fontSize: 16,
    color: '#e74c3c',
    minWidth: 60,
  },
  saveButton: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerSpacer: {
    width: 60,
  },
});
