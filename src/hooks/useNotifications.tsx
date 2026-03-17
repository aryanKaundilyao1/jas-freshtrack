import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { toast } from '@/components/ui/use-toast';

export function useNotifications() {
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const result = await LocalNotifications.requestPermissions();
        if (result.display !== 'granted') {
          toast({
            title: "Notifications Disabled",
            description: "Enable notifications to get alerts about expiring food items.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.log('Notifications not available on this platform');
      }
    };

    requestPermissions();
  }, []);

  const scheduleExpiryNotification = async (itemName: string, daysUntilExpiry: number) => {
    try {
      const notificationTime = new Date();
      notificationTime.setDate(notificationTime.getDate() + Math.max(0, daysUntilExpiry - 1));
      
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Food Expiry Alert 🍎",
            body: `Your ${itemName} will expire tomorrow. Don't forget to use it!`,
            id: Date.now(),
            schedule: { at: notificationTime },
            sound: 'beep.wav',
            actionTypeId: "",
            extra: {
              itemName,
              type: 'expiry_reminder'
            }
          }
        ]
      });
    } catch (error) {
      console.log('Failed to schedule notification:', error);
    }
  };

  const scheduleRecipeNotification = async (expiringItems: string[]) => {
    if (expiringItems.length === 0) return;
    
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Recipe Suggestions Available! 👨‍🍳",
            body: `You have ${expiringItems.length} items expiring soon. Check out AI recipe suggestions!`,
            id: Date.now() + 1000,
            schedule: { at: new Date(Date.now() + 60000) }, // 1 minute from now
            sound: 'beep.wav',
            actionTypeId: "",
            extra: {
              items: expiringItems,
              type: 'recipe_suggestion'
            }
          }
        ]
      });
    } catch (error) {
      console.log('Failed to schedule recipe notification:', error);
    }
  };

  return {
    scheduleExpiryNotification,
    scheduleRecipeNotification
  };
}