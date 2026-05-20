import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import AppNavigator from './src/navigation/AppNavigator'
import useAuthStore from './src/store/useAuthStore'
import { registerForPushNotifications } from './src/services/notifications'

export default function App() {
  const { token } = useAuthStore()

  useEffect(() => {
    if (token) registerForPushNotifications()
  }, [token])

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  )
}
