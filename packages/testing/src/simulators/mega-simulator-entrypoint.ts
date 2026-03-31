// Mega Simulator Docker Entrypoint
// REQ-LTO-007: Multi-pod simulator deployment
// Starts mega simulator with env-configured domain/page counts

import { loadConfigFromEnv } from './mega-simulator-config.js';
import { createMegaSimulator } from './mega-simulator.js';

const config = loadConfigFromEnv();
const sim = createMegaSimulator(config);

sim.server.listen(config.port, '0.0.0.0', () => {
  const totalPages = config.domainCount * config.pagesPerDomain;
  console.log(
    `Mega simulator started on :${String(config.port)} — `
    + `${String(config.domainCount)} domains × ${String(config.pagesPerDomain)} pages = ${String(totalPages)} URLs`,
  );
  console.log(
    `Chaos domains: ${String(Math.floor(config.domainCount * config.chaosDomainRatio))} `
    + `(${String(config.chaosDomainRatio * 100)}%)`,
  );
});

const shutdown = (): void => {
  console.log('Shutting down mega simulator...');
  sim.close().then(
    () => { process.exit(0); },
    () => { process.exit(1); },
  );
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
