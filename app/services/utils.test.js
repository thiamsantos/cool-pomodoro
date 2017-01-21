import test from 'tape'
import {
  isPaused,
  getNextPlayState,
  getNextPlayStateText,
  getPlayStateStyle,
  formatTime,
  capitalize,
  getTitle
} from './utils'

const createFakeStore = playState => ({
  getState: () => ({
    timer: {
      playState
    }
  })
})

test('formatTime function', t => {
  const actual = formatTime(1200)
  const expected = '20:00'

  t.equal(actual, expected, 'should format seconds to a human-friendly string')
  t.end()
})

test('capitalize function', t => {
  const actual = capitalize('hey there')
  const expected = 'Hey there'

  t.equal(actual, expected, 'should capitalize the given string')
  t.end()
})

test('getTitle function', t => {
  const store = {
    getState() {
      return {
        timer: {
          value: 1200
        }
      }
    }
  }
  const actual = getTitle(store)
  const expected = '20:00 | Pomodoro Timer'

  t.equal(
    actual,
    expected,
    'should return a string with the formatted title given the store')
  t.end()
})

test('isPaused function', t => {
  const store = createFakeStore('running')
  t.notOk(isPaused(store), 'by default the state should be running')
  t.end()
})

test('isPaused function', t => {
  const store = createFakeStore('paused')

  t.ok(isPaused(store), 'should return true')
  t.end()
})

test('getNextPlayState function', t => {
  const store = createFakeStore('running')
  const actual = getNextPlayState(store)
  const expected = 'paused'

  t.equal(actual, expected, 'should return the next play state: paused')
  t.end()
})

test('getNextPlayState function', t => {
  const store = createFakeStore('paused')

  const actual = getNextPlayState(store)
  const expected = 'running'

  t.equal(actual, expected, 'should return the next play state: running')
  t.end()
})

test('getNextPlayStateText function', t => {
  const store = createFakeStore('running')
  const actual = getNextPlayStateText(store)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: pause')
  t.end()
})

test('getNextPlayStateText function', t => {
  const store = createFakeStore('paused')

  const actual = getNextPlayStateText(store)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: play')
  t.end()
})

test('getPlayStateStyle function', t => {
  const store = createFakeStore('running')
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(store, styles)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})

test('getPlayStateStyle function', t => {
  const store = createFakeStore('paused')
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(store, styles)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})
