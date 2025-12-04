import React, { useState, useEffect, useMemo } from 'react';
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
import { WeeklyGigGroup, GigWithPaychecks, Paycheck } from '@/types';
import { format, parseISO } from 'date-fns';
import { groupGigsByWeek, formatWeekLabel } from '@/lib/utils';
import GigFormModal from '@/components/modals/GigFormModal';
import LinkPaychecksModal from '@/components/modals/LinkPaychecksModal';
import ViewGigModal from '@/components/modals/ViewGigModal';

export default function GigsScreen() {
  const { gigs, paychecks, loading, refreshData, deleteGig, updateGig } = useBills();
  const [gigFormVisible, setGigFormVisible] = useState(false);
  const [linkPaychecksVisible, setLinkPaychecksVisible] = useState(false);
  const [viewGigVisible, setViewGigVisible] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPaychecks | null>(null);
  const [selectedGig, setSelectedGig] = useState<GigWithPaychecks | null>(null);
  const [viewingGig, setViewingGig] = useState<GigWithPaychecks | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  // Group gigs by week using shared utility
  const weeklyGroups = useMemo(() => {
    return groupGigsByWeek(gigs);
  }, [gigs]);

  const handleAddGig = () => {
    setEditingGig(null);
    setGigFormVisible(true);
  };

  const handleEditGig = (gig: GigWithPaychecks) => {
    setEditingGig(gig);
    setGigFormVisible(true);
  };

  const handleDeleteGig = (gig: GigWithPaychecks) => {
    Alert.alert(
      'Delete Gig',
      `Are you sure you want to delete "${gig.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGig(gig.id);
            if (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleLinkPaychecks = (gig: GigWithPaychecks) => {
    setSelectedGig(gig);
    setLinkPaychecksVisible(true);
  };

  const handleViewGig = (gig: GigWithPaychecks) => {
    setViewingGig(gig);
    setViewGigVisible(true);
  };

  const handleUpdateGig = async (updates: Partial<GigWithPaychecks>) => {
    if (!viewingGig) return;

    const { error } = await updateGig(viewingGig.id, updates);
    if (error) {
      Alert.alert('Error', error.message);
    }
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

  // Get unlinked paychecks (not associated with any gig)
  const getUnlinkedPaychecks = (): Paycheck[] => {
    const linkedPaycheckIds = new Set(
      gigs.flatMap(gig => gig.paychecks.map(pc => pc.id))
    );
    return paychecks.filter(pc => !linkedPaycheckIds.has(pc.id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gigs</Text>
        <TouchableOpacity onPress={handleAddGig} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Weekly Groups */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {weeklyGroups.map((group, index) => (
          <View key={index} style={styles.weekGroup}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekLabel}>
                {formatWeekLabel(group.startDate, group.endDate)}
              </Text>
              <View style={styles.weekTotals}>
                <Text style={styles.weekTotalAmount}>
                  {formatAmount(group.totalAmount)}
                </Text>
                {group.totalHours > 0 && (
                  <Text style={styles.weekTotalHours}>
                    {formatHours(group.totalHours)}
                  </Text>
                )}
              </View>
            </View>

            {group.gigs.length === 0 ? (
              <View style={styles.emptyWeek}>
                <Text style={styles.emptyWeekText}>No gigs this week</Text>
              </View>
            ) : (
              group.gigs.map(gig => (
                <TouchableOpacity
                  key={gig.id}
                  style={styles.gigCard}
                  onPress={() => handleViewGig(gig)}
                >
                  <View style={styles.gigHeader}>
                    <View style={styles.gigMainInfo}>
                      <Text style={styles.gigName}>{gig.name}</Text>
                      <Text style={styles.gigDateRange}>
                        {formatDateRange(gig.start_date, gig.end_date)}
                      </Text>
                    </View>
                    <View style={styles.gigAmountInfo}>
                      <Text style={styles.gigAmount}>
                        {formatAmount(gig.total_amount)}
                      </Text>
                      {gig.total_hours && (
                        <Text style={styles.gigHours}>
                          {formatHours(gig.total_hours)}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color="#7f8c8d"
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}
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

      <LinkPaychecksModal
        visible={linkPaychecksVisible}
        gig={selectedGig}
        availablePaychecks={getUnlinkedPaychecks()}
        onClose={() => {
          setLinkPaychecksVisible(false);
          setSelectedGig(null);
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  weekGroup: {
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#34495e',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  weekTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  weekTotalHours: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  emptyWeek: {
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  emptyWeekText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  gigCard: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  gigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  gigMainInfo: {
    flex: 1,
  },
  gigName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  gigDateRange: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  gigAmountInfo: {
    alignItems: 'flex-end',
  },
  gigAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  gigHours: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
});
