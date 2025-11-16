import { useRef } from "react";
import Stopwatch, { type StopwatchHandle } from "~/components/stopwatch";
import { Button } from "~/components/ui/button";

export default function Test() {
  const stopwatchRef = useRef<StopwatchHandle>(null);
  return (
    <>
      <Stopwatch ref={stopwatchRef} />
      <Button onClick={() => stopwatchRef.current?.start()}>start</Button>
      <Button onClick={() => stopwatchRef.current?.pause()}>pause</Button>
      <Button onClick={() => stopwatchRef.current?.reset()}>reset</Button>
      <Button onClick={() => alert(stopwatchRef.current?.getTime())}>
        get time
      </Button>
    </>
  );
}
