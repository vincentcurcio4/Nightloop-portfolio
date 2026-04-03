import { StyleSheet, Text, View } from 'react-native';
import { useBrandColors } from '../constants/brand';
import {
  getCheckinStatusLabel,
  getCheckinVisibilityLabel,
  type ActiveCheckin,
} from '../lib/checkins';
import ActionButton from './ActionButton';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ActiveCheckinCardProps = {
  checkin: ActiveCheckin;
  onOpenVenue?: () => void;
  onLeave?: () => void;
};

export default function ActiveCheckinCard({
  checkin,
  onOpenVenue,
  onLeave,
}: ActiveCheckinCardProps) {
  const colors = useBrandColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Current location</Text>

      <Text style={styles.venueName}>
        {checkin.venues?.name ?? 'Unknown venue'}
      </Text>

      <Text style={styles.meta}>
        {checkin.venues?.neighborhood ? `${checkin.venues.neighborhood}, ` : ''}
        {checkin.venues?.city ?? ''}
      </Text>

      <Text style={styles.meta}>
        Mode: {getCheckinStatusLabel(checkin.status)} | Visibility:{' '}
        {getCheckinVisibilityLabel(checkin.visibility)}
      </Text>

      <Text style={styles.meta}>Active until: {formatTime(checkin.expires_at)}</Text>

      <View style={styles.buttons}>
        {onOpenVenue ? (
          <ActionButton
            title="Open location"
            onPress={onOpenVenue}
            variant="secondary"
            style={styles.button}
          />
        ) : null}
        {onLeave ? (
          <ActionButton
            title="Clear location"
            onPress={onLeave}
            variant="ghost"
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useBrandColors>) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surface,
      gap: 8,
    },
    heading: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    venueName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.ink,
    },
    meta: {
      color: colors.textMuted,
      lineHeight: 20,
    },
    buttons: {
      marginTop: 8,
      gap: 10,
    },
    button: {
      width: '100%',
    },
  });
}
