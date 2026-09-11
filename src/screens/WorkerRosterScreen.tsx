import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { AppHeader } from '../components/ui/AppHeader';
import { WorkerListItem } from '../components/WorkerListItem';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getWorkers, createWorker, getReadingsByWorker } from '../services/db';
import { Worker, Reading } from '../types';
import { RosterStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RosterStackParamList, 'RosterMain'>;

interface WorkerWithReading { worker: Worker; latestReading?: Reading }

export const WorkerRosterScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [workers, setWorkers] = useState<WorkerWithReading[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    const ws = await getWorkers();
    const withReadings = await Promise.all(
      ws.map(async w => {
        const readings = await getReadingsByWorker(w.id);
        const latestReading = readings[0];
        return { worker: w, latestReading };
      })
    );
    setWorkers(withReadings);
    setLoading(false);
  }, []);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const filtered = workers.filter(w =>
    w.worker.name.toLowerCase().includes(search.toLowerCase()) ||
    w.worker.worker_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#f5f8ff', '#e8f1fb', '#c8daf4']} style={StyleSheet.absoluteFill} />
      <AppHeader />

      <View style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Worker Roster</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            placeholderTextColor={theme.colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <Text style={styles.countLabel}>{filtered.length} workers</Text>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.worker.id}
            renderItem={({ item }) => (
              <WorkerListItem
                worker={item.worker}
                latestReading={item.latestReading}
                onPress={() =>
                  navigation.navigate('WorkerHistory', {
                    workerId: item.worker.id,
                    workerName: item.worker.name,
                  })
                }
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <AddWorkerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); loadWorkers(); }}
      />
    </SafeAreaView>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="people-outline" size={64} color={theme.colors.text.light} />
    <Text style={styles.emptyTitle}>No workers yet</Text>
    <Text style={styles.emptyBody}>Add workers to start tracking their H₂S exposure.</Text>
    <Button label="Add First Worker" onPress={onAdd} style={styles.emptyBtn} />
  </View>
);

// ─── Add Worker Modal ─────────────────────────────────────────────────────────

interface AddWorkerModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AddWorkerModal: React.FC<AddWorkerModalProps> = ({ visible, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [site, setSite] = useState('Site A');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!code.trim()) e.code = 'Worker ID is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await createWorker({ name: name.trim(), worker_code: code.trim().toUpperCase(), site_id: site });
      setName(''); setCode(''); setSite('Site A'); setErrors({});
      onSaved();
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE')) {
        setErrors({ code: 'This Worker ID already exists' });
      } else {
        Alert.alert('Error', 'Could not save worker. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKAV}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Worker</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formFields}>
              <Input
                label="Full Name"
                placeholder="e.g. Rajesh Kumar"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
              />
              <Input
                label="Worker ID"
                placeholder="e.g. W001"
                value={code}
                onChangeText={setCode}
                error={errors.code}
                autoCapitalize="characters"
              />
              <Input
                label="Site"
                placeholder="e.g. Site A"
                value={site}
                onChangeText={setSite}
              />
            </View>

            <Button
              label={saving ? 'Saving...' : 'Save Worker'}
              onPress={handleSave}
              disabled={saving}
              style={styles.saveBtn}
            />
          </Card>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingTop: theme.spacing.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.xxxl,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.btn,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  addBtnText: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.sm,
    color: '#fff',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.dropdown,
    marginHorizontal: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  searchIcon: { marginRight: theme.spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.md,
    color: theme.colors.text.primary,
  },
  countLabel: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.xs,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  list: { paddingHorizontal: theme.spacing.xl, paddingBottom: 100 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  emptyBody: {
    fontFamily: theme.typography.family.main,
    fontSize: theme.typography.size.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  emptyBtn: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.xl },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalKAV: { width: '100%' },
  modalCard: {
    margin: theme.spacing.md,
    borderRadius: theme.radii.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontFamily: theme.typography.family.semiBold,
    fontSize: theme.typography.size.lg,
    color: theme.colors.text.primary,
  },
  formFields: { gap: theme.spacing.lg, marginBottom: theme.spacing.xl },
  saveBtn: { width: '100%' },
});
