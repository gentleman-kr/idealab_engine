import type { Client } from "@/lib/models";
import { defaultFrameworkState } from "@/lib/frameworkDefaults";

export function ensureFramework(client: Client): Client {
  if (client.framework) return client;
  const fw = defaultFrameworkState();
  return {
    ...client,
    framework: fw,
    sales: client.sales
      ? {
          ...client.sales,
          trust: {
            credibility: fw.trustEquation.credibility,
            reliability: fw.trustEquation.reliability,
            intimacy: fw.trustEquation.intimacy,
            selfOrientation: fw.trustEquation.selfOrientation,
          },
        }
      : client.sales,
  };
}
