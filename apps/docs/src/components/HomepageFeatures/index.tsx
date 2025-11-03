import type { ReactNode } from "react";

import Heading from "@theme/Heading";
import clsx from "clsx";

import styles from "./styles.module.css";

// Import SVGs statically for SSG compatibility
// eslint-disable-next-line ts/no-require-imports
const MountainSvg = require("@site/static/img/undraw_docusaurus_mountain.svg").default;
// eslint-disable-next-line ts/no-require-imports
const TreeSvg = require("@site/static/img/undraw_docusaurus_tree.svg").default;
// eslint-disable-next-line ts/no-require-imports
const ReactSvg = require("@site/static/img/undraw_docusaurus_react.svg").default;

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Easy to Use",
    Svg: MountainSvg,
    description: (
      <>
        Cronicorn is designed to be easy to set up and configure. Get your
        scheduled jobs running in minutes with simple HTTP endpoints.
      </>
    ),
  },
  {
    title: "AI-Powered Adaptation",
    Svg: TreeSvg,
    description: (
      <>
        Intelligent scheduling that adapts to your system's real-time
        conditions, optimizing job execution based on system load and patterns.
      </>
    ),
  },
  {
    title: "Built with TypeScript",
    Svg: ReactSvg,
    description: (
      <>
        Fully typed with TypeScript for a great developer experience. Modern
        architecture with clean separation of concerns.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
