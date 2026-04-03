import { StyleSheet, Text, View } from 'react-native';
import { useBrandColors } from '../constants/brand';
import {
  getCheckinStatusLabel,
  getCheckinVisibilityLabel,
} from '../lib/checkins';
import type { VenuePresenceItem } from '../lib/presence';
import ActionButton from './ActionButton';
import ProfileAvatar from './ProfileAvatar';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDisplayName(item: VenuePresenceItem) {
  if (item.visibility === 'anonymous') return 'Anonymous user';
  if (item.profile?.display_name?.trim()) return item.profile.display_name;
  if (item.profile?.username?.trim()) return `@${item.profile.username}`;
  return 'Anonymous user';
}

type VenuePresenceListProps = {
  items: VenuePresenceItem[];
  followedUserIds?: string[];
  workingUserId?: string | null;
  onReportUser?: (item: VenuePresenceItem) => void;
  onBlockUser?: (item: VenuePresenceItem) => void;
};

export default function VenuePresenceList({
  items,
  followedUserIds = [],
  workingUserId = null,
  onReportUser,
  onBlockUser,
}: VenuePresenceListProps) {
  const colors = useBrandColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>Who is here now</Text>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No visible current locations yet</Text>
          <Text style={styles.emptyText}>
            Public and anonymous current-location updates will appear here.
          </Text>
        </View>
      ) : (
        items.map((item) => {
          const isFollowing =
            item.visibility !== 'anonymous' && followedUserIds.includes(item.userId);
          const canModerate = item.visibility !== 'anonymous' && !!item.profile;

          return (
            <View key={item.checkinId} style={styles.card}>
              <View style={styles.headerRow}>
                <ProfileAvatar
                  avatarUrl={item.profile?.avatar_url}
                  displayName={item.profile?.display_name}
                  username={item.profile?.username}
                  size={52}
                />

                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{getDisplayName(item)}</Text>
                    {isFollowing ? <Text style={styles.badge}>Following</Text> : null}
                  </View>

                  <Text style={styles.meta}>
                    {getCheckinStatusLabel(item.status)} |{' '}
                    {getCheckinVisibilityLabel(item.visibility)}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>Started at: {formatTime(item.startedAt)}</Text>
              <Text style={styles.meta}>Active until: {formatTime(item.expiresAt)}</Text>

              {canModerate ? (
                <View style={styles.actionRow}>
                  <ActionButton
                    title="Report"
                    onPress={() => onReportUser?.(item)}
                    variant="ghost"
                    style={styles.actionButton}
                    disabled={workingUserId === item.userId}
                  />
                  <ActionButton
                    title={workingUserId === item.userId ? 'Blocking...' : 'Block'}
                    onPress={() => onBlockUser?.(item)}
                    variant="danger"
                    style={styles.actionButton}
                    disabled={workingUserId === item.userId}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useBrandColors>) {
  return StyleSheet.create({
    wrapper: {
      gap: 12,
    },
    heading: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.ink,
    },
    emptyState: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 22,
      padding: 18,
      gap: 6,
      backgroundColor: colors.surface,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
    },
    emptyText: {
      color: colors.textMuted,
      lineHeight: 20,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 22,
      padding: 18,
      gap: 6,
      backgroundColor: colors.surface,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 2,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    nameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    name: {
      fontSize: 17,
      fontWeight: '800',
      flex: 1,
      color: colors.ink,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.primarySoft,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    meta: {
      color: colors.textMuted,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionButton: {
      flex: 1,
    },
  });
}
