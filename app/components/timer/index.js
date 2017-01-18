import bel from 'bel'
import Display from './display'
import Label from './label'
import styles from './styles.css'

export default state =>
  bel`<div class=${styles.timer}>
    ${Display(state.timer.value)}
    ${Label(state.timer.type)}
  </div>`
