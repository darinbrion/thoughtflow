import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

const isNative = Capacitor.isNativePlatform();

async function initialize(onCaptureUrl) {
  if (!isNative) return;
  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setStyle({ style: Style.Light });
  App.addListener('appUrlOpen', ({ url }) => {
    const parsed = new URL(url);
    if (parsed.hostname === 'capture' || parsed.pathname === '/capture') {
      onCaptureUrl(parsed.searchParams.get('text') || '');
    }
  });
}

async function tap() {
  if (isNative) await Haptics.impact({ style: ImpactStyle.Light });
}

async function shareThought(thought) {
  await Share.share({
    title: 'ThoughtFlow',
    text: `${thought.content}\n\n${thought.category} · ${thought.priority} priority`,
    dialogTitle: 'Share this thought'
  });
}

async function schedulePriorityReminder(thought) {
  if (!isNative || thought.priority !== 'high' || thought.completed) return false;
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    permission = await LocalNotifications.requestPermissions();
  }
  if (permission.display !== 'granted') return false;

  await LocalNotifications.schedule({
    notifications: [{
      id: Math.abs([...thought.id].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) | 0, 7)),
      title: 'A priority worth returning to',
      body: thought.content,
      schedule: { at: new Date(Date.now() + 60 * 60 * 1000) },
      extra: { thoughtId: thought.id }
    }]
  });
  return true;
}

export const native = {
  isNative,
  initialize,
  tap,
  shareThought,
  schedulePriorityReminder
};
