import {render} from 'snabbx'
import {throttle, pipe} from 'paretojs'
import store from './services/store'
import {getTitle, getValueToResetTimer, TIMER_TYPES} from './services/utils'
import {resetTimer} from './services/actions'
import keyboardShortcuts from './services/keyboard-shortcuts'
import {saveState} from './services/local-storage'
import Root from './components/root'

const {dispatch} = store

const rootEl = Root({state: store.getState(), dispatch})
render(document.getElementById('app'), rootEl)

const update = () => {
  const state = store.getState()

  render(rootEl, Root({state, dispatch}))
}

const setTitle = () => {
  const state = store.getState()
  document.title = getTitle(state)
}

const save = () => {
  const state = store.getState()
  saveState(localStorage, {adjusts: state.adjusts})
}

const notify = () => {
  const state = store.getState()

  if (state.timer.value <= 0) {
    if (state.timer.playState === 'running') {
      const actionCreator = pipe(getValueToResetTimer, resetTimer)
      const action = actionCreator(state.timer.type, TIMER_TYPES)
      store.dispatch(action)
    }
    if (state.adjusts.vibration && 'vibrate' in window.navigator) {
      window.navigator.vibrate(1000)
    }
    if (state.adjusts.sound) {
      const sound = new Audio('audio/alarm.mp3')
      sound.play()
    }
    if (state.adjusts.notification && 'Notification' in window) {
      if (state.timer.type === 'code') {
        new Notification('Relax :)', {
          lang: 'en',
          icon: 'img/coffee.png',
          body: 'Go talk or drink a coffee!'
        })
      } else {
        new Notification('The time is over', {
          lang: 'en',
          icon: 'img/code.png',
          body: 'Hey back to code!'
        })
      }
    }
  }
}

store.subscribe(throttle(setTitle, 300))
store.subscribe(throttle(save, 1000))
store.subscribe(update)
store.subscribe(throttle(notify, 1000))

setInterval(() => {
  const state = store.getState()

  if (state.timer.playState === 'paused' || state.timer.value === 0) {
    return false
  }

  store.dispatch({type: 'DECREMENT_TIMER'})
}, 1000)

document.addEventListener('keyup', keyboardShortcuts(store))

if ('serviceWorker' in navigator || window.location.hostname === 'localhost') {
  navigator.serviceWorker.register('service-worker.js')
}
