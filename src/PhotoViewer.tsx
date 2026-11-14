import { useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { USER_AGENT } from './config';

export type Shot = { uri: string; caption?: string };
type Props = { shots: Shot[]; start: number; visible: boolean; onClose: () => void };

const { width, height } = Dimensions.get('window');
const HEADERS = { 'User-Agent': USER_AGENT };

// Full-screen viewer: swipe between photos, tap Close to leave. The image is shown whole (no cropping).
export default function PhotoViewer({ shots, start, visible, onClose }: Props) {
  const [index, setIndex] = useState(start);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.root}>
        <FlatList
          data={shots}
          keyExtractor={(s, i) => `${i}-${s.uri}`}
          horizontal
          pagingEnabled
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: item.uri, headers: HEADERS }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
            </View>
          )}
        />

        <View style={styles.top}>
          <Text style={styles.counter}>{shots.length > 1 ? `${index + 1} / ${shots.length}` : ''}</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close photo">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {!!shots[index]?.caption && (
          <View style={styles.bottom}>
            <Text style={styles.caption}>{shots[index].caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute', top: 48, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  counter: { color: '#FFFFFF', fontSize: 14 },
  close: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
  closeText: { color: '#FFFFFF', fontWeight: '600' },
  bottom: { position: 'absolute', bottom: 36, left: 20, right: 20 },
  caption: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
