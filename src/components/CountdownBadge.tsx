import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getDaysRemaining, getPaymentUrgency } from '../utils/helpers';

type CountdownBadgeProps = {
  dueDate: Date | string;
  compact?: boolean;
};

const CountdownBadge = ({ dueDate, compact = false }: CountdownBadgeProps) => {
  const { colors } = useTheme();
  const daysRemaining = getDaysRemaining(dueDate);
  const urgency = getPaymentUrgency(daysRemaining);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: urgency.color + '20' }]}>
        <View style={[styles.dot, { backgroundColor: urgency.color }]} />
        <Text style={[styles.compactText, { color: urgency.color }]}>
          {urgency.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: urgency.color + '15', borderColor: urgency.color + '30' }]}>
      <Text style={[styles.daysNumber, { color: urgency.color }]}>
        {daysRemaining < 0 ? Math.abs(daysRemaining) : daysRemaining}
      </Text>
      <Text style={[styles.daysLabel, { color: urgency.color }]}>
        {daysRemaining < 0 ? 'days overdue' : daysRemaining === 0 ? 'due today' : 'days left'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  daysNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  daysLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CountdownBadge;
