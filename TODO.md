NOTIFICATION FEATURE

- In the tutorial, if you set Model Linear slope and then +/- to 1.01, the line will be a compressed, flat line. Some kind of note or notice should display, "hey now, remember what we said in lesson 3? When their is no range the the model is useless!"

SHARE FEATURE:

- Figure out a way to share the settings in a link.

RESULTS FEATURE:

- if bitcoin goes to Zero, find which date it does so on.

COMPARE FEATURE:

- compare two drawdown scenarios on top of one another

NEW OPTIONS

- Add a `priceImproved` flag to OneOffVariableFiat items. Presently it would be activated by default, but if we de-activated it, it would ensure that a variable drawdown that we are willing to spend 1BTC on will _always_ remove 1BTC from holdings, on a date that it is affordable to do so. This would make the drawdown graph pretty. To do this, we need to re-implement variable-drawdown-cache and variable-drawdown-final. We need to add a new column (boolean) as the flag, and shorten the week column from a Float64 to a Uint32 or UInt16. By doing this, we add a feature and reduce memory footprint! Would then off course need to pipe a new state setting throw everything, but could be fun!
- crosshair at mouse option, draw line / vertical / horizontal / box / text box
- Add an option on price modeling where hitting 0 is fatal.
- Add the ability to see past performance of min/max model lines. This is interesting as its adding a new metric not affecting other metrics, and its pretty simple.
- ONLY SPEND IF YOU CAN AFFORD: would be in an individual sample. Basically, lets say you have a OneOff event to spend 1BTC at some future date with a variable range some above 1BTC and some below. It would only trigger the event on timelines that you could afford it. I don't like this as it basically creates two paths in the data. You kind of need stats around that "only 30% of the samples are able to afford this" etc. - If you have a variable drawdown event, that you can not afford (cus the drawdown is too large) shoudl you pay for a fraction of it or do you simple jsut never afford it and paths get bifurcated?

IMPROVE DRAWDOWN

- Add the ability for a variable drawdown that is tied to % of total. Thus being able to model the 4% rule.
- Add a one-off drawdown event that is random between two dates. Say, if someone is expected to die and get inheritance. Do the same with a bitcoin amount.
- Add a new Monte Carlo simulator for inflation itself. the inflation rate could be potentially bound between 0 and 8 or -10 and +15 or something but it should go through the same random walk path and then we decided for that particular month what de-inflation is that month.

IMPROVE AESTHETICS / UX

- Add info buttons where appropriate. Model, Walks,
- full performance audit
- Firefox allocs max-array upfront and does not memory clear it. It might be better to force firefox to use set-size arrays. (i believe this is done, but review it)
- when you tab into a drawdown content table cell, you should be able to hit enter to enter the cell, same with any other buttons and tabbing also escape should exit modal.
- We should be able to see the full setting in a screen shot (so put the full settings in the results.)
- is it possible to solve for: "When Bitcoin hits $100k, all you would need is 4 BTC to withdraw $10k/mo for the rest of your life. \*Assuming BTC has a CAGR of at least 30% for the rest of your life."
- When I scroll over the graph, I can zoom in. This is good. But if I zoom out too far, the whole graph gets compressed into a teeny little section in the middle of the screen. This is not good. I shouldn't be able to have the zoom out scroll go shorter than the width of the frame.
- An entire new UI rewrite is in order. we need much better UI handling across all the different interfaces. Use a library or something.
- An entire new redesign is in order.
- We need to do a way better job of communicating how inflation is calculated across everything in the app. For instance, if you have a paycheck of $100,000 a year Does that mean your paycheck is going up 8% per year? or is it not affected or is it going down 80% per year?

KNOWN

- One-off fiat variable-date, Start at 100: the spend is the last week that path is under the item's inflated dollar cost, and only when every later week on the chart stays above that cost. Inflation compounds on the item. A bitcoin path can be higher than it was and still fall back under the line, because the item's dollar cost rises faster than the path. A date that looks settled on a short epoch is the last unaffordable week for that chart only. A longer epoch moves that week, or drops the spend when the path is still under the line at the new right edge. Slide 17 says inflation can outrun bitcoin and the event may never show. The FAQ says 100 means spend on the last unaffordable day. Neither says a path can clear the cost and then fall back under it. Leave the search as it is. Remember this when explaining inflation or writing tutorial copy.

BUGS

- swiping the results box around can force a refresh of the page. Results box can be dragged out of frame on mobile
- when you are in reocurring item, and you click up on the annual change % it moves to modal. This i no good. either give it padding or make the modal stick on the top.

IMPROVE MODELING

- INvestigate a custom models: "what if bitcoin is above this price by this year"
- add Saylor Models
- Add a +/- tab to a power law regression

ADD SLIDER

- Add a slider so i can click on a One Off Event vertical line and drag it left or right, forward in time or backward in time.

Tuesday, October 13, 2026:

- Add multiple sources for latest block. so we find the latest block but we need multiple sources for that.
- We should also allow it to get the latest block from a local Bitcoin blockchain and get the latest price from a local deployed thing. I don't know how that works. I don't know how you get the latest price or something, but we should investigate that.
- move all the turorial slides to MD (after redesign)
- Add all the new prices to the backend, so we don't need to fetch them.

---

PROBABLY REJECTED:

- when you click out of a model or render, it should close the panel.
- S-Cruve: its easy to add S-Cruve style inflation adjsutments to any graph, but on log scale, its simply irrelevant.
- add a new MODEL: S curve / hyperinflation: I think this can be done by applying inflation to all models, aka all model pricing. Would be suuuper easty to implement, But perhaps not pheasable? Infinity graphs worhtless on all scales.
