export const formatTime = seconds => {
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 3600 % 60)
  const timeFormated = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
  return timeFormated
}

export const capitalize = str => str[0].toUpperCase() + str.slice(1)

export const getTitle = state =>
  `${formatTime(state.timer.value)} | Pomodoro Timer`

export const isPaused = state => state.timer.playState === 'paused'

export const getNextPlayState = state =>
  isPaused(state) ? 'running' : 'paused'

export const getNextPlayStateText = state =>
  isPaused(state) ? 'play' : 'pause'

export const sequentiallyGetTimerType = (current, types, mode) =>
  types.reduce(
    (acc, item, index, array) =>
      item.type === current ? mode(array, index) : acc,
    {}
  )

export const isFirstItem = index => index === 0

export const getPreviousItem = (array, index) => {
  const previousIndex = isFirstItem(index) ? array.length - 1 : index - 1
  return array[previousIndex]
}

export const isLastItem = (array, index) => index === array.length - 1

export const getNextItem = (array, index) => {
  const nextIndex = isLastItem(array, index) ? 0 : index + 1
  return array[nextIndex]
}

export const TIMER_TYPES = [
  {
    type: 'code',
    value: 1500
  },
  {
    type: 'social',
    value: 900
  },
  {
    type: 'coffee',
    value: 300
  }
]

export const getValueToResetTimer = (current, timerTypes) => {
  const currentTimer = timerTypes.filter(timer => timer.type === current)
  return currentTimer.length ? currentTimer[0].value : 0
}

export const cssVariables = {
  textColor: '#fafafa',
  textColorAccent: '#9575cd',
  textColorDark: '#bdbdbd',
  darkColor: '#212121',
  accentColor: '#69f0ae',
  brandColor: '#673ab7',
  brandColorLight: '#7e57c2',
  brandColorDark: '#512da8'
}
