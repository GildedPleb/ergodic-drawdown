import { useEffect, useRef } from "react";

const CaretSVG = ({ $isOpen }: { $isOpen: boolean }): JSX.Element => {
  const animateReference = useRef<SVGAnimateTransformElement | null>(null);

  useEffect(() => {
    if (animateReference.current !== null) {
      animateReference.current.beginElement();
    }
  }, [$isOpen]);

  const toDefault = "-90 50 50";
  const toRotation = "0 50 50";

  const to = $isOpen ? toDefault : toRotation;
  const from = $isOpen ? toRotation : toDefault;

  return (
    <svg
      fill="currentColor"
      height="12"
      viewBox="0 0 100 100"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M50 80 L80 20 H20 L50 80z">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          begin="indefinite"
          dur="0.4s"
          fill="freeze"
          from={from}
          ref={animateReference}
          to={to}
          type="rotate"
        />
      </path>
    </svg>
  );
};

export default CaretSVG;
