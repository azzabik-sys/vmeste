if (typeof document !== 'undefined') {
  document.documentElement.dataset.look = 'card'
  try {
    localStorage.setItem('vmeste.look', 'card')
  } catch {
    // Приватный режим может запретить запись. Вид всё равно карточка.
  }
}
