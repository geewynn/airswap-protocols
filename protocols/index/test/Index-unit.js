const Index = artifacts.require('Index')

const {
  passes,
  equal,
  reverted,
  emitted,
} = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants

contract('Index Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[1]
  let bobAddress = accounts[2]
  let carolAddress = accounts[3]
  let davidAddress = accounts[4]

  let snapshotId
  let index

  let aliceLocatorData = padAddressToLocator(aliceAddress)
  let bobLocatorData = padAddressToLocator(bobAddress)
  let carolLocatorData = padAddressToLocator(carolAddress)
  let emptyLocatorData = padAddressToLocator(EMPTY_ADDRESS)

  // helpers
  const USER = 'user'
  const SCORE = 'score'
  const DATA = 'data'

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup', async () => {
    index = await Index.new({ from: owner })
  })

  describe('Test constructor', async () => {
    it('should setup the linked list as just a head, length 0', async () => {
      let listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')

      let locators = await index.fetchLocators(10)
      equal(locators.length, 0, 'list should have 0 locators')
    })
  })

  describe('Test setLocator', async () => {
    it('should not allow a non owner to call setLocator', async () => {
      await reverted(
        index.setLocator(aliceAddress, 2000, aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow a locator to be inserted by the owner', async () => {
      // set a locator from the owner
      let result = await index.setLocator(
        aliceAddress,
        2000,
        aliceLocatorData,
        {
          from: owner,
        }
      )

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.user === aliceAddress &&
          event.score.toNumber() === 2000 &&
          event.data === aliceLocatorData
        )
      })

      // check it has been inserted into the linked list correctly
      let locators = await index.fetchLocators(10)
      equal(locators.length, 1, 'list should have 1 locator')
      equal(locators[0], aliceLocatorData, 'Alice should be in list')

      // check the length has increased
      let listLength = await index.length()
      equal(listLength, 1, 'Link list length should be 1')
    })

    it('should insert subsequent locators in the correct order', async () => {
      // insert alice
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })

      // now add more
      let result = await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })

      // check the SetLocator event was emitted
      emitted(result, 'SetLocator', event => {
        return (
          event.user === bobAddress &&
          event.score.toNumber() === 500 &&
          event.data === bobLocatorData
        )
      })

      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const locators = await index.fetchLocators(7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
    })

    it('should not be able to set a second locator if one already exists for an address', async () => {
      let trx = index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await passes(trx)
      trx = index.setLocator(aliceAddress, 5000, aliceLocatorData, {
        from: owner,
      })
      await reverted(trx, 'LOCATOR_ALREADY_SET')

      let length = await index.length.call()
      equal(length.toNumber(), 1, 'length increased, but total users has not')
    })
  })

  describe('Test unsetLocator', async () => {
    beforeEach('Setup locators', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })
    })

    it('should not allow a non owner to call unsetLocator', async () => {
      await reverted(
        index.unsetLocator(aliceAddress, { from: nonOwner }),
        'Ownable: caller is not the owner'
      )
    })

    it('should leave state unchanged for someone who hasnt staked', async () => {
      let returnValue = await index.unsetLocator.call(davidAddress, {
        from: owner,
      })
      equal(returnValue, false, 'unsetLocator should have returned false')

      await index.unsetLocator(davidAddress, { from: owner })

      let listLength = await index.length()
      equal(listLength, 3, 'Link list length should be 3')

      const locators = await index.fetchLocators(7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
    })

    it('should unset the locator for a valid user', async () => {
      // check it returns true
      let returnValue = await index.unsetLocator.call(bobAddress, {
        from: owner,
      })
      equal(returnValue, true, 'unsetLocator should have returned true')

      // check it emits an event correctly
      let result = await index.unsetLocator(bobAddress, { from: owner })
      emitted(result, 'UnsetLocator', event => {
        return event.user === bobAddress
      })

      let listLength = await index.length()
      equal(listLength, 2, 'Link list length should be 2')

      let locators = await index.fetchLocators(7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')

      await index.unsetLocator(aliceAddress, { from: owner })
      await index.unsetLocator(carolAddress, { from: owner })

      listLength = await index.length()
      equal(listLength, 0, 'Link list length should be 0')

      locators = await index.fetchLocators(10)
      equal(locators.length, 0, 'list should have 0 locators')
    })

    it('unsetting locator twice in a row for an address has no effect', async () => {
      let trx = index.unsetLocator(bobAddress, { from: owner })
      await passes(trx)
      let size = await index.length.call()
      equal(size, 2, 'Locator was improperly removed')
      trx = index.unsetLocator(bobAddress, { from: owner })
      await passes(trx)
      equal(size, 2, 'Locator was improperly removed')

      let locators = await index.fetchLocators(7)
      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
    })
  })

  describe('Test getLocator', async () => {
    beforeEach('Setup locators again', async () => {
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })
    })

    it('should return empty locator for a non-user', async () => {
      let davidLocator = await index.getLocator(davidAddress)
      equal(
        davidLocator[USER],
        EMPTY_ADDRESS,
        'David: Locator address not correct'
      )
      equal(davidLocator[SCORE], 0, 'David: Locator score not correct')
      equal(davidLocator[DATA], emptyLocatorData, 'David: Locator not correct')

      // now for a recently unset locator
      await index.unsetLocator(carolAddress, { from: owner })
      let testLocator = await index.getLocator(carolAddress)
      equal(
        testLocator[USER],
        EMPTY_ADDRESS,
        'Carol: Locator address not correct'
      )
      equal(testLocator[SCORE], 0, 'Carol: Locator score not correct')
      equal(
        testLocator[DATA],
        emptyLocatorData,
        'Carol: Locator data not correct'
      )
    })

    it('should return the correct locator for a valid user', async () => {
      let aliceLocator = await index.getLocator(aliceAddress)
      equal(
        aliceLocator[USER],
        aliceAddress,
        'Alice: Locator address not correct'
      )
      equal(aliceLocator[SCORE], 2000, 'Alice: Locator score not correct')
      equal(
        aliceLocator[DATA],
        aliceLocatorData,
        'Alice: Locator data not correct'
      )

      let bobLocator = await index.getLocator(bobAddress)
      equal(bobLocator[USER], bobAddress, 'Bob: locator address not correct')
      equal(bobLocator[SCORE], 500, 'Bob: Locator score not correct')
      equal(
        bobLocator[DATA],
        bobLocatorData,
        'Bob: Locator locator data not correct'
      )
    })
  })

  describe('Test fetchLocators', async () => {
    it('returns an empty array with no locators', async () => {
      const locators = await index.fetchLocators(7)
      equal(locators.length, 0, 'there should be no locators')
    })

    it('returns specified number of elements if < length', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      const locators = await index.fetchLocators(2)
      equal(locators.length, 2, 'there should only be 2 locators returned')

      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
    })

    it('returns only length if requested number if larger', async () => {
      // add 3 locators
      await index.setLocator(aliceAddress, 2000, aliceLocatorData, {
        from: owner,
      })
      await index.setLocator(bobAddress, 500, bobLocatorData, {
        from: owner,
      })
      await index.setLocator(carolAddress, 1500, carolLocatorData, {
        from: owner,
      })

      const locators = await index.fetchLocators(10)
      equal(locators.length, 3, 'there should only be 3 locators returned')

      equal(locators[0], aliceLocatorData, 'Alice should be first')
      equal(locators[1], carolLocatorData, 'Carol should be second')
      equal(locators[2], bobLocatorData, 'Bob should be third')
    })
  })
})