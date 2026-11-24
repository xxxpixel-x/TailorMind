interface BucketRecord {
  minuteTimestamps: number[];
  dayTimestamps: number[];
}

const ipBuckets = new Map<string, BucketRecord>();

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  remainingMinute: number;
  remainingDay: number;
}

export function checkRateLimit(
  ip: string,
  kind: "analyze" | "visualize" = "analyze"
): RateLimitResult {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const maxPerMin =
    kind === "visualize"
      ? 4
      : Number(process.env.LIANGYI_RATE_LIMIT_PER_MIN || 6);
  const maxPerDay =
    kind === "visualize"
      ? 12
      : Number(process.env.LIANGYI_RATE_LIMIT_PER_DAY || 30);

  const key = `${kind}:${ip}`;
  const bucket = ipBuckets.get(key) || {
    minuteTimestamps: [],
    dayTimestamps: [],
  };

  bucket.minuteTimestamps = bucket.minuteTimestamps.filter((t) => t > oneMinuteAgo);
  bucket.dayTimestamps = bucket.dayTimestamps.filter((t) => t > oneDayAgo);

  if (bucket.minuteTimestamps.length >= maxPerMin) {
    return {
      allowed: false,
      reason: `请求过于频繁（公网保护限流：每分钟最多 ${maxPerMin} 次），请稍候再试或先浏览预演快照。`,
      remainingMinute: 0,
      remainingDay: Math.max(0, maxPerDay - bucket.dayTimestamps.length),
    };
  }

  if (bucket.dayTimestamps.length >= maxPerDay) {
    return {
      allowed: false,
      reason: `今日公网体验额度已达上限（单 IP 每日限 ${maxPerDay} 次），可前往设置页填写自有 API Key。`,
      remainingMinute: Math.max(0, maxPerMin - bucket.minuteTimestamps.length),
      remainingDay: 0,
    };
  }

  bucket.minuteTimestamps.push(now);
  bucket.dayTimestamps.push(now);
  ipBuckets.set(key, bucket);

  return {
    allowed: true,
    remainingMinute: maxPerMin - bucket.minuteTimestamps.length,
    remainingDay: maxPerDay - bucket.dayTimestamps.length,
  };
}
