import test from 'tape'
import Timer from './'

test('timer component', t => {
  t.equal(typeof Timer, 'function', 'should be a function')
  t.end()
})
