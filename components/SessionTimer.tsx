import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SessionTimerProps {
  incomeSourceId: string;
  incomeSourceName: string;
}

export default function SessionTimer({ incomeSourceId, incomeSourceName }: SessionTimerProps) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [totalSessionTime, setTotalSessionTime] = useState('00:00');

  useEffect(() => {
    loadActiveSession();
    loadTotalSessionTime();
  }, [incomeSourceId]);

  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(activeSession.start_datetime);
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      setElapsedMinutes(diffMins);
    }, 1000); // Update every second for accuracy

    return () => clearInterval(interval);
  }, [activeSession]);

  const loadActiveSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('income_source_earning_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('income_source_id', incomeSourceId)
        .is('end_datetime', null)
        .order('start_datetime', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading active session:', error);
      }

      setActiveSession(data);
    } catch (err) {
      console.error('Error loading active session:', err);
    }
  };

  const loadTotalSessionTime = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('income_source_earning_sessions')
        .select('start_datetime, end_datetime')
        .eq('user_id', user.id)
        .eq('income_source_id', incomeSourceId)
        .gte('start_datetime', `${today}T00:00:00`)
        .not('end_datetime', 'is', null);

      if (error) {
        console.error('Error loading session time:', error);
        return;
      }

      let totalMinutes = 0;
      data?.forEach(session => {
        const start = new Date(session.start_datetime);
        const end = new Date(session.end_datetime!);
        const diffMs = end.getTime() - start.getTime();
        totalMinutes += Math.floor(diffMs / 60000);
      });

      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      setTotalSessionTime(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    } catch (err) {
      console.error('Error loading total session time:', err);
    }
  };

  const handleStartSession = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('income_source_earning_sessions')
        .insert({
          user_id: user.id,
          income_source_id: incomeSourceId,
          start_datetime: new Date().toISOString(),
        });

      if (error) throw error;
      await loadActiveSession();
    } catch (err) {
      console.error('Error starting session:', err);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession || !user) return;

    try {
      const { error } = await supabase
        .from('income_source_earning_sessions')
        .update({ end_datetime: new Date().toISOString() })
        .eq('id', activeSession.id);

      if (error) throw error;
      setActiveSession(null);
      setElapsedMinutes(0);
      await loadTotalSessionTime();
    } catch (err) {
      console.error('Error stopping session:', err);
    }
  };

  const formatElapsed = () => {
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>
          {activeSession ? formatElapsed() : totalSessionTime}
        </Text>
        <TouchableOpacity
          onPress={activeSession ? handleStopSession : handleStartSession}
          style={styles.playButton}
        >
          <Ionicons
            name={activeSession ? 'stop' : 'play'}
            size={16}
            color={activeSession ? '#e74c3c' : '#27ae60'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34495e',
    fontFamily: 'monospace',
  },
  playButton: {
    padding: 4,
  },
});
