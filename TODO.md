Things to do:

IMPROVE MODELING

- improve the bubble walk
- alter as many existing walks as possible to not be clamped, like SIn and Random presently are.
- Add a new model, a trajectory of past lows and highes per cycle as min and max. As per: https://www.ecoinometrics.com/bitcoins-growth-trajectory-after-the-halving/
- add walk settings ? like 1 variable that can be used for cycle frequency or something else
- SAW walk shoudl be spaced further apart / or have a less steep climb.
- INvestigate a custom walk like Zack was talking about

NOTIFICATION FEATURE

- In the tutorial, if you set Model Linear slope and then +/- to 1.01, the line will be a compressed, flat line. Some kind of note or notice shoudl display, "hey now, remember what we said in lesson 3? When their is no range the the model is useless!"
- add a note that if they are visitin the website for the first time, and they are on mobile, they should open it up on desktop and do the tutorial

SHARE FEATURE:

- Figure out a way to share the settings in a link.

RESULTS FEATURE:

- if bitcoin goes to Zero, find which date it does so on.

NEW OPTIONS

- Add a `priceImproved` flag to OneOffVariableFiat items. Presently it would be activated by default, but if we de-activated it, it would ensure that a variable drawdown that we are willing to spend 1BTC on will _always_ remove 1BTC from holdings, on a date that it is affordable to do so. This would make the drawdown graph pretty. To do this, we need to re-implament variable-drawdown-cache and variable drawdown final. We need to add a new column (boolean) as the flag, and shorten the week column from a Float64 to a Uint32 or UInt16. By doing this, we add a feature and reduce memory footprint! Woudl then off course need to pipe a new state setting throw everythign, but coudl be fun!
- add a new MODEL: S curve / hyperinflation: I think this can be done by applying inflation to all models, aka all model pricing.
- crosshair at mouse option, draw line / vertical / horizontal / box / text box
- Add an option on price modeling where hitting 0 is fatal.

IMPROVE DRAWDOWN

- Add the ability for a variable drawdown that is tied to % of total. Thus being able to model the 4% rule.
- Add a one-off drawdown event that is random between two dates. Say, if someone is expected to die and get inheritance. Do the same with a bitcoin amount.

REFACTOR DRAWDOWN MODAL

- when you hit "today" on the drawdow item, it goes to the previsou day?
- When you uncheck Active on a drawdown item, no matter what the setting is set to, it will only refrect something that was already loaded. It needs to fully copy over the items state into the modal, and not save any prev state artifacts.
- If i have 2 identical drawdown items, they both show up in the results, but i can not see the labels for both the labels overwrite eachother, it seems

IMPROVE AESTHETICS / UX

- Add info buttons where appropriate. Model, Walks,
- full performance audit
- Firefox allocs max-array upfront and does not memory clear it. It might be better to force firefox to use set-size arrays. (i believe this is done, but review it)
- when you tab into a drawdown content table cell, you shoudl be able to hit enter to enter the cell, same with any other buttons and tabbing also escape shoudl exit modal.
- We should be able to see the full setting in a screen shot (so put the full settings inthe results.)
- is it possilbe to solve for: "When Bitcoin hits $100k, all you would need is 4 BTC to withdraw $10k/mo for the rest of your life. \*Assuming BTC has a CAGR of at least 30% for the rest of your life."

BUGS

- When set to Random Walk, it looks like one of the quantiles converges with Max Price line. INvestigate this, cus this shoudl not be the case.
- swiping the results box around can force a refresh of the page. Results box can be dragged out of frame on mobile
- If you select normal distribution for the drawdown, and have a flat leading area, it will not say your darwdown is flat, but instead it will be non-existant.
- can not set inflation to nothing (undefined) by hitting delete. Check other fields
- add a versioning system to saved files so that they can be improved if needed.

PROBABLY REJECTED:

- If you have a variable drawdown event, that you can not afford (cus the drawdown is too large) shoudl you pay for a fraction of it or do you simple jsut never afford it and paths get bifurcated?
- when you click out of a model or render, it should close the panel.
