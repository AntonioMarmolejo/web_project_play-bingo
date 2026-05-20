import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { auth as authApi } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bingo', {
      name: 'BingoScan',
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  // projectId viene del app.json cuando se configura EAS Build.
  // En desarrollo con Expo Go puede no estar disponible.
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data
    await authApi.savePushToken(token).catch(() => {})
    return token
  } catch {
    console.warn('[push] Push notifications no disponibles sin EAS projectId.')
    return null
  }
}
