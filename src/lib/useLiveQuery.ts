/**
 * A live query with the real-time fallback (specs §1.4 network states, S-33, F-1101, NFR "≤ 15 s on fallback
 * polling"): Convex pushes every change over its WebSocket; once that has been down for more than 10 s, the same
 * query is fetched over HTTPS every S-33 seconds until the WebSocket is back.
 */
import { useConvex, useQuery } from 'convex/react';
import type { ConnectionState } from 'convex/browser';
import {
  getFunctionName,
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
} from 'convex/server';
import { useEffect, useState } from 'react';

import { useAppConfig } from './appConfig';
import { queryOverHttp } from './convex';

const DOWN_AFTER_MS = 10 * 1000;

/** True once the real-time connection has been down for more than 10 s. */
function useRealtimeDown(): boolean {
  const convex = useConvex();
  const [down, setDown] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (state: ConnectionState) => {
      if (state.isWebSocketConnected) {
        clearTimeout(timer);
        timer = undefined;
        setDown(false);
      } else if (timer === undefined) {
        timer = setTimeout(() => setDown(true), DOWN_AFTER_MS);
      }
    };
    update(convex.connectionState());
    const stop = convex.subscribeToConnectionState(update);
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [convex]);
  return down;
}

export function useLiveQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: FunctionArgs<Query>,
): FunctionReturnType<Query> | undefined {
  const live = useQuery(query, args);
  const down = useRealtimeDown();
  const everySec = useAppConfig()?.realtimeFallbackSec;
  // `api.x.y` is a new object on every render: key the effect on the function's name and the args' JSON.
  const name = getFunctionName(query);
  const argsKey = JSON.stringify(args);
  const key = `${name} ${argsKey}`;
  const [polled, setPolled] = useState<{ key: string; value: FunctionReturnType<Query> } | null>(null);

  useEffect(() => {
    if (!down || everySec === undefined) return;
    const ref = makeFunctionReference<'query'>(name) as Query;
    const pollArgs = JSON.parse(argsKey) as FunctionArgs<Query>;
    let stopped = false;
    const poll = () =>
      void queryOverHttp(ref, pollArgs).then(
        (value) => {
          if (!stopped) setPolled({ key: `${name} ${argsKey}`, value });
        },
        () => undefined, // still offline: keep the last answer on screen
      );
    poll();
    const timer = setInterval(poll, everySec * 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [down, everySec, name, argsKey]);

  return down && polled?.key === key ? polled.value : live;
}
