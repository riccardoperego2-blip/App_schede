import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL_ID = 'workout-reminders';
const REMINDER_DATA_TYPE = 'workout-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Promemoria allenamento',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22C55E',
  });
}

async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.status === 'granted';
}

export async function cancelWorkoutReminder(notificationId?: string | null): Promise<void> {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return;
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.type === REMINDER_DATA_TYPE)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

export async function scheduleDailyWorkoutReminder(input: {
  hour: number;
  minute: number;
  previousNotificationId?: string | null;
}): Promise<{ granted: boolean; notificationId: string | null }> {
  const granted = await ensureNotificationPermission();
  if (!granted) return { granted: false, notificationId: null };

  await ensureAndroidChannel();
  await cancelWorkoutReminder(input.previousNotificationId);

  const triggerType = Notifications.SchedulableTriggerInputTypes?.DAILY;
  const trigger =
    triggerType !== undefined
      ? {
          type: triggerType,
          hour: input.hour,
          minute: input.minute,
          channelId: REMINDER_CHANNEL_ID,
        }
      : {
          hour: input.hour,
          minute: input.minute,
          repeats: true,
          channelId: REMINDER_CHANNEL_ID,
        };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Allenamento di oggi',
      body: 'Hai una sessione programmata. Apri Schede Fitness.',
      sound: 'default',
      data: { type: REMINDER_DATA_TYPE },
    },
    trigger,
  });

  return { granted: true, notificationId };
}
