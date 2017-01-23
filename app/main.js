import morphdom from 'morphdom'
import store from './services/store'
import {getTitle} from './services/utils'
import keyboardShortcuts from './services/keyboard-shortcuts'
import Root from './components/root'

const {dispatch} = store

document.body.appendChild(Root({state: store.getState(), dispatch}))

const render = () => {
  const state = store.getState()
  console.log(state)
  document.title = getTitle(state)
  morphdom(
    document.getElementById('app'),
    Root({state, dispatch})
  )
}

const notify = () => {
  const state = store.getState()

  if (state.timer.value === 0) {
    if (state.adjusts.vibration && 'vibrate' in window.navigator) {
      window.navigator.vibrate(1000)
    }
    if (state.adjusts.sound) {
      const sound = new Audio('../audio/alarm.mp3')
      sound.play()
    }
  }
}

store.subscribe(render)
store.subscribe(notify)

setInterval(() => {
  const state = store.getState()

  if (state.timer.playState === 'paused' || state.timer.value === 0) {
    return false
  }

  store.dispatch({type: 'DECREMENT_TIMER'})
}, 1000)

document.addEventListener('keyup', keyboardShortcuts(store))
