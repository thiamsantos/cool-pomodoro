import morphdom from 'morphdom'
import {changeTitle} from './services/utils'
import store from './services/store'
import App from './containers/app'

document.body.appendChild(App(store))

const render = () => {
  console.log(store.getState())
  morphdom(document.getElementById('app'), App(store))
}

store.subscribe(render)
store.subscribe(changeTitle(store))

setInterval(() => {
  if (store.getState().timer.playState === 'paused') {
    return false
  }
  store.dispatch({
    type: 'DECREMENT_TIMER'
  })
}, 1000)
