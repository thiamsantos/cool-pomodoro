import test from 'tape'
import browserEnv from 'browser-env'
import store from '../../services/store'
import {default as Button, changeTimer, isActive} from './button'

browserEnv(['document'])

test('Button component', t => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = Button({
    store,
    timer: 90,
    timerType: 'code'
  })

  const actual = wrapper.querySelector('button').textContent.trim()
  const expected = 'Code'

  t.equal(
    actual,
    expected,
    'the text content should be the timerType capitalizes')
  t.end()
})

test('changeTimer function', t => {
  changeTimer({
    store,
    timerType: 'drink',
    timer: 200
  })()

  t.equal(
    store.getState().timer.value,
    200,
    'should change the timer value from the store')
  t.equal(
    store.getState().timer.type,
    'drink',
    'should change the timer type from the store')

  changeTimer({
    store,
    timerType: 'code',
    timer: 1500
  })()

  t.equal(
    store.getState().timer.value,
    1500,
    'should change the timer value from the store')
  t.equal(
    store.getState().timer.type,
    'code',
    'should change the timer type from the store')

  t.end()
})

test('isActive function', t => {
  const styles = {
    buttonActive: 'active'
  }

  t.equal(
    isActive({store, timerType: 'drink'}, styles),
    '',
    'should return a empty if false')
  t.equal(
    isActive({store, timerType: 'code'}, styles),
    'active',
    'should return a className if true')
  t.end()
})
