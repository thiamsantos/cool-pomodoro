import morphdom from 'morphdom'
import store from './services/store'
import {getTitle} from './services/utils'
import keyboardShortcuts from './services/keyboard-shortcuts'
import Root from './components/root'

document.body.appendChild(Root(store))

const render = () => {
  console.log(store.getState())
  document.title = getTitle(store)
  morphdom(document.getElementById('app'), Root(store))
}

const notify = () => {
  const state = store.getState()

  if (state.timer.value === 0) {
    if (state.adjusts.vibration && 'vibrate' in window.navigator) {
      window.navigator.vibrate(1000)
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
