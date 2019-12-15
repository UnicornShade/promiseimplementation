## Примеры
```
const delay = delay => new Promise(resolve => {
  setTimeout(() => {
    resolve()
  }, delay);
})

delay(5000)
  .then(() => console.log('5s passed'))
```


```
const someTimeConsumingFunction = () = { ... }

Promise.resolve()
  .then(() => someTimeConsumingFunction())
```

```
Promise.all([delay(1000), delay(200), delay(500)]).
  then(() => console.log('Exec after all promise settled'))
```

```
Promise.race([delay(100), delay(500), delay(50)])
  .then(() => console.log('Exec after 50ms delay))
```
