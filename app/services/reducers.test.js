import test from 'tape'
import {
  timer,
  adjusts,
  timerInitialState,
  adjustsInitialState
} from './reducers'

test('timer reducer', t => {
  const actual = timer(undefined, {})
  const expected = timerInitialState

  t.deepEqual(actual, expected, 'should return the initial state')
  t.end()
})

test('timer reducer', t => {
  const action = {
    type: 'DECREMENT_TIMER'
  }
  const actual = timer(timerInitialState, action)
  const expected = {
    ...timerInitialState,
    value: 1499
  }

  t.deepEqual(
    actual,
    expected,
    'should decrement the value field')
  t.end()
})

test('timer reducer', t => {
  const action = {
    type: 'CHANGE_TIMER_PLAY_STATE',
    payload: {
      state: 'running'
    }
  }
  const actual = timer(timerInitialState, action)
  const expected = {
    ...timerInitialState,
    playState: 'running'
  }

  t.deepEqual(actual, expected, 'should change the play state')
  t.end()
})

test('timer reducer', t => {
  const action = {
    type: 'CHANGE_TIMER_TYPE',
    payload: {
      value: 200,
      type: 'coffee'
    }
  }
  const actual = timer(timerInitialState, action)
  const expected = {
    playState: 'running',
    value: 200,
    type: 'coffee'
  }

  t.deepEqual(actual, expected, 'should change the timer type')
  t.end()
})

test('timer reducer', t => {
  const action = {
    type: 'RESET_TIMER',
    payload: {
      value: 700
    }
  }
  const actual = timer(timerInitialState, action)
  const expected = {
    playState: 'paused',
    value: 700,
    type: 'code'
  }

  t.deepEqual(actual, expected, 'should reset the timer')
  t.end()
})

test('adjusts reducer', t => {
  const actual = adjusts(undefined, {})
  const expected = adjustsInitialState

  t.deepEqual(actual, expected, 'should return the initial state')
  t.end()
})

test('adjusts reducer', t => {
  const action = {
    type: 'TOGGLE_ADJUST',
    payload: {
      name: 'vibration'
    }
  }
  const actual = adjusts(adjustsInitialState, action)
  const expected = {
    ...adjustsInitialState,
    vibration: true
  }

  t.deepEqual(actual, expected, 'should toggle the property vibration')
  t.end()
})
