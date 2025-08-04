import { PropsWithChildren, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function Collapsible({ children, title, onPress }: PropsWithChildren & { 
  title: string; 
  onPress?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setIsOpen((value) => !value);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={handlePress}
        activeOpacity={0.8}>
        <Text style={styles.chevron}>
          {isOpen ? '▼' : '▶'}
        </Text>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
      {isOpen && !onPress && (
        <View style={styles.content}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  chevron: {
    fontSize: 14,
    color: '#4a6cf7',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});