import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import type { ListEntry } from '@/data/mock-lists';
import type { ListsState } from '@/lib/lists-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_CHANNEL_ID = 'tracker-reminders';
let channelPrepared = false;

async function ensureChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android' || channelPrepared) {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Tracker reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelPrepared = true;
}

export async function ensureReminderPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!Device.isDevice) {
    return false;
  }

  await ensureChannelAsync();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleReminderForEntry(
  entry: ListEntry,
  listTitle: string
): Promise<string | null> {
  if (Platform.OS === 'web' || !entry.reminderAt || entry.reminderAt <= Date.now()) {
    return null;
  }

  const hasPermission = await ensureReminderPermissionsAsync();
  if (!hasPermission) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: entry.title,
      body: `Reminder from ${listTitle}`,
      data: {
        entryId: entry.id,
        listTitle,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(entry.reminderAt),
      channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelReminderNotification(identifier?: string): Promise<void> {
  if (!identifier || Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('Failed to cancel reminder notification', error);
  }
}

export async function syncReminderNotification(
  entry: ListEntry,
  listTitle: string,
  existingIdentifier?: string
): Promise<string | undefined> {
  if (existingIdentifier) {
    await cancelReminderNotification(existingIdentifier);
  }

  if (!entry.reminderAt || entry.reminderAt <= Date.now()) {
    return undefined;
  }

  const scheduledIdentifier = await scheduleReminderForEntry(entry, listTitle);
  return scheduledIdentifier ?? undefined;
}

export async function reconcileReminderNotifications(
  state: ListsState
): Promise<Record<string, string>> {
  if (Platform.OS === 'web') {
    return {};
  }

  const nextNotificationIds: Record<string, string> = {};
  const seenEntryIds = new Set<string>();

  for (const list of state.lists) {
    for (const entry of list.entries) {
      seenEntryIds.add(entry.id);
      const scheduledId = await syncReminderNotification(
        entry,
        list.title,
        state.reminderNotificationIds[entry.id]
      );
      if (scheduledId) {
        nextNotificationIds[entry.id] = scheduledId;
      }
    }
  }

  for (const [entryId, notificationId] of Object.entries(state.reminderNotificationIds)) {
    if (!seenEntryIds.has(entryId)) {
      await cancelReminderNotification(notificationId);
    }
  }

  return nextNotificationIds;
}
