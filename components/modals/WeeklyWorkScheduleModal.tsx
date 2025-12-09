import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { InlineAlert } from '@/components/InlineAlert';
import { useInlineAlert } from '@/hooks/useInlineAlert';

interface WeeklyScheduleEntry {
  id?: string;
  weekday: number;
  available: boolean;
  max_hours: number | null;
}

interface WeeklyWorkScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function WeeklyWorkScheduleModal({
  visible,
  onClose,
}: WeeklyWorkScheduleModalProps) {
  const { alert, showError, showSuccess, hideAlert } = useInlineAlert();
  const [schedule, setSchedule] = useState<WeeklyScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSchedule();
    }
  }, [visible]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('weekly_work_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('weekday');

      if (error) throw error;

      // Initialize with defaults for all weekdays
      const initialSchedule: WeeklyScheduleEntry[] = WEEKDAYS.map((_, index) => {
        const existing = data?.find(d => d.weekday === index);
        return {
          id: existing?.id,
          weekday: index,
          available: existing?.available ?? true,
          max_hours: existing?.max_hours ?? null,
        };
      });

      setSchedule(initialSchedule);
    } catch (error) {
      console.error('[WeeklyWorkScheduleModal] Error loading schedule:', error);
      showError(error instanceof Error ? error.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailable = (weekday: number) => {
    setSchedule(prev =>
      prev.map(entry =>
        entry.weekday === weekday
          ? { 
              ...entry, 
              available: !entry.available,
              max_hours: !entry.available ? 8 : 0
            }
          : entry
      )
    );
    hideAlert();
  };

  const handleMaxHoursChange = (weekday: number, value: string) => {
    const hours = value === '' ? null : parseFloat(value);
    setSchedule(prev =>
      prev.map(entry =>
        entry.weekday === weekday
          ? { ...entry, max_hours: hours }
          : entry
      )
    );
    hideAlert();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Validate max hours
      for (const entry of schedule) {
        if (entry.available && entry.max_hours !== null) {
          if (isNaN(entry.max_hours) || entry.max_hours < 0 || entry.max_hours > 24) {
            showError(`Invalid max hours for ${WEEKDAYS[entry.weekday]}`);
            setSaving(false);
            return;
          }
        }
      }

      // Upsert all entries
      const upsertData = schedule.map(entry => ({
        user_id: user.id,
        weekday: entry.weekday,
        available: entry.available,
        max_hours: entry.available ? entry.max_hours : null,
      }));

      const { error } = await supabase
        .from('weekly_work_schedule')
        .upsert(upsertData, {
          onConflict: 'user_id,weekday',
        });

      if (error) throw error;

      showSuccess('Weekly schedule saved successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[WeeklyWorkScheduleModal] Error saving schedule:', error);
      showError(error instanceof Error ? error.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Weekly Work Schedule</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
            <Text style={[styles.saveButton, (saving || loading) && styles.disabledButton]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alert */}
        <InlineAlert
          type={alert.type}
          message={alert.message}
          visible={alert.visible}
          onDismiss={hideAlert}
        />

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              {/* Header Row */}
              <View style={styles.headerRow}>
                <Text style={styles.headerCell}>Day</Text>
                <Text style={styles.headerCellCenter}>Max Hours</Text>
                <Text style={styles.headerCellRight}>Availability</Text>
              </View>
              
              {schedule.map(entry => (
                <View key={entry.weekday} style={styles.dayRow}>
                  <Text style={styles.dayName}>{WEEKDAYS[entry.weekday]}</Text>
                    <View style={styles.hoursContainer}>
                        {entry.available && (
                        <TextInput
                            style={styles.maxHoursInput}
                            value={entry.max_hours?.toString() || ''}
                            onChangeText={(value) => handleMaxHoursChange(entry.weekday, value)}
                            placeholder="0"
                            placeholderTextColor="#95a5a6"
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                        />
                        )}
                    </View>
                  <View style={styles.switchContainer}>
                    <Switch
                      value={entry.available}
                      onValueChange={() => handleToggleAvailable(entry.weekday)}
                      trackColor={{ false: '#ddd', true: '#3498db' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
    color: '#2c3e50',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  hoursContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    width: 100,
  },
  headerCellCenter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    flex: 1,
    textAlign: 'center',
  },
  headerCellRight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    width: 80,
    textAlign: 'center',
  },
  dayRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    width: 100,
  },
  switchContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  maxHoursInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: 'white',
    width: 80,
    textAlign: 'center',
  },
});
