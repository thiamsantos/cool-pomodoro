import {html} from 'snabbx'
import {createStyles} from 'stylord'
import Display from './display'
import Label from './label'

const styles = createStyles({
  timer: {
    alignItems: 'center',
    display: 'flex',
    flexFlow: 'column',
    textAlign: 'center'
  }
})

export default state =>
  html`<div class=${styles.timer}>
    ${Display(state.timer.value)}
    ${Label(state.timer.type)}
  </div>`
