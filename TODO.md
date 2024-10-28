Things to do:

- Add a `priceImproved` flag to OneOffVariableFiat items. Presently it would be activated by default, but if we de-activated it, it would ensure that a variable drawdown that we are willing to spend 1BTC on will _always_ remove 1BTC from holdings, on a date that it is affordable to do so. This would make the drawdown graph pretty. To do this, we need to re-implament variable-drawdown-cache and variable drawdown final. We need to add a new column (boolean) as the flag, and shorten the week column from a Float64 to a Uint32 or UInt16. By doing this, we add a feature and reduce memory footprint! Woudl then off course need to pipe a new state setting throw everythign, but coudl be fun!

- Add info buttons where appropriate. Model, Walks,
- this needs to be deployed on netlify with apporpriate HTTPS headers for using SharedArrayBuffers
- improve the bubble walk
- alter as many existing walks as possible to not be clamped, like SIn and Random presently are.
- Do the full TUTORIAL
- add a new MODEL: S curve / hyperinflation
- full performance audit
- Firefox allocs max-array upfront and does not memory clear it. It might be better to force firefox to use set-size arrays. (i believe this is done, but review it)
- crosshair at mouse option, draw line / vertical / horizontal / box / text box
- when you tab into a drawdown content table cell, you shoudl be able to hit enter to enter the cell, same with any other buttons and tabbing also escape shoudl exit modal.
- Figure out a way to share the settings in a link.
- if bitcoin goes to Zero, find which date it does so on.
- Add an option on price modeling where hitting 0 is fatal.
- review / finalize the open/close state of all panels and positioning as the user navigates the app on mobil and desktop (if the use clicks Model on cell, Render and Drawdown should close, etc)
- Add the ability for a variable drawdown that is tied to % of total. Thus being able to model the 4% rule.
- When set to Random Walk, it looks like one of the quantiles converges with Max Price line. INvestigate this, cus this shoudl not be the case.
- Add a one-off drawdown event that is random between two dates.
