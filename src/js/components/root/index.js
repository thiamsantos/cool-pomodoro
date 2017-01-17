import bel from 'bel'
import Timer from '../timer'
import PlayStateControl from '../play-state-control'
import Footer from '../footer'
import ChangeTimer from '../change-timer'
import Adjusts from '../adjusts'

export default store =>
  bel`<div id="app">
    <main class="main">
      ${Timer(store.getState())}
      ${PlayStateControl(store)}
      ${ChangeTimer(store)}
    </main>
    ${Adjusts(store)}
    ${Footer()}
  </div>`
