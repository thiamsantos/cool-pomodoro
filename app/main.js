import morphdom from 'morphdom'
import store from './services/store'
import {getTitle} from './services/utils'
import keyboardShortcuts from './services/keyboard-shortcuts'
import Root from './components/root'

document.body.appendChild(Root(store))

const render = () => {
  // console.log(store.getState())
  document.title = getTitle(store)
  morphdom(document.getElementById('app'), Root(store))
}

store.subscribe(render)

setInterval(() => {
  if (store.getState().timer.playState === 'paused') {
    return false
  }
  store.dispatch({
    type: 'DECREMENT_TIMER'
  })
}, 1000)

document.addEventListener('keyup', keyboardShortcuts(store))
