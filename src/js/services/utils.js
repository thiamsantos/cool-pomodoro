export const formatTime = seconds => {
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 3600 % 60)
  const timeFormated = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
  return timeFormated
}

export const capitalize = str => str[0].toUpperCase() + str.slice(1)

export const getTitle = store =>
  `${formatTime(store.getState().timer.value)} | Pomodoro Timer`
