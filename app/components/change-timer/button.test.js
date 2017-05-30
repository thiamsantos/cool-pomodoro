import test from 'tape'
import browserEnv from 'browser-env'
import store from '../../services/store'
import {default as Button, changeTimer} from './button'

browserEnv(['document'])

test('Button component', t => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = Button({
    state: store.getState(),
    dispatch: store.dispatch,
    timer: {
      value: 90,
      type: 'code'
    }
  })

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'Code'

  t.equal(
    actual,
    expected,
    'the text content should be the timerType capitalizes'
  )
  t.end()
})

test('changeTimer function', t => {
  const target = document.createElement('div')

  changeTimer({
    dispatch: store.dispatch,
    timer: {
      type: 'drink',
      value: 200
    }
  })({target})

  t.equal(
    store.getState().timer.value,
    200,
    'should change the timer value from the store'
  )
  t.equal(
    store.getState().timer.type,
    'drink',
    'should change the timer type from the store'
  )

  changeTimer({
    dispatch: store.dispatch,
    timer: {
      type: 'code',
      value: 1500
    }
  })({target})

  t.equal(
    store.getState().timer.value,
    1500,
    'should change the timer value from the store'
  )
  t.equal(
    store.getState().timer.type,
    'code',
    'should change the timer type from the store'
  )

  t.end()
})
