import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Paycheck } from '@/types';
import WeeklyPaycheckGroup from '@/components/Paychecks/WeeklyPaycheckGroup';

interface PaycheckWeekModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date | null;
  endDate: Date | null;
  paychecks: Paycheck[];
  total: number;
  onViewPaycheck: (paycheck: Paycheck) => void;
  onEditPaycheck: (paycheck: Paycheck) => void;
  onDeletePaycheck: (paycheck: Paycheck) => void;
}

export default function PaycheckWeekModal({
  visible,
  onClose,
  startDate,
  endDate,
  paychecks,
  total,
  onViewPaycheck,
  onEditPaycheck,
  onDeletePaycheck,
}: PaycheckWeekModalProps) {
  if (!startDate || !endDate) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Paychecks for Week</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            <WeeklyPaycheckGroup
              startDate={startDate}
              endDate={endDate}
              paychecks={paychecks}
              total={total}
              onViewPaycheck={onViewPaycheck}
              onEditPaycheck={onEditPaycheck}
              onDeletePaycheck={onDeletePaycheck}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
});
