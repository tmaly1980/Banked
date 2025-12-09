import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBills } from '@/contexts/BillsContext';
import GigFormModal from '@/components/modals/GigFormModal';
import WeeklyWorkScheduleModal from '@/components/modals/WeeklyWorkScheduleModal';
import TabScreenHeader from '@/components/TabScreenHeader';
import TodayView from '@/components/gigs/TodayView';
import WeekView from '@/components/gigs/WeekView';
import AllGigsView from '@/components/gigs/AllGigsView';

type GigTab = 'today' | 'week' | 'all';

export default function GigsScreen() {
  const { refreshData } = useBills();
  const [activeTab, setActiveTab] = useState<GigTab>('today');
  const [gigFormVisible, setGigFormVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>(undefined);
  const [defaultEndDate, setDefaultEndDate] = useState<string | undefined>(undefined);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | undefined>(undefined);
  const [currentWeekEnd, setCurrentWeekEnd] = useState<string | undefined>(undefined);

  useEffect(() => {
    refreshData();
  }, []);

  const handleWeekChange = (startDate: string, endDate: string) => {
    setCurrentWeekStart(startDate);
    setCurrentWeekEnd(endDate);
  };

  const handleAddGig = () => {
    // If on week tab, pre-fill with current week dates
    if (activeTab === 'week' && currentWeekStart && currentWeekEnd) {
      setDefaultStartDate(currentWeekStart);
      setDefaultEndDate(currentWeekEnd);
    } else {
      setDefaultStartDate(undefined);
      setDefaultEndDate(undefined);
    }
    setGigFormVisible(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return <TodayView />;
      case 'week':
        return <WeekView onWeekChange={handleWeekChange} />;
      case 'all':
        return <AllGigsView />;
      default:
        return <TodayView />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TabScreenHeader
          title="Gigs"
          rightContent={
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.scheduleButton} 
              onPress={() => setScheduleModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddGig}>
              <Text style={styles.addButtonText}>+ Gig</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'week' && styles.activeTab]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={[styles.tabText, activeTab === 'week' && styles.activeTabText]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Gigs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      <GigFormModal
        visible={gigFormVisible}
        gig={null}
        onClose={() => {
          setGigFormVisible(false);
          setDefaultStartDate(undefined);
          setDefaultEndDate(undefined);
        }}
        defaultStartDate={defaultStartDate}
        defaultEndDate={defaultEndDate}
      />

      <WeeklyWorkScheduleModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleButton: {
    padding: 4,
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
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
});
