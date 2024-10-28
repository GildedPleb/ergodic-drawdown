/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable @shopify/jsx-no-hardcoded-content */
import { useCallback, useState } from "react";
import styled from "styled-components";

import { Modal } from "../components/modal";

const Container = styled.div`
  width: 100vw;
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
  margin-top: -5px;
  font-size: 0.6rem;
  color: grey;

  gap: 5px;
  align-items: baseline;
`;

const SmallButton = styled.button`
  color: inherit;
  text-decoration: inherit;
  background: inherit;
  padding: inherit;
  font-size: inherit;
  font-weight: inherit;
  transition: none;
  &:hover {
    border: 1px solid transparent;
  }
`;

const SmallHref = styled.a`
  color: inherit;
  text-decoration: inherit;
  background: inherit;
  padding: inherit;
  font-size: inherit;
  font-weight: inherit;
  &:hover {
    color: inherit;
  }
`;

const Legal = styled.div`
  max-height: 80vh;
  overflow: scroll;
`;

const Footer = (): JSX.Element => {
  const [legal, setLegal] = useState(false);
  const [faq, setFAQ] = useState(false);

  const handleSetLegal = useCallback(() => {
    setLegal(true);
  }, []);

  const hanleSetLegalOff = useCallback(() => {
    setLegal(false);
  }, []);

  const handleSetFAQ = useCallback(() => {
    setFAQ(true);
  }, []);

  const handleSetFAQOff = useCallback(() => {
    setFAQ(false);
  }, []);

  return (
    <>
      <Container>
        &copy; 2024 GildedPleb
        <SmallButton onClick={handleSetLegal}>Legal</SmallButton>
        <SmallHref
          aria-label="https://x.com/gildedpleb"
          href="https://x.com/gildedpleb"
          tabIndex={0}
        >
          Contact
        </SmallHref>
        <SmallHref
          aria-label="Verify Course on Github"
          href="https://github.com/gildedpleb/ergodic-drawdown"
        >
          Source
        </SmallHref>
        <SmallButton onClick={handleSetFAQ}>FAQ</SmallButton>
        <SmallHref
          aria-label="LNURL gildedpleb@getalby.com"
          href="lightning:gildedpleb@getalby.com"
          tabIndex={0}
        >
          Tip Me!
        </SmallHref>
      </Container>
      <Modal heading="FAQ" isOpen={faq} onClose={handleSetFAQOff}>
        <Legal>
          <p>
            Many of these questions and concepts are addressed in the Tutorial
            and it is recommended to start there.
          </p>
          <ol>
            <li>
              <p>
                <strong>
                  What is drawdown in the context of Bitcoin financial modeling?
                </strong>
              </p>
              <p>
                Drawdown refers to the reduction in one's Bitcoin holdings as a
                result of withdrawals or expenditures. In financial terms, it's
                the peak-to-trough decline during a specific recorded period of
                an investment. In the context of Bitcoin financial modeling,
                such as on the website using Monte Carlo simulations, drawdown
                specifically addresses how much Bitcoin balance decreases over
                time due to regular withdrawals to meet expenses or other
                financial obligations.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  What does "ergodic" mean in the context of this Bitcoin
                  drawdown tool?
                </strong>
              </p>
              <p>
                "Ergodic" is a term often used in statistics, mathematics, and
                physics to describe systems or processes where, given enough
                time, they cover all possible states or configurations. It
                implies that the time average of a process is equivalent to its
                average over its entire space of states. In simpler terms, an
                ergodic process is one where every part of the system, or every
                outcome, is eventually sampled over time. This concept is
                fundamental in areas like thermodynamics, where it helps in
                understanding how gases behave, and in economics and finance for
                modeling market behaviors and predictions.
              </p>
              <p>
                In the context of this tool, "ergodic" refers to the assumption
                that over a long period, the average results of the Bitcoin
                price simulations will represent the ensemble average across
                many different economic scenarios. This concept is critical in
                ensuring that the projections made by the tool reflect a
                comprehensive range of possible futures, not just a single
                trajectory.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  How does the Monte Carlo simulation method work for an Ergodic
                  drawdown?
                </strong>
              </p>
              <p>
                The Monte Carlo simulation method involves running a large
                number of simulations ('walks') to forecast the future behavior
                of Bitcoin prices. By inputting different parameters like
                volatility and walk strategies, the tool generates multiple
                potential outcomes, helping to illustrate the range of possible
                scenarios for Bitcoin holdings over time, and their associated
                probability.
              </p>
            </li>
            <li>
              <p>
                <strong>What is meant by 'walks' in this simulation?</strong>
              </p>
              <p>
                'Walks' refer to individual iterations of the Monte Carlo
                simulation, where the Bitcoin price is projected forward in time
                based on predefined volatility, strategy, and other factors.
                Each walk represents a single possible future path that
                Bitcoin's price might take, contributing to the broader
                statistical analysis of potential outcomes. Walks are ergodic in
                that they attempt to eventually hit both the bottom (min) and
                top (max) of the given model, which usually corresponds to
                around 1st percentile and 99th percentile. However, these
                boundaries are not always respected or enforced.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  Why is understanding quantiles important in analyzing the
                  simulation results?
                </strong>
              </p>
              <p>
                Quantiles are points or values that divide a dataset into groups
                containing equal numbers of data points, or that represent
                specific proportions of the dataset. They are useful in
                statistics for understanding the distribution and spread of
                data.
              </p>
              <p>
                Quantiles, here, are essential for understanding the
                distribution of possible Bitcoin prices at the end of the
                simulation period. Though a quantile is not an actually walked
                path, by examining different quantiles (e.g., 25th, 75th, 99th
                percentiles), users can gauge the range of best to worst-case
                scenarios and plan their financial strategies accordingly.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  How do different walk strategies impact the outcomes of the
                  simulations?
                </strong>
              </p>
              <p>
                Different walk strategies follow waypoints, paths, logic, and
                other inputs to alter their course. Set the volatility to 0 to
                see how each walk operates without noise.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  What is the primary goal of this Bitcoin drawdown simulation?
                </strong>
              </p>
              <p>
                The primary goal is to help Bitcoin holders intuit future
                financial scenarios where they might begin to draw on their
                Bitcoin holdings. By simulating different market conditions and
                personal spending requirements, users can better understand just
                how valuable their bitcoin is.
              </p>
            </li>
            <li>
              <p>
                <strong>Who should use this simulation tool?</strong>
              </p>
              <p>
                This tool is designed for people who save in bitcoin, people who
                are considering using their holdings as a source of regular
                income, financial planners advising on bitcoin, or anyone
                interested in understanding the long-term financial implications
                of holding and using Bitcoin. For all users, this tool does not
                in any way constitute financial advice. Please speak with a
                licensed financial planner before making any financial
                decisions. Further, this tool does not apply in any way to other
                media beside bitcoin. Especially media that has no future such
                as every other currency or cryptocurrency.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  How accurate are the predictions made by the Monte Carlo
                  simulation?
                </strong>
              </p>
              <p>
                While the Monte Carlo simulation provides a robust model by
                considering thousands of possible outcomes, all predictions are
                hypothetical and based on user assumptions which will
                undoubtedly be proven wrong. That said, being based on
                historical data, statistical assumptions, and pure random number
                generation, makes it a powerful tool to be used along with many
                other such tools in financial planning. Again consult with a
                financial planner.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  Can this tool predict the future price of Bitcoin?
                </strong>
              </p>
              <p>
                No. The tool is not designed to predict exact future prices but
                rather to offer scenarios based on different inputs and shed
                light on probabilities around those assumptions. It helps users
                understand risks under various conditions.
              </p>
            </li>
            <li>
              <p>
                <strong>
                  What are the limitations of this simulation tool?
                </strong>
              </p>
              <p>
                Limitations include the reliance on historical data, which may
                not capture future market conditions accurately. The tool also
                assumes certain financial and economic conditions will remain
                constant, which may not be the case. The base assumption is that
                all models will be proven wrong, and thus many models are
                included. As such, the modeling assumes ergodicity to a fault,
                and this too, might prove wanting in time.
              </p>
            </li>
            <li>
              <p>
                <strong>How often is the data and model updated?</strong>
              </p>
              <p>
                This tool scrapes the current daily price of bitcoin, and keeps
                a record of past prices. All other information is generated
                based on user input. For requests, open a{" "}
                <a href="https://github.com/GildedPleb/ergodic-drawdown/issues/new">
                  github issue
                </a>
                .
              </p>
            </li>
          </ol>
        </Legal>
      </Modal>
      <Modal
        heading="Legal Disclaimer"
        isOpen={legal}
        onClose={hanleSetLegalOff}
      >
        <Legal>
          <section id="disclaimer">
            <p>
              The information provided on this website, including data,
              analyses, and tools, is for educational and informational purposes
              only and is not intended as legal, financial, or professional
              advice. This website explores theoretical Bitcoin price
              projections and drawdown scenarios based on user-inputted
              parameters. All content is speculative and designed to provide
              insights into Bitcoin's potential future behavior under various
              conditions.
            </p>
          </section>
          <section id="accuracy">
            <p>
              <strong>No Representation of Accuracy:</strong> The website makes
              no claims that the information provided is accurate, complete, or
              timely, nor does it make any warranties, express or implied,
              regarding the content. The scenarios and data presented are purely
              hypothetical and should not be relied upon for financial planning
              or investment purposes.
            </p>
            <p>
              <strong>Risk Warning:</strong> Cryptocurrency investments carry
              significant risks. Past performance does not guarantee future
              results. You may lose some or all of your investment.
            </p>
          </section>
          <section id="professional-guidance">
            <p>
              <strong>Consult Professionals:</strong> Before making any
              financial decisions based on the information provided on this
              website, we strongly recommend consulting with qualified
              financial, legal, and tax professionals. This website should not
              be used as a substitute for professional advice from licensed
              practitioners.
            </p>
          </section>
          <section id="licensing">
            <p>
              <strong>MIT License:</strong> The source code used by this website
              is available under the MIT License, which permits reuse under
              specific conditions but does not imply any endorsement of the
              content or its accuracy by the original creators of the software.
            </p>
          </section>
          <section id="privacy">
            <p>
              <strong>Privacy Policy/Data Collection:</strong> This website
              respects user privacy. No personal data is collected, stored, or
              transmitted to any servers.
            </p>
            <p>
              <strong>Local Processing:</strong> All calculations and operations
              are performed locally on the user's device.
            </p>
            <p>
              <strong>Cookies:</strong> This website does not use cookies or
              tracking mechanisms.
            </p>
            <p>
              <strong>Saved Data:</strong> A user my elect, at the user's
              discretion, to save data locally. This data is encrypted using
              AES-256 encryption using a user supplied password. It is the
              user's responsibility to manage this data and this password
              appropriately. This data is only saved locally to the users
              device, and can not be accessed by this website unless the user
              chooses to load that data locally and decrypt it. Encryption
              schemes may change at any time fully invalidating previously saved
              data.
            </p>
          </section>
          <section id="terms">
            <p>
              <strong>Acceptance of Terms:</strong> By accessing and using this
              website, you acknowledge that you have read, understood, and agree
              to be bound by these terms. If you do not agree with these terms,
              you must not use this website.
            </p>
            <p>
              <strong>Use License:</strong> This website grants you a limited,
              non-exclusive, non-transferable license to access and use the
              materials and information available on the site for personal,
              non-commercial purposes only, subject to these restrictions:
            </p>
            <ol>
              <li>
                - You may not modify, copy, or distribute any content without
                express written permission
              </li>
              <li>
                - You may not use any content for commercial purposes or public
                display
              </li>
              <li>
                - You may not attempt to reverse engineer any software on this
                website
              </li>
              <li>
                - You must not remove any copyright or proprietary notices from
                the materials
              </li>
              <li>
                - You may not transfer the content to another person or
                replicate it on any other server
              </li>
            </ol>
            <p>
              This license shall automatically terminate if you violate any of
              these restrictions.
            </p>
            <p>
              <strong>Limitation of Liability:</strong> The website, its owners,
              and contributors shall not be liable for any direct, indirect,
              incidental, special, consequential, or punitive damages arising
              out of:
            </p>
            <ol>
              <li>- Your access to or use of the website</li>
              <li>- Your inability to use the website</li>
              <li>- Any errors or omissions in the content</li>
              <li>
                - Any investment decisions made based on the information
                provided
              </li>
              <li>- Any technical issues or system failures</li>
            </ol>
            <p>
              <strong>Indemnification:</strong> You agree to indemnify, defend,
              and hold harmless the website and its affiliates, contributors,
              creators, officers, agents, and employees from any claim, demand,
              or damages, including reasonable attorneys' fees, made by any
              third party due to or arising out of:
            </p>
            <ol>
              <li>- Your use of the website</li>
              <li>- Your violation of these terms</li>
              <li>- Your violation of any rights of another party</li>
            </ol>
            <strong>Governing Law and Jurisdiction</strong>
            <ol>
              <li>
                - These terms are governed by and construed in accordance with
                the laws of The United States.
              </li>
              <li>
                - Any disputes arising from these terms shall be subject to the
                exclusive jurisdiction of the courts in California.
              </li>
            </ol>
            <strong>Modifications to Terms</strong>
            <ol>
              <li>
                - The website reserves the right to modify these terms at any
                time without prior notice
              </li>
              <li>
                - Such modifications will be effective immediately upon posting
              </li>
              <li>
                - Your continued use of the website after any modifications
                indicates your acceptance of the modified terms
              </li>
            </ol>
            <strong>Severability</strong>
            <p>
              If any provision of these terms is held to be invalid or
              unenforceable:
            </p>
            <ol>
              <li>
                - That provision shall be construed to reflect the parties'
                original intent
              </li>
              <li>
                - The remaining provisions shall remain in full force and effect
              </li>
              <li>
                - The invalid or unenforceable provision shall be replaced with
                a valid provision that most closely matches the intent of the
                original provision
              </li>
            </ol>
          </section>
          <section id="contact">
            <strong>Contact Information</strong>
            <p>
              For questions regarding these terms, please contact us at:
              @gildedpleb on X
            </p>
          </section>
        </Legal>
      </Modal>
    </>
  );
};

export default Footer;
