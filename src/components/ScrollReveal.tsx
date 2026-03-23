import { useEffect, useRef, forwardRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "fade";
}

const ScrollReveal = forwardRef<HTMLDivElement, ScrollRevealProps>(
  ({ children, className = "", delay = 0, direction = "up" }, _ref) => {
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.animationDelay = `${delay}ms`;
            el.classList.add(
              direction === "left" ? "animate-slide-in-left" :
              direction === "fade" ? "animate-fade-in" :
              "animate-reveal-up"
            );
            observer.unobserve(el);
          }
        },
        { threshold: 0.15 }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [delay, direction]);

    return (
      <div ref={innerRef} className={`opacity-0 ${className}`}>
        {children}
      </div>
    );
  }
);

ScrollReveal.displayName = "ScrollReveal";

export default ScrollReveal;
