import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { THEMES } from './theme';
import { MAP_STYLES } from './theme/mapStyles';
import { useTheme } from './theme/ThemeProvider';

type Props = { visible: boolean; onClose: () => void };

// Appearance: app style and map style are chosen separately. "Auto" = by region (app) / follows the app style (map).
export default function SettingsModal({ visible, onClose }: Props) {
  const { theme, settings, setSettings } = useTheme();
  const c = theme.colors;
  const appOptions = [['auto', 'Auto (by region)'], ...Object.values(THEMES).map((t) => [t.id, t.label])];
  const mapOptions = [['auto', 'Auto (follows app style)'], ...Object.values(MAP_STYLES).map((m) => [m.id, m.label])];

  const Group = ({ title, options, value, onPick }: { title: string; options: string[][]; value: string; onPick: (v: string) => void }) => (
    <View style={{ marginTop: 16 }}>
      <Text style={[styles.group, { color: c.muted, fontFamily: theme.fonts.body }]}>{title}</Text>
      {options.map(([id, label]) => (
        <Pressable key={id} onPress={() => onPick(id)} style={styles.row}>
          <View style={[styles.radio, { borderColor: c.accent }, value === id && { backgroundColor: c.accent }]} />
          <Text style={{ color: c.ink, fontSize: 16, fontFamily: theme.fonts.body }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.card, { backgroundColor: c.background, borderTopLeftRadius: theme.shape.sheetRadius, borderTopRightRadius: theme.shape.sheetRadius }]}>
        <Text style={{ color: c.ink, fontSize: 20, fontWeight: '600', fontFamily: theme.fonts.heading }}>Appearance</Text>
        <Group title="App style" options={appOptions} value={settings.app} onPick={(v) => setSettings({ ...settings, app: v as any })} />
        <Group title="Map style" options={mapOptions} value={settings.map} onPick={(v) => setSettings({ ...settings, map: v as any })} />
        <Pressable onPress={onClose} style={[styles.done, { backgroundColor: c.chipOn, borderRadius: theme.shape.buttonRadius }]}>
          <Text style={{ color: c.chipOnText, fontWeight: '600' }}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { padding: 20, paddingBottom: 32 },
  group: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  done: { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
});
