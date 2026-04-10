export function solicitarPermisoNotificaciones() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function enviarNotificacion(titulo, opciones = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...opciones,
    })
  }
}
