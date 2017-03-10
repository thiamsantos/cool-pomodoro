import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import Timer from '../timer'
import PlayStateControl from '../play-state-control'
import Footer from '../footer'
import ChangeTimer from '../change-timer'
import Adjusts from '../adjusts'
import GithubCorner from '../github-corner'
import {cssVariables} from '../../services/utils'

const styles = StyleSheet.create({
  app: {
    backgroundColor: cssVariables.darkColor,
    color: cssVariables.textColor,
    fontSize: '1.6rem',
    fontWeight: '300',
    lineHeight: '1.2',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Roboto", sans-serif',
    minHeight: '100vh'
  },
  main: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingBottom: '4rem',
    paddingTop: '4rem'
  }
})

export default ({state, dispatch}) =>
  bel`<div id="app" class=${css(styles.app)}>
    ${GithubCorner('https://github.com/thiamsantos/cool-pomodoro')}
    <main class=${css(styles.main)}>
      ${Timer(state)}
      ${PlayStateControl({state, dispatch})}
      ${ChangeTimer({state, dispatch})}
    </main>
    ${Adjusts({state, dispatch})}
    ${Footer()}
  </div>`
