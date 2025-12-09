import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, addDays, startOfDay, endOfDay, parseISO, getDay } from 'date-fns';
import ViewGigModal from '@/components/modals/ViewGigModal';
import { supabase } from '@/lib/supabase';

interface WeekViewProps {
  onAddGigWithDates?: (startDate: string, endDate: string) => void;
  onWeekChange?: (startDate: string, endDate: string) => void;
}

export default function WeekView({ onAddGigWithDates, onWeekChange }: WeekViewProps = {}) {
  const { gigs, loading, refreshData, updateGig } = useBills();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewGigVisible, setViewGigVisible] = useState(false);
  const [viewingGig, setViewingGig] = useState<GigWithDeposits | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const todayCardRef = useRef<View>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<{ [weekday: number]: { available: boolean; max_hours: number | null } }>({});

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
  const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 0 });

  // Fetch weekly schedule
  useEffect(() => {
    const fetchWeeklySchedule = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[WeekView] No user found');
          return;
        }

        const { data, error } = await supabase
          .from('weekly_work_schedule')
          .select('weekday, available, max_hours')
          .eq('user_id', user.id);

        if (error) {
          console.error('[WeekView] Error fetching schedule:', error);
          return;
        }

        console.log('[WeekView] Fetched schedule data:', data);

        const scheduleMap: { [weekday: number]: { available: boolean; max_hours: number | null } } = {};
        data?.forEach(entry => {
          scheduleMap[entry.weekday] = {
            available: entry.available,
            max_hours: entry.max_hours
          };
        });
        console.log('[WeekView] Schedule map:', scheduleMap);
        setWeeklySchedule(scheduleMap);
      } catch (error) {
        console.error('[WeekView] Error fetching weekly schedule:', error);
      }
    };

    fetchWeeklySchedule();
  }, []);

  // Notify parent of week change
  useEffect(() => {
    if (onWeekChange) {
      onWeekChange(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
    }
  }, [weekStart, weekEnd, onWeekChange]);

  // Scroll to today's card when the current week is loaded
  useEffect(() => {
    if (isCurrentWeek && todayCardRef.current && scrollViewRef.current) {
      setTimeout(() => {
        todayCardRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  }, [isCurrentWeek, selectedDate]);

  // Generate array of 7 days for the week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Group gigs by day
  const gigsByDay = useMemo(() => {
    const grouped: { [key: string]: GigWithDeposits[] } = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      grouped[dayKey] = gigs.filter(gig => {
        const gigDueDate = parseISO(gig.due_date);
        // Gig is active if due date falls on this day
        return gigDueDate >= dayStart && gigDueDate <= dayEnd;
      });
    });
    
    return grouped;
  }, [gigs, weekDays]);

  const handlePreviousWeek = () => {
    setSelectedDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => addWeeks(prev, 1));
  };

  const handleThisWeek = () => {
    setSelectedDate(new Date());
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
      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={handlePreviousWeek}
        >
          <Ionicons name="chevron-back" size={24} color="#2c3e50" />
        </TouchableOpacity>

        <View style={styles.weekDisplay}>
          <Text style={styles.weekText}>
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </Text>
          {!isCurrentWeek && (
            <TouchableOpacity 
              style={styles.thisWeekButton} 
              onPress={handleThisWeek}
            >
              <Ionicons name="calendar-outline" size={20} color="#3498db" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.navButton} 
          onPress={handleNextWeek}
        >
          <Ionicons name="chevron-forward" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        <View style={styles.daysContainer}>
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayGigs = gigsByDay[dayKey] || [];
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <View 
                key={dayKey} 
                style={styles.dayCard}
                ref={isToday ? todayCardRef : null}
              >
                <View style={[styles.dayCardHeader, isToday && styles.todayCardHeader]}>
                  <View style={styles.dayHeaderContent}>
                    <Text style={[styles.dayCardHeaderText, isToday && styles.todayCardHeaderText]}>
                      {format(day, 'EEEE, MMMM d')}
                    </Text>
                    {weeklySchedule[getDay(day)]?.available && weeklySchedule[getDay(day)]?.max_hours !== null && (
                      <Text style={[styles.maxHoursText, isToday && styles.todayMaxHoursText]}>
                        {weeklySchedule[getDay(day)].max_hours}h
                      </Text>
                    )}
                  </View>
                </View>
                
                {dayGigs.length === 0 ? (
                  <View style={styles.noGigsInCard}>
                    <Text style={styles.noGigsInCardText}>No gigs</Text>
                  </View>
                ) : (
                  <View style={styles.gigsInCard}>
                    {dayGigs.map(gig => (
                      <TouchableOpacity
                        key={gig.id}
                        style={styles.gigItem}
                        onPress={() => handleViewGig(gig)}
                      >
                        <Text style={styles.gigItemName}>{gig.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modals */}
      <ViewGigModal
        visible={viewGigVisible}
        gig={viewingGig}
        onClose={() => {
          setViewGigVisible(false);
          setViewingGig(null);
        }}
        onUpdate={handleUpdateGig}
        onEdit={() => {
          // You can add edit functionality here if needed
          setViewGigVisible(false);
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
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    padding: 8,
  },
  weekDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  thisWeekButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  daysContainer: {
    padding: 16,
    gap: 12,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayCardHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  todayCardHeader: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  dayHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCardHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  todayCardHeaderText: {
    color: '#1976d2',
  },
  maxHoursText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  todayMaxHoursText: {
    color: '#3498db',
  },
  noGigsInCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noGigsInCardText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  gigsInCard: {
    paddingVertical: 8,
  },
  gigItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  gigItemName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
});
