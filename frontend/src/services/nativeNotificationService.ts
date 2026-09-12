import { Capacitor } from '@capacitor/core';
import { soundService } from '../utils/sound';

let localNotificationsPlugin: any = null;

async function getLocalNotifications() {
  if (!localNotificationsPlugin && Capacitor.isNativePlatform()) {
    try {
      const mod = await import('@capacitor/local-notifications');
      localNotificationsPlugin = mod.LocalNotifications;
    } catch (e) {
      console.warn('LocalNotifications module not available:', e);
    }
  }
  return localNotificationsPlugin;
}

class NativeNotificationService {
  private initialized = false;

  async init() {
    if (!Capacitor.isNativePlatform()) return;
    if (this.initialized) return;

    try {
      const LocalNotifications = await getLocalNotifications();
      if (!LocalNotifications) return;

      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // Crear canal prioritario de Android para pantalla de bloqueo y cabecera
      await LocalNotifications.createChannel({
        id: 'admin-deposits',
        name: 'Alertas de Depósitos y Pedidos',
        description: 'Notificaciones urgentes con sonido y vibración en pantalla bloqueada',
        importance: 5, // IMPORTANCE_HIGH (Android Heads-up & Lock Screen)
        visibility: 1, // VISIBILITY_PUBLIC
        vibration: true,
        lights: true,
        lightColor: '#6366F1',
      });

      this.initialized = true;
    } catch (e) {
      console.warn('No se pudo inicializar LocalNotifications:', e);
    }
  }

  async sendDepositAlert(params: {
    clientName?: string;
    amount?: number;
    count?: number;
    depositId?: string;
  }) {
    const { clientName = 'Un cliente', amount, count = 1, depositId } = params;

    // 1. Sonido en la aplicación
    soundService.playNotificationChime();

    // 2. Alerta Nativa en Android (Funciona incluso con la pantalla bloqueada)
    if (Capacitor.isNativePlatform()) {
      try {
        await this.init();
        const LocalNotifications = await getLocalNotifications();
        if (!LocalNotifications) return;

        const notifId = Math.floor(Date.now() % 100000);
        const amountText = amount ? ` por $${amount.toFixed(2)} USD` : '';
        const bodyText =
          count > 1
            ? `Hay ${count} depósitos pendientes de validar. Toca para revisarlos.`
            : `${clientName} registró un depósito${amountText}. Toca para verificar el comprobante.`;

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: '🚨 ¡Nuevo Depósito Registrado!',
              body: bodyText,
              channelId: 'admin-deposits',
              schedule: { at: new Date(Date.now() + 50) },
              extra: { depositId, type: 'deposit' },
            },
          ],
        });
      } catch (e) {
        console.warn('Error al disparar alerta nativa:', e);
      }
    }
  }
}

export const nativeNotificationService = new NativeNotificationService();
