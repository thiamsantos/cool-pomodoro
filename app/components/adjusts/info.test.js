import test from 'tape'
import Info from './info'

test('info component', t => {
  t.equal(typeof Info, 'function', 'should be a function')
  t.end()
})
