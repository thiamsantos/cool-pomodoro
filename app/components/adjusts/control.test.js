import test from 'tape'
import browserEnv from 'browser-env'
import store from '../../services/store'
import {handleChange, default as Control} from './control'

browserEnv(['document'])

test('control component', t => {
  const node = Control({
    state: store.getState(),
    dispatch: store.dispatch,
    name: 'vibration'
  })
  const component = document.createElement('div')
  component.innerHTML = node

  t.equal(
    component.querySelector('input').id,
    'vibration',
    'the input should have as id the second argument passed'
  )
  t.notOk(
    component.querySelector('input').checked,
    'the input should be unchecked by default'
  )
  t.equal(
    component.querySelector('label').getAttribute('for'),
    'vibration',
    'the label should have as for attribute the second argument passed'
  )
  t.equal(
    component.querySelector('label').textContent.trim(),
    'Vibration',
    'the label should have as text content the second argument capitalized'
  )
  t.end()
})

test('handle change function', t => {
  handleChange(store.dispatch, 'vibration')()

  t.ok(
    store.getState().adjusts.vibration,
    'should toggle the property adjusts.vibration from the state'
  )

  handleChange(store.dispatch, 'vibration')()

  t.notOk(
    store.getState().adjusts.vibration,
    'should toggle the property adjusts.vibration from the state'
  )
  t.end()
})
