import test from 'tape'
import {
  isPaused,
  getNextPlayState,
  getNextPlayStateText,
  getPlayStateStyle,
  formatTime,
  capitalize,
  getTitle,
  TIMER_TYPES
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
  const state = {
    timer: {
      value: 1200
    }
  }

  const actual = getTitle(state)
  const expected = '20:00 | Pomodoro Timer'

  t.equal(
    actual,
    expected,
    'should return a string with the formatted title given the store')
  t.end()
})

test('isPaused function', t => {
  const state = {
    timer: {
      playState: 'running'
    }
  }
  t.notOk(isPaused(state), 'by default the state should be running')
  t.end()
})

test('isPaused function', t => {
  const state = {
    timer: {
      playState: 'paused'
    }
  }

  t.ok(isPaused(state), 'should return true')
  t.end()
})

test('getNextPlayState function', t => {
  const state = {
    timer: {
      playState: 'running'
    }
  }
  const actual = getNextPlayState(state)
  const expected = 'paused'

  t.equal(actual, expected, 'should return the next play state: paused')
  t.end()
})

test('getNextPlayState function', t => {
  const state = {
    timer: {
      playState: 'paused'
    }
  }

  const actual = getNextPlayState(state)
  const expected = 'running'

  t.equal(actual, expected, 'should return the next play state: running')
  t.end()
})

test('getNextPlayStateText function', t => {
  const state = {
    timer: {
      playState: 'running'
    }
  }
  const actual = getNextPlayStateText(state)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: pause')
  t.end()
})

test('getNextPlayStateText function', t => {
  const state = {
    timer: {
      playState: 'paused'
    }
  }

  const actual = getNextPlayStateText(state)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return the type of the action to be triggered: play')
  t.end()
})

test('getPlayStateStyle function', t => {
  const state = {
    timer: {
      playState: 'running'
    }
  }
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(state, styles)
  const expected = 'pause'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})

test('getPlayStateStyle function', t => {
  const state = {
    timer: {
      playState: 'paused'
    }
  }
  const styles = {
    play: 'play',
    pause: 'pause'
  }

  const actual = getPlayStateStyle(state, styles)
  const expected = 'play'

  t.equal(
    actual,
    expected,
    'should return a className')
  t.end()
})

test('TIMER_TYPES const', t => {
  const obj = {}
  const actual = obj.toString.call(TIMER_TYPES)
  const expected = '[object Array]'

  t.equal(actual, expected, 'the const should be array')
  t.end()
})

test('TIMER_TYPES const', t => {
  const actual = TIMER_TYPES.length
  const expected = 3

  t.equal(actual, expected, 'the const should have 3 items')
  t.end()
})

test('TIMER_TYPES const', t => {
  const actual = typeof TIMER_TYPES[0]
  const expected = 'object'

  t.equal(actual, expected, 'the items in the const should be an object')
  t.end()
})

