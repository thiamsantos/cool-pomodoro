import bel from 'bel'
import {StyleSheet, css} from 'aphrodite/no-important'
import {cssVariables} from '../../services/utils'

const pulseHeartAnimation = {
  from: {
    transform: 'rotate(-135deg) scale(1)'
  },
  to: {
    transform: 'rotate(-135deg) scale(1.2)'
  }
}

const focusLinkStyle = {
  color: cssVariables.textColorDark
}

const heartAfterBeforeStyle = {
  backgroundColor: cssVariables.accentColor,
  borderRadius: '50%',
  content: '""',
  height: '10px',
  position: 'absolute',
  width: '10px'
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: cssVariables.brandColorDark,
    paddingBottom: '1rem',
    paddingTop: '1rem',
    textAlign: 'center'
  },
  link: {
    color: cssVariables.textColor,
    textDecoration: 'none',
    ':hover': focusLinkStyle,
    ':focus': focusLinkStyle
  },
  heart: {
    animationName: pulseHeartAnimation,
    animationDuration: '.5s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in',
    backgroundColor: cssVariables.accentColor,
    display: 'inline-block',
    height: '10px',
    margin: '0 5px',
    position: 'relative',
    width: '10px',
    ':before': {
      ...heartAfterBeforeStyle,
      left: '50%',
      top: 0
    },
    ':after': {
      ...heartAfterBeforeStyle,
      left: 0,
      top: '50%'
    }
  }
})

export default () =>
  bel`<footer class=${css(styles.footer)}>
    Made with <span class=${css(styles.heart)}></span> by <a href="https://github.com/thiamsantos" target="_blank" rel="noopener" class=${css(styles.link)}>@thiamsantos</a>
  </footer>`
