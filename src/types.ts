export enum ProxyFormat {
  IP_PORT = "ip:port",
  USER_PASS_AT_IP_PORT = "user:pass@ip:port",
  UNKNOWN = "unknown",
}

export type ProxyStatus = "ok" | "fail" | "unknown";

export type TestStatus = "idle" | "testing" | "stopping" | "finished";

export type Proxy = {
  id: string;
  raw: string;
  formatted: string;
  status: ProxyStatus;
  protocol: ProxyProtocol;
  latency?: number;
  simpleData: SimpleDetails | null;
  proDetails: ProDetails | null;
  error: ProxyError | null;
  // Optional user-supplied tag for the claimed country (e.g. "US"), used by
  // the geo-correctness check feature.
  claimedCountry?: string;
  extras?: ProxyExtras | null;
  targetResults?: TargetResult[] | null;
};

export type AnonymityLevel = "elite" | "anonymous" | "transparent" | "unknown";

export type StickinessVerdict = "sticky" | "rotating" | "unknown";

export type TargetVerdict =
  | "ok"
  | "blocked"
  | "captcha"
  | "fail"
  | "timeout";

export type TargetResult = {
  target: string;
  verdict: TargetVerdict;
  statusCode?: number;
  latency?: number;
  bytes?: number;
  reason?: string;
};

export type LatencyDistribution = {
  samples: number[];
  p50: number;
  p95: number;
  mean: number;
  jitter: number; // standard deviation, ms
  unstable: boolean;
};

export type ProxyExtras = {
  // Feature 1 — geo correctness
  geo?: {
    ip?: string;
    country?: string;
    countryCode?: string;
    city?: string;
    asn?: string;
    org?: string;
    matchesClaim?: boolean | null;
    claimedCountry?: string;
  } | null;

  // Feature 2 — latency distribution
  latency?: LatencyDistribution | null;

  // Feature 3 — protocol auto-detection
  detectedProtocols?: ProxyProtocol[] | null;

  // Feature 4 — anonymity classification
  anonymity?: {
    level: AnonymityLevel;
    leakedHeaders: string[];
    clientIpLeaked: boolean;
  } | null;

  // Feature 5 — DNS leak
  dnsLeak?: {
    detected: boolean;
    resolverIp?: string;
    proxyIp?: string;
    reason?: string;
  } | null;

  // Feature 7 — session stickiness
  stickiness?: {
    verdict: StickinessVerdict;
    samples: string[]; // exit IPs over time
    unique: number;
  } | null;

  // Feature 8 — concurrent connection cap
  concurrency?: {
    attempted: number;
    succeeded: number;
    ceiling: number;
  } | null;

  // Feature 9 — economics: bytes transferred during all probes for this proxy
  bytesTransferred?: number;

  // Bonus 2 — rotation tester
  rotation?: {
    attempted: number;
    uniqueExits: number;
    sampleIps: string[];
  } | null;
};

export type ProxyError = {
  code?: string;
  message: string;
  statusCode?: number;
  suggestion?: string;
  protocolsTried?: ProxyProtocol[];
};

export type UpdateStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "INSTALLING"
  | "DONE"
  | "ERROR";

export type ProxyTesterState = {
  loadedProxies: Proxy[];
  testedProxies: Proxy[];
  isLoading: boolean;
  options: ProxyTesterOptions;
  testStatus: TestStatus;
  abortController: AbortController | null;
};

export type SimpleModeOptions = {
  ipLookup: boolean;
  latencyCheck: boolean;
};

export type ExtraTestOptions = {
  // Feature 1
  geoCorrectness: boolean;
  // Feature 2
  latencyDistribution: boolean;
  latencySamples: number;
  // Feature 3
  protocolAutoDetect: boolean;
  // Feature 4
  anonymityClassification: boolean;
  // Feature 5
  dnsLeakDetection: boolean;
  // Feature 6
  multiTargetEnabled: boolean;
  multiTargets: string[];
  // Feature 7
  stickinessCheck: boolean;
  stickinessSamples: number;
  stickinessIntervalMs: number;
  // Feature 8
  concurrencyCheck: boolean;
  concurrencyAttempts: number;
  // Feature 9
  costPerGb: number;
  // Bonus 1
  captchaDetection: boolean;
  // Bonus 2
  rotationCheck: boolean;
  rotationAttempts: number;
};

export type ProModeOptions = {
  connectionsPerProxy: number;
  testAllConnections: boolean;
  detailedMetrics: boolean;
  connectionPooling: boolean;
  retryCount: number;
  customTimeout: number;
  ipLookup?: boolean; // Add this for consistency
};

export type ProxyTesterOptions = {
  targetUrl: string;
  activeMode: "simple" | "pro";
  simpleMode: SimpleModeOptions;
  proMode: ProModeOptions;
  extras?: ExtraTestOptions;
};

export type ProxyProtocol = "http" | "https" | "socks4" | "socks5" | "unknown";

export interface DetailedLatencyMetrics {
  dnsLookupTime: number;
  tcpConnectTime: number;
  tlsHandshakeTime: number;
  proxyConnectTime: number;
  proxyAuthTime: number;
  requestSendTime: number;
  responseWaitTime: number;
  responseDownloadTime: number;
  totalTime: number;
  isFirstConnection: boolean;
  sessionReused: boolean;
  connectionNumber: number;
}

export interface SimpleDetails {
  country: string;
  countryCode: string;
  ip: string;
  isp: string;
  city: string;
}

export interface ProDetails {
  connections: DetailedLatencyMetrics[];
  averageMetrics: DetailedLatencyMetrics;
  firstConnectionTime: number;
  subsequentConnectionTime: number;
  connectionsCount: number;
  detailedMetrics: DetailedLatencyMetrics;
}

export interface NormalizedProxy {
  formatted: string;
  protocol: ProxyProtocol;
}

// Additional interface for internal use in the low-level tester
export interface ConnectionSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  protocol: ProxyProtocol;
  proxy: string;
  lastUsed: number;
  requestCount: number;
  isAlive: boolean;
}

export interface SocketTimings {
  dnsStart?: number;
  dnsEnd?: number;
  socketCreateStart?: number;
  socketCreateEnd?: number;
  connectStart?: number;
  connectEnd?: number;
  proxyHandshakeStart?: number;
  proxyHandshakeEnd?: number;
  tlsStart?: number;
  tlsEnd?: number;
  requestStart?: number;
  requestEnd?: number;
  responseStart?: number;
  responseEnd?: number;
  firstByteTime?: number;
  lastByteTime?: number;
}
