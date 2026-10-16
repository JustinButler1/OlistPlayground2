import { beforeEach, expect, it, vi } from 'vitest';
import type { ListEntry } from '../data/mock-lists';
const mocks = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ granted: true })),
  schedule: vi.fn(async () => 'notification'),
  cancel: vi.fn(async () => {}),
  cancelAll: vi.fn(async () => {}),
  dismiss: vi.fn(async () => {}),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-device', () => ({ isDevice: true }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: mocks.permission,
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  scheduleNotificationAsync: mocks.schedule,
  cancelScheduledNotificationAsync: mocks.cancel,
  dismissNotificationAsync: vi.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: mocks.cancelAll,
  dismissAllNotificationsAsync: mocks.dismiss,
}));
import {
  clearDeviceReminders,
  scheduleReminderForEntry,
} from '../lib/reminders';
const entry = {
  id: 'entry',
  title: 'Private A title',
  reminderAt: Date.now() + 600000,
} as ListEntry;
beforeEach(() => vi.clearAllMocks());
it('does not schedule A reminders when sign-out occurs during a permissions prompt', async () => {
  let release!: (v: { granted: boolean }) => void;
  mocks.permission.mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  let active = true;
  const pending = scheduleReminderForEntry(entry, 'A list', () => active);
  await vi.waitFor(() => expect(mocks.permission).toHaveBeenCalled());
  active = false;
  release({ granted: true });
  expect(await pending).toBeNull();
  expect(mocks.schedule).not.toHaveBeenCalled();
});
it('cancels reminders returned after session teardown', async () => {
  let release!: (v: string) => void;
  mocks.schedule.mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  let active = true;
  const pending = scheduleReminderForEntry(entry, 'A list', () => active);
  await vi.waitFor(() => expect(mocks.schedule).toHaveBeenCalled());
  active = false;
  release('late-A-reminder');
  expect(await pending).toBeNull();
  expect(mocks.cancel).toHaveBeenCalledWith('late-A-reminder');
});
it('clears scheduled and delivered notifications on session transitions', async () => {
  await clearDeviceReminders();
  expect(mocks.cancelAll).toHaveBeenCalledOnce();
  expect(mocks.dismiss).toHaveBeenCalledOnce();
});
