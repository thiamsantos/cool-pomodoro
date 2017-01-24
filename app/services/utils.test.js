import test from 'tape'
import {
  isPaused,
  getNextPlayState,
  getNextPlayStateText,
  getPlayStateStyle,
  formatTime,
  capitalize,
  getTitle,
  TIMER_TYPES,
  isLastItem,
  isFirstItem,
  getNextItem,
  getPreviousItem,
  sequentiallyGetTimerType,
  getValueToResetTimer
} from './utils'

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
  for (const item of TIMER_TYPES) {
    const actual = typeof item
    const expected = 'object'

    t.equal(actual, expected, 'the items in the const should be an object')
  }
  t.end()
})

test('TIMER_TYPES const', t => {
  for (const item of TIMER_TYPES) {
    const actual = Object.keys(item).length
    const expected = 2

    t.equal(
      actual,
      expected,
      'the items in the const should be have two properties')
  }
  t.end()
})

test('TIMER_TYPES const', t => {
  for (const item of TIMER_TYPES) {
    const actual = typeof item.value
    const expected = 'number'

    t.equal(
      actual,
      expected,
      'the property value in a item should be a number')
  }
  t.end()
})

test('TIMER_TYPES const', t => {
  for (const item of TIMER_TYPES) {
    const actual = typeof item.type
    const expected = 'string'

    t.equal(
      actual,
      expected,
      'the property type in the const should be a string')
  }
  t.end()
})

test('isLastItem function', t => {
  const arr = [1, 2, 3]

  t.ok(isLastItem(arr, 2), 'should return true given the index for last item')
  t.notOk(isLastItem(arr, 1), 'should return false given the second index')
  t.end()
})

test('isFirstItem function', t => {
  t.ok(isFirstItem(0), 'should return true given the index 0')
  t.notOk(isFirstItem(3), 'should return false given a index different than 0')
  t.end()
})

test('getNextItem function', t => {
  const arr = ['first', 'second', 'third']

  const actual = getNextItem(arr, 1)
  const expected = 'third'

  t.equal(
    actual,
    expected,
    'should return the next item of the array given a index')
  t.end()
})

test('getNextItem function', t => {
  const arr = ['first', 'second', 'third']

  const actual = getNextItem(arr, 2)
  const expected = 'first'

  t.equal(
    actual,
    expected,
    'should return the first item given the index of the last item')
  t.end()
})

test('getPreviousItem', t => {
  const arr = ['first', 'second', 'third']

  const actual = getPreviousItem(arr, 1)
  const expected = 'first'

  t.equal(
    actual,
    expected,
    'should return the previous item given a index')
  t.end()
})

test('getPreviousItem', t => {
  const arr = ['first', 'second', 'third']

  const actual = getPreviousItem(arr, 0)
  const expected = 'third'

  t.equal(
    actual,
    expected,
    'should return the last item given the index of the first item')
  t.end()
})

test('sequentiallyGetTimerType function', t => {
  const types = [{
    type: 'code',
    value: 1500
  }, {
    type: 'coffee',
    value: 300
  }]
  const currentType = 'code'
  const actual = sequentiallyGetTimerType(currentType, types, getNextItem)
  const expected = {
    type: 'coffee',
    value: 300
  }
  t.deepEqual(actual, expected, 'should return the next object of the array')
  t.end()
})

test('sequentiallyGetTimerType function', t => {
  const types = [{
    type: 'code',
    value: 1500
  }, {
    type: 'coffee',
    value: 300
  }]
  const currentType = 'coffee'
  const actual = sequentiallyGetTimerType(currentType, types, getPreviousItem)
  const expected = {
    type: 'code',
    value: 1500
  }
  t.deepEqual(
    actual,
    expected,
    'should return the previous object of the array')
  t.end()
})

test('getValueToResetTimer function', t => {
  const timerTypes = [{type: 'code', value: 1500}]
  const actual = getValueToResetTimer('code', timerTypes)
  const expected = 1500

  t.equal(
    actual,
    expected,
    'should return the default value of the timer type matched')
  t.end()
})

test('getValueToResetTimer function', t => {
  const timerTypes = [{type: 'code', value: 1500}]
  const actual = getValueToResetTimer('drink', timerTypes)
  const expected = 0

  t.equal(
    actual,
    expected,
    'should return 0 if the current type doesnt exist')
  t.end()
})
