import test from 'tape'
import store from './store'
import keyboardShortcuts from './keyboard-shortcuts'

test('keyboardShortcut space', t => {
  const space = () => keyboardShortcuts(store)({code: 'Space'})
  t.equal(
    store.getState().timer.playState,
    'running',
    'should return the default state')
  t.notOk(space(), 'should return false in order to stop the event')
  t.equal(
    store.getState().timer.playState,
    'paused',
    'should change the playState to paused')
  space()
  t.equal(
    store.getState().timer.playState,
    'running',
    'should change the playState to running')
  t.end()
})

test('keyboardShortcut ctrl', t => {
  const ctrl = keyboardShortcuts(store)({ctrlKey: false})
  t.notOk(ctrl, 'should return false in order to stop the event')
  t.deepEqual(
    store.getState().timer,
    {
      playState: 'running',
      value: 1500,
      type: 'code'
    },
    'should do nothing')
  t.end()
})

test('keyboardShortcut ctrl+arrowRight', t => {
  const ctrlArrowRight = () => keyboardShortcuts(store)({
    ctrlKey: true,
    code: 'ArrowRight'
  })
  t.notOk(ctrlArrowRight(), 'should return in order to stop the event')
  t.equal(
    store.getState().timer.type,
    'social',
    'should change the timer type to the next one')
  t.end()
})

test('keyboardShortcut ctrl+arrowLeft', t => {
  const ctrlArrowLeft = () => keyboardShortcuts(store)({
    ctrlKey: true,
    code: 'ArrowLeft'
  })
  t.notOk(ctrlArrowLeft(), 'should return in order to stop the event')
  t.equal(
    store.getState().timer.type,
    'code',
    'should change the timer type to the previous one')
  t.end()
})
