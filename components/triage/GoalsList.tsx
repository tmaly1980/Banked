import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTriage } from '@/contexts/TriageContext';
import { Ionicons } from '@expo/vector-icons';

export default function GoalsList() {
  const { goals, reorderGoals, setCurrentStep } = useTriage();

  // Calendar calculations
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Group goals by date
  const goalsByDate = useMemo(() => {
    const map: { [key: string]: typeof goals } = {};
    goals.forEach(goal => {
      if (goal.dueDate && !goal.isPaid) {
        const date = new Date(goal.dueDate);
        if (date.getMonth() === month && date.getFullYear() === year) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push(goal);
        }
      }
    });
    return map;
  }, [goals, month, year]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    reorderGoals(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index === goals.length - 1) return;
    reorderGoals(index, index + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Thank you for that info. Here are your biggest priorities. Which would you like to work on today?
        </Text>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.calendarTitle}>{monthName}</Text>
          
          <View style={styles.calendar}>
            {/* Day headers */}
            <View style={styles.calendarHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <Text key={i} style={styles.calendarHeaderText}>{day}</Text>
              ))}
            </View>
            
            {/* Calendar days */}
            <View style={styles.calendarGrid}>
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarDay} />
              ))}
              
              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const goalsOnDay = goalsByDate[day] || [];
                const isToday = day === now.getDate();
                
                return (
                  <View key={day} style={[styles.calendarDay, isToday && styles.today]}>
                    <Text style={[styles.dayNumber, isToday && styles.todayText]}>{day}</Text>
                    {goalsOnDay.length > 0 && (
                      <View style={styles.goalIndicators}>
                        {goalsOnDay.slice(0, 3).map((goal, idx) => (
                          <TouchableOpacity
                            key={goal.id}
                            style={styles.goalDot}
                            onPress={() => setCurrentStep(`goal-${goal.id}`)}
                          >
                            <View style={[
                              styles.dot,
                              goal.deadlineType === 'catastrophic' && styles.dotCatastrophic,
                              goal.deadlineType === 'preferred' && styles.dotPreferred,
                              goal.deadlineType === 'flexible' && styles.dotFlexible,
                            ]} />
                          </TouchableOpacity>
                        ))}
                        {goalsOnDay.length > 3 && (
                          <Text style={styles.moreGoals}>+{goalsOnDay.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotCatastrophic]} />
              <Text style={styles.legendText}>Critical</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotPreferred]} />
              <Text style={styles.legendText}>Preferred</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dotFlexible]} />
              <Text style={styles.legendText}>Flexible</Text>
            </View>
          </View>
        </View>

        <View style={styles.goalsList}>
          {goals.map((goal, index) => (
            <View key={goal.id} style={styles.goalItem}>
              <View style={styles.goalHeader}>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalNumber}>{index + 1}</Text>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                </View>
                
                <View style={styles.goalActions}>
                  {goal.isPaid ? (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#27ae60" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.prioritizeButton}
                      onPress={() => setCurrentStep(`goal-${goal.id}`)}
                    >
                      <Text style={styles.prioritizeButtonText}>Prioritize</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.moveButtons}>
                <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? '#bdc3c7' : '#3498db'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveDown(index)}
                  disabled={index === goals.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={index === goals.length - 1 ? '#bdc3c7' : '#3498db'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.helpText}>
          Feel free to move the biggest priorities to the top of the list
        </Text>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 24,
    lineHeight: 30,
  },
  calendarSection: {
    marginBottom: 24,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendar: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 8,
  },
  today: {
    backgroundColor: '#e3f2fd',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  todayText: {
    color: '#3498db',
  },
  goalIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  goalDot: {
    padding: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#95a5a6',
  },
  dotCatastrophic: {
    backgroundColor: '#e74c3c',
  },
  dotPreferred: {
    backgroundColor: '#f39c12',
  },
  dotFlexible: {
    backgroundColor: '#3498db',
  },
  moreGoals: {
    fontSize: 8,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  goalsList: {
    marginBottom: 16,
  },
  goalItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3498db',
    marginRight: 12,
    minWidth: 24,
  },
  goalTitle: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    fontWeight: '500',
  },
  goalActions: {
    marginLeft: 12,
  },
  prioritizeButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  prioritizeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  paidBadge: {
    paddingHorizontal: 8,
  },
  moveButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  helpText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
