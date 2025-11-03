import type { ReactNode } from "react";

import { docsFeatures } from "@cronicorn/content";
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

const svgComponents = [MountainSvg, TreeSvg, ReactSvg];

const FeatureList: FeatureItem[] = docsFeatures.map((feature, index) => ({
  title: feature.title,
  Svg: svgComponents[index],
  description: <>{feature.description}</>,
}));

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
