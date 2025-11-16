import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
} from "react";

export interface StopwatchHandle {
  start: () => void;
  pause: () => void;
  reset: () => void;
  getTime: () => number;
}

interface StopwatchProps {
  className?: string;
}

const Stopwatch = forwardRef<StopwatchHandle, StopwatchProps>(
  ({ className }, ref) => {
    const [displayTime, setDisplayTime] = useState(0); // for rendering
    const startTimeRef = useRef<number | null>(null);
    const elapsedRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);

    // get the current elapsed time without relying on state
    const getElapsed = () => {
      if (startTimeRef.current !== null) {
        return elapsedRef.current + (Date.now() - startTimeRef.current);
      }
      return elapsedRef.current;
    };

    function tick() {
      setDisplayTime(getElapsed());
      rafRef.current = requestAnimationFrame(tick);
    }

    function start() {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    function pause() {
      if (startTimeRef.current !== null) {
        elapsedRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      }
    }

    function reset() {
      elapsedRef.current = 0;
      startTimeRef.current = null;
      setDisplayTime(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    useImperativeHandle(ref, () => ({
      start,
      pause,
      reset,
      getTime: () => getElapsed(),
    }));

    useEffect(() => {
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    function formatTime(ms: number) {
      const milliseconds = Math.floor((ms % 1000) / 10);
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor(ms / (1000 * 60 * 60));

      let formatted = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;

      if (hours > 0) {
        formatted = `${hours.toString().padStart(2, "0")}:${formatted}`;
      }

      return formatted;
    }

    return <div className={className}>{formatTime(displayTime)}</div>;
  }
);

export default Stopwatch;
