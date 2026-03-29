/**
 * Web Simulator — HTTP server with configurable routes for E2E testing.
 *
 * Provides a deterministic "mock internet" with real TCP connections.
 * Deployable in-process (integration tests) or as K8s pod (E2E tests).
 *
 * @see REQ-K8E-010, REQ-K8E-012, REQ-K8E-015
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

/** Route handler receives a parsed request and returns a response config */
export type RouteHandler = (
  req: SimulatorRequest,
) => SimulatorResponse | Promise<SimulatorResponse>;

export type SimulatorRequest = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
};

export type SimulatorResponse = {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: string;
  readonly delay?: number;
};

export type SimulatorRoute = {
  readonly path: string;
  readonly handler: RouteHandler;
};

export type WebSimulatorConfig = {
  readonly port?: number;
  readonly host?: string;
};

export type WebSimulatorInstance = {
  readonly url: string;
  readonly port: number;
  readonly close: () => Promise<void>;
};

function matchRoute(
  routes: ReadonlyArray<SimulatorRoute>,
  pathname: string,
): SimulatorRoute | undefined {
  return routes.find((r) => {
    if (r.path === pathname) return true;
    // Match path prefix for query-parametrized routes
    if (pathname.startsWith(r.path) && pathname[r.path.length] === '?') return true;
    return false;
  });
}

async function handleRequest(
  routes: ReadonlyArray<SimulatorRoute>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const reqUrl = req.url ?? '/';
  const parsedUrl = new URL(reqUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;

  const route = matchRoute(routes, pathname);

  if (route === undefined) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  const simReq: SimulatorRequest = {
    url: reqUrl,
    method: req.method ?? 'GET',
    headers,
  };

  const simRes = await route.handler(simReq);

  if (simRes.delay !== undefined && simRes.delay > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, simRes.delay);
    });
  }

  const resHeaders: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    ...simRes.headers,
  };

  res.writeHead(simRes.status, resHeaders);
  res.end(simRes.body);
}

/** Create a web simulator with explicit routes. REQ-K8E-010 */
export function createWebSimulator(
  config: WebSimulatorConfig,
  routes: ReadonlyArray<SimulatorRoute>,
): Promise<WebSimulatorInstance> {
  return new Promise<WebSimulatorInstance>((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      handleRequest(routes, req, res).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      });
    });

    const host = config.host ?? '127.0.0.1';
    const port = config.port ?? 0;

    server.listen(port, host, () => {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }

      const boundPort = addr.port;
      const url = `http://${host}:${String(boundPort)}`;

      resolve({
        url,
        port: boundPort,
        close: (): Promise<void> =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((err) => {
              if (err !== undefined) rejectClose(err);
              else resolveClose();
            });
          }),
      });
    });

    server.on('error', reject);
  });
}
