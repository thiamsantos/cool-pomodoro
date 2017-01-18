import bel from 'bel'
import styles from './styles.css'

export default type =>
  bel`<p class=${styles.label}>The ${type} time!</p>`
