NOTIFICATION FEATURE

- In the tutorial, if you set Model Linear slope and then +/- to 1.01, the line will be a compressed, flat line. Some kind of note or notice should display, "hey now, remember what we said in lesson 3? When their is no range the the model is useless!"

SHARE FEATURE:

- Figure out a way to share the settings in a link.

RESULTS FEATURE:

- if bitcoin goes to Zero, find which date it does so on.

NEW OPTIONS

- Add a `priceImproved` flag to OneOffVariableFiat items. Presently it would be activated by default, but if we de-activated it, it would ensure that a variable drawdown that we are willing to spend 1BTC on will _always_ remove 1BTC from holdings, on a date that it is affordable to do so. This would make the drawdown graph pretty. To do this, we need to re-implement variable-drawdown-cache and variable-drawdown-final. We need to add a new column (boolean) as the flag, and shorten the week column from a Float64 to a Uint32 or UInt16. By doing this, we add a feature and reduce memory footprint! Would then off course need to pipe a new state setting throw everything, but could be fun!
- crosshair at mouse option, draw line / vertical / horizontal / box / text box
- Add an option on price modeling where hitting 0 is fatal.
- Add the ability to see past performance of min/max model lines. This is interesting as its adding a new metric not affecting other metrics, and its pretty simple.
- ONLY SPEND IF YOU CAN AFFORD: would be in an individual sample. Basically, lets say you have a OneOff event to spend 1BTC at some future date with a variable range some above 1BTC and some below. It would only trigger the event on timelines that you could afford it. I don't like this as it basically creates two paths in the data. You kind of need stats around that "only 30% of the samples are able to afford this" etc

IMPROVE DRAWDOWN

- Add the ability for a variable drawdown that is tied to % of total. Thus being able to model the 4% rule.
- Add a one-off drawdown event that is random between two dates. Say, if someone is expected to die and get inheritance. Do the same with a bitcoin amount.

IMPROVE AESTHETICS / UX

- Add info buttons where appropriate. Model, Walks,
- full performance audit
- Firefox allocs max-array upfront and does not memory clear it. It might be better to force firefox to use set-size arrays. (i believe this is done, but review it)
- when you tab into a drawdown content table cell, you should be able to hit enter to enter the cell, same with any other buttons and tabbing also escape should exit modal.
- We should be able to see the full setting in a screen shot (so put the full settings in the results.)
- is it possible to solve for: "When Bitcoin hits $100k, all you would need is 4 BTC to withdraw $10k/mo for the rest of your life. \*Assuming BTC has a CAGR of at least 30% for the rest of your life."

BUGS

- swiping the results box around can force a refresh of the page. Results box can be dragged out of frame on mobile
- can not set inflation to nothing (undefined) by hitting delete. Check other fields

IMPROVE MODELING

- INvestigate a custom models: "what if bitcoin is above this price by this year"
- add Saylor Models
- Add a +/- tab to a power law regression

ADD SLIDER

- Add a slider so i can click on a One Off Event vertical line and drag it left or right, forward in time or backward in time.

---

PROBABLY REJECTED:

- If you have a variable drawdown event, that you can not afford (cus the drawdown is too large) shoudl you pay for a fraction of it or do you simple jsut never afford it and paths get bifurcated?
- when you click out of a model or render, it should close the panel.
- S-Cruve: its easy to add S-Cruve style inflation adjsutments to any graph, but on log scale, its simply irrelevant.
- add a new MODEL: S curve / hyperinflation: I think this can be done by applying inflation to all models, aka all model pricing. Would be suuuper easty to implement, But perhaps not pheasable? Infinity graphs worhtless on all scales.
