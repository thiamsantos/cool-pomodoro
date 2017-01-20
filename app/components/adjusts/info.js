import bel from 'bel'
import styles from './styles.css'

export default () =>
  bel`<a
    href="https://en.wikipedia.org/wiki/Pomodoro_Technique"
    rel="noopener"
    target="_blank"
    class=${styles.info} >
    What is Pomodoro?
  </a>`
