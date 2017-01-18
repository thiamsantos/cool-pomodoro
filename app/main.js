import morphdom from 'morphdom'
import {createStore, combineReducers} from 'redux'
import * as reducers from './services/reducers'
import {getTitle} from './services/utils'
import Root from './components/root'

const store = createStore(combineReducers(reducers))

document.body.appendChild(Root(store))

const render = () => {
  console.log(store.getState())
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
