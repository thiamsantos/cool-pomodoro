import bel from 'bel'
import {formatTime} from '../../services/utils'
import styles from './styles.css'

export default time =>
  bel`<p class=${styles.display}>${formatTime(time)}</p>`
