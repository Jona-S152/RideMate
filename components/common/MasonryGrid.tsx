import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';

interface MasonryGridProps {
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  keyExtractor: (item: any, index: number) => string;
  numColumns?: number;
  contentContainerStyle?: ViewStyle;
}

export default function MasonryGrid({
  data,
  renderItem,
  keyExtractor,
  numColumns = 2,
  contentContainerStyle
}: MasonryGridProps) {
  // Create an array of columns
  const columns: any[][] = Array.from({ length: numColumns }, () => []);

  // Distribute items into columns alternately
  data.forEach((item, index) => {
    columns[index % numColumns].push({ item, index });
  });

  return (
    <View style={[styles.container, contentContainerStyle]}>
      {columns.map((col, colIndex) => (
        <View key={`column-${colIndex}`} style={styles.column}>
          {col.map((colItem) => (
            <View key={keyExtractor(colItem.item, colItem.index)} style={styles.itemContainer}>
              {renderItem(colItem.item, colItem.index)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  column: {
    flex: 1,
    flexDirection: 'column',
  },
  itemContainer: {
    width: '100%',
  }
});
