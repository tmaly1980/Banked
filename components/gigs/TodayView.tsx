import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import { GigWithDeposits } from '@/types';
import { format, startOfDay, endOfDay, parseISO, getDay } from 'date-fns';
import GigFormModal from '@/components/modals/GigFormModal';
import ViewGigModal from '@/components/modals/ViewGigModal';
import { supabase } from '@/lib/supabase';

export default function TodayView() {
  const { gigs, loading, refreshData, deleteGig, updateGig } = useBills();
  const [gigFormVisible, setGigFormVisible] = useState(false);
  const [viewGigVisible, setViewGigVisible] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithDeposits | null>(null);
  const [viewingGig, setViewingGig] = useState<GigWithDeposits | null>(null);
  const [maxHours, setMaxHours] = useState<number | null>(null);

  // Fetch max_hours for today's weekday
  useEffect(() => {
    const fetchMaxHours = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[TodayView] No user found');
          return;
        }

        const todayWeekday = getDay(new Date()); // 0 = Sunday, 6 = Saturday
        console.log('[TodayView] Today is weekday:', todayWeekday, '(0=Sun, 5=Fri, 6=Sat)');
        
        const { data, error } = await supabase
          .from('weekly_work_schedule')
          .select('max_hours, available')
          .eq('user_id', user.id)
          .eq('weekday', todayWeekday)
          .maybeSingle();

        if (error) {
          console.log('[TodayView] Error fetching schedule:', error.message);
          setMaxHours(null);
          return;
        }

        if (!data) {
          console.log('[TodayView] No schedule entry for weekday', todayWeekday);
          setMaxHours(null);
          return;
        }

        console.log('[TodayView] Schedule data:', data);
        const hours = data.available ? data.max_hours : null;
        console.log('[TodayView] Setting max hours to:', hours);
        setMaxHours(hours);
      } catch (error) {
        console.error('[TodayView] Error fetching max hours:', error);
      }
    };

    fetchMaxHours();
  }, []);

  // Filter gigs active for today
  const activeGigs = useMemo(() => {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    return gigs.filter(gig => {
      const gigDueDate = parseISO(gig.due_date);
      // Gig is active if due date is today
      return gigDueDate >= dayStart && gigDueDate <= dayEnd;
    });
  }, [gigs]);

  const handleEditGig = (gig: GigWithDeposits) => {
    setEditingGig(gig);
    setFormVisible(true);
  };

  const handleViewGig = (gig: GigWithDeposits) => {
    setViewingGig(gig);
    setViewGigVisible(true);
  };

  const handleUpdateGig = async (updates: any) => {
    if (!viewingGig) return;

    const { error } = await updateGig(viewingGig.id, updates);
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const formatHours = (logged?: number, planned?: number) => {
    const loggedStr = logged ? logged.toFixed(1) : '0.0';
    const plannedStr = planned ? planned.toFixed(1) : '0.0';
    return `${loggedStr} / ${plannedStr}`;
  };

  return (
    <View style={styles.container}>
      {/* Date Display */}
      <View style={styles.dateDisplay}>
        <Text style={styles.dateText}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>
        {maxHours !== null && (
          <Text style={styles.maxHoursText}>
            Max Hours: {maxHours}
          </Text>
        )}
      </View>

      {/* Gigs List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {activeGigs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No active gigs</Text>
            <Text style={styles.emptyStateSubtext}>
              No gigs scheduled for this date
            </Text>
          </View>
        ) : (
          <View style={styles.gigsList}>
            {activeGigs.map(gig => (
              <TouchableOpacity
                key={gig.id}
                style={styles.gigCard}
                onPress={() => handleViewGig(gig)}
              >
                <View style={styles.gigCardContent}>
                  <View style={styles.gigInfo}>
                    <Text style={styles.gigName}>{gig.name}</Text>
                    <Text style={styles.gigHours}>
                      {formatHours(gig.hours_logged, gig.est_hours_total)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.timerButton}>
                    <Ionicons name="timer-outline" size={24} color="#3498db" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <GigFormModal
        visible={gigFormVisible}
        gig={editingGig}
        onClose={() => {
          setGigFormVisible(false);
          setEditingGig(null);
        }}
      />

      <ViewGigModal
        visible={viewGigVisible}
        gig={viewingGig}
        onClose={() => {
          setViewGigVisible(false);
          setViewingGig(null);
        }}
        onUpdate={handleUpdateGig}
        onEdit={() => {
          if (viewingGig) {
            setViewGigVisible(false);
            handleEditGig(viewingGig);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  dateDisplay: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  maxHoursText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  gigsList: {
    padding: 16,
  },
  gigCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gigCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gigInfo: {
    flex: 1,
  },
  gigName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  gigHours: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  timerButton: {
    padding: 8,
    marginLeft: 12,
  },
});
