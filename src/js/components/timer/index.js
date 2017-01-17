import bel from 'bel'
import Display from './display'
import Label from './label'

export default state =>
  bel`<div class="timer">
    ${Display(state.timer.value)}
    ${Label(state.timer.type)}
  </div>`
