declare module 'expo-notifications' {
  export enum AndroidImportance {
    DEFAULT = 3,
  }

  export enum SchedulableTriggerInputTypes {
    DAILY = 'daily',
  }

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }): void;

  export function setNotificationChannelAsync(
    channelId: string,
    channel: {
      name: string;
      importance: AndroidImportance;
      sound?: string;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ): Promise<unknown>;

  export function getPermissionsAsync(): Promise<{ granted: boolean; status: string }>;
  export function requestPermissionsAsync(): Promise<{ granted: boolean; status: string }>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function getAllScheduledNotificationsAsync(): Promise<
    Array<{
      identifier: string;
      content: { data?: Record<string, unknown> };
    }>
  >;
  export function scheduleNotificationAsync(input: {
    content: {
      title: string;
      body: string;
      sound?: string;
      data?: Record<string, unknown>;
    };
    trigger: unknown;
  }): Promise<string>;
}
