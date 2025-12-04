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

export default function GigsScreen() {
  const { gigs, paychecks, loading, refreshData, deleteGig } = useBills();
  const [gigFormVisible, setGigFormVisible] = useState(false);
  const [linkPaychecksVisible, setLinkPaychecksVisible] = useState(false);
  const [editingGig, setEditingGig] = useState<GigWithPaychecks | null>(null);
  const [selectedGig, setSelectedGig] = useState<GigWithPaychecks | null>(null);
  const [expandedGigs, setExpandedGigs] = useState<Set<string>>(new Set());

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

  const toggleGigDetails = (gigId: string) => {
    const newExpanded = new Set(expandedGigs);
    if (newExpanded.has(gigId)) {
      newExpanded.delete(gigId);
    } else {
      newExpanded.add(gigId);
    }
    setExpandedGigs(newExpanded);
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
              group.gigs.map(gig => {
                const isExpanded = expandedGigs.has(gig.id);
                return (
                  <View key={gig.id} style={styles.gigCard}>
                    <TouchableOpacity
                      onPress={() => toggleGigDetails(gig.id)}
                      style={styles.gigHeader}
                    >
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
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color="#7f8c8d"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.gigDetails}>
                        {gig.description && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>Description:</Text>
                            <Text style={styles.detailText}>{gig.description}</Text>
                          </View>
                        )}

                        {/* Linked Paychecks */}
                        <View style={styles.detailSection}>
                          <Text style={styles.detailLabel}>
                            Linked Paychecks ({gig.paychecks.length}):
                          </Text>
                          {gig.paychecks.length === 0 ? (
                            <Text style={styles.noPaychecksText}>
                              No paychecks linked
                            </Text>
                          ) : (
                            gig.paychecks.map(pc => (
                              <View key={pc.id} style={styles.paycheckItem}>
                                <Text style={styles.paycheckDate}>
                                  {pc.date ? format(parseISO(pc.date), 'MMM d, yyyy') : 'No date'}
                                </Text>
                                <Text style={styles.paycheckAmount}>
                                  {formatAmount(pc.amount)}
                                </Text>
                              </View>
                            ))
                          )}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            onPress={() => handleLinkPaychecks(gig)}
                            style={styles.linkButton}
                          >
                            <Ionicons name="link" size={20} color="#3498db" />
                            <Text style={styles.linkButtonText}>
                              Link Paychecks
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleEditGig(gig)}
                            style={styles.editButton}
                          >
                            <Ionicons name="pencil" size={20} color="#f39c12" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteGig(gig)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash" size={20} color="#e74c3c" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
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
    padding: 12,
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
  gigDetails: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: '#f8f9fa',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  noPaychecksText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  paycheckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    marginBottom: 6,
  },
  paycheckDate: {
    fontSize: 14,
    color: '#2c3e50',
  },
  paycheckAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  editButton: {
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
});
