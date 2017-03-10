import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import Display from './display'
import Label from './label'

const styles = StyleSheet.create({
  timer: {
    alignItems: 'center',
    display: 'flex',
    flexFlow: 'column',
    textAlign: 'center'
  }
})

export default state =>
  bel`<div class=${css(styles.timer)}>
    ${Display(state.timer.value)}
    ${Label(state.timer.type)}
  </div>`
