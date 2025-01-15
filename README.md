# Stack Math: The Bitcoin Modeling Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.2.2-blue)](https://www.typescriptlang.org/)

Stack Math is an open-source Monte Carlo framework that combines ergodic walk strategies with traditional Bitcoin pricing models to generate probabilistic financial planning scenarios. It bridges the gap between theoretical Bitcoin models and practical financial decision-making needs.

## Features

- **Advanced Price Modeling**

  - Boundary Definition using established models (Power Law, Rainbow, etc.)
  - Ergodic Walk Strategies within defined boundaries
  - Monte Carlo Simulation generating thousands of price trajectories
  - Normal and Regression Distribution analysis for price and drawdown

- **Financial Planning Tools**

  - Retirement planning scenarios
  - Major purchase modeling
  - Recurring expense calculations
  - Monetary inflation impact analysis

- **Technical Implementation**
  - Client-side computation using Web Workers
  - Fully transparent and verifiable open-source framework
  - Custom-built dependency tree for deterministic results
  - React and TypeScript-based architecture

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/stack-math.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## System Requirements

- Node.js >= 18.0.0
- Modern browser with ES6 module support

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture

Stack Math implements a sophisticated architecture that includes:

- Dedicated web workers for computation-intensive Monte Carlo simulations
- Custom dependency tree management for calculation ordering
- Client-side execution for data privacy
- Responsive UI with React and styled-components
- Comprehensive charting capabilities using Chart.js

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## Security

All operations execute client-side, ensuring user data privacy. No sensitive financial data is transmitted over the network.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Project Structure

```
src/
├── api.ts                 # API interfaces
├── components/           # React components
├── contexts/            # React contexts
├── data/               # Data models and datasets
│   ├── models/        # Price prediction models
│   └── walks/         # Walk strategy implementations
├── panels/            # Main UI panels
└── tutorial/          # Interactive tutorial
```

## Credits

Stack Math is the culmination of six years of work in Bitcoin modeling and financial planning technology. The project represents a fundamental rethinking of how we approach Bitcoin price prediction and practical financial planning.

## Support

For questions, feature requests, or bug reports, please open an issue on our GitHub repository.

---

**Note:** Stack Math is currently in public beta. While the core functionality is stable, we're continuously working on improvements and welcome community feedback.

## Internal Dependency Graph

```mermaid
flowchart LR
    %% Render related base variables
    renderDrawdownDistribution
    renderDrawdownWalks
    renderModelMax
    renderModelMin
    renderPriceDistribution
    renderPriceWalks
    samplesToRender
    showHistoric

    %% Halving related
    currentBlock
    halvings

    %% Model related
    clampBottom
    clampTop
    epochCount
    minMaxMultiple
    model
    samples
    showModel
    simulationData
    variable
    volatility
    walk

    %% Price and time related
    currentPrice
    now

    %% Drawdown related
    bitcoin
    drawdownData
    finalVariableCache
    inflation
    oneOffFiatVariables
    oneOffItems
    reoccurringItems
    variableDrawdownCache

    %% Worker
    worker

    %% Interim
    interim

    subgraph Tier0[Tier 0]
        interimDataset
        inflationFactors
        currentNotZero
        halvingAnnotations
        maxArray
        maxDataset
        minArray
        minDataset
    end

    subgraph Tier1[Tier 1]
        drawdownStatic
        simulation
        simulationStats
        drawdownVariables
        drawdownVariableLabels
    end

    subgraph Tier2[Tier 2]
        chartOptions
        volume
        zeroCount
        volumeStats
        priceDistribution
        priceWalks
        drawdownDistribution
        drawdownWalks
        dataProperties
    end

    %% Dependencies for Tier 0
    interim --> interimDataset
    showHistoric --> interimDataset

    inflation --> inflationFactors

    currentBlock --> currentNotZero
    currentPrice --> currentNotZero

    halvings --> halvingAnnotations
    currentNotZero --> halvingAnnotations

    currentBlock --> maxArray
    minMaxMultiple --> maxArray
    model --> maxArray
    variable --> maxArray
    currentPrice --> maxArray
    now --> maxArray
    currentNotZero --> maxArray

    renderModelMax --> maxDataset
    maxArray --> maxDataset
    now --> maxDataset

    currentBlock --> minArray
    minMaxMultiple --> minArray
    model --> minArray
    variable --> minArray
    currentPrice --> minArray
    now --> minArray
    currentNotZero --> minArray

    renderModelMin --> minDataset
    minArray --> minDataset
    now --> minDataset

    %% Dependencies for Tier 1
    now --> drawdownStatic
    oneOffItems --> drawdownStatic
    reoccurringItems --> drawdownStatic
    inflationFactors --> drawdownStatic

    currentPrice --> simulation
    minArray --> simulation
    maxArray --> simulation
    epochCount --> simulation
    simulationData --> simulation
    samples --> simulation
    worker --> simulation
    currentNotZero --> simulation

    simulationData --> simulationStats
    simulation --> simulationStats

    epochCount --> drawdownVariables
    samples --> drawdownVariables
    simulationData --> drawdownVariables
    finalVariableCache --> drawdownVariables
    oneOffFiatVariables --> drawdownVariables
    variableDrawdownCache --> drawdownVariables
    worker --> drawdownVariables
    inflationFactors --> drawdownVariables
    showModel --> drawdownVariables
    simulation --> drawdownVariables

    oneOffFiatVariables --> drawdownVariableLabels
    variableDrawdownCache --> drawdownVariableLabels
    showModel --> drawdownVariableLabels
    drawdownVariables --> drawdownVariableLabels

    %% Dependencies for Tier 2
    halvingAnnotations --> chartOptions
    now --> chartOptions
    reoccurringItems --> chartOptions
    oneOffItems --> chartOptions
    showModel --> chartOptions
    drawdownVariableLabels --> chartOptions
    showHistoric --> chartOptions

    bitcoin --> volume
    drawdownStatic --> volume
    finalVariableCache --> volume
    samples --> volume
    epochCount --> volume
    simulationData --> volume
    drawdownData --> volume
    worker --> volume
    showModel --> volume
    drawdownVariables --> volume
    simulation --> volume

    drawdownData --> zeroCount
    showModel --> zeroCount
    volume --> zeroCount

    zeroCount --> volumeStats
    showModel --> volumeStats

    simulationData --> priceDistribution
    now --> priceDistribution
    worker --> priceDistribution
    samples --> priceDistribution
    renderPriceDistribution --> priceDistribution
    simulation --> priceDistribution

    now --> priceWalks
    simulationData --> priceWalks
    renderPriceWalks --> priceWalks
    samplesToRender --> priceWalks
    simulation --> priceWalks

    drawdownData --> drawdownDistribution
    now --> drawdownDistribution
    worker --> drawdownDistribution
    samples --> drawdownDistribution
    renderDrawdownDistribution --> drawdownDistribution
    showModel --> drawdownDistribution
    volume --> drawdownDistribution

    now --> drawdownWalks
    drawdownData --> drawdownWalks
    renderDrawdownWalks --> drawdownWalks
    samplesToRender --> drawdownWalks
    showModel --> drawdownWalks
    volume --> drawdownWalks

    drawdownDistribution --> dataProperties
    drawdownWalks --> dataProperties
    interimDataset --> dataProperties
    maxDataset --> dataProperties
    minDataset --> dataProperties
    priceDistribution --> dataProperties
    priceWalks --> dataProperties
    showHistoric --> dataProperties
```
