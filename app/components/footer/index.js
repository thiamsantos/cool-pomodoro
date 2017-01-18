import bel from 'bel'
import styles from './styles.css'

export default () =>
  bel`<footer class=${styles.footer}>
    Made with <span class=${styles.heart}></span> by <a href="https://github.com/thiamsantos" class="link" target="_blank" rel="noopener">@thiamsantos</a>
  </footer>`
