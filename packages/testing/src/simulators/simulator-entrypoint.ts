/**
 * Simulator Entrypoint — Standalone runner for Docker container.
 *
 * Starts the web simulator as a standalone HTTP server with a default
 * site graph, configurable via SIMULATOR_PORT env var.
 *
 * @see REQ-K8E-016
 */

import { createSiteGraphSimulator } from './site-graph-builder.js';
import { getBuiltInScenarioRoutes } from './built-in-scenarios.js';
import { createWebSimulator, type SimulatorRoute } from './web-simulator.js';

const port = parseInt(process.env['SIMULATOR_PORT'] ?? '8080', 10);

/** Default site graph for E2E testing — a small bounded crawlable site */
const defaultSiteGraph = {
  pages: [
    { path: '/', title: 'Home', links: ['/about', '/blog', '/products'] },
    { path: '/about', title: 'About Us', links: ['/', '/blog'] },
    { path: '/blog', title: 'Blog', links: ['/', '/blog/post-1', '/blog/post-2'] },
    { path: '/blog/post-1', title: 'First Post', links: ['/blog', '/about'] },
    { path: '/blog/post-2', title: 'Second Post', links: ['/blog', '/products'] },
    { path: '/products', title: 'Products', links: ['/', '/products/widget'] },
    { path: '/products/widget', title: 'Widget', links: ['/products', '/about'] },
  ],
  robotsTxt: 'User-agent: *\nDisallow: /admin\nAllow: /',
} as const;

async function main(): Promise<void> {
  // Start site graph simulator (pages + robots.txt)
  const graphSim = await createSiteGraphSimulator(
    { port, host: '0.0.0.0' },
    defaultSiteGraph,
  );

  // Also create a simulator instance with built-in scenarios on port+1
  const scenarioRoutes: ReadonlyArray<SimulatorRoute> = getBuiltInScenarioRoutes();
  const scenarioSim = await createWebSimulator(
    { port: port + 1, host: '0.0.0.0' },
    scenarioRoutes,
  );

  console.log(`Site graph simulator: ${graphSim.url} (${String(defaultSiteGraph.pages.length)} pages)`);
  console.log(`Scenario simulator: ${scenarioSim.url}`);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('Shutting down simulators...');
    await graphSim.close();
    await scenarioSim.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
}

void main();
