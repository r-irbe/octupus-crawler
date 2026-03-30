// CrawlerAPI — TypeSpec service definition
// Implements: T-COMM-007 (REQ-COMM-005, REQ-COMM-007)
// Contract-first: TypeSpec → OpenAPI 3.0+ → Spectral lint
// NOTE: @typespec/openapi3 emitter generates 3.0.0; upgrade to 3.1 when emitter supports it
// TODO: Add @useAuth(BearerAuth) when auth design is finalized (F-005)
// Source schemas: packages/api-router/src/schemas.ts (Zod)
// ADR-017: TypeSpec for external/non-TS consumers

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "@typespec/versioning";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

// REQ-COMM-007: URL-prefix versioning (/api/v1/)
/** Public API for the IPF distributed web crawler. Submit crawl jobs, monitor status, and check service health. */
@versioned(Versions)
@service(#{ title: "IPF Crawler API" })
@server("http://localhost:3000", "Development server")
namespace IPF.CrawlerAPI;

enum Versions {
  v1: "v1",
}

// --- Models ---

model CrawlSubmitRequest {
  /** URLs to crawl (1–1000) */
  @minItems(1)
  @maxItems(1000)
  urls: url[];

  /** Maximum crawl depth (0–100, default 3) */
  @minValue(0)
  @maxValue(100)
  maxDepth?: int32 = 3;

  /** Maximum concurrent requests (1–100, default 10) */
  @minValue(1)
  @maxValue(100)
  maxConcurrent?: int32 = 10;

  /** Restrict crawling to these domains */
  allowedDomains?: string[];

  /** Custom user agent string (max 500 chars) */
  @maxLength(500)
  userAgent?: string;
}

model CrawlSubmitResponse {
  jobId: string;
  urlCount: int32;
  status: "queued";
}

enum CrawlStatus {
  queued,
  running,
  completed,
  failed,
  cancelled,
}

model CrawlStatusResponse {
  jobId: string;
  status: CrawlStatus;
  urlsTotal: int32;
  urlsCrawled: int32;
  urlsFailed: int32;
  startedAt?: utcDateTime;
  completedAt?: utcDateTime;
}

enum HealthStatus {
  ok,
  degraded,
  unhealthy,
}

model HealthResponse {
  status: HealthStatus;
}

model ErrorResponse {
  code: string;
  message: string;
  correlationId?: string;
}

// --- Operations ---

@route("/api/v1")
namespace V1 {
  @route("/crawl")
  @tag("Crawl")
  namespace Crawl {
    /** Submit URLs for crawling */
    @post
    op submit(@body body: CrawlSubmitRequest): {
      @statusCode statusCode: 201;
      @body body: CrawlSubmitResponse;
    } | {
      @statusCode statusCode: 400;
      @body body: ErrorResponse;
    } | {
      @statusCode statusCode: 401;
      @body body: ErrorResponse;
    };

    /** Get crawl job status */
    @get
    @route("/{jobId}")
    op getStatus(@path jobId: string): {
      @statusCode statusCode: 200;
      @body body: CrawlStatusResponse;
    } | {
      @statusCode statusCode: 404;
      @body body: ErrorResponse;
    };
  }

  @route("/health")
  @tag("Health")
  namespace Health {
    /** Health check endpoint */
    @get
    op check(): {
      @statusCode statusCode: 200;
      @body body: HealthResponse;
    };
  }
}
