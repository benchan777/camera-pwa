import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onRegisterError(error) {
    console.log(error)
  },
  onNeedRefresh() {
    console.log('refresh needed')
  },
  onOfflineReady() {
    console.log('offline ready')
  }
});