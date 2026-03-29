/**
 * Site Graph Builder — Convert declarative page definitions to simulator routes.
 *
 * @see REQ-K8E-011, REQ-K8E-015
 */

import {
  createWebSimulator,
  type SimulatorRoute,
  type WebSimulatorConfig,
  type WebSimulatorInstance,
} from './web-simulator.js';

export type PageDefinition = {
  readonly path: string;
  readonly title: string;
  readonly links: ReadonlyArray<string>;
  /** Raw HTML body content (trusted — not escaped). Only for test scenarios. */
  readonly body?: string;
};

export type SiteGraph = {
  readonly pages: ReadonlyArray<PageDefinition>;
  readonly robotsTxt?: string;
};

/** Generate minimal valid HTML for a page with navigable links */
export function generatePageHtml(page: PageDefinition): string {
  const linkElements = page.links
    .map((link) => `    <a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`)
    .join('\n');

  const bodyContent = page.body !== undefined ? `  <div>${page.body}</div>\n` : '';

  return [
    '<!DOCTYPE html>',
    '<html>',
    `<head><title>${escapeHtml(page.title)}</title></head>`,
    '<body>',
    `  <h1>${escapeHtml(page.title)}</h1>`,
    bodyContent,
    '  <nav>',
    linkElements,
    '  </nav>',
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert a site graph definition into simulator routes. REQ-K8E-011 */
export function buildSiteGraphRoutes(graph: SiteGraph): ReadonlyArray<SimulatorRoute> {
  const routes: SimulatorRoute[] = [];

  // Add robots.txt route if configured (REQ-K8E-014)
  if (graph.robotsTxt !== undefined) {
    const robotsContent = graph.robotsTxt;
    routes.push({
      path: '/robots.txt',
      handler: () => ({
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: robotsContent,
      }),
    });
  }

  // Add page routes
  for (const page of graph.pages) {
    const html = generatePageHtml(page);
    routes.push({
      path: page.path,
      handler: () => ({
        status: 200,
        body: html,
      }),
    });
  }

  return routes;
}

/** Create a web simulator from a declarative site graph. REQ-K8E-011 */
export function createSiteGraphSimulator(
  config: WebSimulatorConfig,
  graph: SiteGraph,
): Promise<WebSimulatorInstance> {
  const routes = buildSiteGraphRoutes(graph);
  return createWebSimulator(config, routes);
}
