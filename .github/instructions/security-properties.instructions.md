---
applyTo: "**/*.property.test.ts"
---

# Security Property Testing Instructions

## Required Security Properties

Map these security gaps to fast-check properties:

### GAP-SEC-001: RFC 6890 Reserved IP Ranges

All URL validation MUST reject every RFC 6890 reserved range:

```typescript
// Property for REQ-SEC-001: URL validator rejects all RFC 6890 reserved IPs
fcTest.prop('rejects RFC 6890 reserved IPs', [arbReservedIP], (ip) => {
  expect(validateUrl(`http://${ip}/`).isErr()).toBe(true);
});
```

### GAP-SEC-002: IPv4-Mapped IPv6

Block `::ffff:` prefixed addresses that map to reserved IPv4:

```typescript
fcTest.prop('rejects IPv4-mapped IPv6', [arbIPv4MappedIPv6], (ip) => {
  expect(validateUrl(`http://[${ip}]/`).isErr()).toBe(true);
});
```

### GAP-SEC-003: DNS TOCTOU

Verify DNS resolution is pinned — resolve before fetch, validate resolved IP:

```typescript
fcTest.prop('DNS pin prevents rebinding', [arbTOCTOUPayload], (payload) => {
  // Resolver must pin IP and validate against RFC 6890 after resolution
});
```

### GAP-SEC-004: DNS Rebinding Sequences

Low-TTL domains that switch from public to reserved IP between resolve and fetch:

```typescript
fcTest.prop('blocks DNS rebinding via TTL manipulation', [arbRebindingDomain], ...);
```

### GAP-SEC-005: Redirect Chain SSRF

Redirect chains that terminate at reserved IPs must be blocked:

```typescript
fcTest.prop('blocks redirect chains to reserved IPs', [arbRedirectChain], ...);
```

## Generators

Import from `@ipf/testing/generators/`:

- `rfc6890.generator` — `arbReservedIPv4`, `arbIPv4MappedIPv6`, `arbReservedIP`
- `dns-rebinding.generator` — `arbTOCTOUPayload`, `arbRedirectChain`, `arbSchemeAbuse`
- `ssrf-payload.generator` — `arbSSRFPayload`, `arbDecimalIP`, `arbOctalIP`
