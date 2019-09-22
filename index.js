Promise.resolve().then
// Get current global object
const globalObj = (() => {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof self !== 'undefined') return self
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  if (typeof this !== 'undefined') return this
  throw new Error('Unable to locate global `this`')
})()

delete globalObj.Promise

// Check if a function or object defines then method
function isThenable(object) {
  if (object === null) return false

  const objectType = typeof object
  if (objectType === 'function' || objectType === 'object') {
    if (typeof object.then === 'function') return true
  }

  return false
}


// Check if platform contains native Promise object
function hasNativePromise() {
  return typeof Promise !== 'undefined' && ~Promise.toString().indexOf('[native code]')
}

globalObj.Promise = (function () {
  if (hasNativePromise()) return Promise

  const STATES = {
    pending: 0,
    fulfilled: 1,
    rejected: 2
  }

  /**
   * Создает новый промис
   * @param {*} executor Функция-callback, принимающая resolve и reject callback'и
   * resolve принимает значение или thenable и переводит промис в статус fulfilled
   * reject принимает причину ошибки и переводит промис в статус rejected
   */
  function Promise(executor) {
    let _state = STATES.pending
    let _value = null
    const callbacks = []

    if (!this instanceof Promise) throw new Error('Promise must call with constructor')

    try {
      executor(
        function (value) { setState(value, STATES.fulfilled) },
        function (value) { setState(value, STATES.rejected) }
      )
    } catch (err) {
      setState(err, STATES.rejected)
    }

    /**
     * Добавляет callback, который будет вызван после разрешения промиса
     * @param resolveCb Callback, который будет вызван при успешном выполнении промиса
     * @param rejectCb Callback, который будет вызван при ошибке
     * @returns Promise
     */
    this.then = function (...callbacks) {
      return new Promise(function (...executors) {
        addCallback(callbacks, executors)
      })
    }

    /**
     * Добавляет callback, который выполняется после разрешения промиса с ошибкой
     * @param rejectCb Callback, который будет вызван после разрешения с ошибкой
     * @returns Promise
     */
    this.catch = function (rejectCb) {
      return this.then(
        function (value) { return value },
        rejectCb
      )
    }

    // Set state of promise and execute callbacks
    function setState(value, state) {
      setTimeout(function () {
        if (_state !== STATES.pending) return

        // unpack if value is thenable
        if (isThenable(value)) {
          return value.then(
            function (value) { setState(value, STATES.fulfilled) },
            function (value) { setState(value, STATES.rejected) }
          )
        }

        _state = state
        _value = value

        processCallbacks()
      }, 0)
    }

    // Process callbacks when promise is settled
    function processCallbacks() {
      if (_state === STATES.pending) return

      callbacks.forEach(function (callback) {
        _state === STATES.fulfilled
          ? callback.onFulfilled(_value)
          : callback.onRejected(_value)
      })

      callbacks.length = 0
    }

    // Attach callback to promise
    function addCallback(
      [fulfillCb, rejectCb],
      [resolve, reject]
    ) {
      callbacks.push({
        onFulfilled() {
          if (!fulfillCb) return resolve(_value)

          try { resolve(fulfillCb(_value)) }
          catch (err) { reject(err) }
        },
        onRejected() {
          if (!rejectCb) return reject(_value)

          try { resolve(rejectCb(_value)) }
          catch (err) { reject(err) }
        }
      })

      processCallbacks()
    }
  }

  /**
   * Создает новый успешно разрешенный промис
   * @param value Значение/thenable с которым разрешится промис
   */
  Promise.resolve = function (value) {
    return new Promise(function (resolve) {
      resolve(value)
    })
  }

  /**
   * Создает новый промис с ошибкой
   * @param reason Ошибка, с которой разрешится промис
   */
  Promise.reject = function (reason) {
    return new Promise(function (_, reject) {
      reject(reason)
    })
  }

  /**
   * Создает промис, который выполнится, когда будут разрешены все промисы, переданные в аргументе
   * @param promises Коллекция промисов
   */
  Promise.all = function (promises) {
    return new Promise(function (resolve, reject) {
      if (!Array.isArray(promises)) throw new Error(`${promises} is not an array.`)

      const resolvedPromises = []

      promises.forEach(function (promise, index) {
        Promise.resolve(promise)
          .then(function (value) {
            // установка происходит по индексу, т.к промисы разрешаются не по порядку
            resolvedPromises[index] = value

            if (resolvedPromises.length !== promises.length) return

            resolve(resolvedPromises)
          })
          .catch(reject)
      })
    })
  }

  /**
   * Создает промис, который выполнится, когда будет разрешен один из промисов, переданных в аргументе
   * @param promises Коллекция промисов
   */
  Promise.race = function (promises) {
    return new Promise(function (resolve, reject) {
      if (!Array.isArray(promises)) throw new Error(`${promises} is not an array.`)

      promises.forEach(function (promise) {
        Promise.resolve(promise)
          .then(resolve)
          .catch(reject)
      })
    })
  }

  return Promise
})()

// function testPromise() {
//   // check main functionality of Promise
//   void function () {
//     const promise = new Promise(function (resolve) { resolve(42) })

//     promise
//       .then(function (value) {
//         return value + 1
//       })
//       .then(function (value) {
//         console.log(value) // 43
//         return new Promise(function (resolve) { resolve(137) })
//       })
//       .then(function (value) {
//         console.log(value) // 137
//         throw new Error('Error in promise chain')
//       })
//       .then(
//         function () { console.log('Будет проигнорировано') },
//         // function () { return 'ошибка обработана' }
//       )
//       .catch(function (value) {
//         console.log(value) // 'ошибка обработана'
//       })
//   }()

//   // Check Promise.all
//   void function () {
//     const p1 = Promise.resolve(3)
//     const p2 = 1337
//     const p3 = new Promise((resolve, reject) => {
//       setTimeout(resolve, 100, 'foo')
//     })

//     // log [3, 1337, 'foo']
//     Promise.all([p1, p2, p3]).then(values => console.log(values))
//   }()

//   // Check Promise.race
//   void function () {
//     const promise1 = new Promise((resolve, reject) => setTimeout(resolve, 500, 'one'))
//     const promise2 = new Promise((resolve, reject) => setTimeout(resolve, 100, 'two'))
//     const promise3 = Promise.reject(new Error('Error in race promise'))

//     // log 'Error in race promise'
//     Promise.race([promise1, promise2, promise3])
//       .then(value => console.log(value))
//       .catch(reason => console.log(reason))

//     // log 'two'
//     Promise.race([promise1, promise2, promise3])
//       .then(value => console.log(value))
//       .catch(reason => console.log(reason))
//   }()
// }

// testPromise()
