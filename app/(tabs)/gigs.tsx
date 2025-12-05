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
import { groupGigsByWeek, formatWeekLabel, formatAmount } from '@/lib/utils';
import GigFormModal from '@/components/modals/GigFormModal';
import LinkPaychecksModal from '@/components/modals/LinkPaychecksModal';
import ViewGigModal from '@/components/modals/ViewGigModal';
import TabScreenHeader from '@/components/TabScreenHeader';
import WeeklyCard from '@/components/WeeklyCard';

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

  const handleUpdateGig = async (updates: any) => {
    if (!viewingGig) return;

    const { error } = await updateGig(viewingGig.id, updates);
    if (error) {
      Alert.alert('Error', error.message);
    }
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
      <TabScreenHeader
        title="Gigs"
        rightContent={
          <TouchableOpacity style={styles.addButton} onPress={handleAddGig}>
            <Text style={styles.addButtonText}>+ Gig</Text>
          </TouchableOpacity>
        }
      />

      {/* Weekly Groups */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {weeklyGroups.filter(group => group.gigs.length > 0).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No gigs yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + button to add your first gig
            </Text>
          </View>
        ) : (
          weeklyGroups
            .filter(group => group.gigs.length > 0)
            .map((group, index) => {
          const headerRight = (
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
          );

          return (
            <WeeklyCard
              key={index}
              title={formatWeekLabel(group.startDate, group.endDate)}
              headerRight={headerRight}
            >
              <View style={styles.gigsList}>
                  {group.gigs.map(gig => (
                    <TouchableOpacity
                      key={gig.id}
                      style={styles.gigItem}
                      onPress={() => handleViewGig(gig)}
                    >
                      <View style={styles.gigRow}>
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
                          size={20}
                          color="#7f8c8d"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
            </WeeklyCard>
          );
        }))}
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
    backgroundColor: '#ecf0f1',
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 16,
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
  weekTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  weekTotalHours: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  gigsList: {
    paddingHorizontal: 16,
  },
  gigItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  gigRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
