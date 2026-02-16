import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

/**
 * Initialize push notifications on native platforms.
 * Requests permission, registers for push, and stores the FCM/APNs token.
 */
export async function initPushNotifications(userId: string) {
  if (!Capacitor.isNativePlatform()) return

  // Request permission
  const permResult = await PushNotifications.requestPermissions()
  if (permResult.receive !== 'granted') return

  // Register for push
  await PushNotifications.register()

  // Listen for registration success - store token in Supabase
  PushNotifications.addListener('registration', async token => {
    const platform = Capacitor.getPlatform() as 'ios' | 'android'
    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token: token.value,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )
  })

  // Handle registration errors
  PushNotifications.addListener('registrationError', err => {
    console.error('Push registration failed:', err)
  })

  // Handle foreground notifications (show in-app)
  PushNotifications.addListener('pushNotificationReceived', notification => {
    // Display as in-app toast/banner - notifications received while app is in foreground
    console.log('Push received in foreground:', notification.title)
  })

  // Handle notification tap (navigate to relevant route)
  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const data = action.notification.data
    if (data?.route && typeof data.route === 'string') {
      // Only allow relative paths starting with / to prevent open redirect attacks
      const route = data.route
      if (route.startsWith('/') && !route.startsWith('//') && !route.includes('://')) {
        window.location.href = route
      }
    }
  })
}

/**
 * Remove push token for the current user on sign out.
 */
export async function removePushToken(userId: string) {
  if (!Capacitor.isNativePlatform()) return

  const platform = Capacitor.getPlatform()
  await supabase.from('push_tokens').delete().match({ user_id: userId, platform })
}
