import React, { useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, PanResponder, Dimensions, Platform,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Trash2, Undo2, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

type SignaturePadProps = {
  onSave: (pathData: string) => void;
  onCancel?: () => void;
  initialData?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
};

export default function SignaturePad({
  onSave,
  onCancel,
  initialData,
  width: propWidth,
  height = 180,
  strokeColor,
  strokeWidth = 2.5,
}: SignaturePadProps) {
  const { colors } = useTheme();
  const color = strokeColor || colors.text;
  const width = propWidth || Dimensions.get('window').width - 64;

  // Parse initial paths if provided
  const parseInitialPaths = (): string[] => {
    if (!initialData) return [];
    return initialData.split('|||').filter(Boolean);
  };

  const initialPaths = parseInitialPaths();
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [currentPath, setCurrentPath] = useState<string>('');

  const pathsRef = useRef<string[]>(initialPaths);
  const currentPathRef = useRef<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `${currentPathRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current) {
          const newPaths = [...pathsRef.current, currentPathRef.current];
          pathsRef.current = newPaths;
          setPaths(newPaths);
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    pathsRef.current = [];
    setPaths([]);
    currentPathRef.current = '';
    setCurrentPath('');
  };

  const handleUndo = () => {
    const newPaths = pathsRef.current.slice(0, -1);
    pathsRef.current = newPaths;
    setPaths(newPaths);
  };

  const handleSave = () => {
    // Combine all paths with separator
    const combined = pathsRef.current.join('|||');
    onSave(combined);
  };

  const hasContent = paths.length > 0 || currentPath.length > 0;

  return (
    <View style={styles.container}>
      {/* Canvas */}
      <View
        style={[
          styles.canvas,
          {
            width,
            height,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height}>
          <G>
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </G>
        </Svg>

        {/* Placeholder text */}
        {!hasContent && (
          <View style={styles.placeholder}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary + '60' }]}>
              Sign here
            </Text>
          </View>
        )}

        {/* Signature line */}
        <View style={[styles.signatureLine, { backgroundColor: colors.textSecondary + '30' }]} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleClear}
          style={[styles.actionBtn, { backgroundColor: colors.danger + '12' }]}
        >
          <Trash2 size={16} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUndo}
          disabled={paths.length === 0}
          style={[
            styles.actionBtn,
            { backgroundColor: colors.textSecondary + '12' },
            paths.length === 0 && { opacity: 0.4 },
          ]}
        >
          <Undo2 size={16} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Undo</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            style={[styles.actionBtn, { backgroundColor: colors.textSecondary + '12' }]}
          >
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasContent}
          style={[
            styles.actionBtn,
            styles.saveBtn,
            { backgroundColor: colors.secondary },
            !hasContent && { opacity: 0.4 },
          ]}
        >
          <Check size={16} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Renders a saved signature from path data (read-only preview)
 */
export function SignaturePreview({
  pathData,
  width: propWidth,
  height = 80,
  strokeColor,
}: {
  pathData: string;
  width?: number;
  height?: number;
  strokeColor?: string;
}) {
  const { colors } = useTheme();
  const color = strokeColor || colors.text;
  const width = propWidth || Dimensions.get('window').width - 80;

  const paths = pathData.split('|||').filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <View style={[previewStyles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${Dimensions.get('window').width - 64} 180`}>
        <G>
          {paths.map((path, index) => (
            <Path
              key={index}
              d={path}
              stroke={color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  canvas: {
    borderWidth: 1.5,
    borderRadius: 16,
    borderStyle: 'dashed',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '300',
    fontStyle: 'italic',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtn: {
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const previewStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
