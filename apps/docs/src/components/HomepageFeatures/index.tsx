import type { ReactNode } from "react";

import Heading from "@theme/Heading";
import clsx from "clsx";

import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "AI-Powered Intelligence",
    // eslint-disable-next-line ts/no-require-imports
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        Cronicorn uses AI to automatically adjust task scheduling based on
        performance metrics, failure patterns, and system load. Get smarter
        scheduling without manual intervention.
      </>
    ),
  },
  {
    title: "Real-time Adaptation",
    // eslint-disable-next-line ts/no-require-imports
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Dynamic scheduling that responds to your application&apos;s needs in real-time.
        Automatically scales up during high demand and backs off during failures,
        respecting your configured constraints.
      </>
    ),
  },
  {
    title: "Built for Production",
    // eslint-disable-next-line ts/no-require-imports
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Multi-tenant support, comprehensive monitoring, fault tolerance, and
        distributed execution. Cronicorn is designed for production workloads
        with clean architecture and extensive observability.
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
