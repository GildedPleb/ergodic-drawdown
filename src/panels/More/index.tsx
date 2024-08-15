import React, { Suspense, useEffect, useState } from "react";

import HowToButton from "../../components/button";
import HowToPanel from "../../components/panel";

const allPosts = import.meta.glob("./info/*.mdx");

interface FrontMatter {
  offButtonText: string;
  onButtonText: string;
  order: number;
}

interface ISection {
  Content: JSX.Element;
  meta: FrontMatter;
  path: string;
}

interface PostComponent {
  default: React.ComponentType;
  frontmatter: FrontMatter;
}

const More = (): JSX.Element => {
  const [showPanel, setShowPanel] = useState<number | undefined>();

  const [posts, setPosts] = useState<ISection[]>([]);

  useEffect(() => {
    const asyncFunction = async (): Promise<void> => {
      const newPosts = await Promise.all(
        Object.entries(allPosts).map(async ([path, resolver]) => {
          const raw = (await resolver()) as PostComponent;
          const { default: Content, frontmatter: meta } = raw;
          return { Content: <Content />, meta, path };
        }),
      );
      const sorted = newPosts.sort(
        (first, second) => Number(first.meta.order) - Number(second.meta.order),
      );
      setPosts(sorted);
    };

    asyncFunction().catch(console.error);
  }, []);

  const togglePanel = (index: number) => () => {
    if (showPanel === index) {
      setShowPanel(undefined);
    } else {
      setShowPanel(index);
    }
  };
  return (
    <div className="how-to">
      <Suspense fallback={<div />}>
        <div className="button-box">
          {posts.map((item, index) => (
            <HowToButton
              isVisible={showPanel !== index}
              key={item.path}
              offButtonText={item.meta.offButtonText}
              // eslint-disable-next-line react/jsx-handler-names
              onButtonText={item.meta.onButtonText}
              onClick={togglePanel(index)}
            />
          ))}
        </div>
        {posts.map((item, index) => (
          <HowToPanel isVisible={showPanel === index} key={item.path}>
            {item.Content}
          </HowToPanel>
        ))}
      </Suspense>
    </div>
  );
};

export default More;
