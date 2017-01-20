import test from 'tape'
import Adjusts from './'

test('adjusts component', t => {
  t.equal(typeof Adjusts, 'function', 'should be a function')
  t.end()
})
