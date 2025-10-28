import { useCallback, useEffect, useState } from "react";

import type { TimelineConfig, TimelineStep } from "./timeline-types";

type UseTimelineProps = {
  steps: Array<TimelineStep>;
  config: TimelineConfig;
};

export function useTimeline({ steps, config }: UseTimelineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(config.autoPlay);
  const [isPaused, setIsPaused] = useState(false);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= steps.length - 1) {
        return config.loop ? 0 : prev;
      }
      return prev + 1;
    });
  }, [steps.length, config.loop]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev <= 0) {
        return config.loop ? steps.length - 1 : prev;
      }
      return prev - 1;
    });
  }, [steps.length, config.loop]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
      }
    },
    [steps.length],
  );

  const play = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(config.autoPlay);
    setIsPaused(false);
  }, [config.autoPlay]);

  useEffect(() => {
    if (!isPlaying || isPaused)
      return;

    const timer = setInterval(() => {
      nextStep();
    }, config.stepDuration);

    return () => clearInterval(timer);
  }, [isPlaying, isPaused, nextStep, config.stepDuration]);

  return {
    currentStep,
    currentData: steps[currentStep],
    isPlaying,
    isPaused,
    nextStep,
    prevStep,
    goToStep,
    play,
    pause,
    reset,
    progress: (currentStep / (steps.length - 1)) * 100,
  };
}
