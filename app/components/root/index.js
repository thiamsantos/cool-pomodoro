import bel from 'bel'
import Timer from '../timer'
import PlayStateControl from '../play-state-control'
import Footer from '../footer'
import ChangeTimer from '../change-timer'
import Adjusts from '../adjusts'
import GithubCorner from '../github-corner'
import styles from './styles.css'

export default store =>
  bel`<div id="app" class=${styles.app}>
    ${GithubCorner('https://github.com/thiamsantos/cool-pomodoro')}
    <main class=${styles.main}>
      ${Timer(store.getState())}
      ${PlayStateControl(store)}
      ${ChangeTimer(store)}
    </main>
    ${Adjusts(store)}
    ${Footer()}
  </div>`
