import bel from 'bel'
import {formatTime} from '../../services/utils'

export default time =>
  bel`<p class="timer__display">${formatTime(time)}</p>`
