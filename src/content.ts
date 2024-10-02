export const title = "How Much is Enough";

export const subTitle = [
  "A Quantitative Monte Carlo Simulation to Model Ergodicity in Bitcoin Price Trajectories and Assess Path-Dependant Drawdown Probabilities for BTC Holdings.",
  "Number go up. Number go down. How much number you need make good up down.",
  "A special computer game to see how Bitcoin's price can go up and down over time, and what that might mean for the value of bitcoin holdings and financial goal.",
  "Riding the Bitcoin Rollercoaster? Our Magic Crystal Ball Predicts How Wacky Your Financial Journey Might Be!",
  "Unlock the Power of Predictive Analytics: Navigate Bitcoin's Ups and Downs Like a Pro with Our Expert Monte Carlo Simulation- Your Path to Bitcoin Wealth Management!",
  "Do You Regularly Mistake Wild Guesses for Statistical Probabilities? You'll Fit Right In Here.",
  "Learning the Ropes of Bitcoin Economics: A Hands-On Monte Carlo Simulation to Demystify Bitcoin's Potential Future Market Movements.",
  "Strategizing for Uncertainty: Employing Monte Carlo Simulations to Forge Robust Bitcoin Investment Pathways Across A Non-Random Stochastic Future.",
  "Satoshi Millionaire? Wholecoiner? Vladimir Club? Find Out How Far Your Bitcoin Can Go In The Volatile Future.",
];

export const legal = `Legal Disclaimer
The information, including data, analyses, and tools, provided on this website is for educational and informational purposes only and is not intended as legal, financial, or professional advice. This website explores theoretical Bitcoin price projections and drawdown scenarios based on user-inputted parameters. All content is speculative and designed to provide insights into Bitcoin’s potential future behavior under various conditions.

No Representation of Accuracy: The website makes no claims that the information provided is accurate, complete, or timely, nor does it make any warranties, express or implied, regarding the content. The scenarios and data presented are purely hypothetical and should not be relied upon for financial planning or investment purposes.

Consult Professionals: Before making any financial decisions based on the information provided on this website, we strongly recommend consulting with financial professionals. This website should not be used as a substitute for professional advice from a licensed practitioner.

MIT License: The source code used by this website is available under the MIT License, which permits reuse under specific conditions, but does not imply any endorsement of the content or its accuracy by the original creators of the software.

Privacy Policy
Data Privacy: This website respects user privacy. No personal data is collected, stored, or transmitted to any servers. All calculations and operations are performed locally on the user's device.

Terms of Service
Acceptance of Terms: By accessing and using this website, you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree with these terms, you are advised not to use this website.

Use License: This website grants you a limited, non-exclusive, non-transferable license to access and use the materials and information available on the site for personal, non-commercial purposes only, subject to these terms:

You may not modify, copy, or distribute any content without express permission.
You may not use any content for commercial purposes or public display.
You may not attempt to reverse engineer any software on this website.
You must not remove any copyright or proprietary notices from the materials.
You may not transfer the content to another person or replicate on any other server.
This license may be terminated if you violate any of these restrictions.

Limitation of Liability: The website, its owners, and contributors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your access to, use of, or inability to use the website, or any errors or omissions in the content.

Indemnification: You agree to indemnify and hold harmless the website and its affiliates, officers, agents, and employees from any claim or demand made by any third party due to or arising out of your use of the website or your violation of these terms.

Governing Law: These terms are governed by the laws of The United States without regard to its conflict of law provisions.

Changes to Terms: The website reserves the right to modify these terms at any time, and such modifications will be effective immediately upon posting the new terms.

Severability: If any part of these terms is held invalid or unenforceable, that part will be construed to reflect the parties' original intent, and the remaining portions will remain in full force and effect.`;

export const inputLabels = {
  clamp: "Clamp Price:",
  clampBottom: "Min",
  clampTop: "Max",
  distributions: "Distribution:",
  drawdownDate: "Starts:",
  epoch: "Epoch Count (1-30):",
  inflation: "Inflation:",
  model: "Model:",
  renderDrawdown: "Walks",
  renderExpenses: "Expenses:",
  renderModelMax: "Model Max:",
  renderModelMin: "Model Min:",
  renderNormal: "Std Dev:",
  renderQuantile: "Quantile:",
  renderWalk: "Walks",
  renderWalkQuantile: "Quantile:",
  samples: "Statistical Sample Count (1k-10k):",
  samplesToRender: "Walk count:",
  totalBitcoin: "Bitcoin:",
  vol: "Volatility (0-1):",
  walk: "Walk Strategy:",
};

export const fieldLabels = {
  drawdown: "Drawdown",
  graph: "Visualization",
  model: "Model",
  price: "Price",
  render: "Render",
};

export const pay = "gildedpleb@getalby.com";
export const bitcoinColor = "rgb(246, 145, 50)";

export const distributions = ["Normal", "Quantile", "None"] as const;
